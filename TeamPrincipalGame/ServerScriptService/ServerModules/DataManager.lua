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
