--[[
	TeamManager (ModuleScript)
	Location: ServerScriptService > ServerModules > TeamManager

	Everything about building the team: new careers, the staff market, hiring,
	firing, car upgrades, crew training, the AI teams, and turning the team into
	the 20 race entries used by qualifying and the race.
	Every money change happens here on the server, after checking the request.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))

local TeamManager = {}

local DRIVER_SLOTS = { race1 = true, race2 = true, reserve = true }
local STRATEGIST_SLOTS = { s1 = true, s2 = true }

local function clampStat(v)
	return math.clamp(math.floor(v + 0.5), 30, 99)
end

local function gauss(rng)
	-- Box-Muller: a normally distributed random number (mean 0, spread 1)
	local u1 = math.max(rng:NextNumber(), 1e-6)
	local u2 = rng:NextNumber()
	return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
end
TeamManager.gauss = gauss

local function roundMoney(v)
	return math.floor(v / 50000 + 0.5) * 50000
end

function TeamManager.newId(profile, prefix)
	profile.nextId = (profile.nextId or 1) + 1
	return prefix .. tostring(profile.nextId)
end

---------------------------------------------------------------------
-- Fees
---------------------------------------------------------------------
function TeamManager.driverFee(d)
	local ovr = math.max(50, Config.driverOverall(d))
	return roundMoney(1500000 + ((ovr - 50) / 45) ^ 2.2 * 28000000)
end

function TeamManager.crewFee(c)
	local avg = math.max(50, (c.speed + c.reliability) / 2)
	return roundMoney(1000000 + ((avg - 50) / 48) ^ 2 * 9000000)
end

function TeamManager.strategistFee(s)
	local avg = math.max(50, (s.calls + s.planning) / 2)
	return roundMoney(800000 + ((avg - 50) / 48) ^ 2 * 7000000)
end

