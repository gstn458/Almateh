--[[
	Config (ModuleScript)
	Location: ReplicatedStorage > Shared > Config

	Every balance number, name list, tyre, weather type and record target lives here,
	so you can tweak the game without touching the other scripts.
	Both the server and the client read this file.
]]

local Config = {}

---------------------------------------------------------------------
-- Saving
---------------------------------------------------------------------
Config.DataStoreName = "TeamPrincipalCareer_v1"
Config.SaveKeyPrefix = "career_"
Config.AutoSaveSeconds = 90

---------------------------------------------------------------------
-- Economy (all money is in dollars)
---------------------------------------------------------------------
Config.StartingBudget = 75000000
Config.StartingUpgradePoints = 3
Config.RoundsPerSeason = 18

Config.Points = { 25, 18, 15, 12, 10, 8, 6, 4, 2, 1 }

-- Prize money paid for each of your cars, by finishing position.
Config.PrizeMoney = { 4000000, 3200000, 2600000, 2100000, 1800000, 1500000, 1250000, 1000000, 800000, 600000 }
Config.PrizeOutsidePoints = 400000

-- Sponsor income paid after every race.
Config.SponsorBasePerRace = 2500000
Config.SponsorPerPoint = 60000
Config.SponsorPodiumBonus = 1000000
Config.SponsorWinBonus = 1500000

-- Paid at the end of each season, by constructors' championship position.
Config.ConstructorsPrize = { 30000000, 26000000, 22000000, 19000000, 16000000, 14000000, 12000000, 10000000, 8000000, 6000000 }

Config.SalaryRate = 0.03 -- salary per race = this x hiring fee
Config.SeveranceRate = 0.25 -- firing someone costs this x hiring fee

---------------------------------------------------------------------
-- Car development
---------------------------------------------------------------------
Config.Upgrade = {
	Step = 3,
	Max = 100,
	BaseCost = 2000000,
	CostPerRatingSquared = 8000, -- upgrades get much more expensive as a rating climbs
	PointsCost = 3,
	Areas = { "aero", "power", "chassis", "reliability" },
	Labels = {
		aero = "Aerodynamics",
		power = "Power Unit",
		chassis = "Chassis",
		reliability = "Reliability",
	},
	Descriptions = {
		aero = "Cornering speed. Matters most on twisty tracks.",
		power = "Straight-line speed. Matters most on fast tracks.",
		chassis = "All-round balance and tyre care.",
		reliability = "Fewer engine failures and breakdowns.",
	},
}
Config.PlayerStartCar = { aero = 68, power = 69, chassis = 67, reliability = 70 }
Config.AIDevelopmentPerRound = 0.2 -- average rating points AI teams gain per area per round
-- New regulations each winter pull every car's ratings a little back towards 55,
-- so the championship stays a fight. 0.9 = keep 90% of the gap above 55.
Config.SeasonRegulationFactor = 0.9

Config.CrewTraining = { Cost = 1500000, Step = 2, Max = 100 }

---------------------------------------------------------------------
-- Staff market
---------------------------------------------------------------------
Config.Market = {
	Drivers = 10,
	Crews = 5,
	Strategists = 5,
	RefreshEveryRounds = 3,
	RefreshCost = 500000,
}

