--[[
	RaceSim (ModuleScript)
	Location: ServerScriptService > ServerModules > RaceSim

	The live race simulation. It runs on the server only.

	How it works:
	  * When a car crosses the start/finish line, the server decides how long
	    its next lap will take (car + driver + tyres + fuel + weather + luck).
	  * If that lap would take it past the car in front, an overtake is tried.
	    If the move fails, the car is stuck behind and its lap gets slower.
	  * Mistakes, crashes, breakdowns, punctures and safety cars are rolled
	    each lap. Pit stops happen at the line and depend on the pit crew.
	  * The client gets each car's lap start/end time and works out where on
	    the track to draw it, so movement is smooth without heavy networking.
	  * "Take the wheel": the player's car is driven on the client and the
	    client reports its distance. The server checks the distance is
	    believable before using it.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("Config"))
local TrackPath = require(Shared:WaitForChild("TrackPath"))

local Modules = script.Parent
local TyreModel = require(Modules:WaitForChild("TyreModel"))
local Weather = require(Modules:WaitForChild("Weather"))
local TeamManager = require(Modules:WaitForChild("TeamManager"))
local Radio = require(Modules:WaitForChild("Radio"))

local RaceSim = {}
RaceSim.__index = RaceSim

local PIT_LANE_SPEED = 25 -- studs per second in the pit lane (for drawing only)
local AI_SETUP_BONUS = 0.15 -- AI teams always do some practice
local DNF_REASONS = { "Engine failure", "Gearbox failure", "Hydraulics failure", "Brake failure", "Power unit problem" }
local PIT_PROBLEMS = { "front left wheel", "rear right wheel nut", "front jack", "rear jack", "left rear wheel gun" }

local gauss = TeamManager.gauss

---------------------------------------------------------------------
-- Lap model, shared by practice, qualifying and the race
---------------------------------------------------------------------
-- opts: compound, wear, fuel, wetness, bonus (seconds faster), progress (0-1 of session, track rubbers in)
function RaceSim.paceLap(track, entry, opts)
	local scale = track.baseLap / 90
	local d = entry.driver
	local perf = TeamManager.carPerformance(entry.car, track)
	local t = track.baseLap
	t += (100 - perf) * 0.05 * scale
	t += (100 - d.pace) * 0.035 * scale
	t += TyreModel.basePace(opts.compound) * scale
	t += TyreModel.wearPenalty(opts.wear or 0) * scale
	t += TyreModel.weatherPenalty(opts.compound, opts.wetness or 0, d.wet) * scale
	t += (opts.fuel or 0) * Config.Race.FuelSecondsPerKg * scale
	t -= opts.bonus or 0
	t -= 0.35 * (opts.progress or 0) * scale
	return t
end

-- Random lap-to-lap variation. Consistent drivers vary less.
function RaceSim.lapNoise(track, entry, rng)
	local sd = (0.1 + (100 - entry.driver.consistency) * 0.006) * (track.baseLap / 90)
	return gauss(rng) * sd
end

---------------------------------------------------------------------
-- Creating a race
---------------------------------------------------------------------
--[[
	params = {
		player, track, entries, grid (list of entry keys, pole first), laps,
		weekendWeather, weatherState (optional, the forecast session), rng,
		speedIndex, bonus = {setup, long},
		startTyres = { [1] = "Medium", [2] = "Hard" },
		send = function(eventName, payload),  -- to this player's client
		onEvent = function(eventName, value), -- objectives
	}
]]
function RaceSim.new(params)
	local self = setmetatable({}, RaceSim)
	self.player = params.player
	self.track = params.track
	self.path = TrackPath.get(params.track)
	self.laps = params.laps
	self.rng = params.rng
	self.send = params.send or function() end
	self.onEvent = params.onEvent or function() end
	self.bonus = params.bonus or { setup = 0, long = 0 }
	self.weekendWeather = params.weekendWeather
	self.weather = params.weatherState or Weather.newSession(params.weekendWeather, self.rng)
	self.maxWetness = self.weather.wetness
	self.wetLaps = 0
	self.speedIndex = params.speedIndex or 1
	self.timeScale = Config.Race.SimSpeeds[self.speedIndex]
	self.clock = 0
	self.started = false
	self.countdown = 5 -- real seconds of start lights
	self.chequered = false
	self.done = false
	self.leaderLaps = 0
	self.sc = { active = false, lapsLeft = 0 }
	self.fastest = { time = math.huge, key = nil }
	self.manualKey = nil
	self.cars = {}
	self.carsByKey = {}
	self.carsBySlot = {}
	self.snapshotTimer = 0
	self.checkTimer = 0
	self.radioCooldowns = {}

	local byKey = {}
	for _, e in ipairs(params.entries) do
		byKey[e.key] = e
	end
	local count = #params.grid
	for g, key in ipairs(params.grid) do
		local e = byKey[key]
		if e then
			local gridD, gridLat = TrackPath.gridSlot(self.path, g)
			local car = {
				key = key,
				entry = e,
				driver = e.driver,
				isPlayer = e.isPlayer,
				slot = e.slot,
				teamId = e.teamId,
				grid = g,
				position = g,
				gridD = gridD,
				gridLat = gridLat,
				lapsDone = 0,
				lapStart = -(count + 1 - g) * 0.001, -- tiny offsets keep the grid order on lap 1
				lapEnd = 0,
				segStart = 0,
				segFrom = 0,
				compound = "Medium",
				wear = 0,
				fuel = Config.Race.StartFuel,
				usedDry = {},
				wetUsed = false,
				pitThisLap = false,
				pitCompound = nil,
				pitRequest = nil,
				auto = true,
				pit = nil,
				stops = 0,
				crossings = {},
				lastLap = nil,
				bestLap = nil,
				finished = false,
				dnf = false,
				wearWarn = 0,
				lastPosAtCross = g,
				overtakes = 0,
				canTake = false,
				battleWarned = -100,
				manual = false,
				gapText = "",
				intText = "",
				gapAheadTime = nil,
				gapBehindTime = nil,
			}
			car.pitThreshold = self:newPitThreshold(car)
			local startTyre = e.isPlayer and params.startTyres and params.startTyres[e.slot]
			if not TyreModel.isValid(startTyre) then
				startTyre = self:aiStartTyre(car)
			end
			self:fitTyre(car, startTyre)
			table.insert(self.cars, car)
			self.carsByKey[key] = car
			if e.slot then
				self.carsBySlot[e.slot] = car
			end
		end
	end
	self:updatePositions()
	return self
end

function RaceSim:newPitThreshold(car)
	local planning = car.entry.strat.planning
	return 70 + (self.rng:NextNumber() - 0.5) * (100 - planning) * 0.5
end

function RaceSim:longBonus(car)
	return car.isPlayer and (self.bonus.long or 0) or 0.05
end

function RaceSim:setupBonus(car)
	return car.isPlayer and (self.bonus.setup or 0) or AI_SETUP_BONUS
end

function RaceSim:aiStartTyre(car)
	local w = self.weather.wetness
	local kind = TyreModel.idealKind(w)
	if kind == "inter" then
		return "Inter"
	elseif kind == "wet" then
		return "Wet"
	end
	local r = self.rng:NextNumber()
	if car.grid <= 10 then
		return r < 0.6 and "Medium" or (r < 0.85 and "Soft" or "Hard")
	end
	return r < 0.4 and "Hard" or (r < 0.8 and "Medium" or "Soft")
end

function RaceSim:fitTyre(car, compound)
	car.compound = compound
	car.wear = 0
	car.wearWarn = 0
	if TyreModel.kind(compound) == "slick" then
		car.usedDry[compound] = true
	else
		car.wetUsed = true
	end
end

---------------------------------------------------------------------
-- Radio helper with a cooldown so messages don't spam
---------------------------------------------------------------------
function RaceSim:radio(car, key, vars, cooldown)
	local id = (car and car.key or "all") .. key
	local last = self.radioCooldowns[id]
	if cooldown and last and self.clock - last < cooldown then
		return
	end
	self.radioCooldowns[id] = self.clock
	vars = vars or {}
	if car then
		vars.driver = vars.driver or car.driver.name
	end
	Radio.say(self.player, key, vars, self.rng, car and car.slot or nil)
end

---------------------------------------------------------------------
-- Lap times
---------------------------------------------------------------------
function RaceSim:idealLap(car)
	return RaceSim.paceLap(self.track, car.entry, {
		compound = car.compound,
		wear = car.wear,
		fuel = car.fuel,
		wetness = self.weather.wetness,
		bonus = self:setupBonus(car),
		progress = self.leaderLaps / self.laps,
	})
end

function RaceSim:lapTimeFor(car)
	return self:idealLap(car) + RaceSim.lapNoise(self.track, car.entry, self.rng)
end

function RaceSim:scLapTime(car)
	return self:idealLap(car) * 1.35
end

---------------------------------------------------------------------
-- Where a car is
---------------------------------------------------------------------
-- Fraction (0-1) of the current lap's time that has passed.
function RaceSim:lapFraction(car, t)
	if car.pit and t < car.pit.finish then
		local f = (t - car.pit.start) / math.max(0.01, car.pit.finish - car.pit.start)
		return math.clamp(f, 0, 1) * car.segFrom
	end
	local span = car.lapEnd - car.segStart
	if span <= 0 then
		return car.segFrom
	end
	return math.clamp(car.segFrom + (t - car.segStart) / span * (1 - car.segFrom), 0, 0.9999)
end

function RaceSim:manualDist(car)
	return car.manualCum - car.lapsDone * self.path.length
end

-- Bigger number = further ahead in the race.
function RaceSim:progressOf(car, t)
	if car.dnf then
		return -1000 + (car.dnfProgress or 0)
	end
	if car.finished then
		return car.lapsDone - car.finishTime * 1e-7
	end
	if car.manual then
		return car.lapsDone + math.clamp(TrackPath.fracAtDist(self.path, self:manualDist(car)), 0, 0.9999)
	end
	return car.lapsDone + self:lapFraction(car, t) - car.grid * 1e-6
end

-- Current distance (studs) round the lap.
function RaceSim:currentDist(car)
	if car.manual then
		return self:manualDist(car)
	end
	return TrackPath.distAtFrac(self.path, self:lapFraction(car, self.clock))
end

function RaceSim:updatePositions()
	local order = {}
	for _, car in ipairs(self.cars) do
		car.sortKey = self:progressOf(car, self.clock)
		table.insert(order, car)
	end
	table.sort(order, function(a, b)
		return a.sortKey > b.sortKey
	end)
	for i, car in ipairs(order) do
		car.position = i
	end
	self.order = order
end

-- Time gap between two cars at the last line both have crossed.
local function gapBetween(behind, ahead)
	local k = behind.lapsDone
	if k <= 0 then
		return nil
	end
	local tb = behind.crossings[k]
	local ta = ahead.crossings[k]
	if not tb or not ta then
		return nil
	end
	return tb - ta
end

function RaceSim:updateGaps()
	local order = self.order
	local leader = order[1]
	for i, car in ipairs(order) do
		car.gapAheadTime = nil
		car.gapBehindTime = nil
		if car.dnf then
			car.gapText = "OUT"
			car.intText = ""
		elseif i == 1 then
			car.gapText = "Leader"
			car.intText = ""
		else
			local lapsDown = math.floor(leader.sortKey - car.sortKey)
			if leader.finished then
				lapsDown = leader.lapsDone - car.lapsDone - (car.finished and 0 or 1)
				lapsDown = math.max(lapsDown, 0)
			end
			if lapsDown >= 1 then
				car.gapText = "+" .. lapsDown .. (lapsDown == 1 and " LAP" or " LAPS")
			else
				local g = gapBetween(car, leader)
				car.gapText = g and string.format("+%.1f", math.max(0, g)) or "-"
			end
			local ahead = order[i - 1]
			if ahead and not ahead.dnf then
				local g = gapBetween(car, ahead)
				car.intText = g and string.format("+%.1f", math.max(0, g)) or ""
				if g and ahead.lapsDone == car.lapsDone then
					car.gapAheadTime = g
					ahead.gapBehindTime = g
				end
			end
		end
	end
end

---------------------------------------------------------------------
-- Pit stops and strategy
---------------------------------------------------------------------
function RaceSim:chooseTyre(car, lapsLeft)
	return TyreModel.choose(self.weather.wetness, lapsLeft, self.track, car.driver.tyres, self:longBonus(car), car.usedDry, car.wetUsed)
end

local function countKeys(t)
	local n = 0
	for _ in pairs(t) do
		n += 1
	end
	return n
end

-- What the strategist would do now. Returns shouldPit, compound, reason.
function RaceSim:strategyCall(car, lapsLeft)
	local w = self.weather.wetness
	local strat = car.entry.strat
	local kind = TyreModel.kind(car.compound)
	local ideal = TyreModel.idealKind(w)
	if lapsLeft < 1 then
		return false
	end
	if kind ~= ideal then
		local severity = TyreModel.wrongTyreSeverity(car.compound, w)
		if severity > 1.2 and lapsLeft >= 2 then
			if self.rng:NextNumber() < 0.25 + strat.calls * 0.007 then
				return true, self:chooseTyre(car, lapsLeft), "The conditions have changed."
			end
			return false
		end
	end
	if lapsLeft <= 1 then
		return false
	end
	if self.sc.active and kind == ideal and car.wear > 30 and lapsLeft > 3 then
		if self.rng:NextNumber() < 0.35 + strat.calls * 0.005 then
			return true, self:chooseTyre(car, lapsLeft), "A cheap stop under the safety car."
		end
	end
	local rate = TyreModel.wearPerLap(car.compound, self.track, car.driver.tyres, w, self:longBonus(car))
	if car.wear + rate >= car.pitThreshold and car.wear + rate * lapsLeft > 88 then
		return true, self:chooseTyre(car, lapsLeft), "The tyres are worn out."
	end
	if kind == "slick" and not car.wetUsed and lapsLeft <= 2 and countKeys(car.usedDry) < 2 and self.maxWetness < 0.2 then
		return true, self:chooseTyre(car, lapsLeft), "We still have to use a second compound."
	end
	return false
end

-- Decide (at the line) whether to pit at the end of the coming lap.
function RaceSim:decidePit(car)
	if car.pitThisLap then
		return
	end
	local lapsLeft = self.laps - car.lapsDone
	if lapsLeft <= 0 then
		return
	end
	if car.pitRequest then
		car.pitThisLap = true
		car.pitCompound = car.pitRequest
		car.pitRequest = nil
		if car.isPlayer then
			self:radio(car, "boxCall", { compound = Config.Tyres[car.pitCompound].name })
		end
		return
	end
	local want, compound, reason = self:strategyCall(car, lapsLeft)
	if not want then
		return
	end
	if car.isPlayer and not car.auto then
		self:radio(car, "boxAdvice", { compound = Config.Tyres[compound].name, reason = reason }, 90)
		return
	end
	car.pitThisLap = true
	car.pitCompound = compound
	if car.isPlayer then
		self:radio(car, "boxCall", { compound = Config.Tyres[compound].name })
	end
end

-- Performs the stop at time t. Returns the extra seconds this adds to the out-lap.
function RaceSim:doPitStop(car, t)
	local crew = car.entry.crew
	local stop = 1.9 + (100 - crew.speed) * 0.022 + gauss(self.rng) * 0.1
	stop = math.max(1.75, stop)
	local problem = nil
	local errorChance = 0.01 + (100 - crew.reliability) * 0.0015
	if self.rng:NextNumber() < errorChance then
		stop += self.rng:NextNumber(1.5, 6)
		problem = PIT_PROBLEMS[self.rng:NextInteger(1, #PIT_PROBLEMS)]
	end
	stop = math.floor(stop * 100 + 0.5) / 100
	local laneTime = self.path.pitHalf / PIT_LANE_SPEED
	local stopAt = t + laneTime * 0.5
	car.pit = { start = t, stopAt = stopAt, stopEnd = stopAt + stop, finish = stopAt + stop + laneTime * 0.5, stop = stop }
	car.stops += 1
	local lapsLeft = self.laps - car.lapsDone
	local compound = car.pitCompound
	if not TyreModel.isValid(compound) then
		compound = self:chooseTyre(car, lapsLeft)
	end
	self:fitTyre(car, compound)
	car.pitThisLap = false
	car.pitCompound = nil
	car.pitThreshold = self:newPitThreshold(car)
	if car.isPlayer then
		local vars = { time = string.format("%.2f", stop), compound = Config.Tyres[compound].name, part = problem }
		if problem then
			self:radio(car, "pitSlow", vars)
		elseif stop < 2.6 then
			self:radio(car, "pitGood", vars)
		else
			self:radio(car, "pitOk", vars)
		end
		self.onEvent("pitStop", stop)
	end
	local loss = self.sc.active and self.track.pitLoss * 0.5 or self.track.pitLoss
	return loss + stop
end

---------------------------------------------------------------------
-- Incidents
---------------------------------------------------------------------
function RaceSim:applyIncidents(car, t, L)
	local d = car.driver
	local w = self.weather.wetness
	local scale = self.track.baseLap / 90
	local severity = TyreModel.wrongTyreSeverity(car.compound, w)
	if car.isPlayer and severity > 3 then
		self:radio(car, "wrongTyres", nil, 200)
	end
	-- Driver mistakes (more likely in the wet and on the wrong tyres).
	local p = (0.004 + (100 - d.consistency) * 0.00035) * (1 + w * 2.5)
	if severity > 3 then
		p *= 2.5
	end
	if car.lapsDone == 0 then
		p *= 1.8
	end
	if self.sc.active then
		p *= 0.3
	end
	if self.rng:NextNumber() < p then
		local crashChance = 0.07 + w * 0.12 + (severity > 3 and 0.15 or 0)
		if self.rng:NextNumber() < crashChance then
			car.dnfAt = t + L * self.rng:NextNumber(0.15, 0.9)
			car.dnfReason = w > 0.3 and "Crashed in the rain" or "Crashed"
			car.crashed = true
		else
			L += self.rng:NextNumber(0.8, 4.5) * scale
			if car.isPlayer then
				self:radio(car, "mistakeTeam", nil, 60)
			end
		end
	end
	-- Mechanical failures (better reliability = rarer).
	if not car.dnfAt then
		local reliability = car.entry.car.reliability
		if self.rng:NextNumber() < 0.0012 * (1.7 - reliability / 100) then
			car.dnfAt = t + L * self.rng:NextNumber(0.1, 0.9)
			car.dnfReason = DNF_REASONS[self.rng:NextInteger(1, #DNF_REASONS)]
			car.crashed = false
		end
	end
	-- Punctures on worn-out tyres.
	if not car.dnfAt and car.wear > 90 and self.rng:NextNumber() < (car.wear - 90) * 0.03 then
		L += 15 * scale
		if not car.pitThisLap then
			car.pitThisLap = true
			car.pitCompound = self:chooseTyre(car, self.laps - car.lapsDone)
		end
		if car.isPlayer then
			self:radio(car, "puncture")
		end
	end
	return L
end

function RaceSim:retire(car, t)
	car.dnf = true
	car.dnfTime = t
	car.dnfProgress = car.lapsDone + self:lapFraction(car, t)
	car.dnfAt = nil
	car.pitThisLap = false
	if car.isPlayer then
		self:radio(car, car.crashed and "crashTeam" or "mechanicalTeam")
		if self.manualKey == car.key then
			self:endTakeover("retired")
		end
	elseif car.crashed then
		self:radio(nil, "crashOther", { name = car.driver.name }, 20)
	else
		self:radio(nil, "retiredOther", { name = car.driver.name }, 20)
	end
	-- Safety car for crashes (and some breakdowns) when the race isn't almost over.
	local scChance = car.crashed and 0.7 or 0.2
	if not self.sc.active and self.leaderLaps < self.laps - 2 and self.rng:NextNumber() < scChance then
		self.sc.active = true
		self.sc.lapsLeft = self.rng:NextInteger(Config.Race.SafetyCarMinLaps, Config.Race.SafetyCarMaxLaps)
		local reason = car.crashed and (car.driver.name .. " has crashed.") or (car.driver.name .. " has stopped on track.")
		self:radio(nil, "scDeployed", { reason = reason })
	end
end

---------------------------------------------------------------------
-- Traffic and overtaking
---------------------------------------------------------------------
-- The car directly ahead on the road on the same lap, that crossed the line before "bound".
function RaceSim:aheadOf(car, bound)
	local best = nil
	for _, other in ipairs(self.cars) do
		if other ~= car and not other.dnf and not other.finished and other.lapsDone == car.lapsDone and other.lapStart < bound then
			if not best or other.lapStart > best.lapStart then
				best = other
			end
		end
	end
	return best
end

function RaceSim:overtakeChance(attacker, defender, paceAdvantage, closeAtLine)
	local w = self.weather.wetness
	local a, d = attacker.driver, defender.driver
	local c = 0.18 + paceAdvantage * 0.35
	c += (a.overtaking - (d.consistency + d.overtaking) / 2) * 0.006
	c -= self.track.overtakeDifficulty * 0.35
	c += (defender.wear - attacker.wear) * 0.003
	if w > 0.25 then
		c += (a.wet - d.wet) * 0.004
	elseif closeAtLine and attacker.lapsDone > 1 then
		c += 0.12 -- DRS
	end
	return math.clamp(c, 0.03, 0.92)
end

-- Adjusts lap time L for the car in front. Returns the new lap time.
function RaceSim:resolveTraffic(car, t, L, bound)
	bound = bound or t
	if self.sc.active then
		local ahead = self:aheadOf(car, bound)
		L = math.max(L, self:scLapTime(car))
		if ahead and not ahead.manual then
			L = math.max(L, ahead.lapEnd + 0.8 - t)
		end
		return L
	end
	local myEnd = t + L
	for _ = 1, 4 do
		local ahead = self:aheadOf(car, bound)
		if not ahead then
			break
		end
		bound = ahead.lapStart
		local inPits = ahead.pit and ahead.pit.finish > t
		if not ahead.manual and not inPits then
			if myEnd < ahead.lapEnd then
				-- Faster than the car ahead: try to pass it this lap.
				local theirLap = ahead.lapEnd - ahead.lapStart
				local close = (t - ahead.lapStart) < 1.0
				local chance = self:overtakeChance(car, ahead, theirLap - L, close)
				if self.rng:NextNumber() < chance then
					car.overtakes += 1
				else
					myEnd = ahead.lapEnd + 0.25 + self.rng:NextNumber() * 0.35
					break
				end
			elseif myEnd < ahead.lapEnd + 0.2 then
				-- Right on its gearbox but not quick enough to pass: dirty air holds it back.
				myEnd = ahead.lapEnd + 0.2 + self.rng:NextNumber() * 0.2
				break
			else
				break
			end
		end
	end
	return myEnd - t
end

---------------------------------------------------------------------
-- Crossing the line
---------------------------------------------------------------------
function RaceSim:recordLap(car, t)
	local lapTime = t - car.lapStart
	car.lapsDone += 1
	car.crossings[car.lapsDone] = t
	car.lastLap = lapTime
	car.pit = nil
	if not car.bestLap or lapTime < car.bestLap then
		car.bestLap = lapTime
	end
	if car.lapsDone > 1 and lapTime < self.fastest.time then
		self.fastest = { time = lapTime, key = car.key }
		if car.isPlayer and car.lapsDone >= 3 then
			self:radio(car, "fastestLap", { time = Config.formatLapTime(lapTime) }, 60)
		end
	end
	local w = self.weather.wetness
	car.wear = math.min(100, car.wear + TyreModel.wearPerLap(car.compound, self.track, car.driver.tyres, w, self:longBonus(car)))
	car.fuel = math.max(0, car.fuel - Config.Race.StartFuel / self.laps)
	if car.lapsDone > self.leaderLaps then
		self.leaderLaps = car.lapsDone
		self:onLeaderLap()
	end
end

function RaceSim:finishCar(car, t)
	self.chequered = true
	car.finished = true
	car.finishTime = t
	car.pitThisLap = false
	car.pitRequest = nil
	self:updatePositions()
	if car.isPlayer then
		local pos = car.position
		if pos == 1 then
			self:radio(car, "finishWin")
		elseif pos <= 3 then
			self:radio(car, "finishPodium", { pos = pos })
		elseif pos <= 10 then
			self:radio(car, "finishPoints", { pos = pos })
		else
			self:radio(car, "finishNoPoints", { pos = pos })
		end
	end
end

function RaceSim:playerCrossingRadio(car)
	if not car.isPlayer then
		return
	end
	self:updatePositions()
	local pitted = car.pit ~= nil
	if car.position < car.lastPosAtCross then
		self:radio(car, "gainedPlace", { pos = car.position }, 40)
	elseif car.position > car.lastPosAtCross and not pitted then
		self:radio(car, "lostPlace", { pos = car.position }, 40)
	end
	car.lastPosAtCross = car.position
	local compoundName = Config.Tyres[car.compound].name
	if car.wear >= 85 and car.wearWarn < 3 then
		car.wearWarn = 3
		self:radio(car, "tyre85", { wear = math.floor(car.wear) })
	elseif car.wear >= 70 and car.wearWarn < 2 then
		car.wearWarn = 2
		self:radio(car, "tyre70", { wear = math.floor(car.wear) })
	elseif car.wear >= 50 and car.wearWarn < 1 then
		car.wearWarn = 1
		self:radio(car, "tyre50", { wear = math.floor(car.wear), compound = compoundName })
	end
end

function RaceSim:crossLine(car, t)
	self:recordLap(car, t)
	if self.chequered or car.lapsDone >= self.laps then
		self:finishCar(car, t)
		return
	end
	local pitExtra = 0
	if car.pitThisLap then
		pitExtra = self:doPitStop(car, t)
	end
	self:decidePit(car)
	local L = self:lapTimeFor(car) + pitExtra
	L = self:applyIncidents(car, t, L)
	L = self:resolveTraffic(car, t, L)
	car.lapStart = t
	car.lapEnd = t + L
	if car.pit then
		car.segStart = car.pit.finish
		car.segFrom = TrackPath.fracAtDist(self.path, self.path.pitHalf)
	else
		car.segStart = t
		car.segFrom = 0
	end
	-- Radio after the new lap is set up, so positions are worked out correctly.
	self:playerCrossingRadio(car)
end

function RaceSim:onLeaderLap()
	local lap = self.leaderLaps
	if self.sc.active then
		self.sc.lapsLeft -= 1
		if self.sc.lapsLeft == 1 then
			self:radio(nil, "scEnding")
		elseif self.sc.lapsLeft <= 0 then
			self.sc.active = false
		end
	end
	if self.weather.wetness > 0.3 then
		self.wetLaps += 1
	end
	for slot = 1, 2 do
		local car = self.carsBySlot[slot]
		if car and not car.dnf and not car.finished then
			if lap == self.laps - 1 then
				self:radio(car, "lastLap")
			elseif lap > 0 and lap % 4 == 0 and car.gapAheadTime and car.position > 1 then
				local ahead = self.order[car.position - 1]
				if ahead then
					self:radio(car, "gapAhead", { name = ahead.driver.name, gap = string.format("%.1f", car.gapAheadTime) }, 60)
				end
			elseif lap > 0 and lap % 4 == 2 and car.gapBehindTime and car.position < #self.order then
				local behind = self.order[car.position + 1]
				if behind and not behind.dnf then
					self:radio(car, "gapBehind", { name = behind.driver.name, gap = string.format("%.1f", car.gapBehindTime) }, 60)
				end
			end
			if lap == self.laps - 5 and not car.auto and not car.wetUsed and countKeys(car.usedDry) < 2 and self.maxWetness < 0.2 then
				self:radio(car, "twoCompound")
			end
		end
	end
end

---------------------------------------------------------------------
-- Race start
---------------------------------------------------------------------
function RaceSim:startRace()
	self.started = true
	-- Process the grid from pole backwards so each car knows the car in front's first lap.
	for _, car in ipairs(self.cars) do
		local launch = gauss(self.rng) * (0.25 + (100 - car.driver.consistency) * 0.01)
		local L = self:lapTimeFor(car) + 1.2 + (car.grid - 1) * 0.2 + launch
		L = self:applyIncidents(car, 0, L)
		L = self:resolveTraffic(car, 0, L, car.lapStart)
		car.lapEnd = car.lapStart + L
		car.segStart = car.lapStart
		car.segFrom = 0
		self:decidePit(car)
	end
	for slot = 1, 2 do
		local car = self.carsBySlot[slot]
		if car then
			self:radio(car, "raceStart")
		end
	end
	self.send("Lights", {})
end

---------------------------------------------------------------------
-- Main update, called every frame by WeekendManager
---------------------------------------------------------------------
function RaceSim:step(dtReal)
	if self.done then
		return
	end
	if not self.started then
		self.countdown -= dtReal
		if self.countdown <= 0 then
			self:startRace()
		end
		self:pushSnapshot(dtReal)
		return
	end

	local dt = dtReal * self.timeScale
	self.clock += dt

	local changedFrom = Weather.step(self.weather, dt, self.rng)
	self.maxWetness = math.max(self.maxWetness, self.weather.wetness)
	if changedFrom then
		local now = self.weather.type
		local wasRain = changedFrom == "LightRain" or changedFrom == "HeavyRain"
		if now == "HeavyRain" then
			self:radio(nil, "rainHeavy")
		elseif now == "LightRain" and changedFrom == "HeavyRain" then
			self:radio(nil, "rainEasing")
		elseif now == "LightRain" then
			self:radio(nil, "rainStart")
		elseif wasRain then
			self:radio(nil, "rainStopped")
		end
	end

	-- Process line crossings and retirements in time order.
	for _ = 1, 500 do
		local nextCar, nextTime, nextKind = nil, math.huge, nil
		for _, car in ipairs(self.cars) do
			if not car.dnf and not car.finished then
				if car.dnfAt and car.dnfAt <= self.clock and car.dnfAt < nextTime then
					nextCar, nextTime, nextKind = car, car.dnfAt, "dnf"
				end
				if not car.manual and car.lapEnd <= self.clock and car.lapEnd < nextTime then
					nextCar, nextTime, nextKind = car, car.lapEnd, "lap"
				end
			end
		end
		if not nextCar then
			break
		end
		if nextKind == "dnf" then
			self:retire(nextCar, nextTime)
		else
			self:crossLine(nextCar, nextTime)
		end
	end

	-- Driven car: hand back if the client stopped reporting.
	if self.manualKey then
		local car = self.carsByKey[self.manualKey]
		if car and os.clock() - (car.manualLastReport or 0) > 6 then
			self:endTakeover("timeout")
		end
	end

	self:updatePositions()
	self.checkTimer += dtReal
	if self.checkTimer >= 0.5 then
		self.checkTimer = 0
		self:updateGaps()
		self:checkTakeover()
	end

	-- Race over when every car has finished or retired.
	local running = 0
	for _, car in ipairs(self.cars) do
		if not car.dnf and not car.finished then
			running += 1
		end
	end
	if running == 0 then
		self.done = true
		self:updateGaps()
	end
	self:pushSnapshot(dtReal)
end

---------------------------------------------------------------------
-- Take the wheel
---------------------------------------------------------------------
function RaceSim:checkTakeover()
	local lapsLeftLeader = self.laps - self.leaderLaps
	for slot = 1, 2 do
		local car = self.carsBySlot[slot]
		if car then
			local can = false
			local inPits = car.pit and self.clock < car.pit.finish
			if self.started and not car.dnf and not car.finished and not inPits and not self.manualKey and car.lapsDone >= 1 and not self.chequered then
				if lapsLeftLeader <= Config.Race.TakeoverAnyTimeLapsLeft then
					can = true
				elseif self.leaderLaps / self.laps >= Config.Race.TakeoverMinProgress then
					local gap = Config.Race.TakeoverBattleGap
					if (car.gapAheadTime and car.gapAheadTime < gap) or (car.gapBehindTime and car.gapBehindTime < gap) then
						can = true
						if self.clock - car.battleWarned > 400 then
							car.battleWarned = self.clock
							local other
							if car.gapAheadTime and car.gapAheadTime < gap then
								other = self.order[car.position - 1]
							else
								other = self.order[car.position + 1]
							end
							self:radio(car, "battle", { name = other and other.driver.name or "a rival" })
						end
					end
				end
			end
			if car.manual then
				can = false
			end
			car.canTake = can
		end
	end
end

function RaceSim:startTakeover(slot)
	local car = self.carsBySlot[slot]
	if not car then
		return false, "No car in that slot."
	end
	self:updateGaps()
	self:checkTakeover()
	if not car.canTake then
		return false, "You can only take the wheel in a close battle late in the race, or in the last few laps."
	end
	local d = self:currentDist(car)
	local w = self.weather.wetness
	local grip = TyreModel.driveGrip(car.compound, w) * (1 - car.wear / 100 * 0.25)
	local speedMul = 1 - w * 0.1
	grip = math.floor(grip * 100 + 0.5) / 100
	speedMul = math.floor(speedMul * 100 + 0.5) / 100
	local profile = TrackPath.profileTime(self.path, grip, speedMul)
	local k = self:idealLap(car) / (profile * Config.Drive.HumanFactor)
	car.manual = true
	car.dnfAt = nil -- while you drive, only your own driving can end the race
	car.manualCum = car.lapsDone * self.path.length + d
	car.manualLastReport = os.clock()
	car.manualSpeedMul = speedMul
	car.canTake = false
	self.manualKey = car.key
	self.timeScale = k
	self.onEvent("takeover", 1)
	self:radio(car, "takeoverStart")
	return true, "You have control!", {
		key = car.key,
		slot = slot,
		startDist = d,
		lapsDone = car.lapsDone,
		laps = self.laps,
		gripMul = grip,
		speedMul = speedMul,
		timeScale = k,
		compound = car.compound,
		driver = car.driver.name,
	}
end

-- Called when the client reports how far the driven car has gone.
function RaceSim:driveUpdate(cum)
	local car = self.manualKey and self.carsByKey[self.manualKey]
	if not car or type(cum) ~= "number" or cum ~= cum then
		return
	end
	local now = os.clock()
	local dtReal = math.max(0.05, now - (car.manualLastReport or now))
	car.manualLastReport = now
	local maxAdvance = Config.Drive.TopSpeed * (car.manualSpeedMul or 1) * Config.Drive.MaxCheatFactor * dtReal + 20
	car.manualCum = math.clamp(cum, car.manualCum - 300, car.manualCum + maxAdvance)
	local guard = 0
	while car.manual and car.manualCum >= (car.lapsDone + 1) * self.path.length and guard < 3 do
		guard += 1
		self:manualCross(car, self.clock)
	end
end

function RaceSim:manualCross(car, t)
	self:recordLap(car, t)
	if self.chequered or car.lapsDone >= self.laps then
		self:finishCar(car, t)
		self:endTakeover("finished")
		return
	end
	if car.pitThisLap or car.pitRequest then
		if not car.pitThisLap then
			car.pitCompound = car.pitRequest
			car.pitRequest = nil
		end
		car.manual = false
		self.manualKey = nil
		self.timeScale = Config.Race.SimSpeeds[self.speedIndex]
		local pitExtra = self:doPitStop(car, t)
		local L = self:lapTimeFor(car) + pitExtra
		car.lapStart = t
		car.lapEnd = t + L
		car.segStart = car.pit.finish
		car.segFrom = TrackPath.fracAtDist(self.path, self.path.pitHalf)
		self:radio(car, "takeoverEnd")
		self.send("TakeoverEnd", { key = car.key, reason = "pit" })
		self:playerCrossingRadio(car)
		return
	end
	car.lapStart = t
	car.lapEnd = t + self:lapTimeFor(car)
	car.segStart = t
	car.segFrom = 0
	self:playerCrossingRadio(car)
end

function RaceSim:endTakeover(reason)
	local car = self.manualKey and self.carsByKey[self.manualKey]
	self.manualKey = nil
	self.timeScale = Config.Race.SimSpeeds[self.speedIndex]
	if not car then
		return
	end
	if car.manual and not car.finished and not car.dnf then
		local d = math.clamp(self:manualDist(car), 0, self.path.length - 0.01)
		local f = TrackPath.fracAtDist(self.path, d)
		local L = self:lapTimeFor(car)
		car.segStart = self.clock
		car.segFrom = f
		car.lapEnd = self.clock + math.max(1, (1 - f) * L)
		car.pit = nil
	end
	car.manual = false
	if reason ~= "finished" and reason ~= "retired" then
		self:radio(car, "takeoverEnd")
	end
	self.send("TakeoverEnd", { key = car.key, reason = reason })
end

---------------------------------------------------------------------
-- Player commands
---------------------------------------------------------------------
function RaceSim:command(cmd, data)
	data = type(data) == "table" and data or {}
	local slot = tonumber(data.slot)
	local car = slot and self.carsBySlot[slot]
	if cmd == "Pit" then
		if not car or car.dnf or car.finished then
			return
		end
		local compound = data.compound
		if not TyreModel.isValid(compound) then
			return
		end
		local d = self:currentDist(car)
		local tooLate = self.started and car.lapsDone >= 0 and d > self.path.length - self.path.pitHalf - 30
		if car.pitThisLap and not tooLate then
			car.pitCompound = compound
		elseif tooLate or car.pitThisLap then
			car.pitRequest = compound
		else
			car.pitThisLap = true
			car.pitCompound = compound
		end
		self:radio(car, "boxCall", { compound = Config.Tyres[compound].name })
	elseif cmd == "CancelPit" then
		if not car then
			return
		end
		car.pitRequest = nil
		local d = self:currentDist(car)
		if car.pitThisLap and d < self.path.length - self.path.pitHalf - 30 then
			car.pitThisLap = false
			car.pitCompound = nil
		end
	elseif cmd == "Auto" then
		if car then
			car.auto = data.on == true
		end
	elseif cmd == "Speed" then
		local index = tonumber(data.index)
		if index and Config.Race.SimSpeeds[index] then
			self.speedIndex = index
			if not self.manualKey then
				self.timeScale = Config.Race.SimSpeeds[index]
			end
		end
	elseif cmd == "TakeWheel" then
		if self.manualKey or not slot then
			return
		end
		local ok, msg, payload = self:startTakeover(slot)
		if ok then
			self.send("TakeoverStart", payload)
		else
			self.send("Notice", { text = msg })
		end
	elseif cmd == "HandBack" then
		if self.manualKey then
			self:endTakeover("handback")
		end
	elseif cmd == "DriveUpdate" then
		self:driveUpdate(tonumber(data.cum))
	end
end

---------------------------------------------------------------------
-- Data for the client
---------------------------------------------------------------------
function RaceSim:startInfo()
	local cars = {}
	for _, car in ipairs(self.cars) do
		table.insert(cars, {
			k = car.key,
			name = car.driver.name,
			code = car.driver.code,
			teamId = car.teamId,
			teamName = car.entry.teamName,
			color = car.entry.color,
			isPlayer = car.isPlayer,
			slot = car.slot,
			grid = car.grid,
			gridD = car.gridD,
			gridLat = car.gridLat,
		})
	end
	return {
		trackId = self.track.id,
		trackName = self.track.name,
		laps = self.laps,
		cars = cars,
		speedIndex = self.speedIndex,
	}
end

function RaceSim:snapshot()
	local cars = {}
	for _, car in ipairs(self.cars) do
		table.insert(cars, {
			k = car.key,
			p = car.position,
			ld = car.lapsDone,
			ls = car.lapStart,
			le = car.lapEnd,
			ss = car.segStart,
			sf = car.segFrom,
			pt = car.pitThisLap,
			pc = car.pitCompound,
			req = car.pitRequest,
			pit = car.pit and { car.pit.start, car.pit.stopAt, car.pit.stopEnd, car.pit.finish } or nil,
			cp = car.compound,
			w = math.floor(car.wear + 0.5),
			gap = car.gapText,
			int = car.intText,
			last = car.lastLap,
			best = car.bestLap,
			dnf = car.dnf,
			fin = car.finished,
			ft = car.finishTime,
			auto = car.auto,
			can = car.canTake,
			st = car.stops,
			man = car.manual,
			md = car.manual and self:manualDist(car) or nil,
		})
	end
	return {
		clock = self.clock,
		timeScale = self.started and self.timeScale or 0,
		started = self.started,
		countdown = math.max(0, self.countdown),
		lap = math.min(self.laps, self.leaderLaps + 1),
		laps = self.laps,
		chequered = self.chequered,
		sc = self.sc.active,
		weather = Weather.public(self.weather),
		fastest = self.fastest.key and { key = self.fastest.key, time = self.fastest.time } or nil,
		manualKey = self.manualKey,
		speedIndex = self.speedIndex,
		cars = cars,
	}
end

function RaceSim:pushSnapshot(dtReal)
	self.snapshotTimer += dtReal
	if self.snapshotTimer >= Config.Race.SnapshotInterval or self.done then
		self.snapshotTimer = 0
		self.send("Snapshot", self:snapshot())
	end
end

---------------------------------------------------------------------
-- Final classification
---------------------------------------------------------------------
function RaceSim:results()
	-- Dry race rule: two different dry compounds, unless wet tyres were used.
	for _, car in ipairs(self.cars) do
		if car.finished and not car.penaltyApplied and self.maxWetness < 0.2 and not car.wetUsed and countKeys(car.usedDry) < 2 then
			car.penaltyApplied = true
			car.penalty = 10
			car.finishTime += 10
		end
	end
	local list = table.clone(self.cars)
	table.sort(list, function(a, b)
		if a.dnf ~= b.dnf then
			return not a.dnf
		end
		if a.dnf then
			return (a.dnfProgress or 0) > (b.dnfProgress or 0)
		end
		if a.lapsDone ~= b.lapsDone then
			return a.lapsDone > b.lapsDone
		end
		return (a.finishTime or math.huge) < (b.finishTime or math.huge)
	end)
	local out = {}
	local winner = list[1]
	for pos, car in ipairs(list) do
		local status
		if car.dnf then
			status = "DNF: " .. (car.dnfReason or "Retired")
		elseif pos == 1 then
			status = Config.formatLapTime(car.finishTime)
		elseif car.lapsDone < winner.lapsDone then
			local down = winner.lapsDone - car.lapsDone
			status = "+" .. down .. (down == 1 and " Lap" or " Laps")
		else
			status = string.format("+%.3f", car.finishTime - winner.finishTime)
		end
		if car.penalty then
			status ..= " (10s penalty)"
		end
		table.insert(out, {
			pos = pos,
			key = car.key,
			driverId = car.driver.id,
			name = car.driver.name,
			code = car.driver.code,
			teamId = car.teamId,
			teamName = car.entry.teamName,
			color = car.entry.color,
			isPlayer = car.isPlayer,
			slot = car.slot,
			grid = car.grid,
			laps = car.lapsDone,
			status = status,
			dnf = car.dnf,
			crashed = car.crashed == true,
			points = (not car.dnf and Config.Points[pos]) or 0,
			best = car.bestLap,
			stops = car.stops,
			fastestLap = self.fastest.key == car.key,
		})
	end
	return out
end

return RaceSim
