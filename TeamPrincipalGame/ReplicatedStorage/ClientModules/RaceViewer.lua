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
