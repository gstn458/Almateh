# Team Principal: complete game

You run a Formula 1-style team. Hire drivers, a pit crew and strategists, develop
your car, then run every race weekend: three practice sessions, knockout
qualifying (Q1, Q2, Q3) and a live 3D race with changing weather. Call pit
stops, choose tyres and take the wheel yourself in the big moments. Seasons
have 18 rounds and go on forever, and the long-term goal is to beat real F1
records.

Everything is made from scripts: the 18 circuits, the cars, the menus and the
podium. You only paste 22 scripts into Roblox Studio.

This page has the setup guide, then every script in full, in order.

## Setup guide

### One-time Studio settings

1. Open Roblox Studio and create a new place from the **Baseplate** template.
2. Publish it: **File > Publish to Roblox**. Saving only works in a published place.
3. Go to **Home > Game Settings > Security** and turn on
   **Enable Studio Access to API Services**. Click **Save**.
   Without this the game still works, but your career is not saved between tests.

### Make the folders

In the **Explorer** panel (View > Explorer if you can't see it):

1. Right-click **ReplicatedStorage** > Insert Object > **Folder**. Rename it `Shared`.
2. Right-click **ReplicatedStorage** > Insert Object > **Folder**. Rename it `ClientModules`.
3. Right-click **ServerScriptService** > Insert Object > **Folder**. Rename it `ServerModules`.

### Add the scripts

For every file in the table below:

1. Right-click the location shown > **Insert Object** > the script type shown
   (ModuleScript, Script or LocalScript).
2. Rename it to the exact file name (capital letters matter, no `.lua`).
3. Open it, delete the text that is already there (for example
   `print("Hello world!")` or `local module = {}`), and paste the whole file.

| # | File name | Script type | Location in Studio |
|---|---|---|---|
| 1 | Config | ModuleScript | ReplicatedStorage > Shared |
| 2 | Tracks | ModuleScript | ReplicatedStorage > Shared |
| 3 | TrackPath | ModuleScript | ReplicatedStorage > Shared |
| 4 | DataManager | ModuleScript | ServerScriptService > ServerModules |
| 5 | TeamManager | ModuleScript | ServerScriptService > ServerModules |
| 6 | Weather | ModuleScript | ServerScriptService > ServerModules |
| 7 | TyreModel | ModuleScript | ServerScriptService > ServerModules |
| 8 | Radio | ModuleScript | ServerScriptService > ServerModules |
| 9 | RaceSim | ModuleScript | ServerScriptService > ServerModules |
| 10 | Objectives | ModuleScript | ServerScriptService > ServerModules |
| 11 | Records | ModuleScript | ServerScriptService > ServerModules |
| 12 | WeekendManager | ModuleScript | ServerScriptService > ServerModules |
| 13 | GameServer | Script | ServerScriptService |
| 14 | UIKit | ModuleScript | ReplicatedStorage > ClientModules |
| 15 | TrackBuilder | ModuleScript | ReplicatedStorage > ClientModules |
| 16 | RaceViewer | ModuleScript | ReplicatedStorage > ClientModules |
| 17 | DriveController | ModuleScript | ReplicatedStorage > ClientModules |
| 18 | HubPanels | ModuleScript | ReplicatedStorage > ClientModules |
| 19 | HubUI | ModuleScript | ReplicatedStorage > ClientModules |
| 20 | PodiumScene | ModuleScript | ReplicatedStorage > ClientModules |
| 21 | RaceUI | ModuleScript | ReplicatedStorage > ClientModules |
| 22 | ClientMain | LocalScript | StarterPlayer > StarterPlayerScripts |

The files in this folder are laid out the same way:
`ReplicatedStorage/Shared`, `ReplicatedStorage/ClientModules`,
`ServerScriptService/ServerModules`, `ServerScriptService/GameServer.lua` and
`StarterPlayerScripts/ClientMain.lua`.

When you are done, your Explorer should look like this:

```
ReplicatedStorage
  ClientModules   (Folder: UIKit, TrackBuilder, RaceViewer, DriveController,
                   HubPanels, HubUI, PodiumScene, RaceUI)
  Shared          (Folder: Config, Tracks, TrackPath)
ServerScriptService
  GameServer      (Script)
  ServerModules   (Folder: DataManager, TeamManager, Weather, TyreModel, Radio,
                   RaceSim, Objectives, Records, WeekendManager)
StarterPlayer
  StarterPlayerScripts
    ClientMain    (LocalScript)
```

Press **Play**. A "Remotes" folder appears in ReplicatedStorage by itself while
the game runs; you don't need to make it.

### Before you publish the game for others

The historical record targets are in **Config**, near the bottom, under
"HISTORICAL RECORD TARGETS". They are real F1 records as of the end of the
2025 season. Please check them against an up-to-date source and edit them if
needed.

## The scripts

Each script below is complete. Copy everything inside the code block.


### 1. Config (ModuleScript, ReplicatedStorage > Shared)

```lua
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
```


### 2. Tracks (ModuleScript, ReplicatedStorage > Shared)

```lua
--[[
	Tracks (ModuleScript)
	Location: ReplicatedStorage > Shared > Tracks

	The 18 circuits of the season, in calendar order. Each circuit is a list of
	centreline waypoints in metres: {x, y} or {x, y, height}. x points east and
	y points north. Points are listed in racing direction and the first point
	is the start/finish line. TrackPath turns them into a smooth racing line and
	TrackBuilder turns that into road parts, kerbs, walls and a pit lane.

	Circuit names are made up. The shapes follow the real circuits they are
	based on.

	Fields:
	  lengthM            lap length in metres
	  realLaps           laps in the real race (the game races a shorter distance)
	  baseLap            lap time in seconds for a top car on new soft tyres and low fuel
	  abrasion           tyre wear multiplier (1 = normal)
	  overtakeDifficulty 0 = easy to pass, 1 = nearly impossible
	  powerSensitivity   0 = all about cornering, 1 = all about top speed
	  pitLoss            seconds lost driving through the pit lane (without the stop itself)
	  rainChance         chance that a weekend is a rainy one
	  pitSide            1 = pit lane on the right of the main straight, -1 = left
	  pitHalf            half the length of the pit lane, in metres

	Centreline data is derived from the "f1-circuits" GeoJSON dataset:
	Copyright (c) 2019-2025 Tomislav Bacinger, released under the MIT License.
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this data, to deal in it without restriction, provided this copyright
	notice and permission notice are included. The data is provided "as is",
	without warranty of any kind.
]]

local Tracks = {}

Tracks.List = {
	{
		id = "desert",
		name = "Desert Night Circuit",
		description = "A floodlit desert track with heavy braking zones and rough asphalt.",
		lengthM = 5418,
		realLaps = 57,
		baseLap = 89.8,
		abrasion = 1.3,
		overtakeDifficulty = 0.3,
		powerSensitivity = 0.55,
		pitLoss = 23,
		rainChance = 0.03,
		night = true,
		street = false,
		pitSide = -1,
		pitHalf = 200,
		points = {
			{-362,-51}, {-352,286}, {-343,507}, {-339,517}, {-330,518}, {-321,516}, {-314,510}, {-268,464}, {-256,459}, {-242,460}, {-163,486}, {-144,488},
			{-127,487}, {393,387}, {411,381}, {420,371}, {423,359}, {421,347}, {415,333}, {404,319}, {391,308}, {373,295}, {310,248}, {260,196},
			{248,184}, {238,166}, {215,116}, {207,105}, {195,97}, {184,90}, {165,88}, {108,98}, {93,97}, {77,94}, {64,87}, {48,73},
			{-68,-74}, {-79,-84}, {-95,-86}, {-105,-78}, {-108,-63}, {-108,-39}, {-80,127}, {-64,231}, {-62,251}, {-65,270}, {-69,284}, {-77,298},
			{-124,339}, {-131,342}, {-138,340}, {-142,333}, {-159,205}, {-164,120}, {-172,-34}, {-178,-194}, {-184,-340}, {-182,-364}, {-172,-379}, {-158,-387},
			{-137,-391}, {-116,-389}, {-89,-384}, {-62,-371}, {-39,-355}, {-16,-332}, {-3,-309}, {23,-243}, {37,-215}, {51,-199}, {68,-184}, {90,-171},
			{119,-164}, {152,-163}, {175,-169}, {206,-183}, {287,-223}, {303,-236}, {317,-250}, {324,-263}, {333,-278}, {333,-291}, {326,-304}, {312,-318},
			{292,-333}, {-321,-676}, {-333,-682}, {-350,-683}, {-358,-675}, {-385,-618}, {-388,-595}, {-387,-551}, {-379,-313},
		},
	},
	{
		id = "corniche",
		name = "Red Sea Corniche Circuit",
		description = "The fastest street track: flowing walls-close corners by the sea.",
		lengthM = 6196,
		realLaps = 50,
		baseLap = 88.0,
		abrasion = 0.85,
		overtakeDifficulty = 0.45,
		powerSensitivity = 0.75,
		pitLoss = 20,
		rainChance = 0.03,
		night = true,
		street = true,
		pitSide = 1,
		pitHalf = 200,
		points = {
			{243,-877}, {102,-466}, {94,-459}, {87,-458}, {55,-468}, {46,-466}, {39,-462}, {33,-454}, {29,-443}, {35,-411}, {59,-337}, {61,-326},
			{62,-305}, {52,-247}, {21,-62}, {18,-24}, {11,-12}, {-21,1}, {-37,10}, {-49,21}, {-65,47}, {-74,73}, {-75,105}, {-71,130},
			{-64,144}, {-41,178}, {-33,197}, {-29,216}, {-32,246}, {-44,296}, {-58,318}, {-67,326}, {-88,341}, {-99,349}, {-107,358}, {-113,381},
			{-111,477}, {-108,498}, {-87,525}, {-71,537}, {-32,550}, {-21,556}, {-8,578}, {0,621}, {6,654}, {21,703}, {32,733}, {40,783},
			{43,816}, {42,854}, {37,1004}, {25,1197}, {21,1210}, {10,1225}, {-5,1235}, {-26,1243}, {-49,1239}, {-63,1232}, {-78,1222}, {-90,1198},
			{-96,1166}, {-95,1138}, {-89,1115}, {-56,1057}, {-39,1030}, {-24,990}, {-18,965}, {-14,930}, {-15,903}, {-19,871}, {-29,838}, {-42,810},
			{-60,776}, {-74,744}, {-80,708}, {-80,684}, {-80,666}, {-86,651}, {-96,639}, {-112,630}, {-147,620}, {-171,600}, {-182,581}, {-186,566},
			{-192,534}, {-193,499}, {-193,474}, {-191,447}, {-187,418}, {-175,382}, {-144,316}, {-123,265}, {-112,221}, {-107,182}, {-108,145}, {-111,122},
			{-110,73}, {-107,60}, {-104,37}, {-91,-3}, {-79,-29}, {-63,-56}, {-37,-98}, {-19,-129}, {-6,-163}, {8,-214}, {13,-251}, {15,-294},
			{14,-332}, {9,-368}, {1,-415}, {-4,-431}, {-9,-446}, {-8,-459}, {-4,-473}, {6,-488}, {17,-498}, {44,-519}, {57,-535}, {68,-557},
			{86,-638}, {86,-658}, {78,-682}, {61,-714}, {5,-824}, {-8,-857}, {-19,-896}, {-23,-924}, {-25,-949}, {-20,-1006}, {-5,-1062}, {4,-1097},
			{14,-1130}, {26,-1172}, {46,-1215}, {74,-1267}, {94,-1296}, {119,-1328}, {154,-1369}, {199,-1409}, {242,-1438}, {331,-1500}, {356,-1510}, {372,-1506},
			{386,-1496}, {395,-1481}, {394,-1464}, {371,-1360}, {326,-1145}, {303,-1062}, {282,-994},
		},
	},
	{
		id = "lakeside",
		name = "Lakeside Park Circuit",
		description = "A quick park circuit wrapped around a lake.",
		lengthM = 5274,
		realLaps = 58,
		baseLap = 76.5,
		abrasion = 0.9,
		overtakeDifficulty = 0.55,
		powerSensitivity = 0.5,
		pitLoss = 19,
		rainChance = 0.22,
		night = false,
		street = false,
		pitSide = -1,
		pitHalf = 200,
		points = {
			{-152,-427}, {-241,-339}, {-373,-204}, {-381,-197}, {-384,-186}, {-384,-181}, {-381,-177}, {-377,-166}, {-369,-153}, {-365,-136}, {-362,-115}, {-362,-100},
			{-366,-70}, {-372,-55}, {-381,-39}, {-392,-27}, {-415,-3}, {-443,22}, {-483,60}, {-531,112}, {-550,132}, {-601,196}, {-626,230}, {-652,271},
			{-703,360}, {-715,385}, {-723,403}, {-722,414}, {-718,421}, {-707,426}, {-671,432}, {-604,446}, {-596,449}, {-591,453}, {-588,457}, {-583,472},
			{-582,487}, {-587,619}, {-588,667}, {-587,671}, {-573,688}, {-560,698}, {-459,770}, {-437,783}, {-334,825}, {-295,839}, {-259,861}, {-232,877},
			{-220,879}, {-211,879}, {-202,874}, {-190,860}, {-176,848}, {-157,834}, {-132,825}, {-100,821}, {-71,820}, {-47,816}, {-20,807}, {4,795},
			{31,775}, {49,759}, {66,736}, {83,707}, {93,678}, {98,655}, {101,636}, {126,503}, {126,487}, {123,467}, {117,447}, {109,429},
			{95,410}, {83,395}, {69,376}, {62,362}, {56,347}, {52,330}, {24,184}, {22,166}, {21,145}, {21,125}, {22,90}, {27,63},
			{34,32}, {43,2}, {55,-24}, {68,-49}, {88,-81}, {102,-101}, {130,-131}, {222,-213}, {236,-224}, {250,-231}, {260,-236}, {279,-242},
			{298,-243}, {320,-243}, {341,-242}, {361,-242}, {378,-242}, {392,-246}, {406,-253}, {416,-258}, {434,-274}, {535,-360}, {573,-392}, {591,-414},
			{605,-430}, {620,-454}, {635,-489}, {650,-533}, {690,-671}, {714,-759}, {719,-784}, {721,-796}, {722,-804}, {715,-807}, {696,-814}, {606,-851},
			{513,-888}, {506,-890}, {494,-891}, {480,-890}, {466,-884}, {451,-874}, {442,-866}, {434,-853}, {379,-751}, {345,-697}, {341,-690}, {336,-686},
			{332,-684}, {324,-684}, {318,-687}, {258,-755}, {250,-763}, {241,-768}, {230,-773}, {220,-775}, {211,-775}, {200,-773}, {185,-768}, {174,-760},
			{170,-756},
		},
	},
	{
		id = "figure8",
		name = "Figure-Eight Circuit",
		description = "A legendary figure-of-eight with flowing esses and a bridge crossover.",
		lengthM = 5813,
		realLaps = 53,
		baseLap = 88.8,
		abrasion = 1.2,
		overtakeDifficulty = 0.6,
		powerSensitivity = 0.5,
		pitLoss = 22,
		rainChance = 0.3,
		night = false,
		street = false,
		pitSide = -1,
		pitHalf = 200,
		points = {
			{685,-138}, {806,-284}, {948,-458}, {961,-476}, {968,-495}, {971,-512}, {971,-529}, {969,-542}, {953,-593}, {945,-607}, {933,-617}, {924,-622},
			{906,-626}, {891,-626}, {874,-620}, {857,-607}, {841,-583}, {758,-454}, {742,-441}, {728,-437}, {708,-433}, {665,-433}, {643,-427}, {628,-416},
			{616,-402}, {610,-388}, {591,-314}, {583,-295}, {570,-279}, {555,-268}, {536,-259}, {516,-255}, {466,-255}, {443,-250}, {427,-243}, {411,-230},
			{399,-212}, {391,-194}, {388,-177}, {388,-161}, {391,-147}, {416,-80}, {420,-66}, {420,-48}, {418,-36}, {411,-19}, {401,-4}, {383,9},
			{360,21}, {334,35}, {310,44}, {293,49}, {268,53}, {240,53}, {218,53}, {200,48}, {185,41}, {162,31}, {137,18}, {109,-5},
			{87,-28}, {-5,-140}, {-9,-146}, {-24,-150}, {-159,-162}, {-167,-161}, {-177,-155}, {-180,-144}, {-182,-135}, {-202,-51}, {-230,107}, {-235,136},
			{-236,150}, {-235,166}, {-232,181}, {-226,197}, {-219,214}, {-197,263}, {-195,271}, {-196,278}, {-200,285}, {-207,289}, {-215,292}, {-223,291},
			{-232,285}, {-240,275}, {-271,220}, {-297,179}, {-314,154}, {-328,138}, {-340,128}, {-360,112}, {-382,100}, {-404,93}, {-444,88}, {-481,86},
			{-509,88}, {-543,95}, {-579,106}, {-621,121}, {-646,133}, {-669,147}, {-690,162}, {-712,182}, {-735,208}, {-750,230}, {-764,254}, {-798,343},
			{-816,383}, {-825,398}, {-837,410}, {-853,417}, {-873,421}, {-896,420}, {-918,417}, {-939,413}, {-959,404}, {-976,391}, {-986,375}, {-990,359},
			{-989,339}, {-984,324}, {-978,309}, {-966,297}, {-944,276}, {-915,252}, {-888,228}, {-853,201}, {-813,174}, {-772,149}, {-726,127}, {-686,106},
			{-644,90}, {-575,66}, {-500,37}, {-410,5,0.4}, {-319,-23,6.5}, {-257,-45,10.9}, {-177,-75,10.9}, {-158,-80,9.8}, {-140,-81,8.6}, {-120,-77,7.1}, {-101,-72,5.6}, {-67,-59,2.9},
			{-36,-43,0.9}, {-10,-27}, {17,-6}, {68,42}, {138,107}, {157,123}, {171,133}, {184,141}, {192,146}, {197,147}, {204,144}, {219,130},
			{231,121}, {240,118}, {249,120}, {259,126}, {276,142}, {295,155}, {316,164}, {341,166}, {365,165}, {391,160}, {416,150}, {438,139},
			{465,121}, {489,99}, {514,71},
		},
	},
	{
		id = "riverside",
		name = "Riverside Classic Circuit",
		description = "An old-school anticlockwise track beside a river.",
		lengthM = 4899,
		realLaps = 63,
		baseLap = 75.5,
		abrasion = 1.0,
		overtakeDifficulty = 0.75,
		powerSensitivity = 0.55,
		pitLoss = 26,
		rainChance = 0.25,
		night = false,
		street = false,
		pitSide = -1,
		pitHalf = 200,
		points = {
			{326,356}, {293,356}, {90,400}, {17,408}, {-25,408}, {-237,389}, {-341,365}, {-354,356}, {-361,348}, {-362,341}, {-370,308}, {-376,297},
			{-389,288}, {-485,240}, {-499,224}, {-654,-160}, {-655,-170}, {-655,-183}, {-639,-242}, {-639,-252}, {-644,-263}, {-650,-271}, {-833,-428}, {-839,-437},
			{-841,-448}, {-838,-459}, {-831,-473}, {-823,-480}, {-813,-483}, {-798,-483}, {-502,-445}, {-468,-442}, {-419,-445}, {-383,-450}, {-334,-460}, {-283,-469},
			{-257,-474}, {-241,-471}, {-228,-465}, {-212,-449}, {-196,-420}, {-171,-357}, {-165,-330}, {-163,-299}, {-168,-268}, {-204,-97}, {-204,-87}, {-199,-74},
			{-178,-41}, {-150,1}, {-142,6}, {-132,7}, {-124,3}, {-84,-13}, {-71,-15}, {355,-12}, {360,-14}, {366,-27}, {370,-38}, {374,-41},
			{383,-41}, {553,29}, {575,41}, {646,90}, {686,127}, {726,166}, {822,261}, {841,274}, {862,285}, {988,340}, {997,350}, {998,364},
			{996,376}, {958,456}, {949,463}, {939,466}, {926,467}, {915,464}, {746,400}, {686,377}, {654,365}, {625,359}, {606,355},
		},
	},
	{
		id = "riviera",
		name = "Riviera Street Circuit",
		description = "Tight harbour streets, a hairpin and a tunnel. Overtaking is almost impossible.",
		lengthM = 3325,
		realLaps = 78,
		baseLap = 71.0,
		abrasion = 0.6,
		overtakeDifficulty = 0.95,
		powerSensitivity = 0.15,
		pitLoss = 20,
		rainChance = 0.15,
		night = false,
		street = true,
		pitSide = -1,
		pitHalf = 150,
		points = {
			{153,251}, {151,261}, {153,270}, {159,283}, {165,291}, {182,313}, {268,431}, {274,439}, {283,442}, {294,438}, {302,432}, {307,422},
			{308,411}, {308,402}, {309,395}, {314,386}, {319,379}, {329,365}, {335,353}, {338,346}, {341,342}, {346,340}, {352,342}, {357,347},
			{358,353}, {355,359}, {348,365}, {325,393}, {322,400}, {322,407}, {324,412}, {326,417}, {337,422}, {353,426}, {362,430}, {371,433},
			{384,438}, {398,439}, {405,435}, {408,424}, {405,358}, {395,289}, {384,246}, {372,215}, {352,180}, {329,150}, {295,113}, {247,83},
			{218,69}, {163,43}, {125,31}, {70,18}, {35,12}, {16,8}, {13,3}, {13,-2}, {12,-7}, {9,-13}, {1,-16}, {-10,-17},
			{-23,-10}, {-29,-10}, {-129,-23}, {-178,-30}, {-223,-37}, {-236,-39}, {-244,-41}, {-250,-47}, {-259,-65}, {-267,-84}, {-274,-102}, {-277,-115},
			{-280,-137}, {-280,-176}, {-280,-185}, {-277,-192}, {-271,-198}, {-259,-207}, {-250,-215}, {-247,-223}, {-245,-235}, {-231,-317}, {-227,-331}, {-226,-336},
			{-227,-342}, {-230,-347}, {-238,-352}, {-246,-356}, {-248,-362}, {-247,-373}, {-237,-400}, {-229,-420}, {-221,-436}, {-206,-456}, {-188,-475}, {-175,-482},
			{-160,-489}, {-152,-493}, {-149,-497}, {-144,-510}, {-146,-517}, {-153,-521}, {-183,-529}, {-200,-531}, {-211,-532}, {-221,-530}, {-227,-526}, {-231,-522},
			{-231,-513}, {-232,-505}, {-235,-496}, {-252,-475}, {-264,-455}, {-274,-441}, {-284,-412}, {-307,-334}, {-313,-308}, {-317,-281}, {-323,-242}, {-327,-190},
			{-327,-157}, {-326,-131}, {-323,-104}, {-318,-86}, {-312,-69}, {-310,-59}, {-308,-50}, {-309,-36}, {-309,-28}, {-306,-23}, {-299,-19}, {-282,-15},
			{-267,-14}, {-246,-12}, {-217,-8}, {-192,-4}, {-126,16}, {-90,26}, {-56,31}, {-33,33}, {-15,39}, {36,64}, {59,73}, {92,81},
			{120,85}, {147,89}, {161,94}, {179,106}, {195,122}, {204,136}, {208,150}, {207,165}, {205,180}, {199,195}, {192,210}, {180,219},
			{169,230}, {163,235}, {158,240},
		},
	},
	{
		id = "catalan",
		name = "Catalan Hills Circuit",
		description = "A complete test of a car with a long main straight.",
		lengthM = 4664,
		realLaps = 66,
		baseLap = 72.2,
		abrasion = 1.25,
		overtakeDifficulty = 0.6,
		powerSensitivity = 0.45,
		pitLoss = 22,
		rainChance = 0.12,
		night = false,
		street = false,
		pitSide = -1,
		pitHalf = 200,
		points = {
			{322,115}, {198,-83}, {129,-193}, {58,-306}, {-17,-426}, {-43,-467}, {-51,-476}, {-58,-482}, {-64,-485}, {-76,-487}, {-86,-486}, {-94,-484},
			{-101,-480}, {-127,-464}, {-135,-460}, {-150,-457}, {-161,-457}, {-178,-460}, {-188,-466}, {-259,-520}, {-269,-525}, {-280,-529}, {-294,-533}, {-307,-535},
			{-318,-535}, {-330,-535}, {-344,-533}, {-358,-529}, {-374,-521}, {-382,-514}, {-390,-508}, {-397,-502}, {-415,-477}, {-424,-459}, {-430,-438}, {-432,-424},
			{-434,-406}, {-433,-388}, {-431,-369}, {-423,-338}, {-414,-313}, {-405,-293}, {-395,-278}, {-271,-80}, {-264,-73}, {-253,-67}, {-234,-62}, {-221,-64},
			{-211,-67}, {-200,-73}, {-187,-83}, {-179,-93}, {-169,-113}, {-165,-128}, {-164,-151}, {-165,-165}, {-168,-181}, {-175,-197}, {-188,-221}, {-278,-362},
			{-280,-371}, {-281,-380}, {-278,-390}, {-274,-397}, {-270,-402}, {-262,-407}, {-254,-410}, {-247,-412}, {-235,-409}, {-230,-407}, {-94,-346}, {-75,-334},
			{-57,-320}, {-38,-302}, {-25,-286}, {29,-201}, {35,-189}, {38,-180}, {35,-166}, {29,-153}, {18,-144}, {-7,-129}, {-20,-118}, {-28,-110},
			{-35,-99}, {-39,-92}, {-73,-11}, {-111,80}, {-114,96}, {-114,112}, {-113,124}, {-110,136}, {-103,150}, {-97,159}, {-85,173}, {-72,183},
			{360,404}, {375,413}, {383,421}, {386,429}, {387,439}, {384,450}, {379,459}, {372,466}, {361,474}, {344,481}, {333,484}, {319,486},
			{306,487}, {293,486}, {280,482}, {260,473}, {247,465}, {229,449}, {210,436}, {198,430}, {178,429}, {166,431}, {152,438}, {141,448},
			{134,459}, {129,471}, {127,484}, {127,491}, {130,508}, {137,521}, {148,531}, {251,616}, {261,625}, {274,632}, {285,636}, {302,639},
			{318,639}, {332,636}, {344,631}, {369,616}, {396,598}, {419,582}, {434,573}, {485,541}, {498,532}, {506,524}, {513,514}, {518,503},
			{523,489}, {526,475}, {526,455}, {523,438}, {509,410},
		},
	},
	{
		id = "island",
		name = "Island Canal Circuit",
		description = "Long straights and chicanes on an island, with a famous final wall.",
		lengthM = 4365,
		realLaps = 70,
		baseLap = 72.8,
		abrasion = 0.8,
		overtakeDifficulty = 0.35,
		powerSensitivity = 0.75,
		pitLoss = 19,
		rainChance = 0.3,
		night = false,
		street = true,
		pitSide = 1,
		pitHalf = 200,
		points = {
			{250,-288}, {273,-398}, {291,-479}, {301,-538}, {302,-588}, {287,-720}, {290,-736}, {300,-745}, {340,-763}, {347,-769}, {351,-780}, {350,-792},
			{344,-803}, {334,-812}, {320,-817}, {303,-817}, {283,-813}, {237,-800}, {206,-790}, {176,-773}, {147,-754}, {81,-698}, {42,-661}, {35,-650},
			{33,-640}, {33,-631}, {40,-610}, {42,-597}, {41,-586}, {36,-577}, {-39,-486}, {-52,-474}, {-78,-456}, {-93,-444}, {-109,-422}, {-119,-398},
			{-125,-374}, {-127,-355}, {-127,-211}, {-127,-199}, {-132,-190}, {-141,-183}, {-157,-179}, {-179,-184}, {-191,-186}, {-207,-181}, {-220,-173}, {-229,-164},
			{-237,-153}, {-242,-143}, {-249,-123}, {-255,-99}, {-262,-68}, {-263,-43}, {-272,67}, {-271,126}, {-269,174}, {-265,226}, {-260,268}, {-254,300},
			{-215,456}, {-209,471}, {-200,476}, {-190,478}, {-176,479}, {-165,483}, {-154,489}, {-142,501}, {-134,516}, {-126,535}, {-88,691}, {-72,775},
			{-67,834}, {-65,895}, {-66,915}, {-68,936}, {-96,1074}, {-97,1083}, {-96,1090}, {-90,1097}, {-77,1099}, {-69,1097}, {-64,1091}, {-62,1085},
			{-59,1054}, {-54,1007}, {-52,991}, {-46,974}, {-26,933}, {-8,896}, {83,661}, {94,631}, {228,-14}, {234,-41}, {233,-49}, {227,-56},
			{216,-60}, {209,-67}, {206,-75}, {207,-85}, {231,-197},
		},
	},
	{
		id = "alpine",
		name = "Alpine Ring",
		description = "A short, fast lap in the mountains with big braking zones.",
		lengthM = 4302,
		realLaps = 71,
		baseLap = 65.0,
		abrasion = 1.0,
		overtakeDifficulty = 0.3,
		powerSensitivity = 0.65,
		pitLoss = 20,
		rainChance = 0.25,
		night = false,
		street = false,
		pitSide = -1,
		pitHalf = 200,
		points = {
			{235,-377}, {149,-400}, {-65,-458}, {-79,-459}, {-89,-450}, {-106,-418}, {-158,-348}, {-215,-267}, {-260,-196}, {-300,-125}, {-367,20}, {-385,59},
			{-413,104}, {-457,157}, {-529,229}, {-595,296}, {-599,305}, {-599,314}, {-591,319}, {-574,322}, {-519,329}, {-465,331}, {-408,330}, {-355,325},
			{-293,315}, {-103,278}, {-16,267}, {171,259}, {187,254}, {196,243}, {199,232}, {199,219}, {194,208}, {175,181}, {160,163}, {133,139},
			{103,123}, {67,111}, {27,105}, {-14,107}, {-173,133}, {-195,130}, {-212,124}, {-227,114}, {-241,99}, {-249,83}, {-254,64}, {-255,48},
			{-252,29}, {-247,16}, {-170,-120}, {-157,-134}, {-136,-147}, {-113,-152}, {-90,-150}, {-66,-140}, {-51,-128}, {-36,-109}, {-21,-91}, {-6,-75},
			{12,-63}, {34,-50}, {64,-39}, {95,-32}, {342,-27}, {533,-22}, {553,-23}, {573,-30}, {589,-42}, {602,-58}, {612,-79}, {650,-210},
			{653,-222}, {650,-231}, {646,-238}, {631,-250}, {611,-262}, {585,-275}, {555,-288}, {520,-299},
		},
	},
	{
		id = "airfield",
		name = "Old Airfield Circuit",
		description = "High-speed sweepers on a former airfield.",
		lengthM = 5878,
		realLaps = 52,
		baseLap = 86.5,
		abrasion = 1.25,
		overtakeDifficulty = 0.4,
		powerSensitivity = 0.55,
		pitLoss = 21,
		rainChance = 0.35,
		night = false,
		street = false,
		pitSide = -1,
		pitHalf = 200,
		points = {
			{69,780}, {255,797}, {289,795}, {314,786}, {331,775}, {351,752}, {363,726}, {373,693}, {387,637}, {402,582}, {410,521}, {414,483},
			{419,390}, {421,311}, {424,280}, {436,251}, {458,211}, {467,188}, {467,170}, {463,150}, {431,66}, {429,33}, {434,9}, {446,-12},
			{477,-55}, {484,-75}, {485,-99}, {480,-120}, {461,-144}, {436,-161}, {403,-180}, {377,-196}, {359,-213}, {338,-249}, {297,-326}, {70,-744},
			{-5,-860}, {-26,-888}, {-43,-903}, {-62,-913}, {-83,-918}, {-102,-917}, {-123,-912}, {-141,-904}, {-157,-892}, {-170,-872}, {-174,-864}, {-194,-820},
			{-217,-780}, {-241,-748}, {-258,-728}, {-276,-708}, {-309,-674}, {-382,-587}, {-390,-582}, {-400,-581}, {-410,-586}, {-441,-613}, {-451,-617}, {-462,-616},
			{-471,-612}, {-483,-600}, {-497,-587}, {-513,-565}, {-525,-541}, {-534,-517}, {-541,-490}, {-542,-479}, {-540,-468}, {-534,-457}, {-519,-434}, {-296,-143},
			{-246,-78}, {-235,-66}, {-217,-54}, {-195,-49}, {-177,-48}, {-153,-50}, {-84,-61}, {-61,-64}, {-38,-65}, {-11,-61}, {13,-55}, {35,-42},
			{177,71}, {187,77}, {198,83}, {210,84}, {219,81}, {227,73}, {232,65}, {256,-20}, {263,-32}, {273,-39}, {285,-40}, {298,-34},
			{306,-24}, {311,-13}, {321,15}, {329,39}, {336,62}, {339,84}, {341,108}, {339,133}, {334,144}, {322,158}, {-140,579}, {-152,587},
			{-170,596}, {-191,599}, {-213,596}, {-236,585}, {-244,575}, {-250,561}, {-259,484}, {-264,469}, {-276,456}, {-293,448}, {-311,445}, {-332,450},
			{-346,460}, {-355,472}, {-362,485}, {-363,500}, {-361,516}, {-349,541}, {-290,659}, {-271,682}, {-252,701}, {-226,724}, {-204,739}, {-176,751},
			{-152,758}, {-102,765},
		},
	},
	{
		id = "valley",
		name = "Valley Twister Circuit",
		description = "A tight, twisty track in a hot valley. Track position is everything.",
		lengthM = 4377,
		realLaps = 70,
		baseLap = 76.0,
		abrasion = 1.0,
		overtakeDifficulty = 0.85,
		powerSensitivity = 0.25,
		pitLoss = 21,
		rainChance = 0.15,
		night = false,
		street = false,
		pitSide = -1,
		pitHalf = 200,
		points = {
			{-372,-277}, {-572,-117}, {-631,-71}, {-636,-62}, {-640,-53}, {-639,-43}, {-635,-35}, {-629,-30}, {-621,-26}, {-610,-25}, {-594,-25}, {-548,-26},
			{-518,-31}, {-490,-39}, {-460,-51}, {-438,-63}, {-421,-75}, {-258,-204}, {-246,-210}, {-235,-213}, {-223,-213}, {-214,-210}, {-204,-206}, {-196,-200},
			{-189,-192}, {-185,-186}, {-181,-176}, {-179,-163}, {-180,-156}, {-183,-146}, {-186,-136}, {-233,-57}, {-238,-42}, {-239,-30}, {-236,-20}, {-233,-8},
			{-228,4}, {-177,106}, {-85,291}, {-69,321}, {-50,346}, {-26,374}, {-21,382}, {-17,390}, {-16,399}, {-19,409}, {-61,566}, {-62,578},
			{-60,590}, {-57,601}, {-52,612}, {-43,621}, {-33,629}, {-22,635}, {-11,637}, {3,636}, {16,633}, {33,626}, {51,615}, {64,606},
			{79,595}, {95,582}, {115,561}, {200,469}, {204,460}, {205,453}, {205,446}, {200,440}, {193,433}, {187,427}, {185,422}, {186,413},
			{188,402}, {219,285}, {226,269}, {230,263}, {235,257}, {242,252}, {250,249}, {265,246}, {329,237}, {343,232}, {351,226}, {358,220},
			{365,210}, {367,201}, {369,191}, {369,179}, {367,167}, {351,54}, {351,34}, {352,21}, {356,8}, {361,-4}, {424,-105}, {430,-120},
			{431,-131}, {432,-140}, {430,-151}, {428,-161}, {424,-171}, {416,-180}, {308,-302}, {212,-414}, {179,-450}, {171,-455}, {163,-456}, {156,-455},
			{150,-451}, {144,-446}, {78,-371}, {68,-361}, {17,-320}, {9,-315}, {0,-311}, {-11,-310}, {-20,-311}, {-33,-317}, {-40,-325}, {-46,-334},
			{-49,-342}, {-50,-352}, {-48,-363}, {-44,-373}, {-38,-381}, {61,-460}, {79,-477}, {84,-486}, {88,-499}, {90,-513}, {89,-527}, {84,-538},
			{79,-549}, {71,-559}, {57,-568}, {43,-573}, {27,-576}, {11,-573}, {-4,-568}, {-18,-558},
		},
	},
	{
		id = "ardennes",
		name = "Ardennes Forest Circuit",
		description = "The longest lap of the year through a rainy forest.",
		lengthM = 6979,
		realLaps = 44,
		baseLap = 114.0,
		abrasion = 1.05,
		overtakeDifficulty = 0.25,
		powerSensitivity = 0.8,
		pitLoss = 19,
		rainChance = 0.5,
		night = false,
		street = false,
		pitSide = -1,
		pitHalf = 200,
		points = {
			{-259,1067}, {-372,1265}, {-373,1274}, {-368,1282}, {-358,1286}, {-346,1282}, {-309,1264}, {-218,1220}, {-175,1193}, {-129,1160}, {-89,1126}, {-56,1091},
			{117,884}, {129,873}, {150,860}, {187,835}, {204,819}, {217,797}, {226,777}, {232,755}, {237,713}, {240,698}, {245,685}, {255,667},
			{340,530}, {395,443}, {410,411}, {419,387}, {431,348}, {499,109}, {604,-253}, {628,-340}, {630,-354}, {627,-370}, {619,-382}, {606,-393},
			{591,-401}, {582,-410}, {575,-420}, {570,-436}, {571,-452}, {592,-546}, {592,-562}, {588,-577}, {577,-593}, {564,-604}, {325,-769}, {310,-775},
			{295,-776}, {279,-771}, {266,-762}, {256,-748}, {253,-734}, {252,-720}, {256,-706}, {265,-692}, {277,-682}, {381,-618}, {393,-606}, {399,-594},
			{402,-581}, {400,-564}, {357,-437}, {344,-385}, {313,-226}, {298,-134}, {295,-118}, {287,-101}, {277,-88}, {262,-73}, {245,-62}, {227,-55},
			{207,-52}, {145,-47}, {121,-50}, {99,-56}, {77,-66}, {59,-78}, {38,-97}, {25,-116}, {10,-144}, {-49,-292}, {-102,-424}, {-113,-444},
			{-127,-458}, {-145,-469}, {-164,-474}, {-181,-475}, {-198,-471}, {-213,-464}, {-237,-448}, {-253,-441}, {-272,-438}, {-291,-440}, {-309,-446}, {-324,-457},
			{-334,-469}, {-346,-485}, {-442,-637}, {-452,-646}, {-464,-652}, {-478,-655}, {-494,-654}, {-508,-648}, {-573,-600}, {-612,-572}, {-621,-559}, {-631,-544},
			{-637,-530}, {-641,-512}, {-642,-494}, {-639,-473}, {-633,-455}, {-624,-431}, {-611,-395}, {-588,-355}, {-564,-320}, {-526,-277}, {-463,-216}, {-426,-187},
			{-395,-169}, {-233,-85}, {-209,-70}, {-187,-53}, {-167,-33}, {-149,-12}, {-133,10}, {-111,50}, {-93,89}, {-53,179}, {-46,198}, {-42,219},
			{-41,245}, {-45,269}, {-69,330}, {-95,398}, {-126,482}, {-134,513}, {-142,551}, {-146,585}, {-149,615}, {-159,750}, {-157,759}, {-151,766},
			{-143,768}, {-129,766}, {-114,766}, {-104,768}, {-97,775}, {-96,783}, {-100,794}, {-151,879},
		},
	},
	{
		id = "dunes",
		name = "Dune Coast Circuit",
		description = "A narrow rollercoaster among sand dunes with banked corners.",
		lengthM = 4256,
		realLaps = 72,
		baseLap = 71.3,
		abrasion = 1.1,
		overtakeDifficulty = 0.8,
		powerSensitivity = 0.35,
		pitLoss = 22,
		rainChance = 0.3,
		night = false,
		street = false,
		pitSide = -1,
		pitHalf = 200,
		points = {
			{-343,81}, {-234,344}, {-193,441}, {-183,451}, {-171,457}, {-157,459}, {-144,457}, {-132,448}, {-123,438}, {-119,425}, {-119,411}, {-131,383},
			{-165,299}, {-176,260}, {-181,219}, {-178,181}, {-182,165}, {-191,155}, {-207,141}, {-226,134}, {-276,114}, {-289,104}, {-293,90}, {-293,77},
			{-288,63}, {-278,54}, {-266,49}, {-247,49}, {-155,79}, {-112,87}, {-75,88}, {-42,86}, {-11,80}, {11,74}, {47,66}, {80,63},
			{104,68}, {132,75}, {166,93}, {207,119}, {234,132}, {258,139}, {290,142}, {315,142}, {420,135}, {444,130}, {467,119}, {483,105},
			{493,90}, {503,74}, {508,54}, {510,34}, {508,14}, {502,-6}, {490,-28}, {441,-94}, {424,-123}, {383,-210}, {364,-217}, {340,-220},
			{317,-219}, {290,-214}, {262,-205}, {232,-190}, {203,-169}, {184,-149}, {181,-136}, {184,-123}, {195,-107}, {212,-96}, {236,-87}, {277,-81},
			{316,-71}, {352,-57}, {372,-43}, {379,-27}, {380,-8}, {374,10}, {357,27}, {342,32}, {265,41}, {187,41}, {104,31}, {34,13},
			{-10,0}, {-58,-18}, {-104,-38}, {-141,-60}, {-155,-66}, {-164,-64}, {-174,-51}, {-183,-33}, {-197,-24}, {-214,-24}, {-231,-31}, {-240,-44},
			{-244,-57}, {-240,-83}, {-202,-303}, {-201,-317}, {-206,-332}, {-212,-345}, {-219,-353}, {-235,-364}, {-252,-368}, {-324,-369}, {-339,-368}, {-360,-365},
			{-382,-358}, {-400,-349}, {-425,-330}, {-441,-309}, {-451,-291}, {-459,-266}, {-462,-245}, {-459,-210}, {-453,-185}, {-349,68},
		},
	},
	{
		id = "royalpark",
		name = "Royal Park Speedway",
		description = "The temple of speed: huge straights and chicanes in a royal park.",
		lengthM = 5787,
		realLaps = 53,
		baseLap = 80.0,
		abrasion = 0.75,
		overtakeDifficulty = 0.25,
		powerSensitivity = 0.95,
		pitLoss = 24,
		rainChance = 0.15,
		night = false,
		street = false,
		pitSide = -1,
		pitHalf = 200,
		points = {
			{-417,-494}, {-381,-65}, {-364,114}, {-362,122}, {-357,126}, {-351,127}, {-343,126}, {-336,125}, {-329,126}, {-324,130}, {-320,135}, {-320,139},
			{-320,145}, {-345,243}, {-349,269}, {-350,294}, {-349,320}, {-339,448}, {-335,469}, {-331,488}, {-324,509}, {-314,532}, {-304,554}, {-288,578},
			{-272,599}, {-250,622}, {-227,642}, {-201,661}, {-173,677}, {-141,693}, {-109,704}, {-74,714}, {-35,721}, {6,724}, {164,738}, {357,750},
			{369,751}, {375,754}, {380,759}, {386,782}, {389,788}, {393,792}, {401,795}, {427,799}, {456,806}, {497,819}, {677,880}, {693,883},
			{708,883}, {722,881}, {732,876}, {742,871}, {751,864}, {763,852}, {769,842}, {774,830}, {776,816}, {784,730}, {799,583}, {798,570},
			{796,562}, {792,555}, {786,549}, {775,542}, {657,478}, {561,424}, {501,391}, {472,374}, {439,351}, {416,333}, {395,316}, {290,225},
			{216,158}, {58,19}, {-36,-64}, {-49,-77}, {-54,-85}, {-55,-94}, {-55,-104}, {-52,-126}, {-51,-138}, {-51,-155}, {-53,-165}, {-56,-177},
			{-62,-191}, {-71,-205}, {-83,-220}, {-98,-232}, {-109,-240}, {-115,-247}, {-120,-257}, {-124,-274}, {-134,-353}, {-144,-438}, {-222,-1194}, {-225,-1222},
			{-228,-1234}, {-235,-1247}, {-244,-1258}, {-254,-1267}, {-268,-1277}, {-284,-1282}, {-302,-1286}, {-317,-1285}, {-331,-1281}, {-348,-1275}, {-364,-1268}, {-376,-1259},
			{-390,-1248}, {-406,-1231}, {-417,-1215}, {-427,-1199}, {-435,-1179}, {-443,-1157}, {-449,-1134}, {-452,-1115}, {-455,-1085}, {-455,-1056}, {-456,-1028}, {-457,-973},
			{-458,-925}, {-457,-873}, {-451,-804}, {-429,-587},
		},
	},
	{
		id = "marina",
		name = "Marina Night Street Circuit",
		description = "A hot, humid night race with dozens of 90-degree corners.",
		lengthM = 4942,
		realLaps = 62,
		baseLap = 90.3,
		abrasion = 0.9,
		overtakeDifficulty = 0.8,
		powerSensitivity = 0.2,
		pitLoss = 28,
		rainChance = 0.3,
		night = true,
		street = true,
		pitSide = 1,
		pitHalf = 200,
		points = {
			{688,117}, {667,269}, {657,389}, {653,403}, {647,412}, {635,417}, {610,414}, {591,420}, {568,431}, {558,440}, {552,447}, {547,455},
			{536,467}, {526,470}, {516,469}, {503,456}, {494,435}, {488,381}, {488,357}, {492,338}, {497,322}, {506,303}, {537,216}, {548,162},
			{551,122}, {548,105}, {539,87}, {523,77}, {505,68}, {491,65}, {127,87}, {98,92}, {56,108}, {-202,257}, {-211,263}, {-226,270},
			{-235,266}, {-244,253}, {-292,171}, {-329,100}, {-335,88}, {-342,87}, {-350,91}, {-442,187}, {-464,203}, {-482,214}, {-502,210}, {-508,205},
			{-522,191}, {-538,163}, {-626,5}, {-694,-117}, {-711,-146}, {-710,-161}, {-707,-178}, {-701,-190}, {-685,-205}, {-663,-220}, {-645,-231}, {-625,-239},
			{-614,-242}, {-611,-250}, {-617,-262}, {-619,-272}, {-620,-286}, {-612,-315}, {-603,-327}, {-590,-340}, {-568,-360}, {-524,-395}, {-515,-405}, {-506,-423},
			{-494,-440}, {-483,-455}, {-478,-457}, {-468,-457}, {-460,-455}, {-453,-450}, {-449,-445}, {-446,-440}, {-396,-185}, {-372,-59}, {-362,-17}, {-344,39},
			{-338,45}, {-328,51}, {-315,54}, {-305,52}, {-298,46}, {-254,9}, {-153,-80}, {-128,-92}, {-104,-99}, {-69,-103}, {217,-118}, {318,-124},
			{338,-124}, {357,-126}, {361,-131}, {360,-142}, {361,-161}, {369,-180}, {377,-189}, {388,-196}, {406,-201}, {543,-215}, {633,-220}, {652,-221},
			{660,-220}, {667,-217}, {673,-208}, {709,-154}, {716,-142}, {719,-128}, {716,-100},
		},
	},
	{
		id = "lonestar",
		name = "Lone Star Hills Circuit",
		description = "A steep climb to turn one, then flowing esses.",
		lengthM = 5521,
		realLaps = 56,
		baseLap = 93.5,
		abrasion = 1.15,
		overtakeDifficulty = 0.4,
		powerSensitivity = 0.6,
		pitLoss = 21,
		rainChance = 0.1,
		night = false,
		street = false,
		pitSide = 1,
		pitHalf = 200,
		points = {
			{-472,-383}, {-307,-515}, {-261,-547}, {-226,-568}, {-213,-574}, {-208,-576}, {-202,-575}, {-197,-572}, {-194,-566}, {-192,-562}, {-192,-556}, {-228,-453},
			{-244,-405}, {-247,-390}, {-248,-378}, {-247,-363}, {-244,-349}, {-239,-332}, {-231,-317}, {-223,-304}, {-211,-291}, {-198,-281}, {-180,-270}, {-84,-210},
			{-44,-186}, {-36,-177}, {-29,-167}, {-22,-159}, {-17,-147}, {-13,-138}, {-3,-109}, {4,-99}, {13,-88}, {24,-81}, {33,-76}, {56,-67},
			{73,-58}, {84,-51}, {90,-43}, {96,-32}, {98,-20}, {101,2}, {103,16}, {106,31}, {111,42}, {117,52}, {124,63}, {132,72},
			{144,83}, {158,93}, {172,101}, {188,108}, {202,111}, {213,111}, {223,111}, {237,107}, {332,63}, {341,60}, {351,60}, {358,63},
			{377,74}, {399,92}, {415,108}, {431,130}, {443,144}, {454,152}, {466,158}, {475,160}, {488,160}, {503,155}, {514,149}, {523,140},
			{528,134}, {533,126}, {538,117}, {545,110}, {553,107}, {561,107}, {731,144}, {742,148}, {748,152}, {754,157}, {853,278}, {941,383},
			{974,426}, {988,452}, {989,458}, {988,464}, {984,467}, {978,470}, {973,472}, {966,472}, {958,469}, {776,411}, {649,376}, {509,342},
			{341,308}, {237,291}, {140,277}, {-145,245}, {-177,239}, {-181,237}, {-183,231}, {-182,227}, {-178,221}, {-159,201}, {-95,111}, {-66,65},
			{-64,58}, {-66,49}, {-70,42}, {-77,36}, {-84,35}, {-96,33}, {-149,38}, {-154,40}, {-158,44}, {-163,50}, {-167,57}, {-178,86},
			{-182,98}, {-190,108}, {-224,144}, {-229,148}, {-236,151}, {-242,152}, {-276,155}, {-283,154}, {-287,152}, {-291,147}, {-293,141}, {-290,133},
			{-224,20}, {-198,-31}, {-195,-44}, {-196,-58}, {-198,-69}, {-201,-80}, {-208,-100}, {-219,-123}, {-225,-132}, {-237,-140}, {-250,-146}, {-304,-171},
			{-315,-174}, {-326,-174}, {-346,-173}, {-364,-170}, {-383,-164}, {-402,-156}, {-420,-146}, {-432,-137}, {-440,-123}, {-502,-36}, {-550,24}, {-557,31},
			{-564,34}, {-574,36}, {-582,35}, {-594,32}, {-609,28}, {-620,23}, {-820,-65}, {-832,-73}, {-836,-80}, {-838,-88}, {-836,-94}, {-832,-99},
			{-826,-104}, {-721,-188},
		},
	},
	{
		id = "highland",
		name = "Highland Bowl Circuit",
		description = "A short anticlockwise bowl with changeable weather.",
		lengthM = 4299,
		realLaps = 71,
		baseLap = 70.8,
		abrasion = 1.0,
		overtakeDifficulty = 0.35,
		powerSensitivity = 0.6,
		pitLoss = 21,
		rainChance = 0.45,
		night = false,
		street = false,
		pitSide = 1,
		pitHalf = 200,
		points = {
			{-191,-312}, {-132,-539}, {-126,-563}, {-120,-577}, {-106,-598}, {-98,-604}, {-88,-608}, {-78,-608}, {-66,-606}, {-61,-602}, {-42,-586}, {-24,-566},
			{-17,-561}, {-8,-557}, {1,-557}, {14,-561}, {43,-579}, {66,-588}, {82,-592}, {98,-594}, {112,-595}, {132,-593}, {148,-589}, {168,-582},
			{186,-572}, {204,-557}, {218,-542}, {230,-526}, {239,-510}, {246,-493}, {274,-401}, {285,-355}, {306,-276}, {330,-176}, {373,-12}, {389,48},
			{400,89}, {405,109}, {407,121}, {406,132}, {403,140}, {397,149}, {386,157}, {373,163}, {354,166}, {297,178}, {275,180}, {262,179},
			{245,177}, {229,172}, {215,164}, {202,156}, {189,145}, {176,131}, {159,109}, {102,32}, {68,-16}, {39,-57}, {8,-98}, {-9,-121},
			{-21,-138}, {-30,-148}, {-40,-154}, {-54,-159}, {-70,-161}, {-93,-160}, {-108,-158}, {-121,-154}, {-132,-149}, {-150,-139}, {-160,-130}, {-166,-122},
			{-172,-110}, {-177,-94}, {-182,-70}, {-187,-49}, {-193,-8}, {-194,8}, {-194,25}, {-190,38}, {-184,44}, {-179,46}, {-174,48}, {-166,49},
			{-158,47}, {-150,44}, {-127,27}, {-118,21}, {-110,18}, {-103,17}, {-96,16}, {-88,17}, {-77,21}, {-65,31}, {-58,42}, {-54,53},
			{-54,63}, {-55,74}, {-59,83}, {-69,97}, {-78,106}, {-109,137}, {-125,155}, {-136,172}, {-144,194}, {-151,221}, {-154,238}, {-155,253},
			{-154,265}, {-149,273}, {-145,278}, {-139,280}, {-134,282}, {-127,281}, {-119,277}, {-81,234}, {-48,197}, {-42,193}, {-30,184}, {-18,179},
			{-9,176}, {3,175}, {13,173}, {26,173}, {45,176}, {60,181}, {75,190}, {91,203}, {100,214}, {110,227}, {135,267}, {163,314},
			{195,366}, {197,372}, {197,379}, {195,386}, {192,393}, {184,400}, {168,409}, {144,417}, {95,436}, {85,438}, {73,440}, {48,438},
			{27,434}, {-20,424}, {-36,418}, {-67,405}, {-83,399}, {-119,379}, {-134,369}, {-146,358}, {-159,346}, {-169,334}, {-178,320}, {-187,302},
			{-193,282}, {-204,243}, {-216,193}, {-223,146}, {-236,96}, {-245,59}, {-252,33}, {-255,14}, {-255,-12}, {-254,-42}, {-250,-65}, {-245,-92},
			{-235,-130}, {-206,-251},
		},
	},
	{
		id = "gulf",
		name = "Gulf Marina Circuit",
		description = "The twilight season finale around a marina.",
		lengthM = 5294,
		realLaps = 58,
		baseLap = 83.5,
		abrasion = 0.85,
		overtakeDifficulty = 0.5,
		powerSensitivity = 0.6,
		pitLoss = 22,
		rainChance = 0.02,
		night = true,
		street = false,
		pitSide = -1,
		pitHalf = 200,
		points = {
			{-13,69}, {227,101}, {239,105}, {249,115}, {255,129}, {257,143}, {253,157}, {215,320}, {208,338}, {199,351}, {184,363}, {172,369},
			{104,391}, {81,402}, {64,414}, {49,428}, {38,441}, {29,453}, {19,477}, {15,496}, {15,516}, {19,541}, {27,566}, {43,631},
			{49,679}, {50,713}, {47,743}, {28,895}, {16,991}, {13,1002}, {11,1011}, {4,1020}, {-8,1030}, {-16,1033}, {-24,1034}, {-32,1032},
			{-41,1029}, {-47,1022}, {-51,1016}, {-56,1006}, {-71,962}, {-85,898}, {-205,540}, {-252,402}, {-278,325}, {-297,265}, {-318,191}, {-360,54},
			{-401,-69}, {-406,-81}, {-407,-90}, {-406,-95}, {-401,-101}, {-391,-101}, {-353,-96}, {-345,-96}, {-338,-105}, {-316,-187}, {-312,-202}, {-298,-236},
			{-286,-261}, {-259,-300}, {-228,-336}, {-190,-369}, {-27,-497}, {11,-527}, {40,-548}, {79,-573}, {112,-593}, {166,-619}, {216,-641}, {290,-676},
			{321,-689}, {339,-689}, {357,-685}, {375,-675}, {384,-666}, {390,-658}, {396,-645}, {399,-632}, {401,-621}, {400,-602}, {396,-588}, {390,-574},
			{382,-562}, {371,-551}, {357,-542}, {342,-535}, {320,-532}, {149,-519}, {128,-516}, {118,-514}, {109,-510}, {17,-453}, {7,-446}, {1,-438},
			{-6,-421}, {-27,-320}, {-26,-312}, {-21,-307}, {-13,-305}, {63,-293}, {72,-290}, {78,-287}, {84,-280}, {90,-269}, {92,-255}, {92,-185},
			{86,-173}, {79,-166}, {69,-162}, {55,-159}, {42,-157}, {26,-157}, {9,-158}, {-150,-183}, {-164,-184}, {-182,-183}, {-199,-180}, {-211,-176},
			{-218,-169}, {-226,-160}, {-270,-81}, {-293,-44}, {-298,-33}, {-301,-19}, {-302,-7}, {-302,8}, {-300,18}, {-294,25}, {-287,29}, {-270,32},
		},
	},
}

Tracks.ById = {}
for index, track in ipairs(Tracks.List) do
	track.round = index
	Tracks.ById[track.id] = track
end

-- Which circuit hosts a given round (1-18).
function Tracks.forRound(round)
	return Tracks.List[((round - 1) % #Tracks.List) + 1]
end

return Tracks
```


### 3. TrackPath (ModuleScript, ReplicatedStorage > Shared)

```lua
--[[
	TrackPath (ModuleScript)
	Location: ReplicatedStorage > Shared > TrackPath

	Turns a circuit's waypoint list into a smooth racing line made of evenly
	spaced samples. Both the server (race timing) and the client (drawing cars,
	driving) use it, so a car's position always matches on both sides.

	Key ideas:
	  * Distance "d" is measured in studs along the centreline from the start line.
	  * A speed profile (slow in corners, fast on straights) is worked out once.
	    "Time fraction" is how far through a lap a car is in time, which lets the
	    server say "car is 40% through its lap" and the client turn that into a
	    spot on the track where the car is slower in corners.
]]

local Shared = script.Parent
local Config = require(Shared:WaitForChild("Config"))

local TrackPath = {}

local cache = {}

-- Centripetal Catmull-Rom spline point between p1 and p2 (t from 0 to 1).
-- The centripetal version never makes loops or kinks between close points.
local function catmullRom(p0, p1, p2, p3, t)
	local function knot(a, b)
		return math.max((b - a).Magnitude ^ 0.5, 0.0001)
	end
	local t0 = 0
	local t1 = t0 + knot(p0, p1)
	local t2 = t1 + knot(p1, p2)
	local t3 = t2 + knot(p2, p3)
	local tt = t1 + (t2 - t1) * t
	local a1 = p0 * ((t1 - tt) / (t1 - t0)) + p1 * ((tt - t0) / (t1 - t0))
	local a2 = p1 * ((t2 - tt) / (t2 - t1)) + p2 * ((tt - t1) / (t2 - t1))
	local a3 = p2 * ((t3 - tt) / (t3 - t2)) + p3 * ((tt - t2) / (t3 - t2))
	local b1 = a1 * ((t2 - tt) / (t2 - t0)) + a2 * ((tt - t0) / (t2 - t0))
	local b2 = a2 * ((t3 - tt) / (t3 - t1)) + a3 * ((tt - t1) / (t3 - t1))
	return b1 * ((t2 - tt) / (t2 - t1)) + b2 * ((tt - t1) / (t2 - t1))
end

local function flat(v)
	local f = Vector3.new(v.X, 0, v.Z)
	if f.Magnitude < 1e-6 then
		return Vector3.new(0, 0, -1)
	end
	return f.Unit
end

-- Builds the speed profile and cumulative lap time for a given grip and top speed.
local function buildProfile(path, gripMul, speedMul)
	local n = path.n
	local ds = path.ds
	local vmax = Config.Drive.TopSpeed * speedMul
	local aLat = Config.Drive.LateralGrip * gripMul
	local accel = Config.Drive.Accel * math.max(0.6, speedMul)
	local brake = Config.Drive.Brake * gripMul
	local v = table.create(n, 0)
	for i = 1, n do
		local c = math.abs(path.curv[i])
		local limit = vmax
		if c > 1e-5 then
			limit = math.min(vmax, math.sqrt(aLat / c))
		end
		v[i] = math.max(limit, 12)
	end
	-- Two passes around the loop so braking and acceleration wrap past the start line.
	for _ = 1, 2 do
		for i = 1, n do
			local prev = v[(i - 2) % n + 1]
			v[i] = math.min(v[i], math.sqrt(prev * prev + 2 * accel * ds))
		end
		for i = n, 1, -1 do
			local nxt = v[i % n + 1]
			v[i] = math.min(v[i], math.sqrt(nxt * nxt + 2 * brake * ds))
		end
	end
	local times = table.create(n + 1, 0)
	local total = 0
	for i = 1, n do
		times[i] = total
		local nxt = v[i % n + 1]
		total += ds / ((v[i] + nxt) * 0.5)
	end
	times[n + 1] = total
	return v, times, total
end

function TrackPath.get(track)
	local cached = cache[track.id]
	if cached then
		return cached
	end

	local scale = Config.Track.Scale
	local origin = Config.Track.Origin
	local raw = {}
	for i, p in ipairs(track.points) do
		raw[i] = Vector3.new(p[1] * scale, p[3] or 0, -p[2] * scale)
	end
	local count = #raw

	-- 1. Smooth spline through the waypoints.
	local dense = {}
	for i = 1, count do
		local p0 = raw[(i - 2) % count + 1]
		local p1 = raw[i]
		local p2 = raw[i % count + 1]
		local p3 = raw[(i + 1) % count + 1]
		local steps = math.max(2, math.ceil((p2 - p1).Magnitude / 2))
		for s = 0, steps - 1 do
			table.insert(dense, catmullRom(p0, p1, p2, p3, s / steps))
		end
	end

	-- 2. Re-sample at an even spacing.
	local denseCount = #dense
	local cum = table.create(denseCount + 1, 0)
	for i = 2, denseCount + 1 do
		local a = dense[i - 1]
		local b = dense[(i - 1) % denseCount + 1]
		cum[i] = cum[i - 1] + (b - a).Magnitude
	end
	local length = cum[denseCount + 1]
	local n = math.max(50, math.floor(length / Config.Track.SampleSpacing))
	local ds = length / n
	local pos = table.create(n)
	local j = 1
	for i = 1, n do
		local target = (i - 1) * ds
		while j < denseCount and cum[j + 1] < target do
			j += 1
		end
		local a = dense[j]
		local b = dense[j % denseCount + 1]
		local segLen = cum[j + 1] - cum[j]
		local f = segLen > 0 and (target - cum[j]) / segLen or 0
		pos[i] = origin + a:Lerp(b, math.clamp(f, 0, 1))
	end

	-- 3. Direction, right-hand side and curvature at every sample.
	local tan = table.create(n)
	local right = table.create(n)
	for i = 1, n do
		local a = pos[(i - 2) % n + 1]
		local b = pos[i % n + 1]
		tan[i] = flat(b - a)
		right[i] = tan[i]:Cross(Vector3.yAxis)
	end
	local curv = table.create(n, 0)
	local k = 3
	for i = 1, n do
		local t1 = tan[(i - 1 - k) % n + 1]
		local t2 = tan[(i - 1 + k) % n + 1]
		local dot = math.clamp(t1:Dot(t2), -1, 1)
		local angle = math.acos(dot)
		local sign = t1:Cross(t2).Y >= 0 and 1 or -1 -- positive = left turn
		curv[i] = sign * angle / (2 * k * ds)
	end

	local path = {
		id = track.id,
		track = track,
		n = n,
		ds = ds,
		length = length,
		pos = pos,
		tan = tan,
		right = right,
		curv = curv,
		width = Config.Track.Width,
		runoff = track.street and Config.Track.StreetRunoff or Config.Track.Runoff,
		pitSide = track.pitSide or -1,
		pitHalf = track.pitHalf or 200,
		profiles = {},
	}
	local speed, times, total = buildProfile(path, 1, 1)
	path.speed = speed
	path.times = times
	path.profileTime = total
	path.profiles["1_1"] = total

	cache[track.id] = path
	return path
end

-- Ideal lap time (seconds of real driving) for a given grip and top-speed multiplier.
function TrackPath.profileTime(path, gripMul, speedMul)
	local key = string.format("%.2f_%.2f", gripMul, speedMul)
	local cachedTime = path.profiles[key]
	if cachedTime then
		return cachedTime
	end
	local _, _, total = buildProfile(path, gripMul, speedMul)
	path.profiles[key] = total
	return total
end

function TrackPath.wrap(path, d)
	return d % path.length
end

-- Position and forward direction at distance d.
function TrackPath.posAt(path, d)
	d = d % path.length
	local f = d / path.ds
	local i = math.floor(f) + 1
	local frac = f - (i - 1)
	local i2 = i % path.n + 1
	local p = path.pos[i]:Lerp(path.pos[i2], frac)
	local t = path.tan[i]:Lerp(path.tan[i2], frac)
	if t.Magnitude < 1e-6 then
		t = path.tan[i]
	end
	return p, t.Unit
end

function TrackPath.rightAt(path, d)
	local _, t = TrackPath.posAt(path, d)
	return t:Cross(Vector3.yAxis)
end

function TrackPath.indexAt(path, d)
	d = d % path.length
	return math.floor(d / path.ds) + 1
end

-- A CFrame on the track at distance d, shifted sideways by "lateral" studs (positive = right).
function TrackPath.cframeAt(path, d, lateral, height)
	local p, t = TrackPath.posAt(path, d)
	local r = t:Cross(Vector3.yAxis)
	local at = p + r * (lateral or 0) + Vector3.new(0, height or 0, 0)
	-- Look slightly ahead so cars tilt up and down over the bridge.
	local ahead = TrackPath.posAt(path, d + 4) + r * (lateral or 0) + Vector3.new(0, height or 0, 0)
	if (ahead - at).Magnitude < 0.01 then
		ahead = at + t
	end
	return CFrame.lookAt(at, ahead)
end

-- Fraction of lap time (0-1) at distance d.
function TrackPath.fracAtDist(path, d)
	d = d % path.length
	local f = d / path.ds
	local i = math.floor(f) + 1
	local frac = f - (i - 1)
	local a = path.times[i]
	local b = path.times[i + 1]
	return (a + (b - a) * frac) / path.profileTime
end

-- Distance (studs) at a fraction (0-1) of lap time. Binary search on the time table.
function TrackPath.distAtFrac(path, frac)
	frac = math.clamp(frac, 0, 1)
	local target = frac * path.profileTime
	local times = path.times
	local lo, hi = 1, path.n + 1
	while hi - lo > 1 do
		local mid = (lo + hi) // 2
		if times[mid] <= target then
			lo = mid
		else
			hi = mid
		end
	end
	local a = times[lo]
	local b = times[lo + 1] or path.profileTime
	local f = b > a and (target - a) / (b - a) or 0
	return ((lo - 1) + f) * path.ds
end

-- Finds the closest centreline point to a world position.
-- hint: index to search around (keeps the bridge crossing from confusing it).
-- Returns: index, distance along the lap, sideways offset (positive = right).
function TrackPath.nearest(path, worldPos, hint, window)
	local n = path.n
	local bestI, bestD = 1, math.huge
	local function test(i)
		local p = path.pos[i]
		local dx, dz, dy = worldPos.X - p.X, worldPos.Z - p.Z, (worldPos.Y - p.Y) * 3
		local dd = dx * dx + dz * dz + dy * dy
		if dd < bestD then
			bestD = dd
			bestI = i
		end
	end
	if hint then
		local w = window or 40
		for o = -w, w do
			test((hint - 1 + o) % n + 1)
		end
	else
		for i = 1, n do
			test(i)
		end
	end
	local p = path.pos[bestI]
	local t = path.tan[bestI]
	local offset = worldPos - p
	local along = (bestI - 1) * path.ds + offset:Dot(t)
	local lateral = offset:Dot(path.right[bestI])
	return bestI, along % path.length, lateral
end

-- Where grid slot "slot" (1 = pole) sits: distance and sideways offset.
function TrackPath.gridSlot(path, slot)
	local d = -(16 + (slot - 1) * 9)
	local lateral = (slot % 2 == 1) and -4.5 or 4.5
	return d, lateral
end

return TrackPath
```


### 4. DataManager (ModuleScript, ServerScriptService > ServerModules)

```lua
--[[
	DataManager (ModuleScript)
	Location: ServerScriptService > ServerModules > DataManager

	Loads and saves each player's career with DataStoreService.
	If DataStores are not available (for example an unpublished place in Studio,
	or "Studio Access to API Services" is turned off) the game still runs,
	it just cannot save. If loading fails for a player who may already have a
	save, saving is switched off for that session so the old save is never
	overwritten by a fresh career.
]]

local DataStoreService = game:GetService("DataStoreService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))

local DataManager = {}

local store = nil
local storeError = nil

function DataManager.init()
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore(Config.DataStoreName)
	end)
	if ok then
		store = result
	else
		storeError = tostring(result)
		warn("[DataManager] DataStores unavailable, progress will not be saved: " .. storeError)
	end
end

local function keyFor(player)
	return Config.SaveKeyPrefix .. tostring(player.UserId)
end

-- Returns: data (table or nil), status ("loaded" | "new" | "offline"), message
function DataManager.load(player)
	if not store then
		return nil, "offline", "Saving is not available here (publish the game and enable Studio Access to API Services)."
	end
	local key = keyFor(player)
	local lastErr = nil
	for attempt = 1, 3 do
		local ok, result = pcall(function()
			return store:GetAsync(key)
		end)
		if ok then
			if type(result) == "table" then
				return result, "loaded", "Career loaded."
			end
			return nil, "new", "New career started."
		end
		lastErr = tostring(result)
		warn(string.format("[DataManager] Load attempt %d failed for %s: %s", attempt, player.Name, lastErr))
		if not player.Parent then
			break
		end
		task.wait(1.5 * attempt)
	end
	-- UserId 0 or negative ids are Studio test players; their keys work like normal ones.
	return nil, "offline", "Could not load your save, so saving is off for this visit: " .. tostring(lastErr)
end

-- Saves a profile. Returns ok (boolean) and a message.
function DataManager.save(player, profile)
	if not store then
		return false, "Saving is not available."
	end
	local key = keyFor(player)
	profile.lastSaved = os.time()
	local lastErr = nil
	for attempt = 1, 3 do
		local ok, err = pcall(function()
			store:SetAsync(key, profile, { player.UserId })
		end)
		if ok then
			return true, "Saved."
		end
		lastErr = tostring(err)
		warn(string.format("[DataManager] Save attempt %d failed for %s: %s", attempt, player.Name, lastErr))
		task.wait(1 + attempt)
	end
	return false, "Save failed: " .. tostring(lastErr)
end

-- Copies any missing fields from template into data (used when the save format grows).
function DataManager.reconcile(data, template)
	for k, v in pairs(template) do
		if data[k] == nil then
			if type(v) == "table" then
				local copy = {}
				DataManager.reconcile(copy, v)
				data[k] = copy
			else
				data[k] = v
			end
		elseif type(v) == "table" and type(data[k]) == "table" and next(v) ~= nil and #v == 0 then
			-- Only fill dictionaries, never lists (lists are game data, not defaults).
			DataManager.reconcile(data[k], v)
		end
	end
	return data
end

function DataManager.isAvailable()
	return store ~= nil
end

return DataManager
```


### 5. TeamManager (ModuleScript, ServerScriptService > ServerModules)

```lua
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
```


### 6. Weather (ModuleScript, ServerScriptService > ServerModules)

```lua
--[[
	Weather (ModuleScript)
	Location: ServerScriptService > ServerModules > Weather

	Weather for a race weekend. Each circuit has its own chance of a rainy
	weekend. Inside a session the weather moves between Dry, Overcast,
	Light Rain and Heavy Rain every few minutes. "wetness" (0-1) is how much
	water is on the track: it rises while it rains and slowly dries afterwards.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))

local Weather = {}

local RAINY = { LightRain = true, HeavyRain = true }

-- Chances of moving to another weather type at each change point.
local function transitions(weatherType, bias)
	if weatherType == "Dry" then
		return { Overcast = 0.2 + 0.5 * bias }
	elseif weatherType == "Overcast" then
		return { Dry = 0.35 * (1 - bias), LightRain = 0.06 + 0.55 * bias }
	elseif weatherType == "LightRain" then
		return { Overcast = 0.3 * (1 - bias) + 0.08, HeavyRain = 0.1 + 0.35 * bias }
	else
		return { LightRain = 0.45 }
	end
end

local function pickNext(weatherType, bias, rng)
	local r = rng:NextNumber()
	local acc = 0
	for _, name in ipairs(Config.WeatherOrder) do
		local p = transitions(weatherType, bias)[name]
		if p then
			acc += p
			if r < acc then
				return name
			end
		end
	end
	return weatherType
end

-- Sets up the weekend's weather mood.
function Weather.newWeekend(track, rng)
	local rainy = rng:NextNumber() < (track.rainChance or 0.1)
	local bias
	if rainy then
		bias = rng:NextNumber(0.45, 0.8)
	else
		bias = rng:NextNumber(0, 0.1) * (0.3 + (track.rainChance or 0.1) * 2)
	end
	return { bias = bias, rainy = rainy, lastType = nil, lastWetness = 0 }
end

-- Starts the weather for one session (practice, qualifying or race).
function Weather.newSession(weekend, rng)
	local bias = weekend.bias
	local weatherType
	if weekend.lastType and rng:NextNumber() < 0.5 then
		weatherType = weekend.lastType
	else
		local r = rng:NextNumber()
		if r < bias * 0.22 then
			weatherType = "HeavyRain"
		elseif r < bias * 0.62 then
			weatherType = "LightRain"
		elseif r < 0.25 + bias * 0.75 then
			weatherType = "Overcast"
		else
			weatherType = "Dry"
		end
	end
	local rain = Config.Weather[weatherType].rain
	local wetness = weekend.lastWetness * 0.4
	if RAINY[weatherType] then
		wetness = math.max(wetness, rain * rng:NextNumber(0.7, 1))
	end
	return {
		type = weatherType,
		rain = rain,
		wetness = wetness,
		bias = bias,
		timer = 0,
		nextChange = rng:NextNumber(150, 320),
	}
end

-- Moves the weather forward by dt seconds of session time.
-- Returns the previous weather type if it changed, otherwise nil.
function Weather.step(state, dt, rng)
	local changedFrom = nil
	state.timer += dt
	if state.timer >= state.nextChange then
		state.timer = 0
		state.nextChange = rng:NextNumber(150, 320)
		local nextType = pickNext(state.type, state.bias, rng)
		if nextType ~= state.type then
			changedFrom = state.type
			state.type = nextType
		end
	end
	local cfg = Config.Weather[state.type]
	state.rain += (cfg.rain - state.rain) * math.min(1, dt / 60)
	if state.rain > 0.05 then
		-- Track gets wetter (or less wet if rain is lighter than the water on track).
		state.wetness += (state.rain - state.wetness) * math.min(1, dt * 0.004)
	else
		state.wetness = math.max(0, state.wetness - cfg.dryRate * dt)
	end
	state.wetness = math.clamp(state.wetness, 0, 1)
	return changedFrom
end

-- Remembers how the session ended so the next session starts from there.
function Weather.endSession(weekend, state)
	weekend.lastType = state.type
	weekend.lastWetness = state.wetness
end

function Weather.isRaining(state)
	return RAINY[state.type] == true
end

-- Chance (0-1) that it is raining at some point over the next two weather changes.
function Weather.rainRisk(state)
	local probs = { [state.type] = 1 }
	local risk = 0
	for _ = 1, 2 do
		local nextProbs = {}
		for name, p in pairs(probs) do
			local stay = 1
			for to, tp in pairs(transitions(name, state.bias)) do
				nextProbs[to] = (nextProbs[to] or 0) + p * tp
				stay -= tp
			end
			nextProbs[name] = (nextProbs[name] or 0) + p * stay
		end
		probs = nextProbs
		local rainNow = (probs.LightRain or 0) + (probs.HeavyRain or 0)
		risk = math.max(risk, rainNow)
	end
	return math.clamp(risk, 0, 1)
end

-- Forecast text. A strategist with poor "calls" gives a less accurate number.
function Weather.forecast(state, callsSkill, rng)
	local risk = Weather.rainRisk(state)
	local noise = (100 - (callsSkill or 60)) / 100 * 0.3
	local shown = math.clamp(risk + rng:NextNumber(-noise, noise), 0, 1)
	local pct = math.floor(shown * 10 + 0.5) * 10
	if Weather.isRaining(state) then
		return string.format("Raining now. Chance it continues: %d%%", pct)
	end
	return string.format("Chance of rain soon: %d%%", pct)
end

function Weather.public(state)
	return {
		type = state.type,
		label = Config.Weather[state.type].label,
		rain = math.floor(state.rain * 100 + 0.5) / 100,
		wetness = math.floor(state.wetness * 100 + 0.5) / 100,
	}
end

return Weather
```


### 7. TyreModel (ModuleScript, ServerScriptService > ServerModules)

```lua
--[[
	TyreModel (ModuleScript)
	Location: ServerScriptService > ServerModules > TyreModel

	How tyres affect lap time and how fast they wear.
	  * Slicks (Soft/Medium/Hard) are fastest in the dry and terrible in the wet.
	  * Intermediates are best on a damp track.
	  * Wets are best in heavy rain.
	Using the wrong tyre for the conditions costs many seconds per lap.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))

local TyreModel = {}

function TyreModel.kind(compound)
	local t = Config.Tyres[compound]
	return t and t.kind or "slick"
end

function TyreModel.isValid(compound)
	return type(compound) == "string" and Config.Tyres[compound] ~= nil
end

-- Which type of tyre suits a track this wet.
function TyreModel.idealKind(wetness)
	if wetness < 0.17 then
		return "slick"
	elseif wetness < 0.62 then
		return "inter"
	end
	return "wet"
end

-- Seconds lost per lap because of the conditions, before the driver's wet skill.
local function conditionPenalty(compound, wetness)
	local kind = TyreModel.kind(compound)
	if kind == "slick" then
		return wetness > 0.1 and (wetness - 0.1) * 30 or 0
	elseif kind == "inter" then
		return math.max(0, 0.22 - wetness) * 16 + math.max(0, wetness - 0.65) * 20
	end
	return math.max(0, 0.6 - wetness) * 11 + 0.8
end

-- Total seconds the weather costs on this tyre. Good wet-weather drivers lose less.
function TyreModel.weatherPenalty(compound, wetness, wetSkill)
	local p = conditionPenalty(compound, wetness)
	if wetness > 0.08 then
		local general = wetness * 7 -- a wet track is slower for everyone
		local skill = 1.3 - (wetSkill or 70) / 100 * 0.6
		return (p + general) * skill
	end
	return p
end

-- How many seconds per lap worse this tyre is than the best tyre right now.
function TyreModel.wrongTyreSeverity(compound, wetness)
	local best = math.huge
	for _, name in ipairs(Config.TyreOrder) do
		best = math.min(best, conditionPenalty(name, wetness) + Config.Tyres[name].pace)
	end
	return conditionPenalty(compound, wetness) + Config.Tyres[compound].pace - best
end

-- Dry pace difference between compounds (Soft is 0).
function TyreModel.basePace(compound)
	return Config.Tyres[compound].pace
end

-- Seconds lost because the tyre is worn. Past about 72% wear the tyre "falls off a cliff".
function TyreModel.wearPenalty(wear)
	local w = wear / 100
	local p = w * w * 2.2
	if wear > 72 then
		p += (wear - 72) * 0.18
	end
	return p
end

-- Wear in % for one lap.
function TyreModel.wearPerLap(compound, track, tyreSkill, wetness, longRunBonus)
	local base = Config.Tyres[compound].wear
	local mult = (track.abrasion or 1) * (1.35 - (tyreSkill or 70) / 100 * 0.6)
	local kind = TyreModel.kind(compound)
	if kind == "inter" and wetness < 0.15 then
		mult *= 2.6 -- inters overheat on a dry track
	elseif kind == "wet" and wetness < 0.35 then
		mult *= 3
	elseif kind == "slick" and wetness > 0.3 then
		mult *= 0.7
	end
	mult *= (1 - (longRunBonus or 0))
	return base * mult
end

-- Laps a compound can do before reaching the wear limit.
function TyreModel.stintLaps(compound, track, tyreSkill, wetness, longRunBonus, limit)
	local rate = TyreModel.wearPerLap(compound, track, tyreSkill, wetness, longRunBonus)
	return math.floor((limit or 75) / rate)
end

-- Best tyre to fit now.
-- lapsLeft: laps still to race. usedDry: set of dry compounds used so far.
function TyreModel.choose(wetness, lapsLeft, track, tyreSkill, longRunBonus, usedDry, wetUsed)
	local kind = TyreModel.idealKind(wetness)
	if kind == "inter" then
		return "Inter"
	elseif kind == "wet" then
		return "Wet"
	end
	-- Fastest compound that can reach the end.
	local options = { "Soft", "Medium", "Hard" }
	local pick = nil
	for _, c in ipairs(options) do
		if TyreModel.stintLaps(c, track, tyreSkill, wetness, longRunBonus, 82) >= lapsLeft then
			pick = c
			break
		end
	end
	if not pick then
		-- Cannot reach the end: Medium for a middle stint, Hard for a very long one.
		pick = lapsLeft > TyreModel.stintLaps("Medium", track, tyreSkill, wetness, longRunBonus, 75) * 1.6 and "Hard" or "Medium"
	end
	-- Dry-race rule: if this is the final stint, make sure a second dry compound gets used.
	usedDry = usedDry or {}
	local count = 0
	for _ in pairs(usedDry) do
		count += 1
	end
	if not wetUsed and count == 1 and usedDry[pick] then
		for _, c in ipairs(options) do
			if not usedDry[c] and TyreModel.stintLaps(c, track, tyreSkill, wetness, longRunBonus, 90) >= lapsLeft then
				return c
			end
		end
		for _, c in ipairs({ "Hard", "Medium", "Soft" }) do
			if not usedDry[c] then
				return c
			end
		end
	end
	return pick
end

-- Grip multiplier for the driving mode (1 = perfect dry grip).
function TyreModel.driveGrip(compound, wetness)
	local kind = TyreModel.kind(compound)
	if kind == "slick" then
		return math.clamp(1 - math.max(0, wetness - 0.08) * 0.75, 0.35, 1)
	elseif kind == "inter" then
		return math.clamp(0.9 - math.abs(wetness - 0.4) * 0.35, 0.6, 0.92)
	end
	return math.clamp(0.82 - math.max(0, 0.55 - wetness) * 0.3, 0.6, 0.84)
end

return TyreModel
```


### 8. Radio (ModuleScript, ServerScriptService > ServerModules)

```lua
--[[
	Radio (ModuleScript)
	Location: ServerScriptService > ServerModules > Radio

	Team radio messages. Each message has a speaker role (driver, engineer or
	strategist) and several wordings, so the radio doesn't repeat itself.
	Words in {curly brackets} are filled in with real race details.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Radio = {}

local remote = nil

Radio.Templates = {
	raceStart = { "engineer", {
		"Lights out and away we go! Clean start, {driver}.",
		"Here we go, {driver}. Keep it clean into turn one.",
		"Race start. Tyres are cold, be careful on the first lap.",
	} },
	gainedPlace = { "driver", {
		"Got him! Up to P{pos}.",
		"Move done, I'm P{pos} now!",
		"Easy pass. P{pos}, let's keep going.",
	} },
	lostPlace = { "driver", {
		"He got past me. I'm P{pos}.",
		"Lost a place, P{pos}. My tyres are struggling.",
	} },
	tyre50 = { "engineer", {
		"Tyres at {wear}% wear. Look after them.",
		"Your {compound}s are half gone. Manage the rears.",
	} },
	tyre70 = { "driver", {
		"The rears are going off! How long are we staying out?",
		"Tyres are at {wear}%. I'm starting to slide a lot.",
	} },
	tyre85 = { "driver", {
		"These tyres are finished! I need new ones now!",
		"I've got no grip left, box me!",
	} },
	boxCall = { "engineer", {
		"Box, box. Box this lap for {compound}s.",
		"Box this lap, box this lap. {compound}s are ready.",
	} },
	boxAdvice = { "strategist", {
		"Strategy recommends boxing {driver} now for {compound}s. Your call, boss.",
		"Boss, we should pit {driver} for {compound}s. {reason}",
	} },
	pitGood = { "engineer", {
		"Great stop, {time} seconds! Push now, push.",
		"{time} second stop, brilliant work from the crew!",
	} },
	pitOk = { "engineer", {
		"Stop done, {time} seconds. On to {compound}s.",
	} },
	pitSlow = { "engineer", {
		"Slow stop, {time} seconds. We had a problem with the {part}. Sorry.",
		"Sorry {driver}, {time} seconds. The {part} was stuck.",
	} },
	rainStart = { "strategist", {
		"Rain is starting to fall. The track will get slippery.",
		"We have rain! Watch the grip levels.",
	} },
	rainHeavy = { "strategist", {
		"Heavy rain now! Slicks will be undriveable.",
		"It's pouring down! We need wets or inters.",
	} },
	rainEasing = { "strategist", {
		"Rain is easing off.",
		"The rain is getting lighter.",
	} },
	rainStopped = { "strategist", {
		"Rain has stopped. Track will start to dry.",
		"No more rain. A dry line will appear soon.",
	} },
	wrongTyres = { "driver", {
		"I've got no grip on these tyres! Get me in!",
		"These are the wrong tyres for this, I'm losing seconds!",
	} },
	scDeployed = { "engineer", {
		"Safety car, safety car. {reason}",
		"Safety car is out. {reason} Stay off the brakes.",
	} },
	scEnding = { "engineer", {
		"Safety car in this lap. Get ready for the restart.",
		"Restart coming, warm those tyres.",
	} },
	crashOther = { "engineer", {
		"{name} has crashed. Yellow flags, be careful.",
		"{name} is out of the race.",
	} },
	retiredOther = { "engineer", {
		"{name} has stopped with a problem.",
	} },
	crashTeam = { "driver", {
		"I'm out! I lost it, I'm so sorry guys.",
		"I'm in the wall. Sorry team.",
	} },
	mechanicalTeam = { "driver", {
		"I've lost power! The engine has gone!",
		"Something's broken, I have to stop the car.",
	} },
	mistakeTeam = { "driver", {
		"Locked up and went wide. Lost some time there.",
		"Ran wide, sorry. Back on it now.",
		"Little spin! I'm OK, carrying on.",
	} },
	puncture = { "driver", {
		"Puncture! I've got a puncture!",
	} },
	gapAhead = { "engineer", {
		"Gap to {name} ahead is {gap} seconds.",
		"{name} is {gap} ahead. You're catching.",
	} },
	gapBehind = { "engineer", {
		"{name} is {gap} behind you.",
	} },
	battle = { "engineer", {
		"You're fighting {name}! Boss, you can take the wheel now.",
		"Battle with {name}. This is the moment to take control, boss.",
	} },
	fastestLap = { "engineer", {
		"Purple! Fastest lap of the race, {time}.",
		"That's the fastest lap so far, {time}!",
	} },
	lastLap = { "engineer", {
		"Last lap! Bring it home.",
		"Final lap, {driver}. Everything you've got.",
	} },
	twoCompound = { "engineer", {
		"Remember, we must use a second dry compound before the end, or get a 10 second penalty.",
	} },
	finishWin = { "driver", {
		"YES! WE WON! What a car, thank you everyone!",
		"VICTORY! Unbelievable job, team!",
	} },
	finishPodium = { "driver", {
		"Podium! P{pos}! Great job everyone!",
		"P{pos}, we're on the podium! Thanks guys!",
	} },
	finishPoints = { "engineer", {
		"P{pos}. Good points today, well done.",
		"Chequered flag, P{pos}. Solid work.",
	} },
	finishNoPoints = { "engineer", {
		"P{pos}. Not our day. We'll learn from it.",
		"P{pos} at the flag. We need more pace.",
	} },
	takeoverStart = { "engineer", {
		"You have control, boss. Bring it home!",
	} },
	takeoverEnd = { "engineer", {
		"OK, {driver} has control again.",
	} },
	practiceSetup = { "driver", {
		"The car feels better with the new setup. More confident in the corners.",
		"Good progress on balance. I like the car now.",
	} },
	practiceLong = { "driver", {
		"Long run done. I understand how to look after the tyres here.",
		"Tyre data collected. The {compound} lasted well.",
	} },
	practiceQuali = { "driver", {
		"Low fuel runs done. I know where to find the lap time.",
	} },
	practiceWet = { "engineer", {
		"Wet session, so we didn't learn as much as we wanted.",
	} },
	reserveSim = { "engineer", {
		"Reserve driver {name} found extra pace in the simulator overnight.",
	} },
	qualiOut = { "engineer", {
		"Sorry {driver}, we're out in {stage}. P{pos}.",
		"That's P{pos}, knocked out in {stage}.",
	} },
	qualiThrough = { "engineer", {
		"P{pos}, we're through to {next}!",
	} },
	pole = { "driver", {
		"POLE POSITION! Yes! What a lap!",
	} },
	qualiDone = { "engineer", {
		"P{pos} on the grid tomorrow. Good job.",
	} },
	injured = { "engineer", {
		"{name} is being checked by the doctors after that crash.",
	} },
}

function Radio.init()
	local remotes = ReplicatedStorage:WaitForChild("Remotes")
	remote = remotes:WaitForChild("Radio")
end

local function fill(text, vars)
	return (string.gsub(text, "{(%w+)}", function(key)
		local v = vars[key]
		if v == nil then
			return ""
		end
		return tostring(v)
	end))
end

-- Sends a raw message to one player.
function Radio.send(player, speaker, role, text, slot)
	if remote and player and player.Parent then
		remote:FireClient(player, { speaker = speaker, role = role, text = text, slot = slot, time = os.time() })
	end
end

-- Sends a templated message. vars.driver should hold the driver's name.
-- Returns the text that was sent.
function Radio.say(player, key, vars, rng, slot)
	local template = Radio.Templates[key]
	if not template then
		return nil
	end
	vars = vars or {}
	local role = template[1]
	local options = template[2]
	local text = options[(rng and rng:NextInteger(1, #options)) or 1]
	text = fill(text, vars)
	local speaker
	if role == "driver" then
		speaker = vars.driver or "Driver"
	elseif role == "engineer" then
		speaker = "Race Engineer"
	else
		speaker = "Strategist"
	end
	Radio.send(player, speaker, role, text, slot)
	return text
end

return Radio
```


### 9. RaceSim (ModuleScript, ServerScriptService > ServerModules)

```lua
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
```


### 10. Objectives (ModuleScript, ServerScriptService > ServerModules)

```lua
--[[
	Objectives (ModuleScript)
	Location: ServerScriptService > ServerModules > Objectives

	Daily and weekly goals. They reset on real time using os.time():
	daily ones at midnight UTC and weekly ones on Monday 00:00 UTC.
	Progress is updated by game events (podium, pit stop time, win in the
	wet...). Rewards are claimed with a button and checked here on the server.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))

local Objectives = {}

local DAY = 86400
local WEEK = 604800
local MONDAY_OFFSET = 345600 -- 1 Jan 1970 was a Thursday; Monday 5 Jan is 4 days later

local function dayKey(now)
	return math.floor(now / DAY)
end

local function weekKey(now)
	return math.floor((now - MONDAY_OFFSET) / WEEK)
end

local function findDef(pool, id)
	for _, def in ipairs(pool) do
		if def.id == id then
			return def
		end
	end
	return nil
end

-- Picks "count" different objectives using a seed, so everyone sees a fair mix.
local function pick(pool, count, seed)
	local rng = Random.new(seed)
	local indices = {}
	for i = 1, #pool do
		indices[i] = i
	end
	for i = #indices, 2, -1 do
		local j = rng:NextInteger(1, i)
		indices[i], indices[j] = indices[j], indices[i]
	end
	local list = {}
	for i = 1, math.min(count, #pool) do
		local def = pool[indices[i]]
		table.insert(list, { id = def.id, progress = 0, done = false, claimed = false })
	end
	return list
end

-- Makes sure the objective lists are for the current day and week.
function Objectives.refresh(profile, now, userId)
	now = now or os.time()
	local o = profile.objectives
	local d = dayKey(now)
	local w = weekKey(now)
	local salt = (userId or 0) % 9973
	if o.dailyKey ~= d or type(o.daily) ~= "table" then
		o.dailyKey = d
		o.daily = pick(Config.DailyObjectives, Config.DailyObjectiveCount, d * 31 + salt)
	end
	if o.weeklyKey ~= w or type(o.weekly) ~= "table" then
		o.weeklyKey = w
		o.weekly = pick(Config.WeeklyObjectives, Config.WeeklyObjectiveCount, w * 131 + salt)
	end
end

-- Records a game event. Returns the texts of objectives completed by it.
function Objectives.event(profile, eventName, value)
	value = value or 1
	local completed = {}
	local function update(list, pool)
		for _, item in ipairs(list) do
			local def = findDef(pool, item.id)
			if def and not item.done and def.event == eventName then
				local mode = def.mode or "count"
				if mode == "count" then
					item.progress += value
					if item.progress >= def.target then
						item.done = true
					end
				elseif mode == "below" then
					if value <= def.target then
						item.progress = def.target
						item.done = true
					end
				elseif mode == "atLeast" then
					item.progress = math.max(item.progress, value)
					if value >= def.target then
						item.done = true
					end
				end
				if item.done then
					table.insert(completed, def.text)
				end
			end
		end
	end
	update(profile.objectives.daily or {}, Config.DailyObjectives)
	update(profile.objectives.weekly or {}, Config.WeeklyObjectives)
	return completed
end

-- Gives the reward for a finished objective. Returns ok, message.
function Objectives.claim(profile, which, id)
	if which ~= "daily" and which ~= "weekly" then
		return false, "Unknown objective list."
	end
	local list = profile.objectives[which]
	local pool = which == "daily" and Config.DailyObjectives or Config.WeeklyObjectives
	if type(list) ~= "table" then
		return false, "No objectives."
	end
	for _, item in ipairs(list) do
		if item.id == id then
			if not item.done then
				return false, "That objective isn't finished yet."
			end
			if item.claimed then
				return false, "Reward already claimed."
			end
			local def = findDef(pool, id)
			if not def then
				return false, "Unknown objective."
			end
			item.claimed = true
			profile.budget += def.reward.money or 0
			profile.upgradePoints += def.reward.points or 0
			return true, string.format("Reward claimed: %s and %d upgrade point(s).", Config.formatMoney(def.reward.money or 0), def.reward.points or 0)
		end
	end
	return false, "Objective not found."
end

function Objectives.view(profile, now)
	now = now or os.time()
	local function build(list, pool)
		local out = {}
		for _, item in ipairs(list or {}) do
			local def = findDef(pool, item.id)
			if def then
				local mode = def.mode or "count"
				table.insert(out, {
					id = item.id,
					text = def.text,
					progress = mode == "count" and math.min(item.progress, def.target) or (item.done and 1 or 0),
					target = mode == "count" and def.target or 1,
					done = item.done,
					claimed = item.claimed,
					rewardText = Config.formatMoney(def.reward.money or 0) .. " + " .. (def.reward.points or 0) .. " UP",
				})
			end
		end
		return out
	end
	local nextDay = (dayKey(now) + 1) * DAY
	local nextWeek = (weekKey(now) + 1) * WEEK + MONDAY_OFFSET
	return {
		daily = build(profile.objectives.daily, Config.DailyObjectives),
		weekly = build(profile.objectives.weekly, Config.WeeklyObjectives),
		dailyResetIn = nextDay - now,
		weeklyResetIn = nextWeek - now,
	}
end

return Objectives
```


### 11. Records (ModuleScript, ServerScriptService > ServerModules)

```lua
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
```


### 12. WeekendManager (ModuleScript, ServerScriptService > ServerModules)

```lua
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
```


### 13. GameServer (Script, ServerScriptService)

```lua
--[[
	GameServer (Script)
	Location: ServerScriptService > GameServer

	The server's main script. It:
	  * creates the RemoteEvents / RemoteFunction the client talks through,
	  * loads each player's career when they join and saves it when they leave,
	  * checks every request from the client before doing anything,
	  * runs the live races every frame,
	  * autosaves.
	Each player has their own independent career.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("Config"))

---------------------------------------------------------------------
-- Remotes (created here so nothing has to be made by hand in Studio)
---------------------------------------------------------------------
local remotes = ReplicatedStorage:FindFirstChild("Remotes")
if not remotes then
	remotes = Instance.new("Folder")
	remotes.Name = "Remotes"
	remotes.Parent = ReplicatedStorage
end

local function makeRemote(className, name)
	local r = remotes:FindFirstChild(name)
	if not r then
		r = Instance.new(className)
		r.Name = name
		r.Parent = remotes
	end
	return r
end

local Request = makeRemote("RemoteFunction", "Request")
makeRemote("RemoteEvent", "RaceEvent")
local RaceCommand = makeRemote("RemoteEvent", "RaceCommand")
makeRemote("RemoteEvent", "Radio")
local Notify = makeRemote("RemoteEvent", "Notify")
local StateChanged = makeRemote("RemoteEvent", "StateChanged")

---------------------------------------------------------------------
-- Modules
---------------------------------------------------------------------
local Modules = script.Parent:WaitForChild("ServerModules")
local DataManager = require(Modules:WaitForChild("DataManager"))
local TeamManager = require(Modules:WaitForChild("TeamManager"))
local WeekendManager = require(Modules:WaitForChild("WeekendManager"))
local Objectives = require(Modules:WaitForChild("Objectives"))
local Records = require(Modules:WaitForChild("Records"))
local Radio = require(Modules:WaitForChild("Radio"))

DataManager.init()
Radio.init()
WeekendManager.init()

local sessions = {}

---------------------------------------------------------------------
-- Saving
---------------------------------------------------------------------
local function saveSession(session)
	if not session.savingEnabled then
		return false
	end
	if session.saving then
		return false
	end
	session.saving = true
	local ok, msg = DataManager.save(session.player, session.profile)
	session.saving = false
	session.lastSave = os.clock()
	if ok then
		session.dirty = false
		session.saveSoon = false
		local t = os.date("!*t", os.time())
		session.saveMessage = string.format("Saved at %02d:%02d UTC", t.hour, t.min)
	else
		session.saveMessage = msg
	end
	if session.player.Parent then
		Notify:FireClient(session.player, "SaveStatus", { ok = ok, text = session.saveMessage })
	end
	return ok
end

---------------------------------------------------------------------
-- Joining
---------------------------------------------------------------------
local function setupCharacter(character)
	-- The game is played through menus and cameras, so the avatar stays put.
	local root = character:WaitForChild("HumanoidRootPart", 10)
	if root then
		root.Anchored = true
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.WalkSpeed = 0
		humanoid.UseJumpPower = true
		humanoid.JumpPower = 0
	end
end

local function createSession(player)
	local data, status, message = DataManager.load(player)
	if not player.Parent then
		return
	end
	local rng = Random.new()
	local profile
	local template = TeamManager.newProfile(rng)
	if type(data) == "table" then
		profile = DataManager.reconcile(data, template)
	else
		profile = template
	end
	if type(profile.stats) ~= "table" then
		profile.stats = Records.defaultStats()
	else
		DataManager.reconcile(profile.stats, Records.defaultStats())
	end
	if type(profile.objectives) ~= "table" then
		profile.objectives = {}
	end
	if #profile.aiTeams == 0 then
		TeamManager.newAITeams(profile)
	end
	Objectives.refresh(profile, os.time(), player.UserId)

	local session = {
		player = player,
		profile = profile,
		rng = rng,
		savingEnabled = status ~= "offline",
		saveMessage = message,
		dirty = status == "new",
		saveSoon = false,
		lastSave = os.clock(),
		speedIndex = 1,
		lastRequests = {},
		lastCommands = {},
	}
	session.notify = function(kind, payload)
		if player.Parent then
			Notify:FireClient(player, kind, payload)
		end
	end
	sessions[player] = session
	WeekendManager.ensureWeekend(session)
	StateChanged:FireClient(player, WeekendManager.clientState(session))
	Notify:FireClient(player, "SaveStatus", { ok = session.savingEnabled, text = message })
end

local function onPlayerAdded(player)
	player.CharacterAdded:Connect(setupCharacter)
	if player.Character then
		task.spawn(setupCharacter, player.Character)
	end
	task.spawn(createSession, player)
end

Players.PlayerAdded:Connect(onPlayerAdded)
for _, player in ipairs(Players:GetPlayers()) do
	onPlayerAdded(player)
end

Players.PlayerRemoving:Connect(function(player)
	local session = sessions[player]
	if session then
		sessions[player] = nil
		session.race = nil
		saveSession(session)
	end
end)

game:BindToClose(function()
	local pending = 0
	for _, session in pairs(sessions) do
		pending += 1
		task.spawn(function()
			saveSession(session)
			pending -= 1
		end)
	end
	local started = os.clock()
	while pending > 0 and os.clock() - started < 25 do
		task.wait(0.2)
	end
end)

---------------------------------------------------------------------
-- Requests from the client
---------------------------------------------------------------------
-- Simple rate limit: at most "limit" calls per "window" seconds.
local function rateLimited(list, limit, window)
	local now = os.clock()
	for i = #list, 1, -1 do
		if now - list[i] > window then
			table.remove(list, i)
		end
	end
	if #list >= limit then
		return true
	end
	table.insert(list, now)
	return false
end

local function dispatch(session, action, args)
	if action == "GetState" then
		return true, nil
	end
	if TeamManager.isTeamAction(action) then
		if WeekendManager.isRacing(session) then
			return false, "You can't change the team during the race."
		end
		return TeamManager.handle(session.profile, action, args, session.rng)
	end
	if action == "ClaimObjective" then
		Objectives.refresh(session.profile, os.time(), session.player.UserId)
		return Objectives.claim(session.profile, args.which, args.id)
	end
	if action == "SaveNow" then
		if not session.savingEnabled then
			return false, "Saving is not available in this session."
		end
		if os.clock() - session.lastSave < 8 then
			return false, "Saved very recently, try again in a few seconds."
		end
		task.spawn(saveSession, session)
		return true, "Saving..."
	end
	return WeekendManager.handle(session, action, args)
end

Request.OnServerInvoke = function(player, action, args)
	local session = sessions[player]
	if not session then
		return { ok = false, msg = "Your career is still loading..." }
	end
	if type(action) ~= "string" or #action > 40 then
		return { ok = false, msg = "Bad request." }
	end
	if type(args) ~= "table" then
		args = {}
	end
	if rateLimited(session.lastRequests, 15, 3) then
		return { ok = false, msg = "Slow down a little!" }
	end
	Objectives.refresh(session.profile, os.time(), player.UserId)
	local ok, result = pcall(function()
		return table.pack(dispatch(session, action, args))
	end)
	if not ok then
		warn("[GameServer] Request '" .. action .. "' failed: " .. tostring(result))
		return { ok = false, msg = "Something went wrong. Please try again.", state = WeekendManager.clientState(session) }
	end
	local success, msg, extra = result[1], result[2], result[3]
	if success and action ~= "GetState" then
		session.dirty = true
	end
	return { ok = success == true, msg = msg, extra = extra, state = WeekendManager.clientState(session) }
end

RaceCommand.OnServerEvent:Connect(function(player, cmd, data)
	local session = sessions[player]
	if not session or type(cmd) ~= "string" then
		return
	end
	if rateLimited(session.lastCommands, 40, 1) then
		return
	end
	WeekendManager.raceCommand(session, cmd, data)
	if cmd ~= "DriveUpdate" and cmd ~= "Speed" then
		session.dirty = true
	end
end)

---------------------------------------------------------------------
-- Main loop: run races and autosave
---------------------------------------------------------------------
RunService.Heartbeat:Connect(function(dt)
	dt = math.min(dt, 0.1)
	for _, session in pairs(sessions) do
		if session.race then
			local ok, err = pcall(WeekendManager.update, session, dt)
			if not ok then
				session.raceErrors = (session.raceErrors or 0) + 1
				if session.raceErrors <= 3 then
					warn("[GameServer] Race update error: " .. tostring(err))
				end
			end
			if not session.race then
				-- The race just finished: refresh the menus.
				StateChanged:FireClient(session.player, WeekendManager.clientState(session))
			end
		end
	end
end)

task.spawn(function()
	while true do
		task.wait(5)
		for _, session in pairs(sessions) do
			if session.dirty and not session.race and session.savingEnabled then
				local since = os.clock() - session.lastSave
				if since >= Config.AutoSaveSeconds or (session.saveSoon and since >= 7) then
					task.spawn(saveSession, session)
				end
			end
		end
	end
end)

print("[GameServer] Team Principal server ready.")
```


### 14. UIKit (ModuleScript, ReplicatedStorage > ClientModules)

```lua
--[[
	UIKit (ModuleScript)
	Location: ReplicatedStorage > ClientModules > UIKit

	Small helpers for building the interface in code: panels, labels, buttons,
	lists, progress bars, tyre badges, pop-up windows and toast messages.
	Every screen in the game is made with these, so the style stays consistent.
]]

local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))

local UIKit = {}

UIKit.Theme = {
	bg = Color3.fromRGB(14, 16, 24),
	panel = Color3.fromRGB(24, 27, 38),
	panel2 = Color3.fromRGB(33, 37, 52),
	panel3 = Color3.fromRGB(44, 49, 68),
	accent = Color3.fromRGB(225, 30, 60),
	accent2 = Color3.fromRGB(0, 170, 255),
	text = Color3.fromRGB(240, 242, 248),
	subtext = Color3.fromRGB(160, 166, 186),
	good = Color3.fromRGB(60, 205, 110),
	bad = Color3.fromRGB(235, 70, 70),
	warn = Color3.fromRGB(245, 190, 40),
	gold = Color3.fromRGB(255, 205, 60),
	purple = Color3.fromRGB(180, 90, 255),
	font = Enum.Font.Gotham,
	fontMedium = Enum.Font.GothamMedium,
	fontBold = Enum.Font.GothamBold,
}
local T = UIKit.Theme

-- Creates an instance, sets properties and parents it last (faster).
function UIKit.make(className, props, parent)
	local inst = Instance.new(className)
	if props then
		for k, v in pairs(props) do
			inst[k] = v
		end
	end
	if parent then
		inst.Parent = parent
	end
	return inst
end
local make = UIKit.make

function UIKit.corner(inst, radius)
	return make("UICorner", { CornerRadius = UDim.new(0, radius or 8) }, inst)
end

function UIKit.stroke(inst, color, thickness, transparency)
	return make("UIStroke", {
		Color = color or T.panel3,
		Thickness = thickness or 1,
		Transparency = transparency or 0,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
	}, inst)
end

function UIKit.padding(inst, all, horizontal)
	local v = UDim.new(0, all or 8)
	local h = UDim.new(0, horizontal or all or 8)
	return make("UIPadding", { PaddingTop = v, PaddingBottom = v, PaddingLeft = h, PaddingRight = h }, inst)
end

function UIKit.list(inst, direction, gap, hAlign, vAlign)
	return make("UIListLayout", {
		FillDirection = direction or Enum.FillDirection.Vertical,
		Padding = UDim.new(0, gap or 6),
		SortOrder = Enum.SortOrder.LayoutOrder,
		HorizontalAlignment = hAlign or Enum.HorizontalAlignment.Left,
		VerticalAlignment = vAlign or Enum.VerticalAlignment.Top,
	}, inst)
end

function UIKit.frame(parent, props)
	local p = {
		BackgroundColor3 = T.panel,
		BorderSizePixel = 0,
		Size = UDim2.new(1, 0, 0, 40),
	}
	if props then
		for k, v in pairs(props) do
			p[k] = v
		end
	end
	return make("Frame", p, parent)
end

-- A rounded panel that grows to fit its contents vertically.
function UIKit.card(parent, props)
	local f = UIKit.frame(parent, {
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundColor3 = T.panel,
	})
	if props then
		for k, v in pairs(props) do
			f[k] = v
		end
	end
	UIKit.corner(f, 10)
	UIKit.padding(f, 10, 12)
	UIKit.list(f, nil, 6)
	return f
end

function UIKit.label(parent, text, props)
	local p = {
		BackgroundTransparency = 1,
		Text = text or "",
		TextColor3 = T.text,
		Font = T.font,
		TextSize = 16,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextYAlignment = Enum.TextYAlignment.Center,
		Size = UDim2.new(1, 0, 0, 22),
		TextWrapped = true,
		RichText = true,
	}
	if props then
		for k, v in pairs(props) do
			p[k] = v
		end
	end
	return make("TextLabel", p, parent)
end

-- A label that grows to fit long text.
function UIKit.paragraph(parent, text, props)
	local l = UIKit.label(parent, text, {
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		TextColor3 = T.subtext,
		TextSize = 15,
	})
	if props then
		for k, v in pairs(props) do
			l[k] = v
		end
	end
	return l
end

function UIKit.title(parent, text, size)
	return UIKit.label(parent, text, { Font = T.fontBold, TextSize = size or 22, Size = UDim2.new(1, 0, 0, (size or 22) + 8) })
end

-- Button with hover effect. onClick runs when clicked, tapped or pressed on a gamepad.
function UIKit.button(parent, text, onClick, props)
	local color = (props and props.BackgroundColor3) or T.accent
	local b = make("TextButton", {
		Text = text,
		Font = T.fontBold,
		TextSize = 15,
		TextColor3 = Color3.new(1, 1, 1),
		BackgroundColor3 = color,
		AutoButtonColor = false,
		BorderSizePixel = 0,
		Size = UDim2.new(0, 160, 0, 34),
		TextWrapped = true,
	}, parent)
	if props then
		for k, v in pairs(props) do
			b[k] = v
		end
	end
	UIKit.corner(b, 8)
	local base = b.BackgroundColor3
	b.MouseEnter:Connect(function()
		if b.Active then
			b.BackgroundColor3 = base:Lerp(Color3.new(1, 1, 1), 0.15)
		end
	end)
	b.MouseLeave:Connect(function()
		b.BackgroundColor3 = base
	end)
	if onClick then
		b.Activated:Connect(function()
			if b.Active then
				onClick(b)
			end
		end)
	end
	return b
end

-- Greys a button out (or back in).
function UIKit.setEnabled(button, enabled)
	button.Active = enabled
	button.AutoButtonColor = false
	button.TextTransparency = enabled and 0 or 0.5
	button.BackgroundTransparency = enabled and 0 or 0.5
end

function UIKit.scroll(parent, props)
	local s = make("ScrollingFrame", {
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		Size = UDim2.new(1, 0, 1, 0),
		CanvasSize = UDim2.new(0, 0, 0, 0),
		AutomaticCanvasSize = Enum.AutomaticSize.Y,
		ScrollingDirection = Enum.ScrollingDirection.Y,
		ScrollBarThickness = 6,
		ScrollBarImageColor3 = T.panel3,
	}, parent)
	if props then
		for k, v in pairs(props) do
			s[k] = v
		end
	end
	return s
end

-- A horizontal row that holds buttons or labels side by side.
function UIKit.row(parent, height, gap)
	local r = UIKit.frame(parent, { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, height or 34) })
	UIKit.list(r, Enum.FillDirection.Horizontal, gap or 8, nil, Enum.VerticalAlignment.Center)
	return r
end

-- Removes every GUI child (keeps layouts, padding and corners).
function UIKit.clear(frame)
	for _, child in ipairs(frame:GetChildren()) do
		if child:IsA("GuiObject") then
			child:Destroy()
		end
	end
end

-- Progress bar (fraction 0-1).
function UIKit.bar(parent, fraction, color, props)
	local back = UIKit.frame(parent, { BackgroundColor3 = T.panel3, Size = UDim2.new(1, 0, 0, 8) })
	if props then
		for k, v in pairs(props) do
			back[k] = v
		end
	end
	UIKit.corner(back, 4)
	local fill = UIKit.frame(back, {
		BackgroundColor3 = color or T.accent2,
		Size = UDim2.new(math.clamp(fraction or 0, 0, 1), 0, 1, 0),
		Name = "Fill",
	})
	UIKit.corner(fill, 4)
	return back, fill
end

-- A labelled stat bar: "Pace  ███████░░ 87"
function UIKit.statBar(parent, name, value, color)
	local r = UIKit.frame(parent, { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 18) })
	UIKit.label(r, name, { Size = UDim2.new(0, 110, 1, 0), TextSize = 13, TextColor3 = T.subtext })
	UIKit.bar(r, value / 100, color, { Position = UDim2.new(0, 112, 0.5, -4), Size = UDim2.new(1, -150, 0, 8) })
	UIKit.label(r, tostring(math.floor(value + 0.5)), {
		Position = UDim2.new(1, -34, 0, 0),
		Size = UDim2.new(0, 34, 1, 0),
		TextSize = 13,
		Font = T.fontBold,
		TextXAlignment = Enum.TextXAlignment.Right,
	})
	return r
end

-- Coloured circle with the tyre letter (S, M, H, I, W).
function UIKit.tyreBadge(parent, compound, size)
	local tyre = Config.Tyres[compound] or Config.Tyres.Medium
	size = size or 20
	local b = UIKit.frame(parent, {
		Size = UDim2.new(0, size, 0, size),
		BackgroundColor3 = Color3.fromRGB(20, 20, 20),
	})
	UIKit.corner(b, size)
	UIKit.stroke(b, tyre.color, math.max(2, size / 8))
	UIKit.label(b, tyre.short, {
		Size = UDim2.new(1, 0, 1, 0),
		TextXAlignment = Enum.TextXAlignment.Center,
		Font = T.fontBold,
		TextSize = math.floor(size * 0.6),
		TextColor3 = tyre.color,
	})
	return b
end

-- Simple table. columns = { {title, width (0-1 of row), align} }, rows = list of cell lists.
-- A cell can be a string or { text = ..., color = ... }. rowColor(i) can tint a row.
function UIKit.table(parent, columns, rows, rowHeight, rowColor)
	rowHeight = rowHeight or 24
	local holder = UIKit.frame(parent, {
		BackgroundTransparency = 1,
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
	})
	UIKit.list(holder, nil, 2)
	local function makeRow(cells, isHeader, index)
		local r = UIKit.frame(holder, {
			Size = UDim2.new(1, 0, 0, rowHeight),
			BackgroundColor3 = isHeader and T.panel3 or ((rowColor and rowColor(index)) or (index % 2 == 0 and T.panel2 or T.panel)),
			LayoutOrder = isHeader and 0 or index,
		})
		UIKit.corner(r, 4)
		local x = 0
		for c, col in ipairs(columns) do
			local cell = cells[c]
			local text, color = cell, nil
			if type(cell) == "table" then
				text, color = cell.text, cell.color
			end
			UIKit.label(r, tostring(text or ""), {
				Position = UDim2.new(x, 6, 0, 0),
				Size = UDim2.new(col[2], -8, 1, 0),
				TextSize = isHeader and 12 or 14,
				Font = isHeader and T.fontBold or T.font,
				TextColor3 = color or (isHeader and T.subtext or T.text),
				TextXAlignment = col[3] or Enum.TextXAlignment.Left,
				TextTruncate = Enum.TextTruncate.AtEnd,
				TextWrapped = false,
			})
			x += col[2]
		end
	end
	local header = {}
	for i, col in ipairs(columns) do
		header[i] = col[1]
	end
	makeRow(header, true, 0)
	for i, cells in ipairs(rows) do
		makeRow(cells, false, i)
	end
	return holder
end

---------------------------------------------------------------------
-- Toasts and pop-up windows
---------------------------------------------------------------------
local toastHolder = nil

function UIKit.initToasts(gui)
	toastHolder = UIKit.frame(gui, {
		Name = "Toasts",
		BackgroundTransparency = 1,
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 70),
		Size = UDim2.new(0, 520, 0, 300),
		ZIndex = 50,
	})
	UIKit.list(toastHolder, nil, 6, Enum.HorizontalAlignment.Center)
end

-- kind: "good", "bad", "gold" or nil
function UIKit.toast(text, kind, seconds)
	if not toastHolder or not text or text == "" then
		return
	end
	local color = T.panel2
	if kind == "good" then
		color = Color3.fromRGB(30, 110, 60)
	elseif kind == "bad" then
		color = Color3.fromRGB(130, 35, 40)
	elseif kind == "gold" then
		color = Color3.fromRGB(150, 110, 10)
	end
	local f = UIKit.frame(toastHolder, {
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundColor3 = color,
		ZIndex = 50,
	})
	UIKit.corner(f, 8)
	UIKit.padding(f, 8, 12)
	UIKit.label(f, text, {
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		TextXAlignment = Enum.TextXAlignment.Center,
		Font = T.fontMedium,
		ZIndex = 51,
	})
	task.delay(seconds or 3.5, function()
		if f.Parent then
			local tween = TweenService:Create(f, TweenInfo.new(0.4), { BackgroundTransparency = 1 })
			tween:Play()
			for _, d in ipairs(f:GetDescendants()) do
				if d:IsA("TextLabel") then
					TweenService:Create(d, TweenInfo.new(0.4), { TextTransparency = 1 }):Play()
				end
			end
			tween.Completed:Wait()
			f:Destroy()
		end
	end)
end

-- Centered pop-up window. build(content) fills it. Returns the window and a close function.
function UIKit.modal(gui, titleText, build, width)
	local shade = UIKit.frame(gui, {
		Name = "Modal",
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundColor3 = Color3.new(0, 0, 0),
		BackgroundTransparency = 0.35,
		ZIndex = 40,
		Active = true,
	})
	local window = UIKit.frame(shade, {
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5, 0, 0.5, 0),
		Size = UDim2.new(0, width or 560, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundColor3 = T.panel,
		ZIndex = 41,
	})
	UIKit.corner(window, 12)
	UIKit.stroke(window, T.accent, 2)
	UIKit.padding(window, 16, 18)
	UIKit.list(window, nil, 10)
	make("UISizeConstraint", { MaxSize = Vector2.new(width or 560, 640) }, window)
	UIKit.title(window, titleText, 24)
	local content = UIKit.frame(window, {
		BackgroundTransparency = 1,
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
	})
	UIKit.list(content, nil, 8)
	local function close()
		shade:Destroy()
	end
	build(content, close)
	-- Every descendant draws above the shade.
	for _, d in ipairs(window:GetDescendants()) do
		if d:IsA("GuiObject") then
			d.ZIndex = 42
		end
	end
	return window, close
end

function UIKit.money(v)
	return Config.formatMoney(v)
end

-- Text colour that reads well on top of a team colour.
function UIKit.contrastText(color)
	local lum = 0.299 * color.R + 0.587 * color.G + 0.114 * color.B
	return lum > 0.6 and Color3.new(0, 0, 0) or Color3.new(1, 1, 1)
end

return UIKit
```


### 15. TrackBuilder (ModuleScript, ReplicatedStorage > ClientModules)

```lua
--[[
	TrackBuilder (ModuleScript)
	Location: ReplicatedStorage > ClientModules > TrackBuilder

	Builds the 3D circuit on the player's own screen from the waypoint list:
	grass, road, white edge lines, red and white kerbs, barriers, the pit lane
	with garages, the start/finish gantry, grid boxes, grandstands and scenery
	(trees, or buildings for street circuits). Night races get floodlights.

	The track is built by the client (not the server) so that every player can
	be at a different circuit in their own career at the same time.
	Long straight pieces are merged into single parts to keep the part count low.
]]

local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("Config"))
local Tracks = require(Shared:WaitForChild("Tracks"))
local TrackPath = require(Shared:WaitForChild("TrackPath"))

local TrackBuilder = {}
TrackBuilder.current = nil

local UP = Vector3.yAxis
local HASH_CELL = 40

local function newPart(props, parent)
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanTouch = false
	p.CanQuery = false
	p.CastShadow = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in pairs(props) do
		p[k] = v
	end
	p.Parent = parent
	return p
end

---------------------------------------------------------------------
-- Spatial hash of the centreline, used to keep walls and scenery off the road
---------------------------------------------------------------------
local function cellKey(x, z)
	return math.floor(x / HASH_CELL) .. "," .. math.floor(z / HASH_CELL)
end

local function buildHash(path)
	local hash = {}
	for i = 1, path.n do
		local p = path.pos[i]
		local key = cellKey(p.X, p.Z)
		local list = hash[key]
		if not list then
			list = {}
			hash[key] = list
		end
		table.insert(list, i)
	end
	return hash
end

-- True if "point" is within "radius" of a part of the track that is not near sample "index".
local function nearOtherSection(path, hash, point, index, radius)
	local cells = math.ceil(radius / HASH_CELL)
	local cx, cz = math.floor(point.X / HASH_CELL), math.floor(point.Z / HASH_CELL)
	local r2 = radius * radius
	for dx = -cells, cells do
		for dz = -cells, cells do
			local list = hash[(cx + dx) .. "," .. (cz + dz)]
			if list then
				for _, j in ipairs(list) do
					local sep = math.abs(j - (index or -1000))
					sep = math.min(sep, path.n - sep)
					if index == nil or sep > 20 then
						local q = path.pos[j]
						local ddx, ddz = q.X - point.X, q.Z - point.Z
						if ddx * ddx + ddz * ddz < r2 and math.abs(q.Y - point.Y) < 6 then
							return true
						end
					end
				end
			end
		end
	end
	return false
end

---------------------------------------------------------------------
-- Merges consecutive samples along an offset line into straight runs.
-- include(i) can skip samples. Returns a list of {a, b} point pairs.
---------------------------------------------------------------------
local function runs(path, lateral, include, maxLen, maxAngleDeg, firstIndex, lastIndex)
	local segs = {}
	local cosLimit = math.cos(math.rad(maxAngleDeg or 4))
	local startP, prevP, dir = nil, nil, nil
	local n = path.n
	firstIndex = firstIndex or 1
	local count = lastIndex and ((lastIndex - firstIndex) % n) or n
	for step = 0, count do
		local i = (firstIndex - 1 + step) % n + 1
		local ok = include == nil or include(i)
		local p = path.pos[i] + path.right[i] * lateral
		if not ok then
			if startP and prevP and (prevP - startP).Magnitude > 0.5 then
				table.insert(segs, { startP, prevP })
			end
			startP, dir = nil, nil
		elseif not startP then
			startP, dir = p, nil
		else
			local stepVec = p - prevP
			if stepVec.Magnitude > 0.01 then
				local stepDir = stepVec.Unit
				if not dir then
					dir = stepDir
				end
				if (p - startP).Magnitude > (maxLen or 80) or stepDir:Dot(dir) < cosLimit then
					table.insert(segs, { startP, prevP })
					startP, dir = prevP, stepDir
				end
			end
		end
		prevP = p
	end
	if startP and prevP and (prevP - startP).Magnitude > 0.5 then
		table.insert(segs, { startP, prevP })
	end
	return segs
end

-- A flat strip between two points (top surface at the points' height + lift).
local function strip(parent, a, b, width, thickness, color, material, lift)
	local len = (b - a).Magnitude
	if len < 0.05 then
		return nil
	end
	local mid = (a + b) / 2
	local cf = CFrame.lookAt(mid, b) * CFrame.new(0, (lift or 0) - thickness / 2, 0)
	return newPart({
		Size = Vector3.new(width, thickness, len + 0.6),
		CFrame = cf,
		Color = color,
		Material = material or Enum.Material.SmoothPlastic,
	}, parent)
end

---------------------------------------------------------------------
-- Build
---------------------------------------------------------------------
local function setLighting(track)
	if track.night then
		Lighting.ClockTime = 20.6
		Lighting.Brightness = 1.2
		Lighting.OutdoorAmbient = Color3.fromRGB(90, 90, 110)
	else
		Lighting.ClockTime = 14.2
		Lighting.Brightness = 2.2
		Lighting.OutdoorAmbient = Color3.fromRGB(128, 128, 128)
	end
	Lighting.FogEnd = 100000
end

-- progress(fraction, text) is called while building. Yields while it builds.
function TrackBuilder.build(trackId, progress)
	local track = Tracks.ById[trackId]
	if not track then
		return nil
	end
	if TrackBuilder.current and TrackBuilder.current.id == trackId then
		return TrackBuilder.current
	end
	-- Already being built (for example by the menu): wait for that build.
	if TrackBuilder.buildingId == trackId then
		while TrackBuilder.buildingId == trackId do
			task.wait(0.1)
		end
		return TrackBuilder.current
	end
	TrackBuilder.buildingId = trackId
	TrackBuilder.clear()
	progress = progress or function() end

	local path = TrackPath.get(track)
	local W = Config.Track.Width
	local runoff = path.runoff
	local origin = Config.Track.Origin
	local rng = Random.new(#track.id * 7919 + track.lengthM)
	local hash = buildHash(path)

	local folder = Instance.new("Folder")
	folder.Name = "LocalTrack"
	folder.Parent = workspace

	local partCount = 0
	local function tick()
		partCount += 1
		if partCount % 120 == 0 then
			task.wait()
		end
	end

	local asphalt = Color3.fromRGB(52, 54, 60)
	local roadParts = {}

	-- Bounds
	local minX, maxX, minZ, maxZ = math.huge, -math.huge, math.huge, -math.huge
	for i = 1, path.n do
		local p = path.pos[i]
		minX, maxX = math.min(minX, p.X), math.max(maxX, p.X)
		minZ, maxZ = math.min(minZ, p.Z), math.max(maxZ, p.Z)
	end
	local center = Vector3.new((minX + maxX) / 2, origin.Y, (minZ + maxZ) / 2)
	local radius = math.max(maxX - minX, maxZ - minZ) / 2

	progress(0.05, "Laying the grass")
	-- 1. Grass tiles (a part can be at most 2048 studs long).
	local margin = 320
	local x0, x1 = minX - margin, maxX + margin
	local z0, z1 = minZ - margin, maxZ + margin
	local tile = 2000
	local groundColor = track.street and Color3.fromRGB(105, 105, 110) or Color3.fromRGB(70, 125, 60)
	local groundMaterial = track.street and Enum.Material.Concrete or Enum.Material.Grass
	local x = x0
	while x < x1 do
		local sx = math.min(tile, x1 - x)
		local z = z0
		while z < z1 do
			local sz = math.min(tile, z1 - z)
			newPart({
				Name = "Ground",
				Size = Vector3.new(sx, 2, sz),
				CFrame = CFrame.new(x + sx / 2, origin.Y - 1.25, z + sz / 2),
				Color = groundColor,
				Material = groundMaterial,
			}, folder)
			z += tile
		end
		x += tile
	end

	progress(0.15, "Building the road")
	-- 2. Road surface, with round joints so corners have no gaps.
	local roadSegs = runs(path, 0, nil, 90, 4)
	for _, seg in ipairs(roadSegs) do
		local road = strip(folder, seg[1], seg[2], W, 1, asphalt, Enum.Material.Asphalt, 0)
		if road then
			table.insert(roadParts, road)
		end
		local joint = newPart({
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(1, W, W),
			CFrame = CFrame.new(seg[1] - UP * 0.5) * CFrame.Angles(0, 0, math.pi / 2),
			Color = asphalt,
			Material = Enum.Material.Asphalt,
		}, folder)
		table.insert(roadParts, joint)
		tick()
	end

	progress(0.3, "Painting the lines")
	-- 3. White edge lines.
	for _, side in ipairs({ -1, 1 }) do
		for _, seg in ipairs(runs(path, side * (W / 2 - 0.7), nil, 60, 3)) do
			strip(folder, seg[1], seg[2], 0.6, 0.1, Color3.fromRGB(235, 235, 235), nil, 0.06)
			tick()
		end
	end

	progress(0.4, "Fitting the kerbs")
	-- 4. Red and white kerbs in the corners.
	for i = 1, path.n - 2, 2 do
		if math.abs(path.curv[i]) > 1 / 140 then
			local j = i + 2
			for _, side in ipairs({ -1, 1 }) do
				local a = path.pos[i] + path.right[i] * side * (W / 2 + 1.1)
				local b = path.pos[j] + path.right[j] * side * (W / 2 + 1.1)
				local color = ((i // 2) % 2 == 0) and Color3.fromRGB(215, 30, 35) or Color3.fromRGB(245, 245, 245)
				strip(folder, a, b, 2.2, 0.4, color, nil, 0.12)
				tick()
			end
		end
	end

	-- Pit lane area (indices near the start/finish line).
	local pitSide = path.pitSide
	local pitHalf = path.pitHalf
	local function inPitZone(i, extra)
		local d = (i - 1) * path.ds
		local fromLine = math.min(d, path.length - d)
		return fromLine <= pitHalf + (extra or 0)
	end

	progress(0.5, "Putting up the barriers")
	-- 5. Barriers, skipped where they would cross another part of the track.
	local wallHeight = track.street and 3.4 or 2.2
	local wallColor = track.street and Color3.fromRGB(200, 200, 195) or Color3.fromRGB(185, 190, 200)
	local wallMaterial = track.street and Enum.Material.Concrete or Enum.Material.Metal
	for _, side in ipairs({ -1, 1 }) do
		local lateral = side * (W / 2 + runoff)
		local include = function(i)
			if side == pitSide and inPitZone(i, 70) then
				return false
			end
			local p = path.pos[i] + path.right[i] * lateral
			return not nearOtherSection(path, hash, p, i, W / 2 + 5)
		end
		for _, seg in ipairs(runs(path, lateral, include, 70, 5)) do
			local a, b = seg[1], seg[2]
			local len = (b - a).Magnitude
			if len > 0.5 then
				newPart({
					Size = Vector3.new(1, wallHeight, len + 0.8),
					CFrame = CFrame.lookAt((a + b) / 2, b) * CFrame.new(0, wallHeight / 2, 0),
					Color = wallColor,
					Material = wallMaterial,
				}, folder)
				tick()
			end
		end
	end

	progress(0.62, "Building the pit lane")
	-- 6. Pit lane, pit wall, entry/exit roads and garages.
	local pitLat = pitSide * Config.Track.PitLaneOffset
	local pitW = Config.Track.PitLaneWidth
	local firstPit = TrackPath.indexAt(path, -pitHalf)
	local lastPit = TrackPath.indexAt(path, pitHalf)
	for _, seg in ipairs(runs(path, pitLat, nil, 80, 4, firstPit, lastPit)) do
		strip(folder, seg[1], seg[2], pitW, 1, Color3.fromRGB(62, 64, 70), Enum.Material.Asphalt, 0)
		tick()
	end
	local function lanePoint(d, lateral)
		local p = TrackPath.posAt(path, d)
		return p + TrackPath.rightAt(path, d) * lateral
	end
	strip(folder, lanePoint(-pitHalf - 60, pitSide * (W / 2 - 3)), lanePoint(-pitHalf, pitLat), 10, 1, asphalt, Enum.Material.Asphalt, -0.02)
	strip(folder, lanePoint(pitHalf, pitLat), lanePoint(pitHalf + 60, pitSide * (W / 2 - 3)), 10, 1, asphalt, Enum.Material.Asphalt, -0.02)
	local wallLat = pitSide * (W / 2 + (Config.Track.PitLaneOffset - pitW / 2 - W / 2) / 2)
	local firstWall = TrackPath.indexAt(path, -pitHalf + 15)
	local lastWall = TrackPath.indexAt(path, pitHalf - 15)
	for _, seg in ipairs(runs(path, wallLat, nil, 80, 4, firstWall, lastWall)) do
		local a, b = seg[1], seg[2]
		newPart({
			Size = Vector3.new(1.2, 1.8, (b - a).Magnitude + 0.5),
			CFrame = CFrame.lookAt((a + b) / 2, b) * CFrame.new(0, 0.9, 0),
			Color = Color3.fromRGB(235, 235, 235),
			Material = Enum.Material.Concrete,
		}, folder)
	end
	-- Garages: one per team, the player's team where its cars stop.
	local teamColors = { Config.PlayerColors[1].color }
	for _, t in ipairs(Config.AITeams) do
		table.insert(teamColors, t.color)
	end
	local garageLat = pitSide * (Config.Track.PitLaneOffset + pitW / 2 + 7)
	local garageIndex = 0
	local d = -pitHalf + 12
	while d < pitHalf - 8 do
		garageIndex += 1
		local p = lanePoint(d, garageLat)
		local _, tangent = TrackPath.posAt(path, d)
		local color = teamColors[(garageIndex - 1) % #teamColors + 1]
		local garage = newPart({
			Name = "Garage",
			Size = Vector3.new(14, 9, 13),
			CFrame = CFrame.lookAt(p, p + tangent) * CFrame.new(0, 4.5, 0),
			Color = Color3.fromRGB(60, 62, 70),
			Material = Enum.Material.Concrete,
		}, folder)
		newPart({
			Size = Vector3.new(14.2, 2, 13.2),
			CFrame = garage.CFrame * CFrame.new(0, 3.6, 0),
			Color = color,
		}, folder)
		d += 16
	end
	-- Pit box markings where the cars stop.
	local stopPoint = lanePoint(pitHalf / 2, pitLat)
	local _, stopTan = TrackPath.posAt(path, pitHalf / 2)
	newPart({
		Size = Vector3.new(6, 0.1, 9),
		CFrame = CFrame.lookAt(stopPoint, stopPoint + stopTan) * CFrame.new(0, 0.06, 0),
		Color = Color3.fromRGB(240, 200, 30),
	}, folder)

	progress(0.72, "Start line and grid")
	-- 7. Start/finish line, gantry and grid boxes.
	local p0, t0 = TrackPath.posAt(path, 0)
	local r0 = t0:Cross(UP)
	local lineCF = CFrame.lookAt(p0, p0 + t0)
	for row = 0, 1 do
		for col = 0, 7 do
			local white = (row + col) % 2 == 0
			local lateral = -W / 2 + (col + 0.5) * (W / 8)
			newPart({
				Size = Vector3.new(W / 8, 0.12, 1.5),
				CFrame = lineCF * CFrame.new(lateral, 0.07, (row - 0.5) * 1.5),
				Color = white and Color3.new(1, 1, 1) or Color3.new(0.05, 0.05, 0.05),
			}, folder)
		end
	end
	for _, side in ipairs({ -1, 1 }) do
		newPart({
			Size = Vector3.new(1.5, 12, 1.5),
			CFrame = CFrame.new(p0 + r0 * side * (W / 2 + 3) + UP * 6),
			Color = Color3.fromRGB(40, 40, 45),
			Material = Enum.Material.Metal,
		}, folder)
	end
	local beam = newPart({
		Size = Vector3.new(W + 8, 3, 1.5),
		CFrame = lineCF * CFrame.new(0, 12.5, 0),
		Color = Color3.fromRGB(30, 30, 35),
	}, folder)
	local sg = Instance.new("SurfaceGui")
	sg.Face = Enum.NormalId.Back
	sg.CanvasSize = Vector2.new(400, 40)
	sg.Parent = beam
	local sgText = Instance.new("TextLabel")
	sgText.Size = UDim2.new(1, 0, 1, 0)
	sgText.BackgroundTransparency = 1
	sgText.Text = string.upper(track.name)
	sgText.TextColor3 = Color3.new(1, 1, 1)
	sgText.Font = Enum.Font.GothamBold
	sgText.TextScaled = true
	sgText.Parent = sg
	for slot = 1, 20 do
		local gd, glat = TrackPath.gridSlot(path, slot)
		local gp, gt = TrackPath.posAt(path, gd + 3)
		local gr = gt:Cross(UP)
		local at = gp + gr * glat
		newPart({
			Size = Vector3.new(4.5, 0.1, 0.5),
			CFrame = CFrame.lookAt(at, at + gt) * CFrame.new(0, 0.06, 0),
			Color = Color3.new(1, 1, 1),
		}, folder)
	end

	progress(0.8, "Building grandstands")
	-- 8. Grandstands opposite the pits.
	local standLat = -pitSide * (W / 2 + runoff + 14)
	for k = -1, 1 do
		local sd = k * 95
		local sp = lanePoint(sd, standLat)
		local _, st = TrackPath.posAt(path, sd)
		local outward = st:Cross(UP) * -pitSide
		local base = CFrame.lookAt(sp, sp + st)
		for stepIndex = 0, 3 do
			local seatColor = teamColors[rng:NextInteger(1, #teamColors)]
			newPart({
				Size = Vector3.new(8, 2 + stepIndex * 2.4, 80),
				CFrame = base * CFrame.new(0, 1 + stepIndex * 1.2, 0) + outward * (stepIndex * 7),
				Color = seatColor:Lerp(Color3.fromRGB(120, 120, 130), 0.4),
				Material = Enum.Material.SmoothPlastic,
			}, folder)
		end
		newPart({
			Size = Vector3.new(34, 1, 84),
			CFrame = base * CFrame.new(0, 16, 0) + outward * 11,
			Color = Color3.fromRGB(230, 230, 235),
		}, folder)
	end

	progress(0.86, "Planting scenery")
	-- 9. Scenery: trees, or buildings on street circuits.
	local placed, attempts = 0, 0
	local wanted = track.street and 110 or 170
	while placed < wanted and attempts < wanted * 6 do
		attempts += 1
		local i = rng:NextInteger(1, path.n)
		local side = rng:NextNumber() < 0.5 and -1 or 1
		local dist = W / 2 + runoff + rng:NextNumber(14, 140)
		local p = path.pos[i] + path.right[i] * side * dist
		p = Vector3.new(p.X, origin.Y, p.Z)
		local clearance = track.street and 40 or 22
		if not nearOtherSection(path, hash, p, nil, W / 2 + runoff + clearance) then
			placed += 1
			if track.street then
				local h = rng:NextNumber(18, 90)
				local sx, sz = rng:NextNumber(18, 36), rng:NextNumber(18, 36)
				local tone = rng:NextNumber(0.55, 0.9)
				newPart({
					Size = Vector3.new(sx, h, sz),
					CFrame = CFrame.new(p + UP * (h / 2)) * CFrame.Angles(0, math.atan2(path.tan[i].X, path.tan[i].Z), 0),
					Color = Color3.new(tone, tone * rng:NextNumber(0.9, 1), tone * rng:NextNumber(0.85, 1.05)),
					Material = Enum.Material.Concrete,
					CastShadow = true,
				}, folder)
			else
				local h = rng:NextNumber(7, 13)
				newPart({
					Shape = Enum.PartType.Cylinder,
					Size = Vector3.new(h, 1.6, 1.6),
					CFrame = CFrame.new(p + UP * (h / 2)) * CFrame.Angles(0, 0, math.pi / 2),
					Color = Color3.fromRGB(100, 70, 45),
					Material = Enum.Material.Wood,
				}, folder)
				local leaf = rng:NextNumber(7, 12)
				newPart({
					Shape = Enum.PartType.Ball,
					Size = Vector3.new(leaf, leaf, leaf),
					CFrame = CFrame.new(p + UP * (h + leaf * 0.3)),
					Color = Color3.fromRGB(40, rng:NextInteger(95, 135), 45),
					Material = Enum.Material.Grass,
					CastShadow = true,
				}, folder)
			end
			tick()
		end
	end

	-- 10. Floodlights for night races.
	if track.night then
		progress(0.94, "Switching on the floodlights")
		local spacing = 110
		local k = 0
		local dist = 0
		while dist < path.length do
			k += 1
			local side = (k % 2 == 0) and 1 or -1
			local i = TrackPath.indexAt(path, dist)
			local p = path.pos[i] + path.right[i] * side * (W / 2 + runoff + 4)
			if not nearOtherSection(path, hash, p, i, W / 2 + 3) then
				local pole = newPart({
					Size = Vector3.new(1, 18, 1),
					CFrame = CFrame.new(p + UP * 9),
					Color = Color3.fromRGB(60, 60, 65),
				}, folder)
				local lamp = newPart({
					Size = Vector3.new(4, 1, 2),
					CFrame = pole.CFrame * CFrame.new(0, 9.5, 0),
					Color = Color3.fromRGB(255, 250, 220),
					Material = Enum.Material.Neon,
				}, folder)
				local light = Instance.new("PointLight")
				light.Range = 60
				light.Brightness = 2.5
				light.Color = Color3.fromRGB(255, 245, 225)
				light.Parent = lamp
			end
			dist += spacing
			tick()
		end
	end

	-- 11. TV camera positions round the lap.
	local tvCams = {}
	local camDist = 0
	local camSide = 1
	while camDist < path.length do
		local i = TrackPath.indexAt(path, camDist)
		local p = path.pos[i] + path.right[i] * camSide * (W / 2 + runoff + 22) + UP * 16
		table.insert(tvCams, { pos = p, d = camDist })
		camDist += 260
		camSide = -camSide
	end

	setLighting(track)
	progress(1, "Ready")
	TrackBuilder.buildingId = nil

	TrackBuilder.current = {
		id = trackId,
		track = track,
		folder = folder,
		path = path,
		center = center,
		radius = radius,
		tvCams = tvCams,
		roadParts = roadParts,
	}
	return TrackBuilder.current
end

-- Makes the road shiny when it is wet.
function TrackBuilder.setWetness(wetness)
	local cur = TrackBuilder.current
	if not cur then
		return
	end
	local reflect = math.clamp(wetness * 0.35, 0, 0.35)
	if cur.lastReflect and math.abs(cur.lastReflect - reflect) < 0.03 then
		return
	end
	cur.lastReflect = reflect
	local color = Color3.fromRGB(52, 54, 60):Lerp(Color3.fromRGB(30, 32, 38), math.clamp(wetness, 0, 1))
	for _, p in ipairs(cur.roadParts) do
		p.Reflectance = reflect
		p.Color = color
	end
end

function TrackBuilder.clear()
	if TrackBuilder.current then
		TrackBuilder.current.folder:Destroy()
		TrackBuilder.current = nil
	end
end

return TrackBuilder
```


### 16. RaceViewer (ModuleScript, ReplicatedStorage > ClientModules)

```lua
--[[
	RaceViewer (ModuleScript)
	Location: ReplicatedStorage > ClientModules > RaceViewer

	Draws the race in 3D: builds 20 simple F1-style cars out of parts and moves
	them along the track every frame using the timing data from the server
	(no physics, so a full grid stays smooth). Also runs the race cameras
	(chase, TV, helicopter, overhead), the pit lane movement, and the rain and
	wet-track effects. In the menus it slowly circles the current circuit.
]]

local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("Config"))
local TrackPath = require(Shared:WaitForChild("TrackPath"))

local ClientModules = script.Parent
local TrackBuilder = require(ClientModules:WaitForChild("TrackBuilder"))

local RaceViewer = {}

local UP = Vector3.yAxis
local CAR_HEIGHT = 0.55
local CAMERA_MODES = { "Chase", "TV", "Helicopter", "Overhead" }

local state = {
	active = false,
	models = {},
	info = {},
	data = {},
	carCF = {},
	snap = nil,
	snapAt = 0,
	simClock = 0,
	clockReady = false,
	focusKey = nil,
	camMode = "Chase",
	manualKey = nil,
	orbitAngle = 0,
}
RaceViewer.state = state

---------------------------------------------------------------------
-- Car models
---------------------------------------------------------------------
local function weldPart(root, props, offset, model)
	local p = Instance.new("Part")
	p.Anchored = false
	p.CanCollide = false
	p.CanTouch = false
	p.CanQuery = false
	p.Massless = true
	p.CastShadow = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in pairs(props) do
		p[k] = v
	end
	p.CFrame = root.CFrame * offset
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = root
	weld.Part1 = p
	weld.Parent = p
	p.Parent = model
	return p
end

-- Builds a car. Returns the model (its PrimaryPart moves the whole car).
function RaceViewer.buildCar(color, code, highlight)
	local model = Instance.new("Model")
	model.Name = "Car_" .. tostring(code)
	local dark = Color3.fromRGB(25, 25, 28)
	local root = Instance.new("Part")
	root.Name = "Body"
	root.Anchored = true
	root.CanCollide = false
	root.CanTouch = false
	root.CanQuery = false
	root.CastShadow = false
	root.Size = Vector3.new(2.2, 0.7, 6.4)
	root.Color = color
	root.Material = Enum.Material.SmoothPlastic
	root.CFrame = CFrame.new(0, -1000, 0)
	root.Parent = model
	model.PrimaryPart = root

	weldPart(root, { Size = Vector3.new(0.9, 0.4, 2.2), Color = color }, CFrame.new(0, -0.1, -4.2), model)
	weldPart(root, { Size = Vector3.new(3.8, 0.15, 0.9), Color = dark }, CFrame.new(0, -0.35, -5.1), model)
	weldPart(root, { Size = Vector3.new(3.3, 0.55, 2.6), Color = color }, CFrame.new(0, -0.05, 0.6), model)
	weldPart(root, { Size = Vector3.new(0.75, 0.75, 1.8), Color = dark }, CFrame.new(0, 0.65, 0.7), model)
	weldPart(root, { Size = Vector3.new(2.9, 0.22, 0.8), Color = color }, CFrame.new(0, 1.0, 3.3), model)
	for _, side in ipairs({ -1, 1 }) do
		weldPart(root, { Size = Vector3.new(0.15, 0.9, 0.9), Color = dark }, CFrame.new(side * 1.45, 0.6, 3.3), model)
	end
	weldPart(root, {
		Shape = Enum.PartType.Ball,
		Size = Vector3.new(0.75, 0.75, 0.75),
		Color = Color3.fromRGB(250, 220, 40),
	}, CFrame.new(0, 0.55, -0.5), model)
	-- Wheels: cylinders lie along X, which is the axle direction.
	for _, wheel in ipairs({ { -2.9, 1.25 }, { 2.4, 1.45 } }) do
		for _, side in ipairs({ -1, 1 }) do
			weldPart(root, {
				Shape = Enum.PartType.Cylinder,
				Size = Vector3.new(0.95, wheel[2], wheel[2]),
				Color = Color3.fromRGB(20, 20, 20),
			}, CFrame.new(side * 1.65, wheel[2] / 2 - CAR_HEIGHT, wheel[1]), model)
		end
	end

	local billboard = Instance.new("BillboardGui")
	billboard.Size = UDim2.new(0, 48, 0, 18)
	billboard.StudsOffset = Vector3.new(0, 3.6, 0)
	billboard.AlwaysOnTop = true
	billboard.MaxDistance = 380
	billboard.LightInfluence = 0
	billboard.Parent = root
	local tag = Instance.new("TextLabel")
	tag.Size = UDim2.new(1, 0, 1, 0)
	tag.BackgroundColor3 = color
	tag.BackgroundTransparency = 0.1
	tag.BorderSizePixel = 0
	tag.Text = code
	tag.Font = Enum.Font.GothamBold
	tag.TextScaled = true
	local lum = 0.299 * color.R + 0.587 * color.G + 0.114 * color.B
	tag.TextColor3 = lum > 0.6 and Color3.new(0, 0, 0) or Color3.new(1, 1, 1)
	tag.Parent = billboard
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 4)
	corner.Parent = tag

	if highlight then
		local h = Instance.new("Highlight")
		h.FillTransparency = 1
		h.OutlineColor = Color3.fromRGB(255, 215, 60)
		h.OutlineTransparency = 0.2
		h.DepthMode = Enum.HighlightDepthMode.Occluded
		h.Parent = model
	end
	return model
end

---------------------------------------------------------------------
-- Race start / stop
---------------------------------------------------------------------
function RaceViewer.start(info)
	RaceViewer.stop()
	local built = TrackBuilder.current
	if not built then
		return
	end
	state.path = built.path
	state.active = true
	state.clockReady = false
	state.simClock = 0
	state.snap = nil
	state.manualKey = nil
	local folder = Instance.new("Folder")
	folder.Name = "RaceCars"
	folder.Parent = workspace
	state.folder = folder
	state.focusKey = nil
	for _, car in ipairs(info.cars) do
		state.info[car.k] = car
		local model = RaceViewer.buildCar(car.color, car.code, car.isPlayer)
		model.Parent = folder
		state.models[car.k] = model
		if car.isPlayer and (not state.focusKey or car.slot == 1) then
			state.focusKey = car.k
		end
		-- Park on the grid straight away.
		local cf = TrackPath.cframeAt(state.path, car.gridD, car.gridLat, CAR_HEIGHT)
		model.PrimaryPart.CFrame = cf
		state.carCF[car.k] = cf
	end
	state.focusKey = state.focusKey or info.cars[1].k
	state.order = info.cars
end

function RaceViewer.stop()
	state.active = false
	if state.folder then
		state.folder:Destroy()
		state.folder = nil
	end
	state.models = {}
	state.info = {}
	state.data = {}
	state.carCF = {}
	state.manualKey = nil
	RaceViewer.setWeather(nil)
end

function RaceViewer.applySnapshot(snap)
	state.snap = snap
	state.snapAt = os.clock()
	for _, c in ipairs(snap.cars) do
		state.data[c.k] = c
	end
	state.manualKey = snap.manualKey
	if snap.weather then
		RaceViewer.setWeather(snap.weather)
	end
end

function RaceViewer.getClock()
	return state.simClock
end

function RaceViewer.getModel(key)
	return state.models[key]
end

function RaceViewer.setManual(key)
	state.manualKey = key
end

---------------------------------------------------------------------
-- Where each car is drawn
---------------------------------------------------------------------
local function smooth(x)
	x = math.clamp(x, 0, 1)
	return x * x * (3 - 2 * x)
end

-- Returns distance round the lap, sideways offset, and whether the car is hidden.
local function placement(c, info, t, path)
	local pitLat = path.pitSide * Config.Track.PitLaneOffset
	local L = path.length
	if c.dnf then
		return 0, 0, true
	end
	if c.fin and c.ft then
		-- Slow-down lap after the chequered flag.
		local cool = math.max(0, t - c.ft)
		return math.min(cool * 22, L * 0.6), 0, false
	end
	local pit = c.pit
	if pit and t < pit[4] then
		local half = path.pitHalf / 2
		local d
		if t < pit[2] then
			d = (t - pit[1]) / math.max(0.01, pit[2] - pit[1]) * half
		elseif t < pit[3] then
			d = half
		else
			d = half + (t - pit[3]) / math.max(0.01, pit[4] - pit[3]) * half
		end
		return math.max(0, d), pitLat, false
	end
	local span = c.le - c.ss
	local f = c.sf
	if span > 0 then
		f = c.sf + (t - c.ss) / span * (1 - c.sf)
	end
	f = math.clamp(f, 0, 0.9999)
	local d = TrackPath.distAtFrac(path, f)
	local lateral = 0
	if c.ld == 0 and info then
		-- First lap: start from the grid slot.
		d += info.gridD * (1 - f)
		lateral = info.gridLat * (1 - smooth(f * 6))
	end
	-- Into the pit lane before the line.
	if c.pt and d > L - path.pitHalf then
		lateral = pitLat * smooth((d - (L - path.pitHalf)) / 50)
	end
	-- Back out of the pit lane after the stop.
	if pit and d < path.pitHalf + 50 then
		lateral = pitLat * (1 - smooth((d - path.pitHalf) / 50))
	end
	return d, lateral, false
end

function RaceViewer.updateCars(dt)
	local snap = state.snap
	local path = state.path
	if not state.active or not path then
		return
	end
	if snap then
		local target = snap.clock + (os.clock() - state.snapAt) * snap.timeScale
		if not state.clockReady then
			state.simClock = target
			state.clockReady = true
		end
		state.simClock += dt * snap.timeScale
		local err = target - state.simClock
		if math.abs(err) > 8 then
			state.simClock = target
		else
			state.simClock += err * math.min(1, dt * 2)
		end
	end
	local t = state.simClock
	-- Work out everyone's spot first, so cars side by side can be spread out.
	local spots = {}
	for key, model in pairs(state.models) do
		local c = state.data[key]
		if c and key ~= state.manualKey then
			local d, lateral, hidden = placement(c, state.info[key], t, path)
			if hidden then
				if model.Parent then
					model.Parent = nil
				end
			else
				if not model.Parent then
					model.Parent = state.folder
				end
				table.insert(spots, { key = key, d = d % path.length, lateral = lateral, model = model, pos = c.p or 99 })
			end
		end
	end
	table.sort(spots, function(a, b)
		return a.d < b.d
	end)
	for i = 2, #spots do
		local a, b = spots[i - 1], spots[i]
		if b.d - a.d < 7 and math.abs(b.lateral - a.lateral) < 3 and math.abs(a.lateral) < 6 then
			b.lateral = a.lateral + ((b.pos % 2 == 0) and 4.5 or -4.5)
		end
	end
	for _, s in ipairs(spots) do
		local cf = TrackPath.cframeAt(path, s.d, s.lateral, CAR_HEIGHT)
		local old = state.carCF[s.key]
		if old and (old.Position - cf.Position).Magnitude < 40 then
			cf = old:Lerp(cf, math.min(1, dt * 20))
		end
		s.model.PrimaryPart.CFrame = cf
		state.carCF[s.key] = cf
	end
end

-- CFrames of all visible cars except the one the player drives (for bumping).
function RaceViewer.otherCars()
	local list = {}
	for key, cf in pairs(state.carCF) do
		local model = state.models[key]
		if key ~= state.manualKey and model and model.Parent then
			table.insert(list, cf)
		end
	end
	return list
end

function RaceViewer.setCarCFrame(key, cf)
	local model = state.models[key]
	if model then
		model.PrimaryPart.CFrame = cf
		state.carCF[key] = cf
	end
end

---------------------------------------------------------------------
-- Cameras
---------------------------------------------------------------------
function RaceViewer.setFocus(key)
	if state.models[key] then
		state.focusKey = key
	end
end

function RaceViewer.cycleFocus(direction)
	local snap = state.snap
	if not snap then
		return
	end
	local order = {}
	for _, c in ipairs(snap.cars) do
		if not c.dnf then
			table.insert(order, c)
		end
	end
	table.sort(order, function(a, b)
		return a.p < b.p
	end)
	local index = 1
	for i, c in ipairs(order) do
		if c.k == state.focusKey then
			index = i
		end
	end
	index = (index - 1 + direction) % #order + 1
	if order[index] then
		state.focusKey = order[index].k
	end
end

function RaceViewer.cycleCamera()
	local index = table.find(CAMERA_MODES, state.camMode) or 1
	state.camMode = CAMERA_MODES[index % #CAMERA_MODES + 1]
	workspace.CurrentCamera.FieldOfView = 70
	return state.camMode
end

function RaceViewer.focusName()
	local info = state.info[state.focusKey]
	return info and info.name or ""
end

function RaceViewer.updateCamera(dt)
	local cam = workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Scriptable
	local built = TrackBuilder.current
	if not built then
		return
	end
	local cf = state.carCF[state.focusKey]
	local mode = state.camMode
	if mode == "Overhead" or not cf then
		local c = built.center
		local r = built.radius
		cam.FieldOfView = 50
		cam.CFrame = cam.CFrame:Lerp(CFrame.lookAt(c + Vector3.new(0, r * 1.7, r * 0.7), c), math.min(1, dt * 3))
		return
	end
	local pos = cf.Position
	local look = cf.LookVector
	if mode == "Chase" then
		cam.FieldOfView = 70
		local desired = CFrame.lookAt(pos - look * 17 + UP * 6, pos + look * 10 + UP * 1.5)
		cam.CFrame = cam.CFrame:Lerp(desired, math.min(1, dt * 6))
	elseif mode == "Helicopter" then
		cam.FieldOfView = 60
		local desired = CFrame.lookAt(pos - look * 70 + UP * 85, pos)
		cam.CFrame = cam.CFrame:Lerp(desired, math.min(1, dt * 3))
	else
		-- TV: nearest trackside camera, zooming in on the car.
		local best, bestDist = nil, math.huge
		for _, tv in ipairs(built.tvCams) do
			local dd = (tv.pos - pos).Magnitude
			if dd < bestDist then
				best, bestDist = tv, dd
			end
		end
		if best then
			local fov = math.clamp(math.deg(2 * math.atan(14 / math.max(bestDist, 1))), 10, 70)
			cam.FieldOfView = cam.FieldOfView + (fov - cam.FieldOfView) * math.min(1, dt * 4)
			cam.CFrame = CFrame.lookAt(best.pos, pos)
		end
	end
end

-- Slow circle above the circuit, used in the menus.
function RaceViewer.orbit(dt)
	local built = TrackBuilder.current
	local cam = workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Scriptable
	if not built then
		return
	end
	state.orbitAngle += dt * 0.04
	local c = built.center
	local r = built.radius
	cam.FieldOfView = 55
	local p = c + Vector3.new(math.cos(state.orbitAngle) * r * 1.2, r * 0.75, math.sin(state.orbitAngle) * r * 1.2)
	cam.CFrame = CFrame.lookAt(p, c)
end

---------------------------------------------------------------------
-- Weather effects
---------------------------------------------------------------------
local rainPart = nil
local rainEmitter = nil
local baseLighting = nil

function RaceViewer.setWeather(w)
	if not baseLighting then
		baseLighting = { brightness = Lighting.Brightness, exposure = Lighting.ExposureCompensation }
	end
	local rain = w and w.rain or 0
	local wet = w and w.wetness or 0
	local overcast = w and w.type ~= "Dry"
	if rain > 0.05 and not rainPart then
		rainPart = Instance.new("Part")
		rainPart.Name = "RainEmitter"
		rainPart.Anchored = true
		rainPart.CanCollide = false
		rainPart.CanQuery = false
		rainPart.CanTouch = false
		rainPart.Transparency = 1
		rainPart.Size = Vector3.new(140, 1, 140)
		rainPart.Parent = workspace
		rainEmitter = Instance.new("ParticleEmitter")
		rainEmitter.Texture = "rbxasset://textures/particles/smoke_main.dds"
		rainEmitter.Color = ColorSequence.new(Color3.fromRGB(200, 210, 230))
		rainEmitter.Transparency = NumberSequence.new(0.35)
		rainEmitter.Size = NumberSequence.new(0.12)
		rainEmitter.Squash = NumberSequence.new(3)
		rainEmitter.Lifetime = NumberRange.new(0.6, 0.8)
		rainEmitter.Speed = NumberRange.new(110, 130)
		rainEmitter.EmissionDirection = Enum.NormalId.Bottom
		rainEmitter.LightEmission = 0.2
		rainEmitter.Orientation = Enum.ParticleOrientation.FacingCameraWorldUp
		rainEmitter.Parent = rainPart
	elseif rain <= 0.05 and rainPart then
		rainPart:Destroy()
		rainPart = nil
		rainEmitter = nil
	end
	if rainEmitter then
		rainEmitter.Rate = 300 + rain * 1800
	end
	local current = TrackBuilder.current
	local night = current and current.track.night
	local base = night and 1.2 or 2.2
	Lighting.Brightness = base * (overcast and 0.7 or 1) * (1 - rain * 0.3)
	Lighting.ExposureCompensation = (baseLighting.exposure or 0) - (overcast and 0.2 or 0) - rain * 0.3
	local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere")
	if atmosphere then
		atmosphere.Density = 0.3 + rain * 0.35
		atmosphere.Haze = rain * 2
	else
		Lighting.FogColor = Color3.fromRGB(150, 155, 165)
		Lighting.FogEnd = rain > 0.05 and (2500 - rain * 1700) or 100000
	end
	TrackBuilder.setWetness(wet)
end

-- Keeps the rain falling around the camera.
function RaceViewer.updateWeather()
	if rainPart then
		local cam = workspace.CurrentCamera
		rainPart.CFrame = CFrame.new(cam.CFrame.Position + Vector3.new(0, 45, 0))
	end
end

function RaceViewer.getFocusKey()
	return state.focusKey
end

function RaceViewer.getCameraMode()
	return state.camMode
end

return RaceViewer
```


### 17. DriveController (ModuleScript, ReplicatedStorage > ClientModules)

```lua
--[[
	DriveController (ModuleScript)
	Location: ReplicatedStorage > ClientModules > DriveController

	Lets the player drive one of their cars ("take the wheel").
	Controls:
	  Keyboard: W / Up = throttle, S / Down / Space = brake, A D / Left Right = steer,
	            B = braking assist on/off
	  Gamepad:  Right trigger = throttle, Left trigger = brake, left stick = steer,
	            Y = braking assist on/off
	  Touch:    on-screen buttons (made by RaceUI) set DriveController.touch values.

	Arcade handling: the tyres only have so much grip, so the car cannot turn
	faster than the grip allows (it runs wide instead). Brake before corners.
	Going off the road onto grass slows you down; walls bounce you back.

	Two modes:
	  "race":  continues a race. Your distance is reported to the server, which
	           checks it is believable.
	  "quali": one flying Q3 lap with a timer, checkpoints and track limits.
]]

local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("Config"))
local TrackPath = require(Shared:WaitForChild("TrackPath"))

local DriveController = {}

DriveController.touch = { throttle = 0, brake = 0, steer = 0 }
DriveController.assist = true

local UP = Vector3.yAxis
local CAR_HEIGHT = 0.55
local active = nil
local connection = nil

local function yawFromVector(v)
	return math.atan2(-v.X, -v.Z)
end

local function forwardFromYaw(yaw)
	return Vector3.new(-math.sin(yaw), 0, -math.cos(yaw))
end

local function angleLerp(a, b, t)
	local diff = (b - a + math.pi) % (2 * math.pi) - math.pi
	return a + diff * t
end

-- Reads keyboard, gamepad and touch input. Returns throttle (0-1), brake (0-1), steer (-1 left .. 1 right).
local function readInput()
	local throttle, brake, steer = 0, 0, 0
	if UserInputService:IsKeyDown(Enum.KeyCode.W) or UserInputService:IsKeyDown(Enum.KeyCode.Up) then
		throttle = 1
	end
	if UserInputService:IsKeyDown(Enum.KeyCode.S) or UserInputService:IsKeyDown(Enum.KeyCode.Down) or UserInputService:IsKeyDown(Enum.KeyCode.Space) then
		brake = 1
	end
	if UserInputService:IsKeyDown(Enum.KeyCode.A) or UserInputService:IsKeyDown(Enum.KeyCode.Left) then
		steer -= 1
	end
	if UserInputService:IsKeyDown(Enum.KeyCode.D) or UserInputService:IsKeyDown(Enum.KeyCode.Right) then
		steer += 1
	end
	if UserInputService.GamepadEnabled then
		local ok, states = pcall(function()
			return UserInputService:GetGamepadState(Enum.UserInputType.Gamepad1)
		end)
		if ok and states then
			for _, input in ipairs(states) do
				if input.KeyCode == Enum.KeyCode.ButtonR2 then
					throttle = math.max(throttle, input.Position.Z)
				elseif input.KeyCode == Enum.KeyCode.ButtonL2 then
					brake = math.max(brake, input.Position.Z)
				elseif input.KeyCode == Enum.KeyCode.Thumbstick1 then
					if math.abs(input.Position.X) > 0.12 then
						steer += input.Position.X
					end
				end
			end
		end
	end
	local t = DriveController.touch
	throttle = math.max(throttle, t.throttle)
	brake = math.max(brake, t.brake)
	steer += t.steer
	return math.clamp(throttle, 0, 1), math.clamp(brake, 0, 1), math.clamp(steer, -1, 1)
end

--[[
	opts = {
		path, mode = "race" | "quali", model (car Model to move),
		startDist, lapsDone (race), gripMul, speedMul,
		startSpeed (optional),
		otherCars = function() -> list of CFrames,
		onReport = function(cumulativeDistance)       -- race mode
		onLapDone = function(seconds, cuts)            -- quali mode
		onHud = function(info)                         -- every frame, for the HUD
		setCarCFrame = function(cf)                     -- moves the car model
	}
]]
function DriveController.start(opts)
	DriveController.stop()
	local path = opts.path
	local p, tangent = TrackPath.posAt(path, opts.startDist)
	local idx = TrackPath.indexAt(path, opts.startDist)
	local profileSpeed = path.speed[idx] or 40
	active = {
		opts = opts,
		path = path,
		mode = opts.mode,
		pos = p,
		yaw = yawFromVector(tangent),
		speed = opts.startSpeed or math.min(profileSpeed, 60),
		steer = 0,
		hint = idx,
		along = opts.startDist % path.length,
		lap = opts.lapsDone or 0,
		reportTimer = 0,
		wallCooldown = 0,
		-- quali
		timing = false,
		lapStart = 0,
		checkpoints = {},
		cuts = 0,
		offTrack = false,
		offTimer = 0,
		reverseTimer = 0,
		wrongWay = 0,
		lastAlong = opts.startDist % path.length,
		elapsed = 0,
	}
	if opts.mode == "quali" then
		active.lap = 0
	end
	connection = RunService.RenderStepped:Connect(DriveController.step)
end

function DriveController.stop()
	if connection then
		connection:Disconnect()
		connection = nil
	end
	active = nil
end

function DriveController.isActive()
	return active ~= nil
end

-- Current position, heading and speed of the driven car (nil when not driving).
function DriveController.getCar()
	if not active then
		return nil
	end
	return { pos = active.pos, yaw = active.yaw, speed = active.speed, along = active.along, lap = active.lap }
end

function DriveController.toggleAssist()
	DriveController.assist = not DriveController.assist
	return DriveController.assist
end

function DriveController.step(dt)
	local a = active
	if not a then
		return
	end
	dt = math.min(dt, 1 / 20)
	local path = a.path
	local opts = a.opts
	local cfg = Config.Drive
	local W = path.width

	-- Where are we relative to the track?
	local idx, along, lateral = TrackPath.nearest(path, a.pos, a.hint, 30)
	a.hint = idx
	local onRoad = math.abs(lateral) <= W / 2 + 0.8
	local wallLimit = W / 2 + path.runoff - 1.6

	local throttle, brake, steerInput = readInput()

	-- Braking assist: brake automatically if far too fast for the corner ahead.
	local grip = opts.gripMul * (onRoad and 1 or 0.55)
	local vmax = cfg.TopSpeed * opts.speedMul * (onRoad and 1 or 0.45)
	if DriveController.assist and a.speed > 5 then
		-- The racing-line speed already allows for braking into the next corner,
		-- so only brake when we are clearly faster than it just ahead.
		local safe = math.huge
		for k = 1, 4 do
			local j = (idx - 1 + k) % path.n + 1
			safe = math.min(safe, path.speed[j] * math.sqrt(opts.gripMul) * opts.speedMul)
		end
		if a.speed > safe + 2 and brake < 0.6 then
			brake = math.max(brake, math.clamp((a.speed - safe) / 12, 0, 1))
			throttle = throttle * 0.3
		end
	end

	-- Speed.
	if brake > 0 and a.speed <= 0.5 then
		a.reverseTimer += dt
	else
		a.reverseTimer = 0
	end
	if a.reverseTimer > 0.5 then
		a.speed = math.max(-12, a.speed - 8 * dt) -- reverse after holding brake when stopped
	else
		if throttle > 0 and a.speed < vmax then
			local ratio = math.max(0, a.speed) / vmax
			a.speed += cfg.Accel * throttle * dt * (1 - ratio * ratio) * (onRoad and 1 or 0.6)
		end
		if brake > 0 and a.speed > 0 then
			a.speed = math.max(0, a.speed - cfg.Brake * brake * dt * (0.6 + 0.4 * grip))
		end
		if a.speed > vmax then
			a.speed = math.max(vmax, a.speed - 35 * dt)
		end
		a.speed -= (1.5 + math.abs(a.speed) * 0.008) * dt * (a.speed >= 0 and 1 or -1)
		if throttle == 0 and brake == 0 and math.abs(a.speed) < 0.3 then
			a.speed = 0
		end
	end

	-- Steering limited by grip: at high speed you can't turn as sharply.
	a.steer += (steerInput - a.steer) * math.min(1, dt * 7)
	local absSpeed = math.abs(a.speed)
	local maxYaw = 2.2
	if absSpeed > 1 then
		maxYaw = math.min(2.2, cfg.LateralGrip * grip / absSpeed)
	end
	local yawRate = -a.steer * maxYaw
	if a.speed < 0 then
		yawRate = -yawRate
	end
	if absSpeed < 0.5 then
		yawRate = 0
	end
	a.yaw += yawRate * dt

	local forward = forwardFromYaw(a.yaw)
	local newPos = a.pos + forward * a.speed * dt

	-- Walls: push back onto the track and lose speed.
	idx, along, lateral = TrackPath.nearest(path, newPos, idx, 30)
	a.wallCooldown -= dt
	if math.abs(lateral) > wallLimit then
		local right = path.right[idx]
		local excess = math.abs(lateral) - wallLimit
		newPos -= right * (excess * math.sign(lateral))
		if a.wallCooldown <= 0 then
			a.speed *= 0.55
			a.wallCooldown = 0.4
		end
		a.yaw = angleLerp(a.yaw, yawFromVector(path.tan[idx]), 0.35)
	end

	-- Bump into other cars.
	if opts.otherCars then
		for _, cf in ipairs(opts.otherCars()) do
			local offset = newPos - cf.Position
			local flatOffset = Vector3.new(offset.X, 0, offset.Z)
			local dist = flatOffset.Magnitude
			if dist < 5.5 and dist > 0.01 and math.abs(offset.Y) < 4 then
				newPos += flatOffset.Unit * (5.5 - dist)
				if forward:Dot(-flatOffset.Unit) > 0.3 then
					a.speed *= 0.9
				end
			end
		end
	end

	local height = path.pos[idx].Y
	a.pos = Vector3.new(newPos.X, height, newPos.Z)

	-- Lap counting: crossing the start/finish line forwards or backwards.
	local L = path.length
	if a.lastAlong > L * 0.75 and along < L * 0.25 then
		a.lap += 1
		DriveController.onLine(a)
	elseif a.lastAlong < L * 0.25 and along > L * 0.75 then
		a.lap -= 1
	end
	if along < a.lastAlong - 0.5 and along > a.lastAlong - L * 0.5 and a.speed > 8 then
		a.wrongWay += dt
	else
		a.wrongWay = math.max(0, a.wrongWay - dt * 2)
	end
	a.lastAlong = along
	a.along = along

	-- Move the car model.
	local cf = CFrame.new(a.pos + UP * CAR_HEIGHT) * CFrame.Angles(0, a.yaw, 0)
	if opts.setCarCFrame then
		opts.setCarCFrame(cf)
	end

	-- Chase camera.
	local cam = workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Scriptable
	cam.FieldOfView = 70 + math.clamp(absSpeed / cfg.TopSpeed, 0, 1) * 8
	local desired = CFrame.lookAt(a.pos - forward * 15 + UP * 5.5, a.pos + forward * 10 + UP * 1.5)
	cam.CFrame = cam.CFrame:Lerp(desired, math.min(1, dt * 8))

	-- Track limits in qualifying: all four wheels over the white line counts.
	local offNow = math.abs(lateral) > W / 2 + 2
	if a.mode == "quali" and a.timing then
		if offNow and not a.offTrack then
			a.cuts += 1
		end
		for c = 1, 10 do
			if not a.checkpoints[c] and along >= (c - 0.5) / 10 * L and along < (c - 0.5) / 10 * L + 120 then
				a.checkpoints[c] = true
			end
		end
	end
	a.offTrack = offNow

	-- Report progress in race mode.
	if a.mode == "race" then
		a.reportTimer += dt
		if a.reportTimer >= 0.2 and opts.onReport then
			a.reportTimer = 0
			opts.onReport(a.lap * L + along)
		end
	end

	a.elapsed += dt
	if opts.onHud then
		opts.onHud({
			speed = absSpeed,
			kmh = math.floor(absSpeed * 3.6 + 0.5),
			lap = a.lap,
			along = along,
			onRoad = onRoad,
			cuts = a.cuts,
			timing = a.timing,
			lapTime = a.timing and (os.clock() - a.lapStart) or 0,
			wrongWay = a.wrongWay > 1.5,
			assist = DriveController.assist,
		})
	end
end

-- Called when the car crosses the start/finish line going forwards.
function DriveController.onLine(a)
	if a.mode ~= "quali" then
		return
	end
	if not a.timing then
		a.timing = true
		a.lapStart = os.clock()
		a.checkpoints = {}
		a.cuts = 0
		return
	end
	local passed = 0
	for c = 1, 10 do
		if a.checkpoints[c] then
			passed += 1
		end
	end
	local lapTime = os.clock() - a.lapStart
	local opts = a.opts
	if passed >= 8 then
		DriveController.stop()
		if opts.onLapDone then
			opts.onLapDone(lapTime, a.cuts)
		end
	else
		-- Skipped part of the track: start a fresh lap.
		a.lapStart = os.clock()
		a.checkpoints = {}
		a.cuts = 0
	end
end

-- Keyboard / gamepad shortcut for the braking assist.
UserInputService.InputBegan:Connect(function(input, processed)
	if processed or not active then
		return
	end
	if input.KeyCode == Enum.KeyCode.B or input.KeyCode == Enum.KeyCode.ButtonY then
		DriveController.toggleAssist()
	end
end)

return DriveController
```


### 18. HubPanels (ModuleScript, ReplicatedStorage > ClientModules)

```lua
--[[
	HubPanels (ModuleScript)
	Location: ReplicatedStorage > ClientModules > HubPanels

	The information tabs of the main menu: Standings, Calendar, Objectives and
	Records, plus the end-of-season window and the "record broken" celebration.
]]

local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))

local ClientModules = script.Parent
local UIKit = require(ClientModules:WaitForChild("UIKit"))

local T = UIKit.Theme
local HubPanels = {}

local ctx = nil

function HubPanels.init(context)
	ctx = context
end

local function duration(seconds)
	seconds = math.max(0, math.floor(seconds))
	local d = seconds // 86400
	local h = (seconds % 86400) // 3600
	local m = (seconds % 3600) // 60
	if d > 0 then
		return string.format("%dd %dh", d, h)
	end
	return string.format("%dh %dm", h, m)
end

---------------------------------------------------------------------
-- Standings
---------------------------------------------------------------------
function HubPanels.renderStandings(parent, s)
	local dCard = UIKit.card(parent, { LayoutOrder = 1 })
	UIKit.title(dCard, "Drivers' championship - Season " .. s.season, 22)
	local drivers = s.standings.drivers
	if #drivers == 0 then
		UIKit.paragraph(dCard, "No races yet this season.")
	else
		local rows = {}
		for i, d in ipairs(drivers) do
			table.insert(rows, {
				tostring(i),
				{ text = d.name, color = d.isPlayer and T.gold or nil },
				{ text = d.teamName or "", color = d.color },
				tostring(d.wins),
				tostring(d.podiums),
				tostring(d.points),
			})
		end
		UIKit.table(dCard, {
			{ "POS", 0.08 },
			{ "DRIVER", 0.32 },
			{ "TEAM", 0.3 },
			{ "WINS", 0.1, Enum.TextXAlignment.Right },
			{ "PODIUMS", 0.1, Enum.TextXAlignment.Right },
			{ "PTS", 0.1, Enum.TextXAlignment.Right },
		}, rows, 22, function(i)
			return drivers[i] and drivers[i].isPlayer and Color3.fromRGB(60, 52, 22) or nil
		end)
	end

	local tCard = UIKit.card(parent, { LayoutOrder = 2 })
	UIKit.title(tCard, "Constructors' championship", 22)
	local teams = s.standings.teams
	if #teams == 0 then
		UIKit.paragraph(tCard, "No races yet this season.")
	else
		local rows = {}
		for i, t in ipairs(teams) do
			table.insert(rows, {
				tostring(i),
				{ text = t.name, color = t.isPlayer and T.gold or t.color },
				tostring(t.wins),
				tostring(t.points),
			})
		end
		UIKit.table(tCard, {
			{ "POS", 0.1 },
			{ "TEAM", 0.6 },
			{ "WINS", 0.15, Enum.TextXAlignment.Right },
			{ "PTS", 0.15, Enum.TextXAlignment.Right },
		}, rows, 24, function(i)
			return teams[i] and teams[i].isPlayer and Color3.fromRGB(60, 52, 22) or nil
		end)
	end

	if #s.history > 0 then
		local hCard = UIKit.card(parent, { LayoutOrder = 3 })
		UIKit.title(hCard, "Past seasons", 20)
		for i = #s.history, 1, -1 do
			local h = s.history[i]
			UIKit.label(hCard, string.format("Season %d: champion <b>%s</b> (%s)  •  constructors <b>%s</b>  •  you finished <b>P%d</b> with %d pts", h.season, h.driverChampion, h.driverChampionTeam, h.constructorsChampion, h.yourPosition, h.yourPoints), { TextSize = 14 })
		end
	end
end

---------------------------------------------------------------------
-- Calendar
---------------------------------------------------------------------
function HubPanels.renderCalendar(parent, s)
	local card = UIKit.card(parent, { LayoutOrder = 1 })
	UIKit.title(card, "Season " .. s.season .. " calendar", 22)
	for _, c in ipairs(s.calendar) do
		local r = UIKit.frame(card, {
			Size = UDim2.new(1, 0, 0, 44),
			BackgroundColor3 = c.current and Color3.fromRGB(70, 30, 40) or T.panel2,
		})
		UIKit.corner(r, 6)
		UIKit.label(r, tostring(c.round), {
			Position = UDim2.new(0, 10, 0, 0),
			Size = UDim2.new(0, 30, 1, 0),
			Font = T.fontBold,
			TextSize = 18,
		})
		UIKit.label(r, "<b>" .. c.name .. "</b>", {
			Position = UDim2.new(0, 46, 0, 2),
			Size = UDim2.new(0.45, -46, 0, 20),
			TextSize = 15,
		})
		UIKit.label(r, c.description, {
			Position = UDim2.new(0, 46, 0, 22),
			Size = UDim2.new(0.45, -46, 0, 18),
			TextSize = 12,
			TextColor3 = T.subtext,
			TextTruncate = Enum.TextTruncate.AtEnd,
			TextWrapped = false,
		})
		local status
		if c.result then
			local best = c.result.yourBest > 0 and ("your best P" .. c.result.yourBest) or ""
			status = string.format("Winner: %s (%s)   %s", c.result.winner, c.result.winnerTeam, best)
		elseif c.current then
			status = "<b>THIS WEEKEND</b>"
		else
			status = "Upcoming"
		end
		UIKit.label(r, status, {
			Position = UDim2.new(0.45, 10, 0, 0),
			Size = UDim2.new(0.55, -20, 1, 0),
			TextSize = 14,
			TextColor3 = c.current and T.gold or T.subtext,
		})
	end
end

---------------------------------------------------------------------
-- Objectives
---------------------------------------------------------------------
local function objectiveList(parent, list, which, order)
	for i, o in ipairs(list) do
		local card = UIKit.card(parent, { LayoutOrder = order + i })
		local r = UIKit.frame(card, { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 24) })
		UIKit.label(r, (o.done and "✅ " or "🎯 ") .. o.text, { Size = UDim2.new(1, -200, 1, 0), Font = T.fontMedium })
		UIKit.label(r, "Reward: " .. o.rewardText, {
			Position = UDim2.new(1, -200, 0, 0),
			Size = UDim2.new(0, 200, 1, 0),
			TextColor3 = T.gold,
			TextSize = 14,
			TextXAlignment = Enum.TextXAlignment.Right,
		})
		UIKit.bar(card, o.progress / math.max(1, o.target), o.done and T.good or T.accent2)
		local footer = UIKit.row(card, 30)
		UIKit.label(footer, string.format("%s / %s", tostring(o.progress), tostring(o.target)), { Size = UDim2.new(0, 120, 1, 0), TextSize = 14, TextColor3 = T.subtext })
		if o.claimed then
			UIKit.label(footer, "Reward claimed ✓", { Size = UDim2.new(0, 200, 1, 0), TextColor3 = T.good, TextSize = 14 })
		elseif o.done then
			UIKit.button(footer, "Claim reward", function()
				ctx.request("ClaimObjective", { which = which, id = o.id })
			end, { Size = UDim2.new(0, 160, 0, 28), BackgroundColor3 = T.gold, TextColor3 = Color3.new(0, 0, 0) })
		end
	end
end

function HubPanels.renderObjectives(parent, s)
	local o = s.objectives
	local d = UIKit.card(parent, { LayoutOrder = 1 })
	UIKit.title(d, "Daily objectives", 22)
	UIKit.label(d, "New ones in " .. duration(o.dailyResetIn) .. " (resets at midnight UTC)", { TextColor3 = T.subtext, TextSize = 14 })
	objectiveList(parent, o.daily, "daily", 10)
	local w = UIKit.card(parent, { LayoutOrder = 50 })
	UIKit.title(w, "Weekly objectives", 22)
	UIKit.label(w, "New ones in " .. duration(o.weeklyResetIn) .. " (resets Monday 00:00 UTC)", { TextColor3 = T.subtext, TextSize = 14 })
	objectiveList(parent, o.weekly, "weekly", 60)
end

---------------------------------------------------------------------
-- Records
---------------------------------------------------------------------
function HubPanels.renderRecords(parent, s)
	local rec = s.records
	local sum = rec.summary
	local head = UIKit.card(parent, { LayoutOrder = 1 })
	UIKit.title(head, "Your career", 22)
	UIKit.label(head, string.format("Races <b>%d</b>   •   Wins <b>%d</b>   •   Podiums <b>%d</b>   •   Poles <b>%d</b>   •   Points <b>%d</b>   •   Constructors' titles <b>%d</b>", sum.races, sum.wins, sum.podiums, sum.poles, sum.points, sum.constructorsTitles))
	UIKit.paragraph(head, "Beat the real Formula 1 records below. Driver records count the best driver who raced for your team.")
	for i, r in ipairs(rec.records) do
		local card = UIKit.card(parent, { LayoutOrder = 1 + i })
		if r.broken then
			card.BackgroundColor3 = Color3.fromRGB(60, 50, 15)
		end
		local top = UIKit.frame(card, { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 24) })
		UIKit.label(top, (r.broken and "🏆 " or "") .. "<b>" .. r.label .. "</b>", { Size = UDim2.new(1, -220, 1, 0) })
		UIKit.label(top, "You: <b>" .. r.valueText .. "</b>  /  Record: <b>" .. r.targetText .. "</b>", {
			Position = UDim2.new(1, -220, 0, 0),
			Size = UDim2.new(0, 220, 1, 0),
			TextXAlignment = Enum.TextXAlignment.Right,
			TextSize = 14,
			TextColor3 = r.broken and T.gold or T.text,
		})
		UIKit.label(card, "Record holder: " .. r.holder .. (r.broken and "   -   BEATEN BY YOUR TEAM!" or ""), { TextSize = 13, TextColor3 = r.broken and T.gold or T.subtext })
		UIKit.bar(card, r.progress, r.broken and T.gold or T.accent2)
	end
end

---------------------------------------------------------------------
-- Windows and celebrations
---------------------------------------------------------------------
function HubPanels.showSeasonSummary(summary)
	UIKit.modal(ctx.gui, "Season " .. summary.season .. " complete!", function(body, close)
		if summary.wonDrivers then
			UIKit.label(body, "🏆 Your driver is WORLD CHAMPION!", { TextColor3 = T.gold, Font = T.fontBold, TextSize = 20 })
		end
		if summary.wonConstructors then
			UIKit.label(body, "🏆 You won the CONSTRUCTORS' CHAMPIONSHIP!", { TextColor3 = T.gold, Font = T.fontBold, TextSize = 20 })
		end
		UIKit.label(body, "Drivers' champion: <b>" .. summary.driverChampion .. "</b> (" .. summary.driverChampionTeam .. ")")
		UIKit.label(body, "Constructors' champion: <b>" .. summary.constructorsChampion .. "</b>")
		UIKit.label(body, string.format("Your team finished <b>P%d</b> with <b>%d</b> points.", summary.yourPosition, summary.yourPoints))
		UIKit.label(body, "End-of-season prize money: <b>" .. Config.formatMoney(summary.prize) .. "</b>", { TextColor3 = T.gold })
		UIKit.paragraph(body, "New regulations pull every car back a little. Drivers have aged a year: young ones improve, older ones slow down. The market has been refreshed.")
		UIKit.button(body, "Start the new season", close, { Size = UDim2.new(0, 240, 0, 40), BackgroundColor3 = T.good })
	end, 560)
	if summary.wonDrivers or summary.wonConstructors then
		HubPanels.confetti(ctx.gui, 120)
	end
end

-- Falling paper confetti over the whole screen.
function HubPanels.confetti(gui, count)
	local colors = { T.gold, T.accent, T.accent2, T.good, T.purple, Color3.new(1, 1, 1) }
	local holder = UIKit.frame(gui, { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 60, Name = "Confetti" })
	local rng = Random.new()
	for _ = 1, count or 80 do
		local piece = UIKit.frame(holder, {
			Size = UDim2.new(0, rng:NextInteger(6, 12), 0, rng:NextInteger(10, 18)),
			Position = UDim2.new(rng:NextNumber(), 0, -0.05, -rng:NextInteger(0, 300)),
			BackgroundColor3 = colors[rng:NextInteger(1, #colors)],
			Rotation = rng:NextInteger(0, 360),
			ZIndex = 60,
		})
		local fall = rng:NextNumber(2.5, 4.5)
		TweenService:Create(piece, TweenInfo.new(fall, Enum.EasingStyle.Sine, Enum.EasingDirection.In), {
			Position = UDim2.new(piece.Position.X.Scale + rng:NextNumber(-0.1, 0.1), 0, 1.05, 0),
			Rotation = piece.Rotation + rng:NextInteger(180, 720),
		}):Play()
	end
	task.delay(5, function()
		holder:Destroy()
	end)
end

-- Big banner when a historical record falls.
function HubPanels.celebrateRecord(record)
	local gui = ctx.gui
	local banner = UIKit.frame(gui, {
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5, 0, 0.4, 0),
		Size = UDim2.new(0, 640, 0, 190),
		BackgroundColor3 = Color3.fromRGB(30, 24, 8),
		ZIndex = 70,
	})
	UIKit.corner(banner, 14)
	UIKit.stroke(banner, T.gold, 3)
	UIKit.label(banner, "🏆 RECORD BROKEN! 🏆", {
		Position = UDim2.new(0, 0, 0, 14),
		Size = UDim2.new(1, 0, 0, 48),
		TextXAlignment = Enum.TextXAlignment.Center,
		Font = T.fontBold,
		TextSize = 40,
		TextColor3 = T.gold,
		ZIndex = 71,
	})
	UIKit.label(banner, record.label, {
		Position = UDim2.new(0, 20, 0, 70),
		Size = UDim2.new(1, -40, 0, 30),
		TextXAlignment = Enum.TextXAlignment.Center,
		Font = T.fontBold,
		TextSize = 22,
		ZIndex = 71,
	})
	local valueText = type(record.value) == "number" and (record.value % 1 ~= 0 and string.format("%.2f", record.value) or tostring(record.value)) or tostring(record.value)
	UIKit.label(banner, "Your team: " .. valueText .. "   -   Previous record: " .. tostring(record.target) .. " (" .. record.holder .. ")", {
		Position = UDim2.new(0, 20, 0, 110),
		Size = UDim2.new(1, -40, 0, 50),
		TextXAlignment = Enum.TextXAlignment.Center,
		TextSize = 16,
		TextColor3 = T.subtext,
		ZIndex = 71,
	})
	HubPanels.confetti(gui, 150)
	banner.Size = UDim2.new(0, 0, 0, 0)
	TweenService:Create(banner, TweenInfo.new(0.5, Enum.EasingStyle.Back), { Size = UDim2.new(0, 640, 0, 190) }):Play()
	task.delay(6, function()
		banner:Destroy()
	end)
end

return HubPanels
```


### 19. HubUI (ModuleScript, ReplicatedStorage > ClientModules)

```lua
--[[
	HubUI (ModuleScript)
	Location: ReplicatedStorage > ClientModules > HubUI

	The main menu between sessions. It has a top bar (team, budget, upgrade
	points, saving) and tabs:
	  Weekend    - run practice, qualifying and start the race; see results
	  Team       - your drivers, reserve, pit crew and strategists
	  Market     - hire new people
	  Car        - spend money or upgrade points on car development
	  Standings, Calendar, Objectives, Records - drawn by HubPanels
	Every button sends a request to the server, which checks it and replies
	with the new game state.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))

local ClientModules = script.Parent
local UIKit = require(ClientModules:WaitForChild("UIKit"))
local HubPanels = require(ClientModules:WaitForChild("HubPanels"))

local T = UIKit.Theme
local HubUI = {}

local ctx = nil
local root, content, topBar, navHolder
local currentTab = "Weekend"
local navButtons = {}
local chosenTyres = { "Medium", "Medium" }
local tyreChoiceRound = -1
local TABS = { "Weekend", "Team", "Market", "Car", "Standings", "Calendar", "Objectives", "Records" }

---------------------------------------------------------------------
-- Helpers
---------------------------------------------------------------------
local function money(v)
	return Config.formatMoney(v)
end

local function teamColor()
	local s = ctx.state
	return Config.teamColor("PLAYER", s and s.colorIndex or 1)
end

local function difficultyText(v)
	if v < 0.35 then
		return "Easy"
	elseif v < 0.6 then
		return "Medium"
	elseif v < 0.8 then
		return "Hard"
	end
	return "Very hard"
end

local function confirm(titleText, message, onYes)
	UIKit.modal(ctx.gui, titleText, function(body, close)
		UIKit.paragraph(body, message, { TextColor3 = T.text })
		local r = UIKit.row(body, 38)
		UIKit.button(r, "Confirm", function()
			close()
			onYes()
		end, { BackgroundColor3 = T.good })
		UIKit.button(r, "Cancel", close, { BackgroundColor3 = T.panel3 })
	end, 460)
end

local function act(action, args)
	return ctx.request(action, args)
end

-- A small results table for practice / qualifying / grid rows.
local function timingTable(parent, rows, cutoff)
	local list = {}
	local best = rows[1] and rows[1].time
	for i, r in ipairs(rows) do
		local gap = ""
		if i > 1 and r.time and best then
			gap = string.format("+%.3f", r.time - best)
		end
		table.insert(list, {
			tostring(r.gridPos or r.pos or i),
			{ text = r.name .. (r.driven and "  (you drove)" or ""), color = r.isPlayer and T.gold or nil },
			{ text = r.teamName, color = r.color },
			r.time and Config.formatLapTime(r.time) or "No time",
			gap,
		})
	end
	UIKit.table(parent, {
		{ "POS", 0.08 },
		{ "DRIVER", 0.34 },
		{ "TEAM", 0.28 },
		{ "TIME", 0.16, Enum.TextXAlignment.Right },
		{ "GAP", 0.14, Enum.TextXAlignment.Right },
	}, list, 22, function(i)
		local r = rows[i]
		if r and r.isPlayer then
			return Color3.fromRGB(60, 52, 22)
		end
		if cutoff and i > cutoff then
			return Color3.fromRGB(58, 30, 34)
		end
		return nil
	end)
end

---------------------------------------------------------------------
-- Weekend tab
---------------------------------------------------------------------
local function sessionStrip(parent, stage)
	local strip = UIKit.row(parent, 34, 6)
	for i, name in ipairs(Config.SessionOrder) do
		local done = stage > i
		local current = stage == i
		local chip = UIKit.frame(strip, {
			Size = UDim2.new(0, 74, 0, 30),
			BackgroundColor3 = current and T.accent or (done and Color3.fromRGB(35, 80, 50) or T.panel2),
			LayoutOrder = i,
		})
		UIKit.corner(chip, 6)
		UIKit.label(chip, (done and "✓ " or "") .. name, {
			Size = UDim2.new(1, 0, 1, 0),
			TextXAlignment = Enum.TextXAlignment.Center,
			Font = T.fontBold,
			TextSize = 14,
		})
	end
end

local function playerQ3Rows(w)
	local list = {}
	local q2 = w.quali and w.quali.Q2
	if q2 then
		for i, r in ipairs(q2) do
			if i <= Config.Race.QualiCutoffs[2] and r.isPlayer then
				table.insert(list, r)
			end
		end
	end
	return list
end

local function idealTyre(wetness)
	if wetness >= 0.62 then
		return "Wet"
	elseif wetness >= 0.17 then
		return "Inter"
	end
	return nil
end

local function renderActions(parent, s)
	local w = s.weekend
	local card = UIKit.card(parent, { LayoutOrder = 5 })
	if not s.setupDone then
		UIKit.title(card, "Welcome, Team Principal!", 20)
		UIKit.paragraph(card, "Pick your team name and colours to start your career.")
		UIKit.button(card, "Set up my team", function()
			HubUI.showSetup()
		end, { Size = UDim2.new(0, 220, 0, 38) })
		return
	end
	if not s.ready then
		UIKit.title(card, "Build your team first", 20)
		UIKit.paragraph(card, "You need two race drivers, a pit crew and at least one strategist. A reserve driver is optional but helps if someone gets injured.")
		local r = UIKit.row(card, 38)
		UIKit.button(r, "Quick Setup (auto-hire)", function()
			act("QuickSetup")
		end, { Size = UDim2.new(0, 230, 0, 36), BackgroundColor3 = T.good })
		UIKit.button(r, "Go to the Market", function()
			HubUI.showTab("Market")
		end, { Size = UDim2.new(0, 190, 0, 36), BackgroundColor3 = T.panel3 })
		return
	end
	local stage = w.stage
	if stage <= 3 then
		UIKit.title(card, Config.SessionOrder[stage] .. ": choose a practice programme", 20)
		UIKit.paragraph(card, "Each practice session makes your team a little faster this weekend. Practice is quick: it is simulated instantly.")
		for _, prog in ipairs(Config.PracticePrograms) do
			local r = UIKit.row(card, 40)
			UIKit.button(r, "Run " .. Config.SessionOrder[stage] .. ": " .. prog.label, function()
				act("RunPractice", { program = prog.id })
			end, { Size = UDim2.new(0, 260, 0, 36) })
			UIKit.label(r, prog.desc, { Size = UDim2.new(1, -280, 1, 0), TextColor3 = T.subtext, TextSize = 14 })
		end
		UIKit.button(card, "Skip the rest of practice", function()
			act("SkipPractice")
		end, { Size = UDim2.new(0, 240, 0, 32), BackgroundColor3 = T.panel3 })
	elseif stage == 4 or stage == 5 then
		local name = Config.SessionOrder[stage]
		UIKit.title(card, "Qualifying: " .. name, 20)
		local out = stage == 4 and "16-20" or "11-15"
		UIKit.paragraph(card, "Everyone sets their best lap. The slowest five (P" .. out .. ") are knocked out and start from those grid places.")
		UIKit.button(card, "Run " .. name, function()
			act("RunQualifying", {})
		end, { Size = UDim2.new(0, 220, 0, 40) })
	elseif stage == 6 then
		UIKit.title(card, "Qualifying: Q3 - the top ten fight for pole", 20)
		if w.pendingDrive then
			UIKit.paragraph(card, "Your Q3 lap is in progress...")
			return
		end
		UIKit.paragraph(card, "Simulate Q3, or take the wheel and drive a flying lap yourself. Your driver has already set a banker lap; your lap only counts if it is faster. Go off the track three times and your lap is deleted.")
		local r = UIKit.row(card, 40)
		UIKit.button(r, "Simulate Q3", function()
			act("RunQualifying", { mode = "sim" })
		end, { Size = UDim2.new(0, 180, 0, 36) })
		for _, row in ipairs(playerQ3Rows(w)) do
			UIKit.button(r, "Drive the lap: " .. row.name, function()
				local resp = act("RunQualifying", { mode = "drive", slot = row.slot })
				if resp and resp.ok and resp.extra and resp.extra.drive then
					ctx.startQualiDrive(resp.extra.drive)
				end
			end, { Size = UDim2.new(0, 280, 0, 36), BackgroundColor3 = T.purple })
		end
	elseif stage == 7 then
		UIKit.title(card, "Race: " .. w.laps .. " laps", 20)
		UIKit.paragraph(card, "Choose each car's starting tyres, then start the race. In a dry race each car must use two different dry compounds (or get a 10 second penalty). Your strategist can make pit calls for you (Auto) or you can call them yourself.")
		if tyreChoiceRound ~= w.round then
			tyreChoiceRound = w.round
			local wet = idealTyre(w.weather.wetness)
			chosenTyres = { wet or "Medium", wet or "Hard" }
		end
		local slots = {}
		for slot = 1, 2 do
			local d = s.team.drivers["race" .. slot]
			slots[slot] = d and d.name or ("Car " .. slot)
		end
		for slot = 1, 2 do
			local r = UIKit.row(card, 34, 6)
			UIKit.label(r, slots[slot] .. ":", { Size = UDim2.new(0, 190, 1, 0), Font = T.fontMedium })
			for _, compound in ipairs(Config.TyreOrder) do
				local tyre = Config.Tyres[compound]
				local selected = chosenTyres[slot] == compound
				UIKit.button(r, tyre.name, function()
					chosenTyres[slot] = compound
					HubUI.refresh()
				end, {
					Size = UDim2.new(0, 100, 0, 30),
					BackgroundColor3 = selected and tyre.color or T.panel3,
					TextColor3 = selected and UIKit.contrastText(tyre.color) or T.text,
				})
			end
		end
		UIKit.button(card, "START THE RACE", function()
			act("StartRace", { tyres = { chosenTyres[1], chosenTyres[2] } })
		end, { Size = UDim2.new(0, 260, 0, 46), TextSize = 18, BackgroundColor3 = T.good })
	else
		local sum = w.raceSummary
		UIKit.title(card, "Race result: " .. w.trackName, 20)
		if sum then
			local rows = {}
			local shown = {}
			for _, r in ipairs(sum.results) do
				if r.pos <= 10 or r.isPlayer then
					table.insert(rows, {
						tostring(r.pos),
						{ text = r.name, color = r.isPlayer and T.gold or nil },
						{ text = r.teamName, color = r.color },
						r.status,
						r.points > 0 and ("+" .. r.points) or "",
					})
					table.insert(shown, r)
				end
			end
			UIKit.table(card, {
				{ "POS", 0.08 },
				{ "DRIVER", 0.3 },
				{ "TEAM", 0.26 },
				{ "TIME", 0.26 },
				{ "PTS", 0.1, Enum.TextXAlignment.Right },
			}, rows, 22, function(i)
				return shown[i] and shown[i].isPlayer and Color3.fromRGB(60, 52, 22) or nil
			end)
			UIKit.title(card, "Money", 18)
			for _, line in ipairs(sum.income) do
				local r = UIKit.row(card, 20)
				UIKit.label(r, line.label, { Size = UDim2.new(0, 260, 1, 0), TextSize = 14, TextColor3 = T.subtext })
				UIKit.label(r, money(line.amount), { Size = UDim2.new(0, 120, 1, 0), TextSize = 14, TextColor3 = line.amount >= 0 and T.good or T.bad })
			end
			UIKit.label(card, "Total this race: <b>" .. money(sum.net) .. "</b>", { TextColor3 = sum.net >= 0 and T.good or T.bad })
		end
		local lastRound = s.round >= Config.RoundsPerSeason
		UIKit.button(card, lastRound and "Finish the season" or "Continue to the next round", function()
			local resp = act("Continue")
			if resp and resp.ok and resp.extra and resp.extra.season then
				HubPanels.showSeasonSummary(resp.extra.season)
			end
		end, { Size = UDim2.new(0, 280, 0, 42), BackgroundColor3 = T.good })
	end
end

local function renderResults(parent, s)
	local w = s.weekend
	local stage = w.stage
	local card
	if stage >= 7 and w.gridRows then
		card = UIKit.card(parent, { LayoutOrder = 6 })
		UIKit.title(card, "Starting grid", 18)
		timingTable(card, w.gridRows)
	elseif stage == 6 and w.quali.Q2 then
		card = UIKit.card(parent, { LayoutOrder = 6 })
		UIKit.title(card, "Q2 result (red = knocked out)", 18)
		timingTable(card, w.quali.Q2, Config.Race.QualiCutoffs[2])
	elseif stage == 5 and w.quali.Q1 then
		card = UIKit.card(parent, { LayoutOrder = 6 })
		UIKit.title(card, "Q1 result (red = knocked out)", 18)
		timingTable(card, w.quali.Q1, Config.Race.QualiCutoffs[1])
	elseif w.practice then
		card = UIKit.card(parent, { LayoutOrder = 6 })
		local wx = w.practice.weather
		UIKit.title(card, w.practice.name .. " result (" .. (wx and wx.label or "") .. ")", 18)
		timingTable(card, w.practice.rows)
	end
end

local function renderRadioLog(parent)
	local log = ctx.radioLog
	if #log == 0 then
		return
	end
	local card = UIKit.card(parent, { LayoutOrder = 7 })
	UIKit.title(card, "Team radio", 18)
	for i = math.max(1, #log - 7), #log do
		local m = log[i]
		local color = m.role == "driver" and T.gold or (m.role == "strategist" and T.accent2 or T.good)
		UIKit.paragraph(card, string.format('<font color="#%s"><b>%s:</b></font> %s', color:ToHex(), m.speaker, m.text), { TextColor3 = T.text, TextSize = 14 })
	end
end

local function renderWeekend(parent, s)
	local w = s.weekend
	local header = UIKit.card(parent, { LayoutOrder = 1 })
	UIKit.title(header, string.format("Round %d of %d: %s", w.round, Config.RoundsPerSeason, w.trackName), 24)
	UIKit.paragraph(header, w.description)
	local f = w.facts
	local facts = string.format(
		"Race distance: <b>%d laps</b>   •   Lap: <b>%.2f km</b>   •   Overtaking: <b>%s</b>   •   Rain chance: <b>%d%%</b>   •   Favours: <b>%s</b>%s%s",
		w.laps,
		w.lengthM / 1000,
		difficultyText(f.overtaking),
		math.floor(f.rain * 100 + 0.5),
		f.power > 0.6 and "power" or (f.power < 0.35 and "cornering" or "balance"),
		f.night and "   •   <b>Night race</b>" or "",
		f.street and "   •   <b>Street circuit</b>" or ""
	)
	UIKit.paragraph(header, facts, { TextColor3 = T.text, TextSize = 14 })
	sessionStrip(header, w.stage)

	local info = UIKit.card(parent, { LayoutOrder = 2 })
	UIKit.label(info, string.format("Weather: <b>%s</b>  (track %d%% wet)   •   %s", w.weather.label, math.floor(w.weather.wetness * 100 + 0.5), w.forecast or ""))
	UIKit.label(info, string.format("Weekend preparation: setup <b>-%.2fs</b>  •  tyre wear <b>-%d%%</b>  •  qualifying <b>-%.2fs</b>", w.bonus.setup, math.floor(w.bonus.long * 100 + 0.5), w.bonus.quali), { TextColor3 = T.subtext, TextSize = 14 })
	for _, note in ipairs(w.notes or {}) do
		UIKit.label(info, "⚠ " .. note, { TextColor3 = T.warn, TextSize = 14 })
	end

	renderActions(parent, s)
	renderResults(parent, s)
	renderRadioLog(parent)
end

---------------------------------------------------------------------
-- Team tab
---------------------------------------------------------------------
local function driverCard(parent, slot, label, d, order)
	local card = UIKit.card(parent, { LayoutOrder = order })
	if not d then
		UIKit.title(card, label .. ": empty seat", 18)
		UIKit.button(card, "Find a driver in the Market", function()
			HubUI.showTab("Market")
		end, { Size = UDim2.new(0, 260, 0, 32), BackgroundColor3 = T.panel3 })
		return
	end
	UIKit.title(card, string.format("%s: %s  <font color=\"#%s\">(%s, %s, age %d)</font>", label, d.name, T.subtext:ToHex(), d.code, d.nation, d.age), 18)
	UIKit.label(card, string.format("Overall <b>%d</b>   •   Salary %s per race", d.overall, money(d.salary)), { TextColor3 = T.subtext, TextSize = 14 })
	if (d.injuredRounds or 0) > 0 then
		UIKit.label(card, "Injured: misses " .. d.injuredRounds .. " more race(s)", { TextColor3 = T.bad, TextSize = 14 })
	end
	UIKit.statBar(card, "Pace", d.pace, T.accent)
	UIKit.statBar(card, "Consistency", d.consistency, T.accent2)
	UIKit.statBar(card, "Wet weather", d.wet, Color3.fromRGB(70, 140, 255))
	UIKit.statBar(card, "Overtaking", d.overtaking, T.warn)
	UIKit.statBar(card, "Tyre care", d.tyres, T.good)
	local r = UIKit.row(card, 34)
	local severance = math.floor(d.fee * Config.SeveranceRate)
	UIKit.button(r, "Release (" .. money(severance) .. ")", function()
		confirm("Release " .. d.name .. "?", "This costs " .. money(severance) .. " in severance. The seat will be empty until you hire someone.", function()
			act("FireDriver", { slot = slot })
		end)
	end, { Size = UDim2.new(0, 200, 0, 30), BackgroundColor3 = T.panel3 })
	if slot == "reserve" then
		for i = 1, 2 do
			UIKit.button(r, "Promote to Driver " .. i, function()
				act("SwapReserve", { slot = "race" .. i })
			end, { Size = UDim2.new(0, 190, 0, 30), BackgroundColor3 = T.accent2 })
		end
	end
end

local function renderTeam(parent, s)
	local team = s.team
	local head = UIKit.card(parent, { LayoutOrder = 0 })
	UIKit.title(head, s.teamName, 24)
	UIKit.label(head, string.format("Total salaries: <b>%s per race</b>   •   Strategy calls %d / planning %d", money(team.salaries), math.floor(team.strategy.calls), math.floor(team.strategy.planning)), { TextColor3 = T.subtext })
	driverCard(parent, "race1", "Driver 1", team.drivers.race1, 1)
	driverCard(parent, "race2", "Driver 2", team.drivers.race2, 2)
	driverCard(parent, "reserve", "Reserve", team.drivers.reserve, 3)

	local crewCard = UIKit.card(parent, { LayoutOrder = 4 })
	local crew = team.crew
	if crew then
		UIKit.title(crewCard, "Pit crew: " .. crew.name, 18)
		UIKit.label(crewCard, string.format("Crew chief %s   •   Typical stop %.2fs   •   Salary %s per race", crew.chief or "-", 1.9 + (100 - crew.speed) * 0.022, money(math.floor(crew.fee * Config.SalaryRate))), { TextColor3 = T.subtext, TextSize = 14 })
		UIKit.statBar(crewCard, "Speed", crew.speed, T.accent)
		UIKit.statBar(crewCard, "Reliability", crew.reliability, T.good)
		UIKit.button(crewCard, "Train the crew (+" .. Config.CrewTraining.Step .. " speed) " .. money(Config.CrewTraining.Cost), function()
			act("TrainCrew")
		end, { Size = UDim2.new(0, 320, 0, 32), BackgroundColor3 = T.accent2 })
	else
		UIKit.title(crewCard, "Pit crew: none hired", 18)
		UIKit.button(crewCard, "Hire a crew in the Market", function()
			HubUI.showTab("Market")
		end, { Size = UDim2.new(0, 260, 0, 32), BackgroundColor3 = T.panel3 })
	end

	for i = 1, 2 do
		local slot = "s" .. i
		local st = team.strategists[slot]
		local card = UIKit.card(parent, { LayoutOrder = 4 + i })
		if st then
			UIKit.title(card, "Strategist " .. i .. ": " .. st.name, 18)
			UIKit.label(card, "Salary " .. money(math.floor(st.fee * Config.SalaryRate)) .. " per race", { TextColor3 = T.subtext, TextSize = 14 })
			UIKit.statBar(card, "Call quality", st.calls, T.accent2)
			UIKit.statBar(card, "Planning", st.planning, T.purple)
			UIKit.button(card, "Release (" .. money(math.floor(st.fee * Config.SeveranceRate)) .. ")", function()
				act("FireStrategist", { slot = slot })
			end, { Size = UDim2.new(0, 200, 0, 30), BackgroundColor3 = T.panel3 })
		else
			UIKit.title(card, "Strategist " .. i .. ": empty", 18)
			UIKit.paragraph(card, i == 1 and "Strategists decide when to pit and react to the weather." or "A second strategist adds a little extra to the first one's calls.")
		end
	end
end

---------------------------------------------------------------------
-- Market tab
---------------------------------------------------------------------
local function hireButton(parent, text, occupant, fee, onYes)
	UIKit.button(parent, text, function()
		if occupant then
			local severance = math.floor(occupant.fee * Config.SeveranceRate)
			confirm("Replace " .. occupant.name .. "?", string.format("Hiring costs %s plus %s severance to release %s.", money(fee), money(severance), occupant.name), onYes)
		else
			onYes()
		end
	end, { Size = UDim2.new(0, 150, 0, 30), BackgroundColor3 = T.good, TextSize = 13 })
end

local function renderMarket(parent, s)
	local team = s.team
	local m = team.market
	local head = UIKit.card(parent, { LayoutOrder = 0 })
	UIKit.title(head, "Market", 24)
	UIKit.paragraph(head, "Hiring fees are paid now. Salaries are paid after every race (" .. math.floor(Config.SalaryRate * 100) .. "% of the fee). New people appear every few rounds.")
	local r = UIKit.row(head, 36)
	UIKit.button(r, "Quick Setup (fill empty seats)", function()
		act("QuickSetup")
	end, { Size = UDim2.new(0, 260, 0, 32), BackgroundColor3 = T.accent2 })
	UIKit.button(r, "Scout new options (" .. money(Config.Market.RefreshCost) .. ")", function()
		act("RefreshMarket")
	end, { Size = UDim2.new(0, 260, 0, 32), BackgroundColor3 = T.panel3 })

	local dHead = UIKit.card(parent, { LayoutOrder = 1 })
	UIKit.title(dHead, "Drivers", 20)
	for i, d in ipairs(m.drivers) do
		local card = UIKit.card(parent, { LayoutOrder = 1 + i })
		UIKit.label(card, string.format("<b>%s</b>  (%s, %s, age %d)   •   Overall <b>%d</b>   •   Fee <b>%s</b>", d.name, d.code, d.nation, d.age, d.overall, money(d.fee)))
		UIKit.label(card, string.format("Pace %d  •  Consistency %d  •  Wet %d  •  Overtaking %d  •  Tyre care %d", d.pace, d.consistency, d.wet, d.overtaking, d.tyres), { TextColor3 = T.subtext, TextSize = 14 })
		local row = UIKit.row(card, 32, 6)
		for _, slotInfo in ipairs({ { "race1", "Sign: Driver 1" }, { "race2", "Sign: Driver 2" }, { "reserve", "Sign: Reserve" } }) do
			local occupant = team.drivers[slotInfo[1]]
			hireButton(row, slotInfo[2], occupant, d.fee, function()
				act("HireDriver", { id = d.id, slot = slotInfo[1] })
			end)
		end
	end

	local cHead = UIKit.card(parent, { LayoutOrder = 50 })
	UIKit.title(cHead, "Pit crews", 20)
	for i, c in ipairs(m.crews) do
		local card = UIKit.card(parent, { LayoutOrder = 50 + i })
		UIKit.label(card, string.format("<b>%s</b> (chief %s)   •   Speed <b>%d</b>   •   Reliability <b>%d</b>   •   Fee <b>%s</b>", c.name, c.chief or "-", c.speed, c.reliability, money(c.fee)))
		local row = UIKit.row(card, 32)
		hireButton(row, "Hire crew", team.crew, c.fee, function()
			act("HireCrew", { id = c.id })
		end)
	end

	local sHead = UIKit.card(parent, { LayoutOrder = 70 })
	UIKit.title(sHead, "Strategists", 20)
	for i, st in ipairs(m.strategists) do
		local card = UIKit.card(parent, { LayoutOrder = 70 + i })
		UIKit.label(card, string.format("<b>%s</b>   •   Call quality <b>%d</b>   •   Planning <b>%d</b>   •   Fee <b>%s</b>", st.name, st.calls, st.planning, money(st.fee)))
		local row = UIKit.row(card, 32, 6)
		for slotIndex = 1, 2 do
			local slot = "s" .. slotIndex
			hireButton(row, "Hire as Strategist " .. slotIndex, team.strategists[slot], st.fee, function()
				act("HireStrategist", { id = st.id, slot = slot })
			end)
		end
	end
end

---------------------------------------------------------------------
-- Car tab
---------------------------------------------------------------------
local function renderCar(parent, s)
	local team = s.team
	local head = UIKit.card(parent, { LayoutOrder = 0 })
	UIKit.title(head, "Car development", 24)
	UIKit.paragraph(head, string.format("Overall car rating: <b>%d</b>. Each upgrade adds +%d. Pay with money, or with %d upgrade points (you have %d). Upgrades get more expensive as a rating climbs, and new rules each winter pull every car back a little.", team.carRating, Config.Upgrade.Step, Config.Upgrade.PointsCost, s.upgradePoints))
	for i, area in ipairs(Config.Upgrade.Areas) do
		local info = team.car[area]
		local card = UIKit.card(parent, { LayoutOrder = i })
		UIKit.title(card, Config.Upgrade.Labels[area] .. ": " .. info.rating, 18)
		UIKit.paragraph(card, Config.Upgrade.Descriptions[area])
		UIKit.bar(card, info.rating / 100, T.accent2, { Size = UDim2.new(1, 0, 0, 10) })
		local r = UIKit.row(card, 34)
		local maxed = info.rating >= Config.Upgrade.Max
		local b1 = UIKit.button(r, maxed and "Maxed out" or ("Upgrade for " .. money(info.cost)), function()
			act("UpgradeCar", { area = area })
		end, { Size = UDim2.new(0, 220, 0, 30), BackgroundColor3 = T.good })
		local b2 = UIKit.button(r, "Use " .. Config.Upgrade.PointsCost .. " upgrade points", function()
			act("UpgradeCar", { area = area, usePoints = true })
		end, { Size = UDim2.new(0, 220, 0, 30), BackgroundColor3 = T.purple })
		UIKit.setEnabled(b1, not maxed and s.budget >= info.cost)
		UIKit.setEnabled(b2, not maxed and s.upgradePoints >= Config.Upgrade.PointsCost)
	end
	local compare = UIKit.card(parent, { LayoutOrder = 10 })
	UIKit.title(compare, "How you compare (average track)", 18)
	local list = {}
	for _, t in ipairs(team.aiTeams) do
		table.insert(list, { name = t.name, rating = t.rating, color = t.color })
	end
	table.insert(list, { name = s.teamName .. " (you)", rating = team.carRating, color = teamColor(), you = true })
	table.sort(list, function(a, b)
		return a.rating > b.rating
	end)
	for _, entry in ipairs(list) do
		local r = UIKit.frame(compare, { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 20) })
		UIKit.label(r, entry.name, { Size = UDim2.new(0, 220, 1, 0), TextSize = 14, Font = entry.you and T.fontBold or T.font, TextColor3 = entry.you and T.gold or T.text })
		UIKit.bar(r, (entry.rating - 50) / 50, entry.color, { Position = UDim2.new(0, 230, 0.5, -5), Size = UDim2.new(1, -280, 0, 10) })
		UIKit.label(r, tostring(entry.rating), { Position = UDim2.new(1, -40, 0, 0), Size = UDim2.new(0, 40, 1, 0), TextXAlignment = Enum.TextXAlignment.Right, TextSize = 14 })
	end
end

---------------------------------------------------------------------
-- Layout
---------------------------------------------------------------------
local renderers = {
	Weekend = renderWeekend,
	Team = renderTeam,
	Market = renderMarket,
	Car = renderCar,
	Standings = function(parent, s)
		HubPanels.renderStandings(parent, s)
	end,
	Calendar = function(parent, s)
		HubPanels.renderCalendar(parent, s)
	end,
	Objectives = function(parent, s)
		HubPanels.renderObjectives(parent, s, ctx)
	end,
	Records = function(parent, s)
		HubPanels.renderRecords(parent, s)
	end,
}

local function renderTopBar()
	UIKit.clear(topBar)
	local s = ctx.state
	if not s then
		return
	end
	UIKit.frame(topBar, { Size = UDim2.new(0, 8, 1, 0), BackgroundColor3 = teamColor() })
	UIKit.label(topBar, s.teamName, {
		Position = UDim2.new(0, 20, 0, 4),
		Size = UDim2.new(0, 300, 0, 26),
		Font = T.fontBold,
		TextSize = 22,
	})
	UIKit.label(topBar, string.format("Season %d  •  Round %d of %d", s.season, s.round, Config.RoundsPerSeason), {
		Position = UDim2.new(0, 20, 0, 30),
		Size = UDim2.new(0, 300, 0, 20),
		TextSize = 14,
		TextColor3 = T.subtext,
	})
	UIKit.label(topBar, "Budget  <b>" .. money(s.budget) .. "</b>", {
		Position = UDim2.new(0, 340, 0, 0),
		Size = UDim2.new(0, 220, 1, 0),
		TextSize = 20,
		TextColor3 = s.budget >= 0 and T.gold or T.bad,
	})
	UIKit.label(topBar, "Upgrade points  <b>" .. s.upgradePoints .. "</b>", {
		Position = UDim2.new(0, 570, 0, 0),
		Size = UDim2.new(0, 220, 1, 0),
		TextSize = 18,
		TextColor3 = T.purple,
	})
	UIKit.label(topBar, ctx.saveText or (s.saving and "Saving on" or "Saving off"), {
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -130, 0, 0),
		Size = UDim2.new(0, 330, 1, 0),
		TextSize = 13,
		TextColor3 = s.saving and T.subtext or T.warn,
		TextXAlignment = Enum.TextXAlignment.Right,
	})
	UIKit.button(topBar, "Save now", function()
		act("SaveNow")
	end, {
		AnchorPoint = Vector2.new(1, 0.5),
		Position = UDim2.new(1, -12, 0.5, 0),
		Size = UDim2.new(0, 105, 0, 32),
		BackgroundColor3 = T.panel3,
	})
end

function HubUI.refresh()
	if not root then
		return
	end
	renderTopBar()
	for name, b in pairs(navButtons) do
		b.BackgroundColor3 = name == currentTab and T.accent or T.panel2
	end
	local scrollPos = content.CanvasPosition
	UIKit.clear(content)
	local s = ctx.state
	if not s then
		UIKit.label(content, "Loading your career...", { TextSize = 20 })
		return
	end
	local ok, err = pcall(renderers[currentTab], content, s)
	if not ok then
		warn("[HubUI] " .. tostring(err))
		UIKit.label(content, "Could not draw this page: " .. tostring(err), { TextColor3 = T.bad })
	end
	content.CanvasPosition = scrollPos
end

function HubUI.showTab(name)
	if renderers[name] then
		if name ~= currentTab then
			content.CanvasPosition = Vector2.new(0, 0)
		end
		currentTab = name
		HubUI.refresh()
	end
end

function HubUI.setVisible(visible)
	if root then
		root.Visible = visible
	end
end

-- First-time team setup window.
function HubUI.showSetup()
	local nameIndex, colorIndex = 1, 1
	UIKit.modal(ctx.gui, "Create your team", function(body, close)
		UIKit.paragraph(body, "You are the new Team Principal. Choose a name and colours. You start with " .. money(Config.StartingBudget) .. " to hire drivers, a pit crew and strategists, and to develop your car.")
		UIKit.label(body, "<b>Team name</b>")
		local names = UIKit.frame(body, { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y })
		UIKit.make("UIGridLayout", { CellSize = UDim2.new(0, 165, 0, 32), CellPadding = UDim2.new(0, 6, 0, 6) }, names)
		local nameButtons = {}
		local function paintNames()
			for i, b in ipairs(nameButtons) do
				b.BackgroundColor3 = i == nameIndex and T.accent or T.panel3
			end
		end
		for i, n in ipairs(Config.PlayerTeamNames) do
			nameButtons[i] = UIKit.button(names, n, function()
				nameIndex = i
				paintNames()
			end, { TextSize = 13 })
		end
		paintNames()
		UIKit.label(body, "<b>Team colour</b>")
		local colors = UIKit.frame(body, { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y })
		UIKit.make("UIGridLayout", { CellSize = UDim2.new(0, 120, 0, 32), CellPadding = UDim2.new(0, 6, 0, 6) }, colors)
		local colorButtons = {}
		local function paintColors()
			for i, b in ipairs(colorButtons) do
				b.Text = (i == colorIndex and "✓ " or "") .. Config.PlayerColors[i].name
			end
		end
		for i, c in ipairs(Config.PlayerColors) do
			colorButtons[i] = UIKit.button(colors, c.name, function()
				colorIndex = i
				paintColors()
			end, { BackgroundColor3 = c.color, TextColor3 = UIKit.contrastText(c.color), TextSize = 13 })
		end
		paintColors()
		UIKit.button(body, "Start my career", function()
			local resp = act("SetupTeam", { nameIndex = nameIndex, colorIndex = colorIndex })
			if resp and resp.ok then
				close()
			end
		end, { Size = UDim2.new(0, 220, 0, 40), BackgroundColor3 = T.good })
	end, 560)
end

function HubUI.init(context)
	ctx = context
	root = UIKit.frame(ctx.gui, {
		Name = "Hub",
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundTransparency = 1,
	})
	topBar = UIKit.frame(root, {
		Name = "TopBar",
		Size = UDim2.new(1, 0, 0, 56),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.05,
	})
	navHolder = UIKit.frame(root, {
		Name = "Nav",
		Position = UDim2.new(0, 0, 0, 56),
		Size = UDim2.new(0, 180, 1, -56),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.1,
	})
	UIKit.padding(navHolder, 10, 10)
	UIKit.list(navHolder, nil, 6)
	for i, name in ipairs(TABS) do
		navButtons[name] = UIKit.button(navHolder, name, function()
			HubUI.showTab(name)
		end, {
			Size = UDim2.new(1, 0, 0, 40),
			LayoutOrder = i,
			BackgroundColor3 = T.panel2,
			TextXAlignment = Enum.TextXAlignment.Left,
			TextSize = 16,
		})
		UIKit.padding(navButtons[name], 0, 14)
	end
	local contentBack = UIKit.frame(root, {
		Name = "ContentBack",
		Position = UDim2.new(0, 190, 0, 66),
		Size = UDim2.new(1, -200, 1, -76),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.2,
	})
	UIKit.corner(contentBack, 12)
	content = UIKit.scroll(contentBack, { Name = "Content" })
	UIKit.padding(content, 12, 14)
	UIKit.list(content, nil, 10)
	HubUI.refresh()
end

return HubUI
```


### 20. PodiumScene (ModuleScript, ReplicatedStorage > ClientModules)

```lua
--[[
	PodiumScene (ModuleScript)
	Location: ReplicatedStorage > ClientModules > PodiumScene

	The podium celebration, shown when one of your drivers finishes in the top
	three. It builds a podium stage out of parts (far away from the track),
	puts the top three drivers on the steps, then plays the celebration:
	jumping drivers with raised arms, a trophy, champagne spray, confetti,
	fireworks and a sweeping camera move. Everything is removed afterwards.
]]

local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local ClientModules = script.Parent
local UIKit = require(ClientModules:WaitForChild("UIKit"))

local T = UIKit.Theme
local PodiumScene = {}

local ctx = nil
local playing = false
local BASE = Vector3.new(6000, 300, 0)
local SKIN = Color3.fromRGB(240, 200, 170)
local GOLD = Color3.fromRGB(255, 200, 40)

function PodiumScene.init(context)
	ctx = context
end

function PodiumScene.isPlaying()
	return playing
end

local function part(folder, props)
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanTouch = false
	p.CanQuery = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in pairs(props) do
		p[k] = v
	end
	p.Parent = folder
	return p
end

local function surfaceText(target, text, face, size)
	local sg = Instance.new("SurfaceGui")
	sg.Face = face
	sg.CanvasSize = size or Vector2.new(400, 200)
	sg.LightInfluence = 0
	sg.Parent = target
	local l = Instance.new("TextLabel")
	l.Size = UDim2.new(1, 0, 1, 0)
	l.BackgroundTransparency = 1
	l.Text = text
	l.TextScaled = true
	l.Font = Enum.Font.GothamBlack
	l.TextColor3 = Color3.new(1, 1, 1)
	l.Parent = sg
	return l
end

-- A simple blocky driver in team colours. Returns a table of parts that the
-- animation moves every frame.
local function makeFigure(folder, color, name, place)
	local fig = {}
	fig.legs = {
		part(folder, { Size = Vector3.new(0.9, 2.4, 0.9), Color = color:Lerp(Color3.new(0, 0, 0), 0.3) }),
		part(folder, { Size = Vector3.new(0.9, 2.4, 0.9), Color = color:Lerp(Color3.new(0, 0, 0), 0.3) }),
	}
	fig.torso = part(folder, { Size = Vector3.new(2.1, 2.3, 1.1), Color = color })
	fig.head = part(folder, { Shape = Enum.PartType.Ball, Size = Vector3.new(1.6, 1.6, 1.6), Color = SKIN })
	fig.cap = part(folder, { Size = Vector3.new(1.7, 0.45, 1.7), Color = color })
	fig.arms = {
		part(folder, { Size = Vector3.new(0.75, 2.2, 0.75), Color = color }),
		part(folder, { Size = Vector3.new(0.75, 2.2, 0.75), Color = color }),
	}
	local billboard = Instance.new("BillboardGui")
	billboard.Size = UDim2.new(0, 200, 0, 46)
	billboard.StudsOffset = Vector3.new(0, 3, 0)
	billboard.AlwaysOnTop = true
	billboard.LightInfluence = 0
	billboard.Parent = fig.head
	local l = Instance.new("TextLabel")
	l.Size = UDim2.new(1, 0, 1, 0)
	l.BackgroundTransparency = 1
	l.Text = "P" .. place .. "  " .. name
	l.TextColor3 = Color3.new(1, 1, 1)
	l.TextStrokeTransparency = 0.3
	l.Font = Enum.Font.GothamBold
	l.TextScaled = true
	l.Parent = billboard
	return fig
end

-- Places a figure: base = CFrame of its feet, jump = height, armAngle in radians (0 = down, pi = straight up).
local function poseFigure(fig, base, jump, armAngle)
	local b = base * CFrame.new(0, jump, 0)
	fig.legs[1].CFrame = b * CFrame.new(-0.5, 1.2, 0)
	fig.legs[2].CFrame = b * CFrame.new(0.5, 1.2, 0)
	fig.torso.CFrame = b * CFrame.new(0, 3.55, 0)
	fig.head.CFrame = b * CFrame.new(0, 5.5, 0)
	fig.cap.CFrame = b * CFrame.new(0, 6.15, 0)
	for i, side in ipairs({ -1, 1 }) do
		local shoulder = b * CFrame.new(side * 1.45, 4.5, 0)
		fig.arms[i].CFrame = shoulder * CFrame.Angles(0, 0, side * armAngle) * CFrame.new(0, -1.05, 0)
	end
	return b
end

local function firework(folder, rng)
	local colors = { Color3.fromRGB(255, 80, 80), Color3.fromRGB(80, 200, 255), GOLD, Color3.fromRGB(120, 255, 120), Color3.fromRGB(255, 120, 255) }
	local at = BASE + Vector3.new(rng:NextNumber(-35, 35), rng:NextNumber(32, 48), rng:NextNumber(-25, -8))
	local p = part(folder, { Size = Vector3.new(1, 1, 1), Transparency = 1, CFrame = CFrame.new(at) })
	local e = Instance.new("ParticleEmitter")
	e.Texture = "rbxasset://textures/particles/sparkles_main.dds"
	local c = colors[rng:NextInteger(1, #colors)]
	e.Color = ColorSequence.new(c)
	e.LightEmission = 1
	e.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1.2), NumberSequenceKeypoint.new(1, 0) })
	e.Lifetime = NumberRange.new(1.2, 1.8)
	e.Speed = NumberRange.new(22, 34)
	e.SpreadAngle = Vector2.new(180, 180)
	e.Drag = 1.5
	e.Acceleration = Vector3.new(0, -10, 0)
	e.Rate = 0
	e.Parent = p
	e:Emit(90)
	local flash = Instance.new("PointLight")
	flash.Color = c
	flash.Range = 40
	flash.Brightness = 4
	flash.Parent = p
	task.delay(0.4, function()
		if flash.Parent then
			flash:Destroy()
		end
	end)
	task.delay(3, function()
		if p.Parent then
			p:Destroy()
		end
	end)
end

local function confetti(folder, rng, count)
	local colors = { GOLD, Color3.fromRGB(230, 40, 60), Color3.fromRGB(40, 150, 255), Color3.new(1, 1, 1), Color3.fromRGB(60, 210, 110) }
	for _ = 1, count do
		local start = BASE + Vector3.new(rng:NextNumber(-25, 25), rng:NextNumber(30, 50), rng:NextNumber(-10, 15))
		local piece = part(folder, {
			Size = Vector3.new(0.5, 0.05, 0.35),
			Color = colors[rng:NextInteger(1, #colors)],
			Material = Enum.Material.SmoothPlastic,
			CFrame = CFrame.new(start) * CFrame.Angles(rng:NextNumber(0, 6), rng:NextNumber(0, 6), 0),
			CastShadow = false,
		})
		local fall = rng:NextNumber(3, 6)
		TweenService:Create(piece, TweenInfo.new(fall, Enum.EasingStyle.Linear), {
			CFrame = CFrame.new(start.X + rng:NextNumber(-6, 6), BASE.Y + 0.6, start.Z + rng:NextNumber(-4, 4)) * CFrame.Angles(rng:NextNumber(0, 12), rng:NextNumber(0, 12), rng:NextNumber(0, 12)),
		}):Play()
	end
end

-- podium = { {pos, name, teamName, color, isPlayer}, ... } (top three)
function PodiumScene.play(podium, trackName, onDone)
	if playing then
		return
	end
	playing = true
	local rng = Random.new()
	local folder = Instance.new("Folder")
	folder.Name = "Podium"
	folder.Parent = workspace

	-- Stage
	part(folder, { Size = Vector3.new(90, 1, 70), CFrame = CFrame.new(BASE + Vector3.new(0, -0.5, 5)), Color = Color3.fromRGB(20, 30, 70) })
	local backdrop = part(folder, { Size = Vector3.new(90, 34, 2), CFrame = CFrame.new(BASE + Vector3.new(0, 17, -16)), Color = Color3.fromRGB(15, 15, 25) })
	local title = surfaceText(backdrop, string.upper(trackName) .. "\nGRAND PRIX", Enum.NormalId.Back, Vector2.new(900, 340))
	title.TextColor3 = GOLD
	local steps = {
		{ place = 1, x = 0, h = 6, color = GOLD },
		{ place = 2, x = -9, h = 4.5, color = Color3.fromRGB(200, 205, 215) },
		{ place = 3, x = 9, h = 3, color = Color3.fromRGB(205, 130, 70) },
	}
	local stepTops = {}
	for _, s in ipairs(steps) do
		local block = part(folder, {
			Size = Vector3.new(8, s.h, 8),
			CFrame = CFrame.new(BASE + Vector3.new(s.x, s.h / 2, 0)),
			Color = Color3.fromRGB(245, 245, 250),
		})
		part(folder, { Size = Vector3.new(8.1, 0.6, 8.1), CFrame = block.CFrame * CFrame.new(0, s.h / 2 - 0.3, 0), Color = s.color })
		surfaceText(block, tostring(s.place), Enum.NormalId.Back, Vector2.new(200, 200)).TextColor3 = Color3.fromRGB(30, 30, 40)
		-- Figures face the camera (+Z).
		local top = BASE + Vector3.new(s.x, s.h, 0)
		stepTops[s.place] = CFrame.lookAt(top, top + Vector3.zAxis)
	end
	for _, side in ipairs({ -1, 1 }) do
		local lamp = part(folder, {
			Size = Vector3.new(2, 2, 2),
			CFrame = CFrame.lookAt(BASE + Vector3.new(side * 26, 26, 28), BASE + Vector3.new(0, 4, 0)),
			Color = Color3.fromRGB(255, 250, 230),
			Material = Enum.Material.Neon,
		})
		local spot = Instance.new("SpotLight")
		spot.Brightness = 6
		spot.Range = 70
		spot.Angle = 70
		spot.Parent = lamp
	end

	-- Drivers, trophy and champagne
	local figures = {}
	for _, entry in ipairs(podium) do
		if stepTops[entry.pos] then
			figures[entry.pos] = makeFigure(folder, entry.color, entry.name, entry.pos)
		end
	end
	local trophy = {
		base = part(folder, { Shape = Enum.PartType.Cylinder, Size = Vector3.new(0.5, 1.2, 1.2), Color = GOLD, Material = Enum.Material.Metal, Reflectance = 0.3 }),
		cup = part(folder, { Shape = Enum.PartType.Ball, Size = Vector3.new(1.5, 1.5, 1.5), Color = GOLD, Material = Enum.Material.Metal, Reflectance = 0.3 }),
		rim = part(folder, { Shape = Enum.PartType.Cylinder, Size = Vector3.new(0.3, 1.7, 1.7), Color = GOLD, Material = Enum.Material.Metal, Reflectance = 0.3 }),
	}
	local sprays = {}
	for _, place in ipairs({ 2, 3 }) do
		if figures[place] then
			local bottle = part(folder, { Size = Vector3.new(0.4, 1.2, 0.4), Color = Color3.fromRGB(20, 90, 40) })
			local spray = Instance.new("ParticleEmitter")
			spray.Texture = "rbxasset://textures/particles/smoke_main.dds"
			spray.Color = ColorSequence.new(Color3.fromRGB(255, 245, 200))
			spray.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.3), NumberSequenceKeypoint.new(1, 1.2) })
			spray.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.2), NumberSequenceKeypoint.new(1, 1) })
			spray.Lifetime = NumberRange.new(0.8, 1.2)
			spray.Speed = NumberRange.new(20, 28)
			spray.SpreadAngle = Vector2.new(12, 12)
			spray.Acceleration = Vector3.new(0, -25, 0)
			spray.EmissionDirection = Enum.NormalId.Top
			spray.Rate = 0
			spray.Parent = bottle
			table.insert(sprays, { bottle = bottle, emitter = spray, place = place })
		end
	end

	-- On-screen title and continue button
	local playerWon = podium[1] and podium[1].isPlayer
	local overlay = UIKit.frame(ctx.gui, { Name = "PodiumOverlay", Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 30 })
	UIKit.label(overlay, playerWon and "🏆 VICTORY! 🏆" or "🏆 PODIUM! 🏆", {
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 30),
		Size = UDim2.new(0, 700, 0, 70),
		TextXAlignment = Enum.TextXAlignment.Center,
		Font = T.fontBold,
		TextSize = 56,
		TextColor3 = T.gold,
		TextStrokeTransparency = 0.4,
		ZIndex = 31,
	})
	local continueButton
	local finished = false
	local connection
	local function finish()
		if finished then
			return
		end
		finished = true
		if connection then
			connection:Disconnect()
		end
		overlay:Destroy()
		folder:Destroy()
		playing = false
		if onDone then
			onDone()
		end
	end
	continueButton = UIKit.button(overlay, "Continue", finish, {
		AnchorPoint = Vector2.new(0.5, 1),
		Position = UDim2.new(0.5, 0, 1, -30),
		Size = UDim2.new(0, 220, 0, 44),
		BackgroundColor3 = T.good,
		Visible = false,
		ZIndex = 31,
	})

	-- Animation
	local cam = workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Scriptable
	local started = os.clock()
	local nextFirework = 0
	local confettiDone = false
	local focus = BASE + Vector3.new(0, 6, 0)
	connection = RunService.RenderStepped:Connect(function()
		local t = os.clock() - started
		-- Camera sweep: wide and high, then round to a close front view.
		local k = math.clamp(t / 9, 0, 1)
		local ease = k * k * (3 - 2 * k)
		local angle = math.rad(-75 + 85 * ease)
		local radius = 70 - 42 * ease
		local height = 28 - 19 * ease
		local camPos = focus + Vector3.new(math.sin(angle) * radius, height, math.cos(angle) * radius)
		cam.FieldOfView = 60
		cam.CFrame = CFrame.lookAt(camPos, focus)

		-- Drivers: arms go up, then everyone jumps (the winner highest).
		local arms = math.clamp((t - 1) / 1.2, 0, 1) * math.rad(150)
		for place, fig in pairs(figures) do
			local jump = 0
			if t > 2.2 then
				local speed = place == 1 and 6 or 5
				jump = math.abs(math.sin((t + place) * speed)) * (place == 1 and 1.6 or 1)
			end
			local wave = t > 2.2 and math.sin(t * 8 + place) * math.rad(15) or 0
			local feet = poseFigure(fig, stepTops[place], jump, arms + wave)
			if place == 1 then
				local lift = math.clamp((t - 1.5) / 1, 0, 1)
				local tcf = feet * CFrame.new(0, 5.2 + lift * 3.4, 0.6)
				trophy.base.CFrame = tcf * CFrame.Angles(0, 0, math.pi / 2)
				trophy.cup.CFrame = tcf * CFrame.new(0, 1.0, 0)
				trophy.rim.CFrame = tcf * CFrame.new(0, 1.6, 0) * CFrame.Angles(0, 0, math.pi / 2)
			end
		end
		for _, s in ipairs(sprays) do
			local fig = figures[s.place]
			local inward = s.place == 2 and 1 or -1
			s.bottle.CFrame = fig.torso.CFrame * CFrame.new(inward * 0.9, 2.6, -0.6) * CFrame.Angles(0, 0, -inward * math.rad(35))
			s.emitter.Rate = (t > 3 and t < 9) and 90 or 0
		end
		-- Fireworks and confetti.
		if t > 1.5 and t > nextFirework then
			nextFirework = t + rng:NextNumber(0.4, 0.9)
			firework(folder, rng)
		end
		if t > 2 and not confettiDone then
			confettiDone = true
			confetti(folder, rng, 160)
		end
		if t > 5 and not continueButton.Visible then
			continueButton.Visible = true
		end
		if t > 25 then
			finish()
		end
	end)
end

return PodiumScene
```


### 21. RaceUI (ModuleScript, ReplicatedStorage > ClientModules)

```lua
--[[
	RaceUI (ModuleScript)
	Location: ReplicatedStorage > ClientModules > RaceUI

	Everything on screen during a live race:
	  * leaderboard with gaps, tyres and pit status (click a row to watch that car)
	  * lap counter, weather and safety car banner, start lights
	  * your two cars: tyre wear, pit call with tyre choice, strategist on/off,
	    and the "TAKE THE WHEEL" button when a battle is on
	  * the team radio panel
	  * the driving HUD (speed, position, hand back) with touch buttons on phones
	  * the Q3 flying-lap screen
	  * the results screen at the end (and the podium celebration)
]]

local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("Config"))
local TrackPath = require(Shared:WaitForChild("TrackPath"))

local ClientModules = script.Parent
local UIKit = require(ClientModules:WaitForChild("UIKit"))
local RaceViewer = require(ClientModules:WaitForChild("RaceViewer"))
local DriveController = require(ClientModules:WaitForChild("DriveController"))
local TrackBuilder = require(ClientModules:WaitForChild("TrackBuilder"))
local PodiumScene = require(ClientModules:WaitForChild("PodiumScene"))

local T = UIKit.Theme
local RaceUI = {}

local ctx = nil
local root = nil
local ui = {}
local race = {
	active = false,
	info = nil,
	infoByKey = {},
	snap = nil,
	gapMode = "gap",
	pitChoice = { "Medium", "Medium" },
	manualKey = nil,
	lightsOutAt = nil,
}
local quali = nil

---------------------------------------------------------------------
-- Building the race screen
---------------------------------------------------------------------
local function buildLeaderboard()
	local board = UIKit.frame(root, {
		Name = "Leaderboard",
		Position = UDim2.new(0, 10, 0, 70),
		Size = UDim2.new(0, 300, 0, 26 + 20 * 23),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.15,
	})
	UIKit.corner(board, 8)
	local header = UIKit.button(board, "POS  DRIVER        GAP TO LEADER", function()
		race.gapMode = race.gapMode == "gap" and "int" or "gap"
		ui.boardHeader.Text = race.gapMode == "gap" and "POS  DRIVER        GAP TO LEADER" or "POS  DRIVER        INTERVAL"
		RaceUI.refreshBoard()
	end, {
		Size = UDim2.new(1, 0, 0, 24),
		BackgroundColor3 = T.panel3,
		TextSize = 12,
		TextXAlignment = Enum.TextXAlignment.Left,
	})
	UIKit.padding(header, 0, 8)
	ui.boardHeader = header
	ui.rows = {}
	for i = 1, 20 do
		local row = UIKit.make("TextButton", {
			Text = "",
			AutoButtonColor = false,
			BorderSizePixel = 0,
			BackgroundColor3 = i % 2 == 0 and T.panel2 or T.panel,
			BackgroundTransparency = 0.1,
			Position = UDim2.new(0, 0, 0, 26 + (i - 1) * 23),
			Size = UDim2.new(1, 0, 0, 22),
		}, board)
		local r = {}
		r.frame = row
		r.pos = UIKit.label(row, tostring(i), { Position = UDim2.new(0, 4, 0, 0), Size = UDim2.new(0, 24, 1, 0), Font = T.fontBold, TextSize = 14, TextXAlignment = Enum.TextXAlignment.Center })
		r.bar = UIKit.frame(row, { Position = UDim2.new(0, 30, 0, 3), Size = UDim2.new(0, 4, 1, -6), BackgroundColor3 = Color3.new(1, 1, 1) })
		r.code = UIKit.label(row, "", { Position = UDim2.new(0, 40, 0, 0), Size = UDim2.new(0, 60, 1, 0), Font = T.fontBold, TextSize = 14 })
		r.gap = UIKit.label(row, "", { Position = UDim2.new(0, 100, 0, 0), Size = UDim2.new(0, 90, 1, 0), TextSize = 13, TextXAlignment = Enum.TextXAlignment.Right })
		r.tyreHolder = UIKit.frame(row, { BackgroundTransparency = 1, Position = UDim2.new(0, 200, 0, 2), Size = UDim2.new(0, 18, 0, 18) })
		r.wear = UIKit.label(row, "", { Position = UDim2.new(0, 222, 0, 0), Size = UDim2.new(0, 36, 1, 0), TextSize = 12, TextColor3 = T.subtext })
		r.status = UIKit.label(row, "", { Position = UDim2.new(0, 258, 0, 0), Size = UDim2.new(0, 40, 1, 0), TextSize = 12, Font = T.fontBold, TextColor3 = T.warn })
		r.compound = nil
		row.Activated:Connect(function()
			if r.key then
				RaceViewer.setFocus(r.key)
				RaceUI.refreshCameraLabel()
			end
		end)
		ui.rows[i] = r
	end
end

local function buildTopBar()
	local top = UIKit.frame(root, {
		Name = "Top",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 8),
		Size = UDim2.new(0, 560, 0, 56),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.15,
	})
	UIKit.corner(top, 10)
	ui.lap = UIKit.label(top, "LAP 1 / 20", { Position = UDim2.new(0, 14, 0, 0), Size = UDim2.new(0, 170, 1, 0), Font = T.fontBold, TextSize = 24 })
	ui.weather = UIKit.label(top, "", { Position = UDim2.new(0, 190, 0, 4), Size = UDim2.new(0, 360, 0, 24), TextSize = 15 })
	ui.fastest = UIKit.label(top, "", { Position = UDim2.new(0, 190, 0, 28), Size = UDim2.new(0, 360, 0, 22), TextSize = 13, TextColor3 = T.purple })
	ui.sc = UIKit.label(root, "SAFETY CAR", {
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 68),
		Size = UDim2.new(0, 260, 0, 36),
		BackgroundColor3 = T.warn,
		BackgroundTransparency = 0,
		TextColor3 = Color3.new(0, 0, 0),
		Font = T.fontBold,
		TextSize = 22,
		TextXAlignment = Enum.TextXAlignment.Center,
		Visible = false,
	})
	UIKit.corner(ui.sc, 8)

	local controls = UIKit.frame(root, {
		Name = "Controls",
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -10, 0, 8),
		Size = UDim2.new(0, 330, 0, 92),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.15,
	})
	UIKit.corner(controls, 10)
	UIKit.padding(controls, 6, 8)
	UIKit.list(controls, nil, 6)
	local speedRow = UIKit.row(controls, 34, 6)
	UIKit.label(speedRow, "Speed", { Size = UDim2.new(0, 50, 1, 0), TextSize = 14, TextColor3 = T.subtext })
	ui.speedButtons = {}
	for i, s in ipairs(Config.Race.SimSpeeds) do
		ui.speedButtons[i] = UIKit.button(speedRow, s .. "x", function()
			ctx.raceCommand("Speed", { index = i })
		end, { Size = UDim2.new(0, 60, 0, 30), BackgroundColor3 = T.panel3, LayoutOrder = i })
	end
	local camRow = UIKit.row(controls, 34, 6)
	ui.camButton = UIKit.button(camRow, "Camera: Chase", function()
		RaceViewer.cycleCamera()
		RaceUI.refreshCameraLabel()
	end, { Size = UDim2.new(0, 130, 0, 30), BackgroundColor3 = T.panel3, TextSize = 13 })
	UIKit.button(camRow, "◀", function()
		RaceViewer.cycleFocus(-1)
		RaceUI.refreshCameraLabel()
	end, { Size = UDim2.new(0, 30, 0, 30), BackgroundColor3 = T.panel3 })
	ui.focusLabel = UIKit.label(camRow, "", { Size = UDim2.new(0, 110, 1, 0), TextSize = 13, TextXAlignment = Enum.TextXAlignment.Center })
	UIKit.button(camRow, "▶", function()
		RaceViewer.cycleFocus(1)
		RaceUI.refreshCameraLabel()
	end, { Size = UDim2.new(0, 30, 0, 30), BackgroundColor3 = T.panel3 })
end

local function buildRadio()
	local panel = UIKit.frame(root, {
		Name = "Radio",
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -10, 0, 108),
		Size = UDim2.new(0, 330, 0, 300),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.15,
	})
	UIKit.corner(panel, 10)
	UIKit.label(panel, "📻  TEAM RADIO", { Position = UDim2.new(0, 10, 0, 4), Size = UDim2.new(1, -20, 0, 22), Font = T.fontBold, TextSize = 14 })
	local list = UIKit.scroll(panel, { Position = UDim2.new(0, 6, 0, 28), Size = UDim2.new(1, -12, 1, -34) })
	UIKit.list(list, nil, 4)
	ui.radioList = list
	ui.radioCount = 0
end

local function buildTeamPanels()
	ui.team = {}
	local holder = UIKit.frame(root, {
		Name = "TeamPanels",
		AnchorPoint = Vector2.new(1, 1),
		Position = UDim2.new(1, -10, 1, -10),
		Size = UDim2.new(0, 790, 0, 168),
		BackgroundTransparency = 1,
	})
	UIKit.list(holder, Enum.FillDirection.Horizontal, 10, Enum.HorizontalAlignment.Right)
	ui.teamHolder = holder
	for slot = 1, 2 do
		local p = {}
		local card = UIKit.frame(holder, { Size = UDim2.new(0, 390, 1, 0), BackgroundColor3 = T.bg, BackgroundTransparency = 0.1, LayoutOrder = slot })
		UIKit.corner(card, 10)
		UIKit.stroke(card, T.panel3, 1)
		p.card = card
		p.name = UIKit.label(card, "", { Position = UDim2.new(0, 10, 0, 4), Size = UDim2.new(1, -20, 0, 22), Font = T.fontBold, TextSize = 16 })
		p.times = UIKit.label(card, "", { Position = UDim2.new(0, 10, 0, 26), Size = UDim2.new(1, -20, 0, 18), TextSize = 13, TextColor3 = T.subtext })
		p.tyreHolder = UIKit.frame(card, { BackgroundTransparency = 1, Position = UDim2.new(0, 10, 0, 48), Size = UDim2.new(0, 22, 0, 22) })
		p.tyreText = UIKit.label(card, "", { Position = UDim2.new(0, 38, 0, 48), Size = UDim2.new(0, 160, 0, 22), TextSize = 13 })
		local _, fill = UIKit.bar(card, 0, T.good, { Position = UDim2.new(0, 200, 0, 56), Size = UDim2.new(0, 178, 0, 8) })
		p.wearFill = fill
		-- Pit call row: tyre choice + BOX button.
		p.compoundButtons = {}
		for i, compound in ipairs(Config.TyreOrder) do
			local tyre = Config.Tyres[compound]
			p.compoundButtons[compound] = UIKit.button(card, tyre.short, function()
				race.pitChoice[slot] = compound
				RaceUI.refreshTeam()
			end, {
				Position = UDim2.new(0, 10 + (i - 1) * 34, 0, 80),
				Size = UDim2.new(0, 30, 0, 30),
				BackgroundColor3 = T.panel3,
				TextColor3 = tyre.color,
				TextSize = 15,
			})
		end
		p.box = UIKit.button(card, "BOX", function()
			local c = RaceUI.carForSlot(slot)
			if c and (c.pt or c.req) then
				ctx.raceCommand("CancelPit", { slot = slot })
			else
				ctx.raceCommand("Pit", { slot = slot, compound = race.pitChoice[slot] })
			end
		end, { Position = UDim2.new(0, 186, 0, 80), Size = UDim2.new(0, 192, 0, 30), BackgroundColor3 = T.accent })
		p.auto = UIKit.button(card, "Strategist: AUTO", function()
			local c = RaceUI.carForSlot(slot)
			if c then
				ctx.raceCommand("Auto", { slot = slot, on = not c.auto })
			end
		end, { Position = UDim2.new(0, 10, 0, 118), Size = UDim2.new(0, 170, 0, 40), BackgroundColor3 = T.panel3, TextSize = 13 })
		p.take = UIKit.button(card, "TAKE THE WHEEL", function()
			ctx.raceCommand("TakeWheel", { slot = slot })
		end, { Position = UDim2.new(0, 186, 0, 118), Size = UDim2.new(0, 192, 0, 40), BackgroundColor3 = T.purple, TextSize = 15 })
		ui.team[slot] = p
	end
end

local function buildLights()
	local f = UIKit.frame(root, {
		Name = "Lights",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5, 0, 0.32, 0),
		Size = UDim2.new(0, 380, 0, 110),
		BackgroundColor3 = Color3.fromRGB(10, 10, 12),
		Visible = false,
	})
	UIKit.corner(f, 14)
	ui.lights = {}
	for i = 1, 5 do
		local l = UIKit.frame(f, {
			Position = UDim2.new(0, 20 + (i - 1) * 70, 0, 14),
			Size = UDim2.new(0, 60, 0, 60),
			BackgroundColor3 = Color3.fromRGB(50, 10, 10),
		})
		UIKit.corner(l, 30)
		ui.lights[i] = l
	end
	ui.lightsText = UIKit.label(f, "", { Position = UDim2.new(0, 0, 0, 80), Size = UDim2.new(1, 0, 0, 26), TextXAlignment = Enum.TextXAlignment.Center, Font = T.fontBold, TextSize = 20 })
	ui.lightsFrame = f
end

-- Touch buttons for phones and tablets (only shown while driving).
local function buildTouchControls(parent)
	local holder = UIKit.frame(parent, { Name = "Touch", BackgroundTransparency = 1, Size = UDim2.new(1, 0, 1, 0), Visible = UserInputService.TouchEnabled })
	local function hold(text, position, onDown, onUp)
		local b = UIKit.button(holder, text, nil, {
			AnchorPoint = Vector2.new(0.5, 0.5),
			Position = position,
			Size = UDim2.new(0, 90, 0, 90),
			BackgroundColor3 = T.panel3,
			BackgroundTransparency = 0.3,
			TextSize = 26,
		})
		b.InputBegan:Connect(function(input)
			if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
				onDown()
			end
		end)
		b.InputEnded:Connect(function(input)
			if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
				onUp()
			end
		end)
	end
	local touch = DriveController.touch
	hold("◀", UDim2.new(0, 70, 1, -90), function()
		touch.steer = -1
	end, function()
		touch.steer = 0
	end)
	hold("▶", UDim2.new(0, 170, 1, -90), function()
		touch.steer = 1
	end, function()
		touch.steer = 0
	end)
	hold("GAS", UDim2.new(1, -70, 1, -90), function()
		touch.throttle = 1
	end, function()
		touch.throttle = 0
	end)
	hold("BRAKE", UDim2.new(1, -170, 1, -90), function()
		touch.brake = 1
	end, function()
		touch.brake = 0
	end)
	return holder
end

local function buildDriveHud()
	local hud = UIKit.frame(root.Parent, {
		Name = "DriveHud",
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundTransparency = 1,
		Visible = false,
		ZIndex = 5,
	})
	local panel = UIKit.frame(hud, {
		AnchorPoint = Vector2.new(0.5, 1),
		Position = UDim2.new(0.5, 0, 1, -16),
		Size = UDim2.new(0, 520, 0, 110),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.15,
	})
	UIKit.corner(panel, 12)
	ui.driveSpeed = UIKit.label(panel, "0", { Position = UDim2.new(0, 16, 0, 6), Size = UDim2.new(0, 170, 0, 56), Font = T.fontBold, TextSize = 52 })
	UIKit.label(panel, "km/h", { Position = UDim2.new(0, 16, 0, 60), Size = UDim2.new(0, 120, 0, 20), TextSize = 14, TextColor3 = T.subtext })
	ui.driveInfo = UIKit.label(panel, "", { Position = UDim2.new(0, 190, 0, 8), Size = UDim2.new(0, 320, 0, 28), Font = T.fontBold, TextSize = 22 })
	ui.driveSub = UIKit.label(panel, "", { Position = UDim2.new(0, 190, 0, 38), Size = UDim2.new(0, 320, 0, 22), TextSize = 14, TextColor3 = T.subtext })
	ui.driveHelp = UIKit.label(panel, "W/S or triggers: throttle/brake  •  A/D or stick: steer  •  B: braking assist", { Position = UDim2.new(0, 16, 0, 84), Size = UDim2.new(1, -32, 0, 20), TextSize = 12, TextColor3 = T.subtext })
	ui.driveButton = UIKit.button(panel, "Hand back (H)", function()
		RaceUI.driveButtonPressed()
	end, { Position = UDim2.new(0, 380, 0, 44), Size = UDim2.new(0, 130, 0, 34), BackgroundColor3 = T.accent })
	ui.driveWarning = UIKit.label(hud, "", {
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 120),
		Size = UDim2.new(0, 500, 0, 40),
		TextXAlignment = Enum.TextXAlignment.Center,
		Font = T.fontBold,
		TextSize = 28,
		TextColor3 = T.bad,
	})
	ui.qualiPanel = UIKit.frame(hud, {
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 10),
		Size = UDim2.new(0, 520, 0, 100),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.15,
		Visible = false,
	})
	UIKit.corner(ui.qualiPanel, 12)
	ui.qualiTimer = UIKit.label(ui.qualiPanel, "", { Position = UDim2.new(0, 16, 0, 6), Size = UDim2.new(1, -32, 0, 44), Font = T.fontBold, TextSize = 36, TextXAlignment = Enum.TextXAlignment.Center })
	ui.qualiInfo = UIKit.label(ui.qualiPanel, "", { Position = UDim2.new(0, 16, 0, 54), Size = UDim2.new(1, -32, 0, 40), TextSize = 14, TextXAlignment = Enum.TextXAlignment.Center, TextColor3 = T.subtext })
	buildTouchControls(hud)
	ui.driveHud = hud
end

---------------------------------------------------------------------
-- Updating the screen
---------------------------------------------------------------------
function RaceUI.carForSlot(slot)
	local snap = race.snap
	if not snap then
		return nil
	end
	for _, c in ipairs(snap.cars) do
		local info = race.infoByKey[c.k]
		if info and info.isPlayer and info.slot == slot then
			return c, info
		end
	end
	return nil
end

local function setTyre(holder, compound, size)
	if holder:GetAttribute("Compound") == compound then
		return
	end
	holder:SetAttribute("Compound", compound)
	UIKit.clear(holder)
	UIKit.tyreBadge(holder, compound, size)
end

function RaceUI.refreshCameraLabel()
	ui.camButton.Text = "Camera: " .. RaceViewer.getCameraMode()
	ui.focusLabel.Text = RaceViewer.focusName()
end

function RaceUI.refreshBoard()
	local snap = race.snap
	if not snap then
		return
	end
	local ordered = table.clone(snap.cars)
	table.sort(ordered, function(a, b)
		return a.p < b.p
	end)
	local clock = RaceViewer.getClock()
	local focus = RaceViewer.getFocusKey()
	for i, row in ipairs(ui.rows) do
		local c = ordered[i]
		if c then
			local info = race.infoByKey[c.k]
			row.key = c.k
			row.frame.Visible = true
			row.pos.Text = tostring(c.p)
			row.bar.BackgroundColor3 = info.color
			row.code.Text = info.code
			row.code.TextColor3 = info.isPlayer and T.gold or T.text
			local gapText = race.gapMode == "gap" and c.gap or c.int
			if c.p == 1 then
				gapText = c.fin and "🏁" or "Leader"
			end
			row.gap.Text = c.dnf and "OUT" or (gapText or "")
			setTyre(row.tyreHolder, c.cp, 18)
			row.wear.Text = c.dnf and "" or (c.w .. "%")
			local status = ""
			if c.dnf then
				status = "DNF"
			elseif c.fin then
				status = "🏁"
			elseif c.pit and clock < c.pit[4] then
				status = "PIT"
			elseif c.pt then
				status = "IN"
			elseif c.man then
				status = "YOU"
			end
			row.status.Text = status
			row.frame.BackgroundColor3 = (c.k == focus) and T.panel3 or ((i % 2 == 0) and T.panel2 or T.panel)
		else
			row.frame.Visible = false
		end
	end
end

function RaceUI.refreshTeam()
	for slot = 1, 2 do
		local p = ui.team[slot]
		local c, info = RaceUI.carForSlot(slot)
		if not c then
			p.card.Visible = false
		else
			p.card.Visible = true
			local stateText = c.dnf and "  -  RETIRED" or (c.fin and "  -  FINISHED" or "")
			p.name.Text = string.format("P%d  %s%s", c.p, info.name, stateText)
			p.name.TextColor3 = info.color:Lerp(Color3.new(1, 1, 1), 0.4)
			p.times.Text = string.format("Last %s   Best %s   Stops %d", Config.formatLapTime(c.last), Config.formatLapTime(c.best), c.st or 0)
			setTyre(p.tyreHolder, c.cp, 22)
			p.tyreText.Text = string.format("%s  •  %d%% worn", Config.Tyres[c.cp].name, c.w)
			p.wearFill.Size = UDim2.new(math.clamp(1 - c.w / 100, 0, 1), 0, 1, 0)
			p.wearFill.BackgroundColor3 = c.w > 70 and T.bad or (c.w > 45 and T.warn or T.good)
			for compound, b in pairs(p.compoundButtons) do
				local selected = race.pitChoice[slot] == compound
				b.BackgroundColor3 = selected and Config.Tyres[compound].color or T.panel3
				b.TextColor3 = selected and UIKit.contrastText(Config.Tyres[compound].color) or Config.Tyres[compound].color
			end
			local running = not c.dnf and not c.fin
			if c.pt then
				p.box.Text = "Boxing this lap (" .. Config.Tyres[c.pc or race.pitChoice[slot]].short .. ") - cancel"
				p.box.BackgroundColor3 = T.warn
			elseif c.req then
				p.box.Text = "Boxing next lap (" .. Config.Tyres[c.req].short .. ") - cancel"
				p.box.BackgroundColor3 = T.warn
			else
				p.box.Text = "BOX for " .. Config.Tyres[race.pitChoice[slot]].name
				p.box.BackgroundColor3 = T.accent
			end
			UIKit.setEnabled(p.box, running)
			p.auto.Text = c.auto and "Strategist: AUTO\n(click for manual)" or "Strategist: MANUAL\n(click for auto)"
			p.auto.BackgroundColor3 = c.auto and Color3.fromRGB(30, 90, 60) or T.panel3
			local canTake = c.can and running and not race.manualKey
			UIKit.setEnabled(p.take, canTake == true)
			p.take.Text = c.man and "YOU ARE DRIVING" or "TAKE THE WHEEL"
		end
	end
end

local function refreshTop()
	local snap = race.snap
	if not snap then
		return
	end
	ui.lap.Text = snap.chequered and "🏁 FINISH" or string.format("LAP %d / %d", snap.lap, snap.laps)
	local w = snap.weather
	if w then
		ui.weather.Text = string.format("%s  •  Track %d%% wet", w.label, math.floor(w.wetness * 100 + 0.5))
	end
	if snap.fastest then
		local info = race.infoByKey[snap.fastest.key]
		ui.fastest.Text = "Fastest lap: " .. (info and info.code or "") .. "  " .. Config.formatLapTime(snap.fastest.time)
	else
		ui.fastest.Text = ""
	end
	ui.sc.Visible = snap.sc == true
	for i, b in ipairs(ui.speedButtons) do
		b.BackgroundColor3 = (i == snap.speedIndex) and T.accent or T.panel3
		UIKit.setEnabled(b, snap.manualKey == nil)
	end
end

---------------------------------------------------------------------
-- Events from the server
---------------------------------------------------------------------
function RaceUI.startRace(info)
	race.active = true
	race.info = info
	race.infoByKey = {}
	race.snap = nil
	race.manualKey = nil
	race.lightsOutAt = nil
	for _, car in ipairs(info.cars) do
		race.infoByKey[car.k] = car
	end
	-- Default pit tyre choice: the next sensible dry compound.
	race.pitChoice = { "Hard", "Medium" }
	if ui.resultsFrame then
		ui.resultsFrame:Destroy()
		ui.resultsFrame = nil
	end
	UIKit.clear(ui.radioList)
	ui.radioCount = 0
	ctx.setHubVisible(false)
	local built = TrackBuilder.current
	if not built or built.id ~= info.trackId then
		TrackBuilder.build(info.trackId)
	end
	RaceViewer.start(info)
	root.Visible = true
	ui.teamHolder.Visible = true
	ui.lightsFrame.Visible = true
	ui.lightsText.Text = "Get ready..."
	RaceUI.refreshCameraLabel()
end

function RaceUI.onSnapshot(snap)
	if not race.active then
		return
	end
	race.snap = snap
	race.manualKey = snap.manualKey
	RaceViewer.applySnapshot(snap)
	if not snap.started then
		local lit = math.clamp(5 - math.floor(snap.countdown), 0, 5)
		for i, l in ipairs(ui.lights) do
			l.BackgroundColor3 = i <= lit and Color3.fromRGB(235, 20, 20) or Color3.fromRGB(50, 10, 10)
		end
	end
	refreshTop()
	RaceUI.refreshBoard()
	RaceUI.refreshTeam()
	if DriveController.isActive() and race.manualKey then
		local c = RaceUI.carForSlotKey(race.manualKey)
		if c then
			ui.driveInfo.Text = string.format("P%d   •   Lap %d / %d", c.p, math.min(c.ld + 1, snap.laps), snap.laps)
		end
	end
end

function RaceUI.carForSlotKey(key)
	if not race.snap then
		return nil
	end
	for _, c in ipairs(race.snap.cars) do
		if c.k == key then
			return c
		end
	end
	return nil
end

function RaceUI.onLights()
	for _, l in ipairs(ui.lights) do
		l.BackgroundColor3 = Color3.fromRGB(50, 10, 10)
	end
	ui.lightsText.Text = "LIGHTS OUT AND AWAY WE GO!"
	race.lightsOutAt = os.clock()
end

function RaceUI.addRadio(msg)
	if not ui.radioList then
		return
	end
	local color = msg.role == "driver" and T.gold or (msg.role == "strategist" and T.accent2 or T.good)
	ui.radioCount += 1
	UIKit.paragraph(ui.radioList, string.format('<font color="#%s"><b>%s:</b></font> %s', color:ToHex(), msg.speaker, msg.text), {
		TextColor3 = T.text,
		TextSize = 13,
		LayoutOrder = ui.radioCount,
	})
	local labels = {}
	for _, child in ipairs(ui.radioList:GetChildren()) do
		if child:IsA("TextLabel") then
			table.insert(labels, child)
		end
	end
	if #labels > 40 then
		table.sort(labels, function(a, b)
			return a.LayoutOrder < b.LayoutOrder
		end)
		labels[1]:Destroy()
	end
	task.defer(function()
		ui.radioList.CanvasPosition = Vector2.new(0, math.max(0, ui.radioList.AbsoluteCanvasSize.Y - ui.radioList.AbsoluteSize.Y))
	end)
end

function RaceUI.onTakeoverStart(payload)
	local built = TrackBuilder.current
	if not built then
		return
	end
	race.manualKey = payload.key
	local path = built.path
	RaceViewer.setManual(payload.key)
	RaceViewer.setFocus(payload.key)
	local idx = TrackPath.indexAt(path, payload.startDist)
	ui.teamHolder.Visible = false
	ui.driveHud.Visible = true
	ui.qualiPanel.Visible = false
	ui.driveButton.Text = "Hand back (H)"
	ui.driveInfo.Text = payload.driver
	ui.driveSub.Text = "You are driving. Faster laps gain real time!"
	DriveController.start({
		path = path,
		mode = "race",
		startDist = payload.startDist,
		lapsDone = payload.lapsDone,
		gripMul = payload.gripMul,
		speedMul = payload.speedMul,
		startSpeed = path.speed[idx] * payload.speedMul * 0.95,
		otherCars = RaceViewer.otherCars,
		onReport = function(cum)
			ctx.raceCommand("DriveUpdate", { cum = cum })
		end,
		onHud = function(h)
			ui.driveSpeed.Text = tostring(h.kmh)
			ui.driveWarning.Text = h.wrongWay and "WRONG WAY" or (h.onRoad and "" or "OFF TRACK")
			ui.driveSub.Text = "Braking assist: " .. (h.assist and "ON" or "OFF") .. "   •   " .. built.track.name
		end,
		setCarCFrame = function(cf)
			RaceViewer.setCarCFrame(payload.key, cf)
		end,
	})
end

function RaceUI.onTakeoverEnd(_payload)
	if DriveController.isActive() and not quali then
		DriveController.stop()
	end
	race.manualKey = nil
	RaceViewer.setManual(nil)
	ui.driveHud.Visible = false
	ui.driveWarning.Text = ""
	if race.active and not ui.resultsFrame then
		ui.teamHolder.Visible = true
	end
end

function RaceUI.driveButtonPressed()
	if quali then
		RaceUI.finishQualiDrive(nil, 99, true)
	elseif race.manualKey then
		ctx.raceCommand("HandBack", {})
	end
end

local function closeRace()
	race.active = false
	RaceViewer.stop()
	root.Visible = false
	ui.driveHud.Visible = false
	if ui.resultsFrame then
		ui.resultsFrame:Destroy()
		ui.resultsFrame = nil
	end
	ctx.setHubVisible(true)
	ctx.refreshHub()
end

function RaceUI.onFinished(summary)
	if DriveController.isActive() then
		DriveController.stop()
	end
	race.manualKey = nil
	ui.driveHud.Visible = false
	ui.teamHolder.Visible = false
	local frame = UIKit.frame(root.Parent, {
		Name = "Results",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5, 0, 0.5, 0),
		Size = UDim2.new(0, 720, 0.88, 0),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.05,
		ZIndex = 20,
	})
	UIKit.corner(frame, 14)
	UIKit.stroke(frame, T.accent, 2)
	ui.resultsFrame = frame
	local scroll = UIKit.scroll(frame, { Position = UDim2.new(0, 0, 0, 0), Size = UDim2.new(1, 0, 1, -64) })
	UIKit.padding(scroll, 12, 16)
	UIKit.list(scroll, nil, 8)
	UIKit.title(scroll, "🏁 " .. summary.trackName .. " - Race result" .. (summary.wet and " (wet race)" or ""), 22)
	local rows = {}
	for _, r in ipairs(summary.results) do
		table.insert(rows, {
			tostring(r.pos),
			{ text = r.name .. (r.fastestLap and "  ⏱" or ""), color = r.isPlayer and T.gold or nil },
			{ text = r.teamName, color = r.color },
			r.status,
			r.points > 0 and ("+" .. r.points) or "",
		})
	end
	UIKit.table(scroll, {
		{ "POS", 0.07 },
		{ "DRIVER", 0.3 },
		{ "TEAM", 0.26 },
		{ "TIME / STATUS", 0.27 },
		{ "PTS", 0.1, Enum.TextXAlignment.Right },
	}, rows, 21, function(i)
		local r = summary.results[i]
		return r and r.isPlayer and Color3.fromRGB(60, 52, 22) or nil
	end)
	for _, line in ipairs(summary.income) do
		UIKit.label(scroll, line.label .. ":  <b>" .. Config.formatMoney(line.amount) .. "</b>", { TextSize = 14, TextColor3 = line.amount >= 0 and T.good or T.bad })
	end
	UIKit.label(scroll, "Total: <b>" .. Config.formatMoney(summary.net) .. "</b>   •   Budget now " .. Config.formatMoney(summary.budget), { TextSize = 16 })
	UIKit.button(frame, summary.podium and "🏆 To the podium!" or "Back to the paddock", function()
		frame:Destroy()
		ui.resultsFrame = nil
		if summary.podium then
			root.Visible = false
			race.active = false -- stop the race camera so the podium camera can take over
			PodiumScene.play(summary.podium, summary.trackName, function()
				closeRace()
			end)
		else
			closeRace()
		end
	end, {
		AnchorPoint = Vector2.new(0.5, 1),
		Position = UDim2.new(0.5, 0, 1, -12),
		Size = UDim2.new(0, 260, 0, 42),
		BackgroundColor3 = T.good,
		ZIndex = 21,
	})
end

---------------------------------------------------------------------
-- Q3 flying lap
---------------------------------------------------------------------
function RaceUI.startQualiDrive(drive)
	local built = TrackBuilder.current
	if not built or built.id ~= drive.trackId then
		TrackBuilder.build(drive.trackId)
		built = TrackBuilder.current
	end
	local path = built.path
	ctx.setHubVisible(false)
	local color = Config.teamColor("PLAYER", ctx.state and ctx.state.colorIndex or 1)
	local model = RaceViewer.buildCar(color, "YOU", true)
	model.Parent = workspace
	quali = { drive = drive, model = model, started = os.clock(), done = false }
	ui.driveHud.Visible = true
	ui.qualiPanel.Visible = true
	ui.driveButton.Text = "Abort lap"
	ui.driveInfo.Text = "Q3 - " .. drive.driver
	ui.qualiTimer.Text = "Out lap"
	ui.qualiInfo.Text = string.format("Banker lap %s   •   Provisional pole %s\nCross the line to start your flying lap.", Config.formatLapTime(drive.banker), Config.formatLapTime(drive.pole))
	local limitTime = TrackPath.profileTime(path, drive.gripMul, drive.speedMul) * 3 + 60
	DriveController.start({
		path = path,
		mode = "quali",
		startDist = path.length - 280,
		gripMul = drive.gripMul,
		speedMul = drive.speedMul,
		startSpeed = 55,
		setCarCFrame = function(cf)
			model.PrimaryPart.CFrame = cf
		end,
		onHud = function(h)
			ui.driveSpeed.Text = tostring(h.kmh)
			ui.driveWarning.Text = h.wrongWay and "WRONG WAY" or (h.onRoad and "" or "TRACK LIMITS")
			ui.driveSub.Text = "Track limits: " .. h.cuts .. " / 3   •   Braking assist: " .. (h.assist and "ON" or "OFF")
			if h.timing then
				ui.qualiTimer.Text = Config.formatLapTime(h.lapTime * drive.timeScale)
				ui.qualiTimer.TextColor3 = h.cuts >= 3 and T.bad or T.text
			end
			if os.clock() - quali.started > limitTime then
				RaceUI.finishQualiDrive(nil, 99, true)
			end
		end,
		onLapDone = function(seconds, cuts)
			RaceUI.finishQualiDrive(seconds, cuts, false)
		end,
	})
end

function RaceUI.finishQualiDrive(seconds, cuts, aborted)
	if not quali or quali.done then
		return
	end
	quali.done = true
	DriveController.stop()
	local current = quali
	local drive = current.drive
	if not aborted then
		ui.qualiTimer.Text = Config.formatLapTime(seconds * drive.timeScale)
		ui.qualiInfo.Text = cuts >= 3 and "Lap deleted: too many track limits warnings." or "Lap complete!"
	end
	-- Finish in a separate thread so the frame update that called us isn't held up.
	task.spawn(function()
		task.wait(aborted and 0.2 or 2)
		current.model:Destroy()
		quali = nil
		ui.driveHud.Visible = false
		ui.qualiPanel.Visible = false
		ui.driveWarning.Text = ""
		ctx.setHubVisible(true)
		ctx.request("Q3DriveResult", { time = seconds, cuts = cuts, aborted = aborted })
	end)
end

---------------------------------------------------------------------
-- Every frame
---------------------------------------------------------------------
function RaceUI.update(dt)
	if race.active then
		RaceViewer.updateCars(dt)
		if not DriveController.isActive() then
			RaceViewer.updateCamera(dt)
		end
		RaceViewer.updateWeather()
		if race.lightsOutAt and os.clock() - race.lightsOutAt > 2 then
			race.lightsOutAt = nil
			ui.lightsFrame.Visible = false
		end
	end
end

function RaceUI.isBusy()
	return race.active or quali ~= nil or PodiumScene.isPlaying()
end

function RaceUI.init(context)
	ctx = context
	root = UIKit.frame(ctx.gui, {
		Name = "Race",
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundTransparency = 1,
		Visible = false,
	})
	buildLeaderboard()
	buildTopBar()
	buildRadio()
	buildTeamPanels()
	buildLights()
	buildDriveHud()
	UserInputService.InputBegan:Connect(function(input, processed)
		if processed then
			return
		end
		if input.KeyCode == Enum.KeyCode.H or input.KeyCode == Enum.KeyCode.ButtonX then
			if race.manualKey and not quali then
				ctx.raceCommand("HandBack", {})
			end
		end
	end)
end

return RaceUI
```


### 22. ClientMain (LocalScript, StarterPlayer > StarterPlayerScripts)

```lua
--[[
	ClientMain (LocalScript)
	Location: StarterPlayer > StarterPlayerScripts > ClientMain

	The client's main script. It:
	  * makes the on-screen interface (menus, race screen),
	  * talks to the server through the Remotes the server created,
	  * builds the current circuit in 3D on this player's screen,
	  * runs the cameras and the per-frame race drawing.
	The server makes every decision about money, results and saving;
	this script only shows things and sends the player's choices.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local StarterGui = game:GetService("StarterGui")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

---------------------------------------------------------------------
-- Wait for the server
---------------------------------------------------------------------
local remotes = ReplicatedStorage:WaitForChild("Remotes", 15)
if not remotes then
	warn("[ClientMain] Still waiting for the server. Check that GameServer is a Script inside ServerScriptService.")
	local hint = Instance.new("ScreenGui")
	hint.Name = "WaitingHint"
	hint.ResetOnSpawn = false
	hint.Parent = playerGui
	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, 0, 0, 60)
	label.BackgroundColor3 = Color3.fromRGB(120, 30, 30)
	label.TextColor3 = Color3.new(1, 1, 1)
	label.TextScaled = true
	label.Text = "Waiting for the server... Is the GameServer Script inside ServerScriptService?"
	label.Parent = hint
	remotes = ReplicatedStorage:WaitForChild("Remotes")
	hint:Destroy()
end
local Request = remotes:WaitForChild("Request")
local RaceEvent = remotes:WaitForChild("RaceEvent")
local RaceCommand = remotes:WaitForChild("RaceCommand")
local RadioRemote = remotes:WaitForChild("Radio")
local Notify = remotes:WaitForChild("Notify")
local StateChanged = remotes:WaitForChild("StateChanged")

---------------------------------------------------------------------
-- Modules
---------------------------------------------------------------------
local ClientModules = ReplicatedStorage:WaitForChild("ClientModules")
local UIKit = require(ClientModules:WaitForChild("UIKit"))
local TrackBuilder = require(ClientModules:WaitForChild("TrackBuilder"))
local RaceViewer = require(ClientModules:WaitForChild("RaceViewer"))
local HubPanels = require(ClientModules:WaitForChild("HubPanels"))
local HubUI = require(ClientModules:WaitForChild("HubUI"))
local PodiumScene = require(ClientModules:WaitForChild("PodiumScene"))
local RaceUI = require(ClientModules:WaitForChild("RaceUI"))

-- Hide the backpack and health bar; this game is played through menus.
pcall(function()
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false)
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Health, false)
end)

local gui = Instance.new("ScreenGui")
gui.Name = "TeamPrincipalGui"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false -- keep everything below Roblox's own top bar
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = playerGui

UIKit.initToasts(gui)

---------------------------------------------------------------------
-- Shared context passed to every UI module
---------------------------------------------------------------------
local ctx = {
	gui = gui,
	state = nil,
	radioLog = {},
	saveText = nil,
	busy = false,
}

local setupShown = false
local wantedTrack = nil
local buildFailures = 0

-- Builds the circuit for the current round (in the background).
local function ensureTrack(trackId)
	if not trackId or wantedTrack == trackId then
		return
	end
	wantedTrack = trackId
	if RaceUI.isBusy() then
		return
	end
	task.spawn(function()
		local current = TrackBuilder.current
		if current and current.id == trackId then
			return
		end
		UIKit.toast("Building the circuit...", nil, 2)
		local ok, err = pcall(TrackBuilder.build, trackId)
		if not ok then
			buildFailures += 1
			warn("[ClientMain] Track build failed: " .. tostring(err))
			UIKit.toast("Could not build the track: " .. tostring(err), "bad", 6)
		end
	end)
end

function ctx.setState(state)
	ctx.state = state
	if state.weekend then
		ensureTrack(state.weekend.trackId)
	end
	HubUI.refresh()
	if not state.setupDone and not setupShown then
		setupShown = true
		HubUI.showSetup()
	end
end

-- Sends a request to the server and shows its answer.
function ctx.request(action, args)
	if ctx.busy then
		UIKit.toast("One moment...", nil, 1)
		return nil
	end
	ctx.busy = true
	local ok, resp = pcall(function()
		return Request:InvokeServer(action, args or {})
	end)
	ctx.busy = false
	if not ok or type(resp) ~= "table" then
		UIKit.toast("Connection problem: " .. tostring(resp), "bad")
		return nil
	end
	if resp.state then
		ctx.setState(resp.state)
	end
	if resp.msg and resp.msg ~= "" then
		UIKit.toast(resp.msg, resp.ok and "good" or "bad")
	end
	return resp
end

function ctx.raceCommand(cmd, data)
	RaceCommand:FireServer(cmd, data or {})
end

function ctx.setHubVisible(visible)
	HubUI.setVisible(visible)
end

function ctx.refreshHub()
	HubUI.refresh()
end

function ctx.startQualiDrive(drive)
	RaceUI.startQualiDrive(drive)
end

HubPanels.init(ctx)
PodiumScene.init(ctx)
HubUI.init(ctx)
RaceUI.init(ctx)

---------------------------------------------------------------------
-- Messages from the server
---------------------------------------------------------------------
StateChanged.OnClientEvent:Connect(function(state)
	ctx.setState(state)
end)

RaceEvent.OnClientEvent:Connect(function(name, payload)
	if name == "Start" then
		RaceUI.startRace(payload)
	elseif name == "Snapshot" then
		RaceUI.onSnapshot(payload)
	elseif name == "Lights" then
		RaceUI.onLights()
	elseif name == "TakeoverStart" then
		RaceUI.onTakeoverStart(payload)
	elseif name == "TakeoverEnd" then
		RaceUI.onTakeoverEnd(payload)
	elseif name == "Notice" then
		UIKit.toast(payload.text, "bad")
	elseif name == "Finished" then
		RaceUI.onFinished(payload)
	end
end)

RadioRemote.OnClientEvent:Connect(function(msg)
	table.insert(ctx.radioLog, msg)
	if #ctx.radioLog > 30 then
		table.remove(ctx.radioLog, 1)
	end
	RaceUI.addRadio(msg)
end)

Notify.OnClientEvent:Connect(function(kind, payload)
	payload = payload or {}
	if kind == "SaveStatus" then
		ctx.saveText = payload.text
		HubUI.refresh()
	elseif kind == "Objective" then
		UIKit.toast("🎯 Objective complete: " .. tostring(payload.text) .. " (claim it in Objectives)", "gold", 5)
	elseif kind == "Record" then
		HubPanels.celebrateRecord(payload)
	elseif payload.text then
		UIKit.toast(payload.text)
	end
end)

---------------------------------------------------------------------
-- Every frame: race drawing, or a slow fly-around of the circuit
---------------------------------------------------------------------
RunService.RenderStepped:Connect(function(dt)
	if RaceUI.isBusy() then
		RaceUI.update(dt)
	else
		local needsBuild = wantedTrack and (not TrackBuilder.current or TrackBuilder.current.id ~= wantedTrack)
		if needsBuild and not TrackBuilder.buildingId and buildFailures < 3 then
			-- A race just ended at the old track: build the next one now.
			local id = wantedTrack
			wantedTrack = nil
			ensureTrack(id)
		end
		RaceViewer.orbit(dt)
	end
end)

---------------------------------------------------------------------
-- First load (the career can take a few seconds to load)
---------------------------------------------------------------------
task.spawn(function()
	for _ = 1, 30 do
		if ctx.state then
			return
		end
		local ok, resp = pcall(function()
			return Request:InvokeServer("GetState", {})
		end)
		if ok and type(resp) == "table" and resp.state then
			ctx.setState(resp.state)
			return
		end
		task.wait(2)
	end
end)
```


## How to play

1. **Create your team.** Pick a name and colour. You start with $75M.
2. **Build the team.** Use the **Market** tab to sign two race drivers, a
   reserve, a pit crew and one or two strategists, or press **Quick Setup**.
   Driver stats: pace, consistency, wet weather, overtaking and tyre care.
   Pit crews have speed and reliability; strategists have call quality and
   planning. Hiring fees are paid now, salaries after every race.
3. **Develop the car** in the **Car** tab with money or upgrade points.
   Aerodynamics matters most on twisty tracks, the power unit on fast ones.
4. **Race weekend** (Weekend tab):
   * **FP1-FP3**: pick a programme (setup work, long runs or qualifying runs).
     Each makes you a little faster or easier on tyres this weekend.
   * **Q1 and Q2** knock out the slowest five each. In **Q3** you can simulate
     it or **drive the flying lap yourself**. Three track-limits warnings
     delete your lap, and your driver's banker lap still counts.
   * **Race**: choose starting tyres and press START. Use 4x, 8x or 16x speed.
     Your strategist pits automatically (AUTO), or switch to MANUAL and press
     **BOX** with the tyre you want. Soft, Medium and Hard are for dry tracks,
     Intermediate for damp and Wet for heavy rain. The wrong tyre costs
     seconds every lap. In a dry race each car must use two dry compounds or
     get a 10-second penalty.
   * **Take the wheel**: late in the race, when your car is in a close battle
     (and in the last four laps), the purple button lights up. Drive with
     W/S/A/D or the arrow keys (gamepad: triggers and left stick, phones:
     on-screen buttons). B toggles the braking assist. Press **H** (or the
     button) to hand back.
5. After the race you get prize and sponsor money. If one of your drivers
   finishes in the top three, you go to the **podium**.
6. **Objectives** give money and upgrade points. Daily ones reset at
   midnight UTC and weekly ones on Monday 00:00 UTC. Claim rewards in the
   Objectives tab.
7. **Records** shows your career against real F1 records. Beat one and the
   game celebrates.
8. After round 18 the championships are decided, end-of-season prize money is
   paid and a new season starts. Your team, budget and staff carry over.


## Troubleshooting

**A red bar says "Waiting for the server..."**
GameServer is missing, misnamed, or in the wrong place. It must be a **Script**
(not a LocalScript) directly inside **ServerScriptService**.

**The Output window says "Infinite yield possible on ... WaitForChild("Something")"**
A script or folder has the wrong name or is in the wrong folder. Names must
match the table exactly, including capital letters. For example
`ReplicatedStorage.Shared.Config` must be a ModuleScript named `Config` inside
a Folder named `Shared`.

**The top bar says "Saving off" or "Saving is not available here"**
Publish the place (File > Publish to Roblox) and turn on **Enable Studio Access
to API Services** (Home > Game Settings > Security), then press Play again.
The game still runs without saving, it just starts fresh each time.

**Saving says "Could not load your save, so saving is off for this visit"**
Roblox's DataStores had a problem when you joined. Saving is switched off on
purpose so your old save isn't overwritten by a new career. Rejoin later.

**Nothing happens when I click, or the screen stays empty**
Open View > Output and look for red errors. Check that ClientMain is a
**LocalScript** inside **StarterPlayer > StarterPlayerScripts**, not in
StarterGui or StarterCharacterScripts. Also check that no file was only
partly pasted: each one must end with a line like `return Config` or, for
ClientMain and GameServer, the last `end)` of the file.

**"Requested module experienced an error while loading"**
One of the ModuleScripts has a copy-paste mistake. The line number in the
error tells you which file. Paste that file again in full.

**The circuit takes a moment to appear**
The track is built from parts when a new round starts. It takes a few
seconds, and a message says "Building the circuit...".

**The game is slow on my computer**
Lower the graphics quality in Studio (File > Studio Settings > Rendering) or in
the Roblox menu while playing. Use the Overhead camera during races.

**I want to start my career again**
Change `Config.DataStoreName` (top of Config) to a new name, for example
`"TeamPrincipalCareer_v2"`.

**My avatar is standing on the baseplate below the track**
That is normal. The game is played through the menus and cameras, so the
avatar is frozen in place.


## Credits and notes

* Circuit, team and driver names are made up. The circuit shapes follow real
  circuits, using centreline data from the MIT-licensed
  [f1-circuits](https://github.com/bacinger/f1-circuits) dataset by Tomislav
  Bacinger (credit is kept in the Tracks script).
* Races are about a third of real race distance so a race takes 5-10 minutes.
  Tyre wear and fuel use are scaled to match.
* Each player who joins gets their own independent career.