Config.FirstNames = {
	"Adrian", "Bruno", "Caio", "Dario", "Emil", "Fabian", "Gabriel", "Henrik", "Ivo", "Jonas",
	"Kian", "Leon", "Marek", "Nico", "Otto", "Paolo", "Quentin", "Rory", "Stefan", "Tomas",
	"Umberto", "Victor", "Wesley", "Xavier", "Yannick", "Zane", "Andre", "Bastian", "Cyril", "Dante",
	"Elio", "Finn", "Gustav", "Hamza", "Isak", "Joel", "Kazuki", "Lorenzo", "Milo", "Noah",
}
Config.LastNames = {
	"Albescu", "Bergstrom", "Castellano", "Dumont", "Eriksen", "Falcone", "Garrido", "Hartmann", "Iversen", "Jaramillo",
	"Kowalczyk", "Lindahl", "Montague", "Nakashima", "Oyelaran", "Pellegrini", "Quist", "Rasmussen", "Silvestri", "Taniguchi",
	"Underwood", "Valtonen", "Whitlock", "Yilmaz", "Zielinski", "Abernathy", "Bellucci", "Corvino", "Delacroix", "Esterhazy",
	"Fontaine", "Grimaldo", "Holloway", "Ishikawa", "Jovanovic", "Kessler", "Lacroix", "Marchetti", "Navarro", "Ostrowski",
}
Config.Nations = { "GBR", "ITA", "GER", "FRA", "ESP", "BRA", "JPN", "AUS", "NED", "FIN", "SWE", "MEX", "CAN", "USA", "DEN", "POL", "NZL", "ARG" }
Config.CrewNicknames = { "Lightning", "Quickfire", "Steel", "Thunder", "Precision", "Rapid", "Velocity", "Clockwork", "Falcon", "Cobalt" }

---------------------------------------------------------------------
-- Player team choices
---------------------------------------------------------------------
Config.PlayerTeamNames = { "Phoenix Racing", "Nova Motorsport", "Apex Union GP", "Stormline Racing", "Zenith F Team", "Kestrel Grand Prix" }
Config.PlayerColors = {
	{ name = "Orange", color = Color3.fromRGB(255, 128, 0) },
	{ name = "Teal", color = Color3.fromRGB(0, 190, 170) },
	{ name = "Purple", color = Color3.fromRGB(140, 70, 220) },
	{ name = "Gold", color = Color3.fromRGB(230, 185, 40) },
	{ name = "Pink", color = Color3.fromRGB(255, 90, 170) },
	{ name = "Lime", color = Color3.fromRGB(140, 220, 40) },
	{ name = "Sky", color = Color3.fromRGB(80, 170, 255) },
	{ name = "Black", color = Color3.fromRGB(35, 35, 40) },
}

