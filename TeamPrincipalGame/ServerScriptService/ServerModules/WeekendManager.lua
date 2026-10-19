--[[
	WeekendManager (ModuleScript)
	Location: ServerScriptService > ServerModules > WeekendManager

	Runs each race weekend in order:
	  FP1 -> FP2 -> FP3 -> Q1 -> Q2 -> Q3 -> Race -> results
	and the season around it (18 rounds, then championships and a new season).
	Practice and qualifying are simulated straight away. The race runs live
	through RaceSim. After the race it pays prize and sponsor money, updates
	standings, objectives and records, and asks for a save.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("Config"))
local Tracks = require(Shared:WaitForChild("Tracks"))
local TrackPath = require(Shared:WaitForChild("TrackPath"))

local Modules = script.Parent
local TeamManager = require(Modules:WaitForChild("TeamManager"))
local Weather = require(Modules:WaitForChild("Weather"))
local TyreModel = require(Modules:WaitForChild("TyreModel"))
local RaceSim = require(Modules:WaitForChild("RaceSim"))
local Radio = require(Modules:WaitForChild("Radio"))
local Objectives = require(Modules:WaitForChild("Objectives"))
local Records = require(Modules:WaitForChild("Records"))

local WeekendManager = {}

local STAGE_FP1, STAGE_Q1, STAGE_Q3, STAGE_RACE, STAGE_POST = 1, 4, 6, 7, 8
local QUALI_DURATION = { 1080, 900, 720 }

local raceEventRemote = nil

function WeekendManager.init()
	local remotes = ReplicatedStorage:WaitForChild("Remotes")
	raceEventRemote = remotes:WaitForChild("RaceEvent")
end

local function sendRace(session, name, payload)
	if raceEventRemote and session.player.Parent then
		raceEventRemote:FireClient(session.player, name, payload)
	end
end

local function notify(session, kind, payload)
	if session.notify then
		session.notify(kind, payload)
	end
end

-- Objective events, with a pop-up for anything completed.
local function objectiveEvent(session, name, value)
	local done = Objectives.event(session.profile, name, value)
	for _, text in ipairs(done) do
		notify(session, "Objective", { text = text })
	end
	if #done > 0 then
		session.dirty = true
	end
end

local function round2(v)
	return math.floor(v * 100 + 0.5) / 100
end

---------------------------------------------------------------------
-- Weekend setup
---------------------------------------------------------------------
function WeekendManager.lapsFor(track)
	local laps = math.floor(track.realLaps * Config.Race.DistanceFactor + 0.5)
	return math.clamp(laps, Config.Race.MinLaps, Config.Race.MaxLaps)
end

local function newUpcoming(session)
	local w = session.weekend
	w.upcoming = Weather.newSession(w.weather, session.rng)
	local strat = TeamManager.strategyRating(session.profile)
	w.forecastText = Weather.forecast(w.upcoming, strat.calls, session.rng)
end

function WeekendManager.ensureWeekend(session)
	local profile = session.profile
	local w = session.weekend
	if w and w.round == profile.round and w.season == profile.season then
		return w
	end
	local track = Tracks.forRound(profile.round)
	w = {
		season = profile.season,
		round = profile.round,
		track = track,
		laps = WeekendManager.lapsFor(track),
		stage = STAGE_FP1,
		weather = Weather.newWeekend(track, session.rng),
		bonus = { setup = 0, long = 0, quali = 0 },
		practice = {},
		quali = {},
		remaining = nil,
		gridRows = nil,
		grid = nil,
		pendingDrive = nil,
		raceSummary = nil,
	}
	session.weekend = w
	newUpcoming(session)
	TrackPath.get(track) -- build the path now so the race starts instantly
	return w
end

local function entryMap(entries)
	local map = {}
	for _, e in ipairs(entries) do
		map[e.key] = e
	end
	return map
end

local function rowFor(entry, time, extra)
	local row = {
		key = entry.key,
		name = entry.driver.name,
		code = entry.driver.code,
		teamName = entry.teamName,
		color = entry.color,
		isPlayer = entry.isPlayer,
		slot = entry.slot,
		time = time,
	}
	if extra then
		for k, v in pairs(extra) do
			row[k] = v
		end
	end
	return row
end

local function sortRows(rows)
	table.sort(rows, function(a, b)
		return (a.time or math.huge) < (b.time or math.huge)
	end)
	for i, row in ipairs(rows) do
		row.pos = i
	end
end

local function playerEntries(entries)
	local list = {}
	for _, e in ipairs(entries) do
		if e.isPlayer then
			table.insert(list, e)
		end
	end
	return list
end

---------------------------------------------------------------------
-- Practice
---------------------------------------------------------------------
local function runPractice(session, program)
	local w = session.weekend
	local profile = session.profile
	local rng = session.rng
	local track = w.track
	local entries = TeamManager.buildEntries(profile)
	local state = w.upcoming
	local best = {}
	local duration = Config.Race.PracticeSessionSeconds
	local wetSum, steps = 0, 0
	for t = 0, duration, 60 do
		Weather.step(state, 60, rng)
		wetSum += state.wetness
		steps += 1
		local kind = TyreModel.idealKind(state.wetness)
		local compound = kind == "slick" and (program == "long" and "Medium" or "Soft") or (kind == "inter" and "Inter" or "Wet")
		for _, e in ipairs(entries) do
			if rng:NextNumber() < 0.3 then
				local bonus = e.isPlayer and w.bonus.setup or 0.1
				local lap = RaceSim.paceLap(track, e, {
					compound = compound,
					wear = rng:NextNumber(2, 30),
					fuel = rng:NextNumber(10, 60),
					wetness = state.wetness,
					bonus = bonus,
					progress = t / duration * 0.5,
				}) + RaceSim.lapNoise(track, e, rng)
				if not best[e.key] or lap < best[e.key] then
					best[e.key] = lap
				end
			end
		end
	end
	local rows = {}
	for _, e in ipairs(entries) do
		table.insert(rows, rowFor(e, best[e.key]))
	end
	sortRows(rows)

	-- What the team learned (less in the wet).
	local avgWet = wetSum / math.max(1, steps)
	local learn = 1 - math.min(0.6, avgWet * 0.8)
	local players = playerEntries(entries)
	local speaker = players[1]
	local vars = { driver = speaker and speaker.driver.name or "Driver", compound = "Medium" }
	if program == "setup" then
		w.bonus.setup = math.min(0.5, w.bonus.setup + 0.12 * learn)
		Radio.say(session.player, "practiceSetup", vars, rng, 1)
	elseif program == "long" then
		w.bonus.long = math.min(0.15, w.bonus.long + 0.045 * learn)
		Radio.say(session.player, "practiceLong", vars, rng, 1)
	else
		w.bonus.quali = math.min(0.5, w.bonus.quali + 0.15 * learn)
		Radio.say(session.player, "practiceQuali", vars, rng, 1)
	end
	if avgWet > 0.3 then
		Radio.say(session.player, "practiceWet", vars, rng)
	end
	local reserve = profile.drivers.reserve
	if reserve then
		w.bonus.setup = math.min(0.5, w.bonus.setup + Config.driverOverall(reserve) / 100 * 0.03)
		Radio.say(session.player, "reserveSim", { name = reserve.name }, rng)
	end

	local sessionName = Config.SessionOrder[w.stage]
	table.insert(w.practice, {
		name = sessionName,
		program = program,
		weather = Weather.public(state),
		rows = rows,
	})
	Weather.endSession(w.weather, state)
	w.stage += 1
	newUpcoming(session)
	objectiveEvent(session, "practice", 1)
	return true, sessionName .. " complete."
end

---------------------------------------------------------------------
-- Qualifying
---------------------------------------------------------------------
local function qualiCompound(wetness)
	local kind = TyreModel.idealKind(wetness)
	if kind == "inter" then
		return "Inter"
	elseif kind == "wet" then
		return "Wet"
	end
	return "Soft"
end

local function qualiIdeal(w, entry, wetness, stageIndex)
	local bonus = entry.isPlayer and (w.bonus.setup + w.bonus.quali) or 0.25
	local scale = w.track.baseLap / 90
	return RaceSim.paceLap(w.track, entry, {
		compound = qualiCompound(wetness),
		wear = 2,
		fuel = 5,
		wetness = wetness,
		bonus = bonus,
		progress = 0.6 + stageIndex * 0.15,
	}) - 0.3 * scale
end

local function qualiLap(w, entry, wetness, stageIndex, rng)
	local t = qualiIdeal(w, entry, wetness, stageIndex) + RaceSim.lapNoise(w.track, entry, rng) * 0.8
	local p = (0.025 + (100 - entry.driver.consistency) * 0.0008) * (1 + wetness * 2)
	if rng:NextNumber() < p then
		t += rng:NextNumber(0.6, 3)
	end
	return t
end

local function simulateStage(session, stageIndex, entries)
	local w = session.weekend
	local rng = session.rng
	local map = entryMap(entries)
	local state = w.qualiWeather
	local runs = {}
	for _, key in ipairs(w.remaining) do
		for _ = 1, 2 do
			table.insert(runs, { key = key, at = rng:NextNumber(0.05, 1) * QUALI_DURATION[stageIndex] })
		end
	end
	table.sort(runs, function(a, b)
		return a.at < b.at
	end)
	local elapsed = 0
	local best = {}
	for _, run in ipairs(runs) do
		local gap = run.at - elapsed
		while gap > 0 do
			local step = math.min(30, gap)
			Weather.step(state, step, rng)
			gap -= step
		end
		elapsed = run.at
		local e = map[run.key]
		if e then
			local lap = qualiLap(w, e, state.wetness, stageIndex, rng)
			if not best[run.key] or lap < best[run.key] then
				best[run.key] = lap
			end
		end
	end
	local rows = {}
	for _, key in ipairs(w.remaining) do
		local e = map[key]
		if e then
			table.insert(rows, rowFor(e, best[key]))
		end
	end
	sortRows(rows)
	return rows
end

local STAGE_NAMES = { "Q1", "Q2", "Q3" }

-- After Q1 or Q2: knock out the slowest cars.
local function finishKnockout(session, stageIndex, rows)
	local w = session.weekend
	local cutoff = Config.Race.QualiCutoffs[stageIndex]
	w.quali[STAGE_NAMES[stageIndex]] = rows
	w.remaining = {}
	w.eliminated = w.eliminated or {}
	for i, row in ipairs(rows) do
		if i <= cutoff then
			table.insert(w.remaining, row.key)
		else
			w.eliminated[row.key] = { pos = i, time = row.time, stage = STAGE_NAMES[stageIndex] }
		end
		if row.isPlayer then
			local vars = { driver = row.name, pos = i, stage = STAGE_NAMES[stageIndex], next = STAGE_NAMES[stageIndex + 1] }
			if i <= cutoff then
				Radio.say(session.player, "qualiThrough", vars, session.rng, row.slot)
				if stageIndex == 2 then
					objectiveEvent(session, "q3", 1)
				end
			else
				Radio.say(session.player, "qualiOut", vars, session.rng, row.slot)
			end
		end
	end
	w.stage += 1
end

-- After Q3: set the grid.
local function finishQ3(session, rows)
	local w = session.weekend
	local profile = session.profile
	sortRows(rows)
	w.quali.Q3 = rows
	local gridRows = {}
	for _, row in ipairs(rows) do
		table.insert(gridRows, row)
	end
	for _, stageName in ipairs({ "Q2", "Q1" }) do
		local stageRows = w.quali[stageName] or {}
		for _, row in ipairs(stageRows) do
			local elim = w.eliminated and w.eliminated[row.key]
			if elim and elim.stage == stageName then
				table.insert(gridRows, row)
			end
		end
	end
	w.grid = {}
	for i, row in ipairs(gridRows) do
		row.gridPos = i
		table.insert(w.grid, row.key)
	end
	w.gridRows = gridRows
	for i, row in ipairs(rows) do
		if row.isPlayer then
			if i == 1 then
				Radio.say(session.player, "pole", { driver = row.name }, session.rng, row.slot)
				local d = nil
				for _, e in ipairs(TeamManager.buildEntries(profile)) do
					if e.key == row.key then
						d = e.driver
					end
				end
				if d then
					Records.onPole(profile, d)
				end
				objectiveEvent(session, "pole", 1)
			else
				Radio.say(session.player, "qualiDone", { driver = row.name, pos = i }, session.rng, row.slot)
			end
		end
	end
	Weather.endSession(w.weather, w.qualiWeather)
	w.qualiWeather = nil
	w.pendingDrive = nil
	w.stage = STAGE_RACE
	newUpcoming(session)
	for _, broken in ipairs(Records.check(profile)) do
		notify(session, "Record", broken)
	end
	session.dirty = true
end

local function runQualifying(session, args)
	local w = session.weekend
	local profile = session.profile
	local entries = TeamManager.buildEntries(profile)
	if w.stage == STAGE_Q1 then
		w.remaining = {}
		w.eliminated = {}
		for _, e in ipairs(entries) do
			table.insert(w.remaining, e.key)
		end
		w.qualiWeather = w.upcoming
	end
	local stageIndex = w.stage - STAGE_Q1 + 1
	local rows = simulateStage(session, stageIndex, entries)
	if stageIndex < 3 then
		finishKnockout(session, stageIndex, rows)
		return true, STAGE_NAMES[stageIndex] .. " complete."
	end
	-- Q3: optionally the player drives the lap.
	if args.mode == "drive" then
		local slot = tonumber(args.slot)
		local row = nil
		for _, r in ipairs(rows) do
			if r.isPlayer and r.slot == slot then
				row = r
			end
		end
		if row then
			local entry = entryMap(entries)[row.key]
			local wetness = w.qualiWeather.wetness
			local compound = qualiCompound(wetness)
			local grip = round2(TyreModel.driveGrip(compound, wetness))
			local speedMul = round2(1 - wetness * 0.1)
			local path = TrackPath.get(w.track)
			local profileTime = TrackPath.profileTime(path, grip, speedMul) * Config.Drive.HumanFactor
			local ideal = qualiIdeal(w, entry, wetness, 3)
			w.pendingDrive = {
				rows = rows,
				key = row.key,
				slot = slot,
				k = ideal / profileTime,
				ideal = ideal,
				banker = row.time,
				started = os.clock(),
				profileTime = profileTime,
			}
			return true, "Drive your Q3 lap!", {
				drive = {
					trackId = w.track.id,
					timeScale = ideal / profileTime,
					gripMul = grip,
					speedMul = speedMul,
					compound = compound,
					driver = row.name,
					banker = row.time,
					pole = rows[1].time,
					slot = slot,
					key = row.key,
				},
			}
		end
	end
	finishQ3(session, rows)
	return true, "Qualifying complete."
end

local function q3DriveResult(session, args)
	local w = session.weekend
	local p = w.pendingDrive
	if not p then
		return false, "No Q3 lap is waiting."
	end
	local driven = tonumber(args.time)
	local cuts = tonumber(args.cuts) or 99
	local elapsed = os.clock() - p.started
	local valid = driven ~= nil and driven == driven and args.aborted ~= true and cuts < 3
	if valid and (driven < p.profileTime * 0.8 or driven > elapsed + 2) then
		valid = false -- impossible lap time
	end
	local message
	local row = nil
	for _, r in ipairs(p.rows) do
		if r.key == p.key then
			row = r
		end
	end
	if valid and row then
		local simTime = math.max(driven * p.k, p.ideal * Config.Drive.QualiMaxGainRatio)
		if not row.time or simTime < row.time then
			row.time = simTime
			message = "Your lap: " .. Config.formatLapTime(simTime) .. "!"
		else
			message = "Your lap (" .. Config.formatLapTime(simTime) .. ") was slower than the banker lap."
		end
		row.driven = true
	else
		message = cuts >= 3 and "Lap deleted for track limits. The banker lap counts." or "Lap not completed. The banker lap counts."
	end
	finishQ3(session, p.rows)
	if row and row.pos <= 3 and valid then
		objectiveEvent(session, "driveQ3Top3", 1)
	end
	return true, message
end

---------------------------------------------------------------------
-- Race
---------------------------------------------------------------------
local function startRace(session, args)
	local w = session.weekend
	local profile = session.profile
	local entries = TeamManager.buildEntries(profile)
	local tyres = {}
	if type(args.tyres) == "table" then
		for slot = 1, 2 do
			if TyreModel.isValid(args.tyres[slot]) then
				tyres[slot] = args.tyres[slot]
			end
		end
	end
	local race = RaceSim.new({
		player = session.player,
		track = w.track,
		entries = entries,
		grid = w.grid,
		laps = w.laps,
		weekendWeather = w.weather,
		weatherState = w.upcoming,
		rng = session.rng,
		speedIndex = session.speedIndex or 1,
		bonus = { setup = w.bonus.setup, long = w.bonus.long },
		startTyres = tyres,
		send = function(name, payload)
			sendRace(session, name, payload)
		end,
		onEvent = function(name, value)
			objectiveEvent(session, name, value)
			if name == "pitStop" then
				Records.onPitStop(profile, value)
			end
		end,
	})
	session.race = race
	sendRace(session, "Start", race:startInfo())
	return true, "Lights out soon!"
end

local function finishRace(session)
	local race = session.race
	local w = session.weekend
	local profile = session.profile
	local rng = session.rng
	local results = race:results()
	Weather.endSession(w.weather, race.weather)

	-- Championship standings.
	for _, r in ipairs(results) do
		local ds = profile.standings.drivers[r.driverId]
		if not ds then
			ds = { name = r.name, code = r.code, teamId = r.teamId, teamName = r.teamName, points = 0, wins = 0, podiums = 0 }
			profile.standings.drivers[r.driverId] = ds
		end
		ds.teamId = r.teamId
		ds.teamName = r.teamName
		ds.points += r.points
		if r.pos == 1 then
			ds.wins += 1
		end
		if r.pos <= 3 and not r.dnf then
			ds.podiums += 1
		end
		local ts = profile.standings.teams[r.teamId]
		if not ts then
			ts = { name = r.teamName, points = 0, wins = 0 }
			profile.standings.teams[r.teamId] = ts
		end
		ts.name = r.teamName
		ts.points += r.points
		if r.pos == 1 then
			ts.wins += 1
		end
	end

	-- Money.
	local teamRows = {}
	for _, r in ipairs(results) do
		if r.isPlayer then
			table.insert(teamRows, r)
		end
	end
	local income = {}
	local points, podiums, wins = 0, 0, 0
	local prize = 0
	for _, r in ipairs(teamRows) do
		points += r.points
		if not r.dnf and r.pos <= 3 then
			podiums += 1
		end
		if not r.dnf and r.pos == 1 then
			wins += 1
		end
		prize += (not r.dnf and Config.PrizeMoney[r.pos]) or Config.PrizeOutsidePoints
	end
	table.insert(income, { label = "Sponsors (base)", amount = Config.SponsorBasePerRace })
	if points > 0 then
		table.insert(income, { label = "Sponsors (points bonus)", amount = points * Config.SponsorPerPoint })
	end
	if podiums > 0 then
		table.insert(income, { label = "Sponsors (podium bonus)", amount = podiums * Config.SponsorPodiumBonus })
	end
	if wins > 0 then
		table.insert(income, { label = "Sponsors (win bonus)", amount = wins * Config.SponsorWinBonus })
	end
	table.insert(income, { label = "Prize money", amount = prize })
	local salaries = TeamManager.salaryTotal(profile)
	table.insert(income, { label = "Salaries", amount = -salaries })
	local net = 0
	for _, line in ipairs(income) do
		net += line.amount
	end
	profile.budget += net

	-- Objectives.
	local wetRace = race.wetLaps >= race.laps * 0.3
	objectiveEvent(session, "raceComplete", 1)
	if podiums > 0 then
		objectiveEvent(session, "podium", podiums)
	end
	if wins > 0 then
		objectiveEvent(session, "win", wins)
		if wetRace then
			objectiveEvent(session, "wetWin", wins)
		end
	end
	if points > 0 then
		objectiveEvent(session, "points", points)
	end
	local inPoints = 0
	local bestGain = 0
	for _, r in ipairs(teamRows) do
		if not r.dnf and r.pos <= 10 then
			inPoints += 1
		end
		if not r.dnf then
			bestGain = math.max(bestGain, r.grid - r.pos)
		end
		if r.fastestLap then
			objectiveEvent(session, "fastestLap", 1)
		end
	end
	if inPoints >= 2 then
		objectiveEvent(session, "doublePoints", 1)
	end
	if bestGain > 0 then
		objectiveEvent(session, "placesGained", bestGain)
	end

	-- Records and injuries.
	Records.onRace(profile, teamRows)
	for _, r in ipairs(teamRows) do
		if r.crashed and rng:NextNumber() < 0.15 then
			for _, d in pairs(profile.drivers) do
				if d.id == r.driverId then
					d.injuredRounds = rng:NextInteger(1, 2)
					Radio.say(session.player, "injured", { name = d.name }, rng)
				end
			end
		end
	end
	local winner = results[1]
	local bestTeam = teamRows[1]
	table.insert(profile.seasonResults, {
		round = w.round,
		trackName = w.track.name,
		winner = winner and winner.name or "-",
		winnerTeam = winner and winner.teamName or "-",
		yourBest = bestTeam and bestTeam.pos or 0,
	})
	TeamManager.endOfRound(profile, rng)
	local broken = Records.check(profile)

	local podium = nil
	if podiums > 0 then
		podium = {}
		for i = 1, 3 do
			local r = results[i]
			if r then
				table.insert(podium, { pos = i, name = r.name, teamName = r.teamName, color = r.color, isPlayer = r.isPlayer })
			end
		end
	end
	w.raceSummary = {
		results = results,
		income = income,
		net = net,
		budget = profile.budget,
		broken = broken,
		podium = podium,
		wet = wetRace,
		trackName = w.track.name,
	}
	w.stage = STAGE_POST
	session.race = nil
	session.dirty = true
	session.saveSoon = true
	sendRace(session, "Finished", w.raceSummary)
	for _, b in ipairs(broken) do
		notify(session, "Record", b)
	end
end

---------------------------------------------------------------------
-- Season end
---------------------------------------------------------------------
local function sortedStandings(profile)
	local drivers = {}
	for id, d in pairs(profile.standings.drivers) do
		local copy = table.clone(d)
		copy.id = id
		table.insert(drivers, copy)
	end
	table.sort(drivers, function(a, b)
		if a.points ~= b.points then
			return a.points > b.points
		end
		return a.wins > b.wins
	end)
	local teams = {}
	for id, t in pairs(profile.standings.teams) do
		local copy = table.clone(t)
		copy.id = id
		copy.isPlayer = id == "PLAYER"
		copy.color = Config.teamColor(id, profile.colorIndex)
		table.insert(teams, copy)
	end
	table.sort(teams, function(a, b)
		if a.points ~= b.points then
			return a.points > b.points
		end
		return a.wins > b.wins
	end)
	for _, d in ipairs(drivers) do
		d.isPlayer = d.teamId == "PLAYER"
		d.color = Config.teamColor(d.teamId, profile.colorIndex)
	end
	return drivers, teams
end

local function endSeason(session)
	local profile = session.profile
	local drivers, teams = sortedStandings(profile)
	local champ = drivers[1]
	local champTeam = teams[1]
	local yourPos = #teams + 1
	for i, t in ipairs(teams) do
		if t.id == "PLAYER" then
			yourPos = i
		end
	end
	local prize = Config.ConstructorsPrize[yourPos] or 0
	profile.budget += prize
	local championDriver = (champ and champ.teamId == "PLAYER") and { id = champ.id, name = champ.name } or nil
	local wonConstructors = champTeam ~= nil and champTeam.id == "PLAYER"
	Records.onSeasonEnd(profile, championDriver, wonConstructors)
	local broken = Records.check(profile)
	local summary = {
		season = profile.season,
		driverChampion = champ and champ.name or "-",
		driverChampionTeam = champ and champ.teamName or "-",
		constructorsChampion = champTeam and champTeam.name or "-",
		yourPosition = yourPos,
		yourPoints = profile.standings.teams.PLAYER and profile.standings.teams.PLAYER.points or 0,
		prize = prize,
		wonDrivers = championDriver ~= nil,
		wonConstructors = wonConstructors,
		broken = broken,
	}
	table.insert(profile.history, summary)
	Records.newSeason(profile)
	profile.standings = { drivers = {}, teams = {} }
	profile.seasonResults = {}
	TeamManager.endOfSeason(profile, session.rng)
	profile.season += 1
	profile.round = 1
	for _, b in ipairs(broken) do
		notify(session, "Record", b)
	end
	return summary
end

---------------------------------------------------------------------
-- Requests from the client
---------------------------------------------------------------------
local function requireReady(session)
	local ok, msg = TeamManager.isReady(session.profile)
	if not ok then
		return false, msg
	end
	return true
end

function WeekendManager.handle(session, action, args)
	args = type(args) == "table" and args or {}
	local w = WeekendManager.ensureWeekend(session)
	if action == "RunPractice" then
		if w.stage > 3 then
			return false, "Practice is over."
		end
		local ok, msg = requireReady(session)
		if not ok then
			return false, msg
		end
		local program = args.program
		if program ~= "setup" and program ~= "long" and program ~= "quali" then
			program = "setup"
		end
		return runPractice(session, program)
	elseif action == "SkipPractice" then
		if w.stage > 3 then
			return false, "Practice is over."
		end
		w.stage = STAGE_Q1
		return true, "Skipped to qualifying."
	elseif action == "RunQualifying" then
		if w.stage < STAGE_Q1 or w.stage > STAGE_Q3 then
			return false, "It's not qualifying time."
		end
		if w.pendingDrive then
			return false, "Finish your Q3 lap first."
		end
		local ok, msg = requireReady(session)
		if not ok then
			return false, msg
		end
		return runQualifying(session, args)
	elseif action == "Q3DriveResult" then
		return q3DriveResult(session, args)
	elseif action == "StartRace" then
		if w.stage ~= STAGE_RACE or session.race then
			return false, "The race can't start now."
		end
		if not w.grid then
			return false, "Qualifying hasn't finished."
		end
		local ok, msg = requireReady(session)
		if not ok then
			return false, msg
		end
		return startRace(session, args)
	elseif action == "Continue" then
		if w.stage ~= STAGE_POST then
			return false, "Finish the race first."
		end
		local summary = nil
		session.profile.round += 1
		if session.profile.round > Config.RoundsPerSeason then
			summary = endSeason(session)
		end
		session.weekend = nil
		WeekendManager.ensureWeekend(session)
		session.dirty = true
		session.saveSoon = true
		return true, summary and "Season complete!" or "On to the next round!", { season = summary }
	end
	return false, "Unknown action."
end

function WeekendManager.raceCommand(session, cmd, data)
	local race = session.race
	if not race or type(cmd) ~= "string" then
		return
	end
	race:command(cmd, data)
	if cmd == "Speed" then
		session.speedIndex = race.speedIndex
	end
end

function WeekendManager.update(session, dt)
	local race = session.race
	if not race then
		return
	end
	race:step(dt)
	if race.done then
		finishRace(session)
	end
end

---------------------------------------------------------------------
-- What the client sees
---------------------------------------------------------------------
function WeekendManager.clientState(session)
	local profile = session.profile
	local w = WeekendManager.ensureWeekend(session)
	local drivers, teams = sortedStandings(profile)
	local calendar = {}
	for i, track in ipairs(Tracks.List) do
		local result = nil
		for _, r in ipairs(profile.seasonResults) do
			if r.round == i then
				result = r
			end
		end
		table.insert(calendar, {
			round = i,
			id = track.id,
			name = track.name,
			description = track.description,
			done = i < profile.round,
			current = i == profile.round,
			result = result,
		})
	end
	local track = w.track
	local lastPractice = w.practice[#w.practice]
	local notes = {}
	for _, e in ipairs(TeamManager.buildEntries(profile)) do
		if e.note then
			table.insert(notes, e.note)
		end
	end
	return {
		budget = profile.budget,
		upgradePoints = profile.upgradePoints,
		season = profile.season,
		round = profile.round,
		teamName = profile.teamName,
		colorIndex = profile.colorIndex,
		setupDone = profile.setupDone,
		ready = (TeamManager.isReady(profile)),
		team = TeamManager.view(profile),
		weekend = {
			round = w.round,
			trackId = track.id,
			trackName = track.name,
			description = track.description,
			lengthM = track.lengthM,
			laps = w.laps,
			stage = w.stage,
			stageName = Config.SessionOrder[w.stage] or "Results",
			weather = Weather.public(w.upcoming),
			forecast = w.forecastText,
			bonus = { setup = round2(w.bonus.setup), long = round2(w.bonus.long), quali = round2(w.bonus.quali) },
			practice = lastPractice,
			practiceCount = #w.practice,
			quali = w.quali,
			gridRows = w.gridRows,
			pendingDrive = w.pendingDrive ~= nil,
			raceSummary = w.raceSummary,
			racing = session.race ~= nil,
			notes = notes,
			facts = {
				power = track.powerSensitivity,
				overtaking = track.overtakeDifficulty,
				abrasion = track.abrasion,
				rain = track.rainChance,
				night = track.night,
				street = track.street,
			},
		},
		standings = { drivers = drivers, teams = teams },
		calendar = calendar,
		history = profile.history,
		objectives = Objectives.view(profile),
		records = Records.view(profile),
		saving = session.savingEnabled,
		saveMessage = session.saveMessage,
	}
end

function WeekendManager.isRacing(session)
	return session.race ~= nil
end

return WeekendManager
