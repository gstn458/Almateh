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
