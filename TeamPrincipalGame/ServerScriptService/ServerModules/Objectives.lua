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
