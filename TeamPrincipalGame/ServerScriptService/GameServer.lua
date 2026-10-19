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
