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