---------------------------------------------------------------------
-- AI teams and their drivers (all fictional)
-- Driver stats are 0-100: pace, consistency, wet, overtaking, tyres (tyre management)
---------------------------------------------------------------------
Config.AITeams = {
	{
		id = "T1", name = "Vortex Racing", color = Color3.fromRGB(30, 60, 160),
		car = { aero = 92, power = 91, chassis = 91, reliability = 90 },
		crew = { speed = 93, reliability = 90 }, strategist = 88,
		drivers = {
			{ name = "Luca Moretti", code = "MOR", nation = "ITA", age = 27, pace = 95, consistency = 90, wet = 93, overtaking = 91, tyres = 88 },
			{ name = "Kenji Arakawa", code = "ARA", nation = "JPN", age = 25, pace = 88, consistency = 85, wet = 84, overtaking = 82, tyres = 86 },
		},
	},
	{
		id = "T2", name = "Crimson Falcon", color = Color3.fromRGB(200, 20, 30),
		car = { aero = 90, power = 93, chassis = 89, reliability = 85 },
		crew = { speed = 90, reliability = 82 }, strategist = 78,
		drivers = {
			{ name = "Rafael Duarte", code = "DUA", nation = "BRA", age = 29, pace = 92, consistency = 86, wet = 88, overtaking = 90, tyres = 84 },
			{ name = "Theo Marchand", code = "MAR", nation = "FRA", age = 26, pace = 90, consistency = 84, wet = 85, overtaking = 86, tyres = 85 },
		},
	},
	{
		id = "T3", name = "Silverline GP", color = Color3.fromRGB(170, 175, 185),
		car = { aero = 89, power = 90, chassis = 90, reliability = 92 },
		crew = { speed = 88, reliability = 92 }, strategist = 90,
		drivers = {
			{ name = "Jack Penrose", code = "PEN", nation = "GBR", age = 33, pace = 91, consistency = 92, wet = 94, overtaking = 89, tyres = 91 },
			{ name = "Oscar Lindqvist", code = "LIN", nation = "SWE", age = 22, pace = 87, consistency = 80, wet = 82, overtaking = 84, tyres = 80 },
		},
	},
	{
		id = "T4", name = "Emerald Rapid", color = Color3.fromRGB(0, 120, 80),
		car = { aero = 86, power = 85, chassis = 86, reliability = 86 },
		crew = { speed = 85, reliability = 86 }, strategist = 80,
		drivers = {
			{ name = "Elias Brandt", code = "BRA", nation = "GER", age = 31, pace = 87, consistency = 90, wet = 86, overtaking = 83, tyres = 90 },
			{ name = "Mateo Ibarra", code = "IBA", nation = "ESP", age = 24, pace = 85, consistency = 79, wet = 80, overtaking = 85, tyres = 78 },
		},
	},
	{
		id = "T5", name = "Bluewave Motorsport", color = Color3.fromRGB(0, 150, 230),
		car = { aero = 83, power = 84, chassis = 82, reliability = 84 },
		crew = { speed = 82, reliability = 84 }, strategist = 75,
		drivers = {
			{ name = "Hugo Lambert", code = "LAM", nation = "BEL", age = 28, pace = 84, consistency = 83, wet = 87, overtaking = 80, tyres = 82 },
			{ name = "Aiden Clarke", code = "CLA", nation = "AUS", age = 23, pace = 83, consistency = 76, wet = 78, overtaking = 82, tyres = 77 },
		},
	},
	{
		id = "T6", name = "Ironclad Racing", color = Color3.fromRGB(90, 90, 95),
		car = { aero = 80, power = 82, chassis = 80, reliability = 88 },
		crew = { speed = 80, reliability = 88 }, strategist = 72,
		drivers = {
			{ name = "Nikolai Varga", code = "VAR", nation = "HUN", age = 30, pace = 82, consistency = 85, wet = 80, overtaking = 78, tyres = 84 },
			{ name = "Sam Okafor", code = "OKA", nation = "NGA", age = 21, pace = 81, consistency = 72, wet = 76, overtaking = 80, tyres = 74 },
		},
	},
	{
		id = "T7", name = "Solaris F Team", color = Color3.fromRGB(240, 200, 0),
		car = { aero = 79, power = 78, chassis = 79, reliability = 80 },
		crew = { speed = 78, reliability = 80 }, strategist = 70,
		drivers = {
			{ name = "Diego Salvatierra", code = "SAL", nation = "MEX", age = 32, pace = 81, consistency = 80, wet = 79, overtaking = 84, tyres = 80 },
			{ name = "Felix Novak", code = "NOV", nation = "CZE", age = 24, pace = 79, consistency = 75, wet = 77, overtaking = 76, tyres = 76 },
		},
	},
	{
		id = "T8", name = "Nordic Thunder", color = Color3.fromRGB(255, 255, 255),
		car = { aero = 76, power = 77, chassis = 76, reliability = 78 },
		crew = { speed = 76, reliability = 78 }, strategist = 68,
		drivers = {
			{ name = "Liam O'Connell", code = "OCO", nation = "IRL", age = 26, pace = 79, consistency = 78, wet = 81, overtaking = 77, tyres = 78 },
			{ name = "Ravi Menon", code = "MEN", nation = "IND", age = 22, pace = 77, consistency = 72, wet = 74, overtaking = 75, tyres = 75 },
		},
	},
	{
		id = "T9", name = "Vanguard Racing", color = Color3.fromRGB(120, 20, 60),
		car = { aero = 73, power = 75, chassis = 73, reliability = 76 },
		crew = { speed = 74, reliability = 76 }, strategist = 65,
		drivers = {
			{ name = "Callum Reid", code = "REI", nation = "NZL", age = 34, pace = 77, consistency = 82, wet = 78, overtaking = 74, tyres = 81 },
			{ name = "Pieter Vos", code = "VOS", nation = "NED", age = 20, pace = 76, consistency = 68, wet = 72, overtaking = 76, tyres = 70 },
		},
	},
}

