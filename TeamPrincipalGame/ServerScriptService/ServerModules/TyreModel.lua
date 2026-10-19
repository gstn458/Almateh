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
