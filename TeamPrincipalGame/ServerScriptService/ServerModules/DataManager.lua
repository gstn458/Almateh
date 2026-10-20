--[[
	DataManager (ModuleScript)
	Location: ServerScriptService > ServerModules > DataManager

	Loads and saves each player's career with DataStoreService, using
	UpdateAsync and a session lock so a quick rejoin can't lose progress.
	If DataStores are not available (for example an unpublished place in Studio,
	or "Studio Access to API Services" is turned off) the game still runs,
	it just cannot save. If loading fails for a player who may already have a
	save, saving is switched off for that session so the old save is never
	overwritten by a fresh career.
]]

local DataStoreService = game:GetService("DataStoreService")
local HttpService = game:GetService("HttpService")
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

-- Each running server gets its own id. A save remembers which server is using
-- it (a "session lock"), so two servers can never overwrite each other's save
-- when a player rejoins quickly. A lock that hasn't been refreshed for
-- LOCK_TIMEOUT seconds belongs to a server that crashed and can be taken over.
local SESSION_ID = HttpService:GenerateGUID(false)
local LOCK_TIMEOUT = 600

local function lockedByOther(data)
	local lock = type(data) == "table" and data._lock
	return type(lock) == "table" and lock.id ~= SESSION_ID and os.time() - (tonumber(lock.time) or 0) < LOCK_TIMEOUT
end

-- Returns: data (table or nil), status ("loaded" | "new" | "offline"), message
function DataManager.load(player)
	if not store then
		return nil, "offline", "Saving is not available here (publish the game and enable Studio Access to API Services)."
	end
	local key = keyFor(player)
	local lastErr = nil
	for attempt = 1, 5 do
		local force = attempt == 5 -- after waiting a while, take over a stuck lock
		local blocked = false
		local loaded = nil
		local ok, err = pcall(function()
			store:UpdateAsync(key, function(old)
				if lockedByOther(old) and not force then
					blocked = true
					return nil -- leave the save untouched
				end
				loaded = old
				if type(old) == "table" then
					old._lock = { id = SESSION_ID, time = os.time() }
					return old, { player.UserId }
				end
				return nil
			end)
		end)
		if ok and not blocked then
			if type(loaded) == "table" then
				return loaded, "loaded", "Career loaded."
			end
			return nil, "new", "New career started."
		end
		lastErr = ok and "your save is still open on another server" or tostring(err)
		warn(string.format("[DataManager] Load attempt %d for %s: %s", attempt, player.Name, lastErr))
		if not player.Parent then
			break
		end
		task.wait(blocked and 4 or 1.5 * attempt)
	end
	return nil, "offline", "Could not load your save, so saving is off for this visit: " .. tostring(lastErr)
end

-- Saves a profile. release = true frees the session lock (player leaving).
-- Returns ok (boolean), a message, and lostLock (true if another server took over).
function DataManager.save(player, profile, release)
	if not store then
		return false, "Saving is not available.", false
	end
	local key = keyFor(player)
	profile.lastSaved = os.time()
	profile._lock = (not release) and { id = SESSION_ID, time = os.time() } or nil
	local lastErr = nil
	for attempt = 1, 3 do
		local lostLock = false
		local ok, err = pcall(function()
			store:UpdateAsync(key, function(old)
				if lockedByOther(old) then
					lostLock = true
					return nil
				end
				return profile, { player.UserId }
			end)
		end)
		if ok and lostLock then
			return false, "Your career is open on another server, so this server stopped saving it.", true
		end
		if ok then
			return true, "Saved.", false
		end
		lastErr = tostring(err)
		warn(string.format("[DataManager] Save attempt %d failed for %s: %s", attempt, player.Name, lastErr))
		task.wait(1 + attempt)
	end
	return false, "Save failed: " .. tostring(lastErr), false
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