---------------------------------------------------------------------
-- Tyres
-- pace: extra seconds per lap on a dry track (Soft is the fastest)
-- wear: tyre wear in % per lap (the race is shorter than a real one, so wear is faster)
---------------------------------------------------------------------
Config.TyreOrder = { "Soft", "Medium", "Hard", "Inter", "Wet" }
Config.Tyres = {
	Soft = { name = "Soft", short = "S", kind = "slick", color = Color3.fromRGB(235, 45, 45), pace = 0.0, wear = 8.5 },
	Medium = { name = "Medium", short = "M", kind = "slick", color = Color3.fromRGB(245, 205, 40), pace = 0.6, wear = 5.6 },
	Hard = { name = "Hard", short = "H", kind = "slick", color = Color3.fromRGB(240, 240, 240), pace = 1.1, wear = 3.9 },
	Inter = { name = "Intermediate", short = "I", kind = "inter", color = Color3.fromRGB(60, 200, 80), pace = 0.0, wear = 4.8 },
	Wet = { name = "Wet", short = "W", kind = "wet", color = Color3.fromRGB(40, 130, 240), pace = 0.0, wear = 3.8 },
}

---------------------------------------------------------------------
-- Weather
-- rain: rain strength 0-1. The track's wetness slowly moves towards this value.
---------------------------------------------------------------------
Config.WeatherOrder = { "Dry", "Overcast", "LightRain", "HeavyRain" }
Config.Weather = {
	Dry = { label = "Dry", rain = 0, dryRate = 0.0016 },
	Overcast = { label = "Overcast", rain = 0, dryRate = 0.0008 },
	LightRain = { label = "Light Rain", rain = 0.4, dryRate = 0 },
	HeavyRain = { label = "Heavy Rain", rain = 0.92, dryRate = 0 },
}

---------------------------------------------------------------------
-- Race weekend
---------------------------------------------------------------------
Config.Race = {
	DistanceFactor = 0.32, -- races are this fraction of the real race distance
	MinLaps = 12,
	MaxLaps = 26,
	SimSpeeds = { 4, 8, 16 }, -- how many times faster than real time the race plays
	SnapshotInterval = 0.35, -- seconds between race updates sent to the client
	StartFuel = 100,
	FuelSecondsPerKg = 0.03,
	SafetyCarMinLaps = 3,
	SafetyCarMaxLaps = 4,
	TakeoverMinProgress = 0.5, -- you can take the wheel after half distance...
	TakeoverBattleGap = 1.3, -- ...when your car is within this many seconds of another car
	TakeoverAnyTimeLapsLeft = 4, -- ...or at any time in the last few laps
	QualiCutoffs = { 15, 10 }, -- cars still running after Q1 and after Q2
	PracticeSessionSeconds = 3600,
}

Config.PracticePrograms = {
	{ id = "setup", label = "Setup work", desc = "Find a better setup: faster in qualifying and the race." },
	{ id = "long", label = "Long runs", desc = "Learn the tyres: less tyre wear in the race." },
	{ id = "quali", label = "Qualifying runs", desc = "Practise one-lap pace: faster in qualifying." },
}

Config.SessionOrder = { "FP1", "FP2", "FP3", "Q1", "Q2", "Q3", "Race" }

---------------------------------------------------------------------
-- Track building (sizes are in studs; 1 stud = 1 metre of the real track)
---------------------------------------------------------------------
Config.Track = {
	Origin = Vector3.new(0, 200, 0), -- tracks are built high above the default baseplate
	Scale = 1.0,
	Width = 26,
	Runoff = 16,
	StreetRunoff = 4,
	SampleSpacing = 4,
	PitLaneOffset = 34,
	PitLaneWidth = 14,
}