---------------------------------------------------------------------
-- Generating people
---------------------------------------------------------------------
local function randomName(rng)
	local first = Config.FirstNames[rng:NextInteger(1, #Config.FirstNames)]
	local last = Config.LastNames[rng:NextInteger(1, #Config.LastNames)]
	return first .. " " .. last, string.upper(string.sub(last, 1, 3))
end

-- quality 0..1 (1 = superstar)
function TeamManager.makeDriver(profile, rng, quality)
	local base = 62 + quality * 30
	local name, code = randomName(rng)
	local d = {
		id = TeamManager.newId(profile, "D"),
		name = name,
		code = code,
		nation = Config.Nations[rng:NextInteger(1, #Config.Nations)],
		age = rng:NextInteger(19, 35),
		pace = clampStat(base + gauss(rng) * 3),
		consistency = clampStat(base + gauss(rng) * 6),
		wet = clampStat(base + gauss(rng) * 7),
		overtaking = clampStat(base + gauss(rng) * 6),
		tyres = clampStat(base + gauss(rng) * 6),
	}
	d.fee = TeamManager.driverFee(d)
	return d
end

function TeamManager.makeCrew(profile, rng, quality)
	local base = 62 + quality * 34
	local c = {
		id = TeamManager.newId(profile, "C"),
		name = Config.CrewNicknames[rng:NextInteger(1, #Config.CrewNicknames)] .. " Crew",
		chief = (randomName(rng)),
		speed = clampStat(base + gauss(rng) * 5),
		reliability = clampStat(base + gauss(rng) * 6),
	}
	c.fee = TeamManager.crewFee(c)
	return c
end

function TeamManager.makeStrategist(profile, rng, quality)
	local base = 60 + quality * 36
	local name = randomName(rng)
	local s = {
		id = TeamManager.newId(profile, "S"),
		name = name,
		calls = clampStat(base + gauss(rng) * 6),
		planning = clampStat(base + gauss(rng) * 6),
	}
	s.fee = TeamManager.strategistFee(s)
	return s
end

---------------------------------------------------------------------
-- Market
---------------------------------------------------------------------
local DRIVER_QUALITIES = { 0.92, 0.8, 0.68, 0.6, 0.5, 0.42, 0.3, 0.22, 0.12, 0.05 }

function TeamManager.refreshMarket(profile, rng, fullRefresh)
	local market = profile.market
	local function refill(list, wanted, maker, qualities)
		if fullRefresh then
			table.clear(list)
		else
			-- Keep about half of the current options.
			for i = #list, 1, -1 do
				if rng:NextNumber() < 0.5 then
					table.remove(list, i)
				end
			end
		end
		local i = 1
		while #list < wanted do
			local q = qualities and qualities[((i - 1) % #qualities) + 1] or rng:NextNumber(0.05, 0.95)
			q = math.clamp(q + rng:NextNumber(-0.06, 0.06), 0, 1)
			table.insert(list, maker(profile, rng, q))
			i += 1
		end
	end
	refill(market.drivers, Config.Market.Drivers, TeamManager.makeDriver, DRIVER_QUALITIES)
	refill(market.crews, Config.Market.Crews, TeamManager.makeCrew, { 0.85, 0.65, 0.45, 0.3, 0.12 })
	refill(market.strategists, Config.Market.Strategists, TeamManager.makeStrategist, { 0.85, 0.65, 0.45, 0.3, 0.12 })
	table.sort(market.drivers, function(a, b)
		return a.fee > b.fee
	end)
	table.sort(market.crews, function(a, b)
		return a.fee > b.fee
	end)
	table.sort(market.strategists, function(a, b)
		return a.fee > b.fee
	end)
	market.lastRefreshRound = profile.round
	market.lastRefreshSeason = profile.season
end

---------------------------------------------------------------------
-- New career
---------------------------------------------------------------------
function TeamManager.newAITeams(profile)
	local teams = {}
	for index, t in ipairs(Config.AITeams) do
		local team = {
			id = t.id,
			configIndex = index,
			car = table.clone(t.car),
			crew = table.clone(t.crew),
			strategist = t.strategist,
			drivers = {},
		}
		for di, d in ipairs(t.drivers) do
			local copy = table.clone(d)
			copy.id = t.id .. "_D" .. di
			copy.fee = TeamManager.driverFee(copy)
			table.insert(team.drivers, copy)
		end
		table.insert(teams, team)
	end
	profile.aiTeams = teams
end

function TeamManager.newProfile(rng)
	local profile = {
		version = 1,
		setupDone = false,
		teamName = Config.PlayerTeamNames[1],
		colorIndex = 1,
		budget = Config.StartingBudget,
		upgradePoints = Config.StartingUpgradePoints,
		season = 1,
		round = 1,
		nextId = 100,
		drivers = {},
		strategists = {},
		crew = nil,
		car = table.clone(Config.PlayerStartCar),
		market = { drivers = {}, crews = {}, strategists = {}, lastRefreshRound = 1, lastRefreshSeason = 1 },
		aiTeams = {},
		standings = { drivers = {}, teams = {} },
		seasonResults = {},
		history = {},
		stats = {},
		objectives = {},
		lastSaved = 0,
	}
	TeamManager.newAITeams(profile)
	TeamManager.refreshMarket(profile, rng, true)
	return profile
end

---------------------------------------------------------------------
-- Ratings
---------------------------------------------------------------------
-- 0-100 car performance on a given track (power tracks weight the engine more).
function TeamManager.carPerformance(car, track)
	local p = track and track.powerSensitivity or 0.5
	local wa = 0.55 - 0.3 * p
	local wp = 0.2 + 0.3 * p
	local wc = 0.25
	return car.aero * wa + car.power * wp + car.chassis * wc
end

-- Combined strategist ability: the best one leads, the second one helps a bit.
function TeamManager.strategyRating(profile)
	local s1, s2 = profile.strategists.s1, profile.strategists.s2
	if not s1 and not s2 then
		return { calls = 35, planning = 35 }
	end
	local function combine(stat)
		local a = s1 and s1[stat] or 0
		local b = s2 and s2[stat] or 0
		local best, other = math.max(a, b), math.min(a, b)
		return math.min(100, best + other * 0.15)
	end
	return { calls = combine("calls"), planning = combine("planning") }
end

function TeamManager.upgradeCost(rating)
	local above = math.max(0, rating - 55)
	return roundMoney(Config.Upgrade.BaseCost + above * above * Config.Upgrade.CostPerRatingSquared)
end

function TeamManager.salaryTotal(profile)
	local total = 0
	for _, d in pairs(profile.drivers) do
		total += (d.fee or 0) * Config.SalaryRate
	end
	for _, s in pairs(profile.strategists) do
		total += (s.fee or 0) * Config.SalaryRate
	end
	if profile.crew then
		total += (profile.crew.fee or 0) * Config.SalaryRate
	end
	return roundMoney(total)
end

function TeamManager.isReady(profile)
	if not profile.setupDone then
		return false, "Choose your team name and colour first."
	end
	if not profile.drivers.race1 or not profile.drivers.race2 then
		return false, "Hire two race drivers in the Market tab."
	end
	if not profile.crew then
		return false, "Hire a pit crew in the Market tab."
	end
	if not profile.strategists.s1 and not profile.strategists.s2 then
		return false, "Hire at least one strategist in the Market tab."
	end
	return true, "Ready"
end

---------------------------------------------------------------------
-- Race entries (the 20 cars for a session)
---------------------------------------------------------------------
local STAND_IN = { name = "Rookie Stand-in", code = "ROO", nation = "GBR", age = 19, pace = 66, consistency = 60, wet = 60, overtaking = 60, tyres = 60 }

function TeamManager.buildEntries(profile)
	local entries = {}
	local playerColor = Config.teamColor("PLAYER", profile.colorIndex)
	local strat = TeamManager.strategyRating(profile)
	local reserveUsed = false
	for slot = 1, 2 do
		local d = profile.drivers["race" .. slot]
		local note = nil
		if d and (d.injuredRounds or 0) > 0 then
			local reserve = profile.drivers.reserve
			if reserve and not reserveUsed and (reserve.injuredRounds or 0) <= 0 then
				note = d.name .. " is injured. Reserve " .. reserve.name .. " drives."
				d = reserve
				reserveUsed = true
			else
				note = d.name .. " is injured. A rookie stand-in drives."
				d = table.clone(STAND_IN)
				d.id = "STANDIN" .. slot
			end
		end
		if d then
			table.insert(entries, {
				key = "P" .. slot,
				slot = slot,
				isPlayer = true,
				teamId = "PLAYER",
				teamName = profile.teamName,
				color = playerColor,
				driver = d,
				car = profile.car,
				crew = profile.crew or { speed = 50, reliability = 50 },
				strat = strat,
				note = note,
			})
		end
	end
	for _, team in ipairs(profile.aiTeams) do
		local cfg = Config.AITeams[team.configIndex]
		for di, d in ipairs(team.drivers) do
			table.insert(entries, {
				key = team.id .. "_" .. di,
				isPlayer = false,
				teamId = team.id,
				teamName = cfg.name,
				color = cfg.color,
				driver = d,
				car = team.car,
				crew = team.crew,
				strat = { calls = team.strategist, planning = team.strategist },
			})
		end
	end
	return entries
end

---------------------------------------------------------------------
-- Actions requested by the client (all validated here)
---------------------------------------------------------------------
local function findById(list, id)
	if type(id) ~= "string" then
		return nil, nil
	end
	for i, item in ipairs(list) do
		if item.id == id then
			return item, i
		end
	end
	return nil, nil
end

local function spend(profile, amount)
	if profile.budget < amount then
		return false
	end
	profile.budget -= amount
	return true
end

local actions = {}

function actions.SetupTeam(profile, args)
	if profile.setupDone then
		return false, "Your team is already set up."
	end
	local nameIndex = tonumber(args.nameIndex)
	local colorIndex = tonumber(args.colorIndex)
	if not nameIndex or not Config.PlayerTeamNames[nameIndex] then
		return false, "Pick a team name."
	end
	if not colorIndex or not Config.PlayerColors[colorIndex] then
		return false, "Pick a team colour."
	end
	profile.teamName = Config.PlayerTeamNames[nameIndex]
	profile.colorIndex = colorIndex
	profile.setupDone = true
	return true, "Welcome to Formula management, " .. profile.teamName .. "!"
end

function actions.HireDriver(profile, args)
	local slot = args.slot
	if type(slot) ~= "string" or not DRIVER_SLOTS[slot] then
		return false, "Invalid seat."
	end
	local d, index = findById(profile.market.drivers, args.id)
	if not d then
		return false, "That driver is no longer available."
	end
	local current = profile.drivers[slot]
	local severance = current and math.floor(current.fee * Config.SeveranceRate) or 0
	local cost = d.fee + severance
	if profile.budget < cost then
		return false, "Not enough budget (" .. Config.formatMoney(cost) .. " needed)."
	end
	spend(profile, cost)
	table.remove(profile.market.drivers, index)
	if current then
		current.injuredRounds = 0
		table.insert(profile.market.drivers, current)
	end
	profile.drivers[slot] = d
	local msg = "Signed " .. d.name .. " for " .. Config.formatMoney(d.fee) .. "."
	if current then
		msg ..= " " .. current.name .. " was released (" .. Config.formatMoney(severance) .. " severance)."
	end
	return true, msg
end

function actions.FireDriver(profile, args)
	local slot = args.slot
	if type(slot) ~= "string" or not DRIVER_SLOTS[slot] then
		return false, "Invalid seat."
	end
	local current = profile.drivers[slot]
	if not current then
		return false, "That seat is already empty."
	end
	local severance = math.floor(current.fee * Config.SeveranceRate)
	if profile.budget < severance then
		return false, "Not enough budget to pay severance (" .. Config.formatMoney(severance) .. ")."
	end
	spend(profile, severance)
	profile.drivers[slot] = nil
	current.injuredRounds = 0
	table.insert(profile.market.drivers, current)
	return true, "Released " .. current.name .. " (" .. Config.formatMoney(severance) .. " severance)."
end

function actions.SwapReserve(profile, args)
	local slot = args.slot
	if slot ~= "race1" and slot ~= "race2" then
		return false, "Invalid seat."
	end
	local reserve = profile.drivers.reserve
	if not reserve then
		return false, "You have no reserve driver."
	end
	profile.drivers.reserve = profile.drivers[slot]
	profile.drivers[slot] = reserve
	return true, reserve.name .. " is now a race driver."
end

function actions.HireCrew(profile, args)
	local c, index = findById(profile.market.crews, args.id)
	if not c then
		return false, "That crew is no longer available."
	end
	local current = profile.crew
	local severance = current and math.floor(current.fee * Config.SeveranceRate) or 0
	local cost = c.fee + severance
	if not spend(profile, cost) then
		return false, "Not enough budget (" .. Config.formatMoney(cost) .. " needed)."
	end
	table.remove(profile.market.crews, index)
	if current then
		table.insert(profile.market.crews, current)
	end
	profile.crew = c
	return true, "Hired the " .. c.name .. "."
end

function actions.HireStrategist(profile, args)
	local slot = args.slot
	if type(slot) ~= "string" or not STRATEGIST_SLOTS[slot] then
		return false, "Invalid strategist slot."
	end
	local s, index = findById(profile.market.strategists, args.id)
	if not s then
		return false, "That strategist is no longer available."
	end
	local current = profile.strategists[slot]
	local severance = current and math.floor(current.fee * Config.SeveranceRate) or 0
	local cost = s.fee + severance
	if not spend(profile, cost) then
		return false, "Not enough budget (" .. Config.formatMoney(cost) .. " needed)."
	end
	table.remove(profile.market.strategists, index)
	if current then
		table.insert(profile.market.strategists, current)
	end
	profile.strategists[slot] = s
	return true, "Hired strategist " .. s.name .. "."
end

function actions.FireStrategist(profile, args)
	local slot = args.slot
	if type(slot) ~= "string" or not STRATEGIST_SLOTS[slot] then
		return false, "Invalid strategist slot."
	end
	local current = profile.strategists[slot]
	if not current then
		return false, "That slot is already empty."
	end
	local severance = math.floor(current.fee * Config.SeveranceRate)
	if not spend(profile, severance) then
		return false, "Not enough budget to pay severance."
	end
	profile.strategists[slot] = nil
	table.insert(profile.market.strategists, current)
	return true, "Released " .. current.name .. "."
end

function actions.UpgradeCar(profile, args)
	local area = args.area
	if type(area) ~= "string" or not Config.Upgrade.Labels[area] then
		return false, "Unknown car area."
	end
	local rating = profile.car[area]
	if rating >= Config.Upgrade.Max then
		return false, "That area is already maxed out."
	end
	if args.usePoints == true then
		if profile.upgradePoints < Config.Upgrade.PointsCost then
			return false, "Not enough upgrade points."
		end
		profile.upgradePoints -= Config.Upgrade.PointsCost
	else
		local cost = TeamManager.upgradeCost(rating)
		if not spend(profile, cost) then
			return false, "Not enough budget (" .. Config.formatMoney(cost) .. " needed)."
		end
	end
	profile.car[area] = math.min(Config.Upgrade.Max, rating + Config.Upgrade.Step)
	return true, Config.Upgrade.Labels[area] .. " upgraded to " .. profile.car[area] .. "."
end

function actions.TrainCrew(profile)
	local crew = profile.crew
	if not crew then
		return false, "Hire a pit crew first."
	end
	if crew.speed >= Config.CrewTraining.Max then
		return false, "Your crew is already as fast as possible."
	end
	if not spend(profile, Config.CrewTraining.Cost) then
		return false, "Not enough budget."
	end
	crew.speed = math.min(Config.CrewTraining.Max, crew.speed + Config.CrewTraining.Step)
	crew.reliability = math.min(Config.CrewTraining.Max, crew.reliability + 1)
	return true, "Crew training done. Speed is now " .. crew.speed .. "."
end

function actions.RefreshMarket(profile, _args, rng)
	if not spend(profile, Config.Market.RefreshCost) then
		return false, "Not enough budget."
	end
	TeamManager.refreshMarket(profile, rng, false)
	return true, "Your scouts found new options."
end

-- Hires a sensible, affordable team for any empty seats.
function actions.QuickSetup(profile, _args, rng)
	local hired = {}
	local function pick(list, maxFee, scoreFn)
		local best, bestScore = nil, -math.huge
		for _, item in ipairs(list) do
			if item.fee <= maxFee and item.fee <= profile.budget then
				local s = scoreFn(item)
				if s > bestScore then
					best, bestScore = item, s
				end
			end
		end
		return best
	end
	for _, slot in ipairs({ "race1", "race2" }) do
		if not profile.drivers[slot] then
			local d = pick(profile.market.drivers, profile.budget * 0.22, Config.driverOverall)
			if d then
				actions.HireDriver(profile, { slot = slot, id = d.id })
				table.insert(hired, d.name)
			end
		end
	end
	if not profile.drivers.reserve then
		local d = pick(profile.market.drivers, profile.budget * 0.06, Config.driverOverall)
		if d then
			actions.HireDriver(profile, { slot = "reserve", id = d.id })
			table.insert(hired, d.name .. " (reserve)")
		end
	end
	if not profile.crew then
		local c = pick(profile.market.crews, profile.budget * 0.12, function(c)
			return c.speed + c.reliability
		end)
		if c then
			actions.HireCrew(profile, { id = c.id })
			table.insert(hired, c.name)
		end
	end
	if not profile.strategists.s1 then
		local s = pick(profile.market.strategists, profile.budget * 0.12, function(s)
			return s.calls + s.planning
		end)
		if s then
			actions.HireStrategist(profile, { slot = "s1", id = s.id })
			table.insert(hired, s.name)
		end
	end
	if #hired == 0 then
		local ok = TeamManager.isReady(profile)
		if ok then
			return true, "Your team is already complete."
		end
		TeamManager.refreshMarket(profile, rng, false)
		return false, "Could not afford anyone suitable. The market has been refreshed, try again."
	end
	return true, "Hired: " .. table.concat(hired, ", ") .. "."
end

-- Runs a team action. Returns ok, message.
function TeamManager.handle(profile, action, args, rng)
	local fn = actions[action]
	if not fn then
		return false, "Unknown action."
	end
	if type(args) ~= "table" then
		args = {}
	end
	return fn(profile, args, rng)
end

function TeamManager.isTeamAction(action)
	return actions[action] ~= nil
end

---------------------------------------------------------------------
-- Between rounds and seasons
---------------------------------------------------------------------
function TeamManager.endOfRound(profile, rng)
	for _, team in ipairs(profile.aiTeams) do
		for _, area in ipairs(Config.Upgrade.Areas) do
			local gain = rng:NextNumber(0, Config.AIDevelopmentPerRound * 2)
			team.car[area] = math.min(99, team.car[area] + gain)
		end
	end
	for _, d in pairs(profile.drivers) do
		if (d.injuredRounds or 0) > 0 then
			d.injuredRounds -= 1
		end
	end
	local market = profile.market
	local roundsSince = (profile.round - (market.lastRefreshRound or 1))
	if market.lastRefreshSeason ~= profile.season or roundsSince >= Config.Market.RefreshEveryRounds then
		TeamManager.refreshMarket(profile, rng, false)
	end
end

local function developDriver(d, rng)
	d.age = (d.age or 25) + 1
	local change
	if d.age <= 24 then
		change = rng:NextInteger(0, 3)
	elseif d.age <= 30 then
		change = rng:NextInteger(-1, 1)
	elseif d.age <= 34 then
		change = rng:NextInteger(-2, 0)
	else
		change = rng:NextInteger(-3, -1)
	end
	d.pace = clampStat(d.pace + change)
	d.consistency = clampStat(d.consistency + math.max(0, change))
	d.overtaking = clampStat(d.overtaking + change)
end

local function applyRegulations(car)
	for _, area in ipairs(Config.Upgrade.Areas) do
		car[area] = math.floor(55 + (car[area] - 55) * Config.SeasonRegulationFactor + 0.5)
	end
end

function TeamManager.endOfSeason(profile, rng)
	for _, d in pairs(profile.drivers) do
		developDriver(d, rng)
	end
	applyRegulations(profile.car)
	for _, team in ipairs(profile.aiTeams) do
		applyRegulations(team.car)
	end
	local weakest = math.huge
	for _, team in ipairs(profile.aiTeams) do
		weakest = math.min(weakest, TeamManager.carPerformance(team.car, nil))
	end
	for _, team in ipairs(profile.aiTeams) do
		local perf = TeamManager.carPerformance(team.car, nil)
		-- Back-markers catch up a little over the winter.
		local boost = perf - weakest < 5 and 1.5 or 0.3
		for _, area in ipairs(Config.Upgrade.Areas) do
			team.car[area] = math.min(99, team.car[area] + rng:NextNumber(0, 1) + boost)
		end
		for i, d in ipairs(team.drivers) do
			developDriver(d, rng)
			if d.age > 37 then
				-- Retire and replace with a young driver of similar level.
				local quality = math.clamp((Config.driverOverall(d) - 62) / 30, 0, 1)
				local young = TeamManager.makeDriver(profile, rng, quality)
				young.age = rng:NextInteger(19, 23)
				young.id = team.id .. "_D" .. i .. "_" .. profile.season
				team.drivers[i] = young
			end
		end
		team.strategist = math.min(99, team.strategist + rng:NextInteger(0, 1))
		team.crew.speed = math.min(99, team.crew.speed + rng:NextInteger(0, 1))
	end
	TeamManager.refreshMarket(profile, rng, true)
end

---------------------------------------------------------------------
-- What the client sees
---------------------------------------------------------------------
function TeamManager.view(profile)
	local drivers = {}
	for slot, d in pairs(profile.drivers) do
		local copy = table.clone(d)
		copy.overall = Config.driverOverall(d)
		copy.salary = math.floor(d.fee * Config.SalaryRate)
		drivers[slot] = copy
	end
	local car = {}
	for _, area in ipairs(Config.Upgrade.Areas) do
		car[area] = {
			rating = math.floor(profile.car[area] + 0.5),
			cost = TeamManager.upgradeCost(profile.car[area]),
		}
	end
	local market = { drivers = {}, crews = profile.market.crews, strategists = profile.market.strategists }
	for _, d in ipairs(profile.market.drivers) do
		local copy = table.clone(d)
		copy.overall = Config.driverOverall(d)
		table.insert(market.drivers, copy)
	end
	local aiTeams = {}
	for _, team in ipairs(profile.aiTeams) do
		local cfg = Config.AITeams[team.configIndex]
		table.insert(aiTeams, {
			id = team.id,
			name = cfg.name,
			color = cfg.color,
			rating = math.floor(TeamManager.carPerformance(team.car, nil) + 0.5),
		})
	end
	return {
		drivers = drivers,
		crew = profile.crew,
		strategists = profile.strategists,
		strategy = TeamManager.strategyRating(profile),
		car = car,
		carRating = math.floor(TeamManager.carPerformance(profile.car, nil) + 0.5),
		salaries = TeamManager.salaryTotal(profile),
		market = market,
		aiTeams = aiTeams,
	}
end

return TeamManager
