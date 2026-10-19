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