---------------------------------------------------------------------
-- "Take the wheel" driving
-- Speeds are studs per second. The car is arcade-style: grip limits how hard
-- it can turn, so brake before corners.
---------------------------------------------------------------------
Config.Drive = {
	TopSpeed = 92,
	LateralGrip = 34,
	Accel = 14,
	Brake = 40,
	HumanFactor = 1.06, -- you only need to be within 6% of the perfect line to match your driver's pace
	MaxCheatFactor = 1.3, -- the server rejects movement faster than this x top speed
	QualiMaxGainRatio = 0.97, -- a driven lap can be at most 3% faster than the driver's ideal lap
}

---------------------------------------------------------------------
-- Objectives (daily ones reset at midnight UTC, weekly ones on Monday UTC)
-- mode "count": add up progress. "below": a single value at or under target.
-- "atLeast": a single value at or above target.
---------------------------------------------------------------------
Config.DailyObjectiveCount = 3
Config.WeeklyObjectiveCount = 3
Config.DailyObjectives = {
	{ id = "d_podium", text = "Score a podium", event = "podium", target = 1, reward = { money = 2000000, points = 1 } },
	{ id = "d_points2", text = "Finish in the points with both cars", event = "doublePoints", target = 1, reward = { money = 1500000, points = 1 } },
	{ id = "d_pit25", text = "Make a pit stop under 2.5s", event = "pitStop", mode = "below", target = 2.5, reward = { money = 1000000, points = 1 } },
	{ id = "d_practice", text = "Complete 3 practice sessions", event = "practice", target = 3, reward = { money = 800000, points = 1 } },
	{ id = "d_gain5", text = "Gain 5 places in a race with one car", event = "placesGained", mode = "atLeast", target = 5, reward = { money = 1500000, points = 1 } },
	{ id = "d_takeover", text = "Take the wheel during a race", event = "takeover", target = 1, reward = { money = 1000000, points = 1 } },
	{ id = "d_fastlap", text = "Set the fastest lap of a race", event = "fastestLap", target = 1, reward = { money = 1200000, points = 1 } },
	{ id = "d_race", text = "Complete a race weekend", event = "raceComplete", target = 1, reward = { money = 1000000, points = 1 } },
	{ id = "d_q3", text = "Get a car into Q3", event = "q3", target = 1, reward = { money = 1000000, points = 1 } },
}
Config.WeeklyObjectives = {
	{ id = "w_win", text = "Win a race", event = "win", target = 1, reward = { money = 6000000, points = 3 } },
	{ id = "w_wetwin", text = "Win in the wet", event = "wetWin", target = 1, reward = { money = 8000000, points = 4 } },
	{ id = "w_podium3", text = "Score 3 podiums", event = "podium", target = 3, reward = { money = 5000000, points = 3 } },
	{ id = "w_pole", text = "Take pole position", event = "pole", target = 1, reward = { money = 4000000, points = 2 } },
	{ id = "w_points50", text = "Score 50 points", event = "points", target = 50, reward = { money = 5000000, points = 3 } },
	{ id = "w_pit22", text = "Make a pit stop under 2.2s", event = "pitStop", mode = "below", target = 2.2, reward = { money = 4000000, points = 2 } },
	{ id = "w_drivelap", text = "Drive a Q3 lap yourself and qualify top 3", event = "driveQ3Top3", target = 1, reward = { money = 5000000, points = 3 } },
	{ id = "w_races3", text = "Complete 3 race weekends", event = "raceComplete", target = 3, reward = { money = 4000000, points = 2 } },
}

