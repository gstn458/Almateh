--[[
	Records (ModuleScript)
	Location: ServerScriptService > ServerModules > Records

	Keeps your career statistics and compares them with the historical record
	targets in Config.Records. Driver records use the best of any driver while
	they drove for your team. When a record is beaten for the first time,
	check() returns it so the game can celebrate.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))

local Records = {}

function Records.defaultStats()
	return {
		races = 0,
		teamWins = 0,
		teamPodiums = 0,
		teamPoles = 0,
		teamPoints = 0,
		seasonTeamWins = 0,
		seasonDrivers = {},
		streaks = {},
		driverCareers = {},
		bestSeasonDriverWins = 0,
		bestSeasonTeamWins = 0,
		bestSeasonDriverPoles = 0,
		bestSeasonDriverPodiums = 0,
		bestSeasonDriverPoints = 0,
		bestConsecutiveWins = 0,
		bestDriverTitles = 0,
		constructorsTitles = 0,
		bestCareerWins = 0,
		bestCareerPoles = 0,
		bestCareerPodiums = 0,
		fastestPitStop = 0, -- 0 means no stop yet
		broken = {},
	}
end

local function seasonEntry(stats, driver)
	local e = stats.seasonDrivers[driver.id]
	if not e then
		e = { name = driver.name, wins = 0, poles = 0, podiums = 0, points = 0 }
		stats.seasonDrivers[driver.id] = e
	end
	return e
end

local function careerEntry(stats, driver)
	local e = stats.driverCareers[driver.id]
	if not e then
		e = { name = driver.name, wins = 0, poles = 0, podiums = 0, titles = 0, starts = 0 }
		stats.driverCareers[driver.id] = e
	end
	return e
end

local function refreshBests(stats)
	for _, e in pairs(stats.seasonDrivers) do
		stats.bestSeasonDriverWins = math.max(stats.bestSeasonDriverWins, e.wins)
		stats.bestSeasonDriverPoles = math.max(stats.bestSeasonDriverPoles, e.poles)
		stats.bestSeasonDriverPodiums = math.max(stats.bestSeasonDriverPodiums, e.podiums)
		stats.bestSeasonDriverPoints = math.max(stats.bestSeasonDriverPoints, e.points)
	end
	for _, e in pairs(stats.driverCareers) do
		stats.bestCareerWins = math.max(stats.bestCareerWins, e.wins)
		stats.bestCareerPoles = math.max(stats.bestCareerPoles, e.poles)
		stats.bestCareerPodiums = math.max(stats.bestCareerPodiums, e.podiums)
		stats.bestDriverTitles = math.max(stats.bestDriverTitles, e.titles)
	end
	for _, streak in pairs(stats.streaks) do
		stats.bestConsecutiveWins = math.max(stats.bestConsecutiveWins, streak)
	end
	stats.bestSeasonTeamWins = math.max(stats.bestSeasonTeamWins, stats.seasonTeamWins)
end

function Records.onPole(profile, driver)
	local stats = profile.stats
	stats.teamPoles += 1
	seasonEntry(stats, driver).poles += 1
	careerEntry(stats, driver).poles += 1
	refreshBests(stats)
end

function Records.onPitStop(profile, seconds)
	local stats = profile.stats
	if stats.fastestPitStop <= 0 or seconds < stats.fastestPitStop then
		stats.fastestPitStop = seconds
	end
end

-- teamResults: the result rows for your cars (see RaceSim:results()).
function Records.onRace(profile, teamResults)
	local stats = profile.stats
	stats.races += 1
	for _, r in ipairs(teamResults) do
		local driver = { id = r.driverId, name = r.name }
		local season = seasonEntry(stats, driver)
		local career = careerEntry(stats, driver)
		career.starts += 1
		season.points += r.points
		stats.teamPoints += r.points
		if r.pos == 1 and not r.dnf then
			stats.teamWins += 1
			stats.seasonTeamWins += 1
			season.wins += 1
			career.wins += 1
			stats.streaks[r.driverId] = (stats.streaks[r.driverId] or 0) + 1
		else
			stats.streaks[r.driverId] = 0
		end
		if r.pos <= 3 and not r.dnf then
			stats.teamPodiums += 1
			season.podiums += 1
			career.podiums += 1
		end
	end
	refreshBests(stats)
end

-- championDriver: {id, name} if one of your drivers won the title, else nil.
function Records.onSeasonEnd(profile, championDriver, wonConstructors)
	local stats = profile.stats
	if championDriver then
		careerEntry(stats, championDriver).titles += 1
	end
	if wonConstructors then
		stats.constructorsTitles += 1
	end
	refreshBests(stats)
end

function Records.newSeason(profile)
	local stats = profile.stats
	stats.seasonTeamWins = 0
	stats.seasonDrivers = {}
end

local function valueOf(stats, record)
	return stats[record.stat] or 0
end

local function isBeaten(record, value)
	if record.lowerIsBetter then
		return value > 0 and value < record.target
	end
	return value > record.target
end

-- Returns records beaten for the first time (and remembers them).
function Records.check(profile)
	local stats = profile.stats
	local newlyBroken = {}
	for _, record in ipairs(Config.Records) do
		if not stats.broken[record.id] then
			local value = valueOf(stats, record)
			if isBeaten(record, value) then
				stats.broken[record.id] = true
				table.insert(newlyBroken, {
					id = record.id,
					label = record.label,
					holder = record.holder,
					target = record.target,
					value = value,
				})
			end
		end
	end
	return newlyBroken
end

function Records.view(profile)
	local stats = profile.stats
	local list = {}
	for _, record in ipairs(Config.Records) do
		local value = valueOf(stats, record)
		local progress
		if record.lowerIsBetter then
			progress = value > 0 and math.clamp(record.target / value, 0, 1) or 0
		else
			progress = math.clamp(value / record.target, 0, 1)
		end
		local function fmt(v)
			if record.isTime then
				return v > 0 and string.format("%.2fs", v) or "-"
			end
			return tostring(math.floor(v))
		end
		table.insert(list, {
			id = record.id,
			label = record.label,
			holder = record.holder,
			targetText = fmt(record.target),
			valueText = fmt(value),
			progress = progress,
			broken = stats.broken[record.id] == true,
		})
	end
	return {
		records = list,
		summary = {
			races = stats.races,
			wins = stats.teamWins,
			podiums = stats.teamPodiums,
			poles = stats.teamPoles,
			points = stats.teamPoints,
			constructorsTitles = stats.constructorsTitles,
		},
	}
end

return Records
