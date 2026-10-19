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