---------------------------------------------------------------------
-- HISTORICAL RECORD TARGETS
-- !! PLEASE VERIFY THESE NUMBERS !!
-- They are real Formula 1 records as known when this game was written
-- (end of the 2025 season). Records change, so check them against an
-- up-to-date source such as the official F1 website or Wikipedia, and edit
-- "target" and "holder" below if anything is out of date.
-- Note: real seasons have 22-24 races; this game's seasons have 18.
--
-- stat: which of your career stats is compared (see the Records module).
-- lowerIsBetter: true for times, where a smaller number beats the record.
---------------------------------------------------------------------
Config.Records = {
	{ id = "seasonWins", label = "Most wins in a season (one driver)", target = 19, holder = "Max Verstappen, 2023", stat = "bestSeasonDriverWins" },
	{ id = "seasonTeamWins", label = "Most wins in a season (team)", target = 21, holder = "Red Bull Racing, 2023", stat = "bestSeasonTeamWins" },
	{ id = "seasonPoles", label = "Most poles in a season (one driver)", target = 15, holder = "Sebastian Vettel, 2011", stat = "bestSeasonDriverPoles" },
	{ id = "seasonPodiums", label = "Most podiums in a season (one driver)", target = 21, holder = "Max Verstappen, 2023", stat = "bestSeasonDriverPodiums" },
	{ id = "seasonPoints", label = "Most points in a season (one driver)", target = 575, holder = "Max Verstappen, 2023", stat = "bestSeasonDriverPoints" },
	{ id = "consecutiveWins", label = "Most consecutive wins (one driver)", target = 10, holder = "Max Verstappen, 2023", stat = "bestConsecutiveWins" },
	{ id = "driverTitles", label = "Most drivers' championships (one driver)", target = 7, holder = "Michael Schumacher and Lewis Hamilton", stat = "bestDriverTitles" },
	{ id = "constructorTitles", label = "Most constructors' championships", target = 16, holder = "Ferrari", stat = "constructorsTitles" },
	{ id = "careerWins", label = "Most race wins in a career (one driver)", target = 105, holder = "Lewis Hamilton", stat = "bestCareerWins" },
	{ id = "careerPoles", label = "Most pole positions in a career (one driver)", target = 104, holder = "Lewis Hamilton", stat = "bestCareerPoles" },
	{ id = "careerPodiums", label = "Most podiums in a career (one driver)", target = 202, holder = "Lewis Hamilton", stat = "bestCareerPodiums" },
	{ id = "fastestPit", label = "Fastest pit stop", target = 1.80, holder = "McLaren, Qatar 2023", stat = "fastestPitStop", lowerIsBetter = true, isTime = true },
}

---------------------------------------------------------------------
-- Small helpers used by both server and client
---------------------------------------------------------------------
function Config.formatMoney(amount)
	amount = amount or 0
	local sign = amount < 0 and "-" or ""
	local a = math.abs(amount)
	if a >= 1000000 then
		return string.format("%s$%.1fM", sign, a / 1000000)
	elseif a >= 1000 then
		return string.format("%s$%dK", sign, math.floor(a / 1000))
	end
	return string.format("%s$%d", sign, math.floor(a))
end

function Config.formatLapTime(seconds)
	if not seconds or seconds <= 0 or seconds ~= seconds then
		return "--:--.---"
	end
	local m = math.floor(seconds / 60)
	local s = seconds - m * 60
	return string.format("%d:%06.3f", m, s)
end

function Config.formatGap(seconds)
	if not seconds then
		return ""
	end
	return string.format("+%.3f", seconds)
end

function Config.driverOverall(d)
	if not d then
		return 0
	end
	return math.floor(d.pace * 0.4 + d.consistency * 0.15 + d.wet * 0.15 + d.overtaking * 0.15 + d.tyres * 0.15 + 0.5)
end

function Config.teamColor(teamId, playerColorIndex)
	if teamId == "PLAYER" then
		local entry = Config.PlayerColors[playerColorIndex or 1] or Config.PlayerColors[1]
		return entry.color
	end
	for _, t in ipairs(Config.AITeams) do
		if t.id == teamId then
			return t.color
		end
	end
	return Color3.fromRGB(200, 200, 200)
end

return Config
