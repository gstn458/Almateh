--[[
	RaceUI (ModuleScript)
	Location: ReplicatedStorage > ClientModules > RaceUI

	Everything on screen during a live race:
	  * leaderboard with gaps, tyres and pit status (click a row to watch that car)
	  * lap counter, weather and safety car banner, start lights
	  * your two cars: tyre wear, pit call with tyre choice, strategist on/off,
	    and the "TAKE THE WHEEL" button when a battle is on
	  * the team radio panel
	  * the driving HUD (speed, position, hand back) with touch buttons on phones
	  * the Q3 flying-lap screen
	  * the results screen at the end (and the podium celebration)
]]

local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("Config"))
local TrackPath = require(Shared:WaitForChild("TrackPath"))

local ClientModules = script.Parent
local UIKit = require(ClientModules:WaitForChild("UIKit"))
local RaceViewer = require(ClientModules:WaitForChild("RaceViewer"))
local DriveController = require(ClientModules:WaitForChild("DriveController"))
local TrackBuilder = require(ClientModules:WaitForChild("TrackBuilder"))
local PodiumScene = require(ClientModules:WaitForChild("PodiumScene"))

local T = UIKit.Theme
local RaceUI = {}

local ctx = nil
local root = nil
local ui = {}
local race = {
	active = false,
	info = nil,
	infoByKey = {},
	snap = nil,
	gapMode = "gap",
	pitChoice = { "Medium", "Medium" },
	manualKey = nil,
	lightsOutAt = nil,
}
local quali = nil

---------------------------------------------------------------------
-- Building the race screen
---------------------------------------------------------------------
local function buildLeaderboard()
	local board = UIKit.frame(root, {
		Name = "Leaderboard",
		Position = UDim2.new(0, 10, 0, 70),
		Size = UDim2.new(0, 300, 0, 26 + 20 * 23),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.15,
	})
	UIKit.corner(board, 8)
	local header = UIKit.button(board, "POS  DRIVER        GAP TO LEADER", function()
		race.gapMode = race.gapMode == "gap" and "int" or "gap"
		ui.boardHeader.Text = race.gapMode == "gap" and "POS  DRIVER        GAP TO LEADER" or "POS  DRIVER        INTERVAL"
		RaceUI.refreshBoard()
	end, {
		Size = UDim2.new(1, 0, 0, 24),
		BackgroundColor3 = T.panel3,
		TextSize = 12,
		TextXAlignment = Enum.TextXAlignment.Left,
	})
	UIKit.padding(header, 0, 8)
	ui.boardHeader = header
	ui.rows = {}
	for i = 1, 20 do
		local row = UIKit.make("TextButton", {
			Text = "",
			AutoButtonColor = false,
			BorderSizePixel = 0,
			BackgroundColor3 = i % 2 == 0 and T.panel2 or T.panel,
			BackgroundTransparency = 0.1,
			Position = UDim2.new(0, 0, 0, 26 + (i - 1) * 23),
			Size = UDim2.new(1, 0, 0, 22),
		}, board)
		local r = {}
		r.frame = row
		r.pos = UIKit.label(row, tostring(i), { Position = UDim2.new(0, 4, 0, 0), Size = UDim2.new(0, 24, 1, 0), Font = T.fontBold, TextSize = 14, TextXAlignment = Enum.TextXAlignment.Center })
		r.bar = UIKit.frame(row, { Position = UDim2.new(0, 30, 0, 3), Size = UDim2.new(0, 4, 1, -6), BackgroundColor3 = Color3.new(1, 1, 1) })
		r.code = UIKit.label(row, "", { Position = UDim2.new(0, 40, 0, 0), Size = UDim2.new(0, 60, 1, 0), Font = T.fontBold, TextSize = 14 })
		r.gap = UIKit.label(row, "", { Position = UDim2.new(0, 100, 0, 0), Size = UDim2.new(0, 90, 1, 0), TextSize = 13, TextXAlignment = Enum.TextXAlignment.Right })
		r.tyreHolder = UIKit.frame(row, { BackgroundTransparency = 1, Position = UDim2.new(0, 200, 0, 2), Size = UDim2.new(0, 18, 0, 18) })
		r.wear = UIKit.label(row, "", { Position = UDim2.new(0, 222, 0, 0), Size = UDim2.new(0, 36, 1, 0), TextSize = 12, TextColor3 = T.subtext })
		r.status = UIKit.label(row, "", { Position = UDim2.new(0, 258, 0, 0), Size = UDim2.new(0, 40, 1, 0), TextSize = 12, Font = T.fontBold, TextColor3 = T.warn })
		r.compound = nil
		row.Activated:Connect(function()
			if r.key then
				RaceViewer.setFocus(r.key)
				RaceUI.refreshCameraLabel()
			end
		end)
		ui.rows[i] = r
	end
end

local function buildTopBar()
	local top = UIKit.frame(root, {
		Name = "Top",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 8),
		Size = UDim2.new(0, 560, 0, 56),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.15,
	})
	UIKit.corner(top, 10)
	ui.lap = UIKit.label(top, "LAP 1 / 20", { Position = UDim2.new(0, 14, 0, 0), Size = UDim2.new(0, 170, 1, 0), Font = T.fontBold, TextSize = 24 })
	ui.weather = UIKit.label(top, "", { Position = UDim2.new(0, 190, 0, 4), Size = UDim2.new(0, 360, 0, 24), TextSize = 15 })
	ui.fastest = UIKit.label(top, "", { Position = UDim2.new(0, 190, 0, 28), Size = UDim2.new(0, 360, 0, 22), TextSize = 13, TextColor3 = T.purple })
	ui.sc = UIKit.label(root, "SAFETY CAR", {
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 68),
		Size = UDim2.new(0, 260, 0, 36),
		BackgroundColor3 = T.warn,
		BackgroundTransparency = 0,
		TextColor3 = Color3.new(0, 0, 0),
		Font = T.fontBold,
		TextSize = 22,
		TextXAlignment = Enum.TextXAlignment.Center,
		Visible = false,
	})
	UIKit.corner(ui.sc, 8)

	local controls = UIKit.frame(root, {
		Name = "Controls",
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -10, 0, 8),
		Size = UDim2.new(0, 330, 0, 92),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.15,
	})
	UIKit.corner(controls, 10)
	UIKit.padding(controls, 6, 8)
	UIKit.list(controls, nil, 6)
	local speedRow = UIKit.row(controls, 34, 6)
	UIKit.label(speedRow, "Speed", { Size = UDim2.new(0, 50, 1, 0), TextSize = 14, TextColor3 = T.subtext })
	ui.speedButtons = {}
	for i, s in ipairs(Config.Race.SimSpeeds) do
		ui.speedButtons[i] = UIKit.button(speedRow, s .. "x", function()
			ctx.raceCommand("Speed", { index = i })
		end, { Size = UDim2.new(0, 60, 0, 30), BackgroundColor3 = T.panel3, LayoutOrder = i })
	end
	local camRow = UIKit.row(controls, 34, 6)
	ui.camButton = UIKit.button(camRow, "Camera: Chase", function()
		RaceViewer.cycleCamera()
		RaceUI.refreshCameraLabel()
	end, { Size = UDim2.new(0, 130, 0, 30), BackgroundColor3 = T.panel3, TextSize = 13 })
	UIKit.button(camRow, "◀", function()
		RaceViewer.cycleFocus(-1)
		RaceUI.refreshCameraLabel()
	end, { Size = UDim2.new(0, 30, 0, 30), BackgroundColor3 = T.panel3 })
	ui.focusLabel = UIKit.label(camRow, "", { Size = UDim2.new(0, 110, 1, 0), TextSize = 13, TextXAlignment = Enum.TextXAlignment.Center })
	UIKit.button(camRow, "▶", function()
		RaceViewer.cycleFocus(1)
		RaceUI.refreshCameraLabel()
	end, { Size = UDim2.new(0, 30, 0, 30), BackgroundColor3 = T.panel3 })
end

local function buildRadio()
	local panel = UIKit.frame(root, {
		Name = "Radio",
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -10, 0, 108),
		Size = UDim2.new(0, 330, 0, 300),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.15,
	})
	UIKit.corner(panel, 10)
	UIKit.label(panel, "📻  TEAM RADIO", { Position = UDim2.new(0, 10, 0, 4), Size = UDim2.new(1, -20, 0, 22), Font = T.fontBold, TextSize = 14 })
	local list = UIKit.scroll(panel, { Position = UDim2.new(0, 6, 0, 28), Size = UDim2.new(1, -12, 1, -34) })
	UIKit.list(list, nil, 4)
	ui.radioList = list
	ui.radioCount = 0
end

local function buildTeamPanels()
	ui.team = {}
	local holder = UIKit.frame(root, {
		Name = "TeamPanels",
		AnchorPoint = Vector2.new(1, 1),
		Position = UDim2.new(1, -10, 1, -10),
		Size = UDim2.new(0, 790, 0, 168),
		BackgroundTransparency = 1,
	})
	UIKit.list(holder, Enum.FillDirection.Horizontal, 10, Enum.HorizontalAlignment.Right)
	ui.teamHolder = holder
	for slot = 1, 2 do
		local p = {}
		local card = UIKit.frame(holder, { Size = UDim2.new(0, 390, 1, 0), BackgroundColor3 = T.bg, BackgroundTransparency = 0.1, LayoutOrder = slot })
		UIKit.corner(card, 10)
		UIKit.stroke(card, T.panel3, 1)
		p.card = card
		p.name = UIKit.label(card, "", { Position = UDim2.new(0, 10, 0, 4), Size = UDim2.new(1, -20, 0, 22), Font = T.fontBold, TextSize = 16 })
		p.times = UIKit.label(card, "", { Position = UDim2.new(0, 10, 0, 26), Size = UDim2.new(1, -20, 0, 18), TextSize = 13, TextColor3 = T.subtext })
		p.tyreHolder = UIKit.frame(card, { BackgroundTransparency = 1, Position = UDim2.new(0, 10, 0, 48), Size = UDim2.new(0, 22, 0, 22) })
		p.tyreText = UIKit.label(card, "", { Position = UDim2.new(0, 38, 0, 48), Size = UDim2.new(0, 160, 0, 22), TextSize = 13 })
		local _, fill = UIKit.bar(card, 0, T.good, { Position = UDim2.new(0, 200, 0, 56), Size = UDim2.new(0, 178, 0, 8) })
		p.wearFill = fill
		-- Pit call row: tyre choice + BOX button.
		p.compoundButtons = {}
		for i, compound in ipairs(Config.TyreOrder) do
			local tyre = Config.Tyres[compound]
			p.compoundButtons[compound] = UIKit.button(card, tyre.short, function()
				race.pitChoice[slot] = compound
				RaceUI.refreshTeam()
			end, {
				Position = UDim2.new(0, 10 + (i - 1) * 34, 0, 80),
				Size = UDim2.new(0, 30, 0, 30),
				BackgroundColor3 = T.panel3,
				TextColor3 = tyre.color,
				TextSize = 15,
			})
		end
		p.box = UIKit.button(card, "BOX", function()
			local c = RaceUI.carForSlot(slot)
			if c and (c.pt or c.req) then
				ctx.raceCommand("CancelPit", { slot = slot })
			else
				ctx.raceCommand("Pit", { slot = slot, compound = race.pitChoice[slot] })
			end
		end, { Position = UDim2.new(0, 186, 0, 80), Size = UDim2.new(0, 192, 0, 30), BackgroundColor3 = T.accent })
		p.auto = UIKit.button(card, "Strategist: AUTO", function()
			local c = RaceUI.carForSlot(slot)
			if c then
				ctx.raceCommand("Auto", { slot = slot, on = not c.auto })
			end
		end, { Position = UDim2.new(0, 10, 0, 118), Size = UDim2.new(0, 170, 0, 40), BackgroundColor3 = T.panel3, TextSize = 13 })
		p.take = UIKit.button(card, "TAKE THE WHEEL", function()
			ctx.raceCommand("TakeWheel", { slot = slot })
		end, { Position = UDim2.new(0, 186, 0, 118), Size = UDim2.new(0, 192, 0, 40), BackgroundColor3 = T.purple, TextSize = 15 })
		ui.team[slot] = p
	end
end

local function buildLights()
	local f = UIKit.frame(root, {
		Name = "Lights",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5, 0, 0.32, 0),
		Size = UDim2.new(0, 380, 0, 110),
		BackgroundColor3 = Color3.fromRGB(10, 10, 12),
		Visible = false,
	})
	UIKit.corner(f, 14)
	ui.lights = {}
	for i = 1, 5 do
		local l = UIKit.frame(f, {
			Position = UDim2.new(0, 20 + (i - 1) * 70, 0, 14),
			Size = UDim2.new(0, 60, 0, 60),
			BackgroundColor3 = Color3.fromRGB(50, 10, 10),
		})
		UIKit.corner(l, 30)
		ui.lights[i] = l
	end
	ui.lightsText = UIKit.label(f, "", { Position = UDim2.new(0, 0, 0, 80), Size = UDim2.new(1, 0, 0, 26), TextXAlignment = Enum.TextXAlignment.Center, Font = T.fontBold, TextSize = 20 })
	ui.lightsFrame = f
end

-- Touch buttons for phones and tablets (only shown while driving).
local function buildTouchControls(parent)
	local holder = UIKit.frame(parent, { Name = "Touch", BackgroundTransparency = 1, Size = UDim2.new(1, 0, 1, 0), Visible = UserInputService.TouchEnabled })
	local function hold(text, position, onDown, onUp)
		local b = UIKit.button(holder, text, nil, {
			AnchorPoint = Vector2.new(0.5, 0.5),
			Position = position,
			Size = UDim2.new(0, 90, 0, 90),
			BackgroundColor3 = T.panel3,
			BackgroundTransparency = 0.3,
			TextSize = 26,
		})
		b.InputBegan:Connect(function(input)
			if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
				onDown()
			end
		end)
		b.InputEnded:Connect(function(input)
			if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
				onUp()
			end
		end)
	end
	local touch = DriveController.touch
	hold("◀", UDim2.new(0, 70, 1, -90), function()
		touch.steer = -1
	end, function()
		touch.steer = 0
	end)
	hold("▶", UDim2.new(0, 170, 1, -90), function()
		touch.steer = 1
	end, function()
		touch.steer = 0
	end)
	hold("GAS", UDim2.new(1, -70, 1, -90), function()
		touch.throttle = 1
	end, function()
		touch.throttle = 0
	end)
	hold("BRAKE", UDim2.new(1, -170, 1, -90), function()
		touch.brake = 1
	end, function()
		touch.brake = 0
	end)
	return holder
end

local function buildDriveHud()
	local hud = UIKit.frame(root.Parent, {
		Name = "DriveHud",
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundTransparency = 1,
		Visible = false,
		ZIndex = 5,
	})
	local panel = UIKit.frame(hud, {
		AnchorPoint = Vector2.new(0.5, 1),
		Position = UDim2.new(0.5, 0, 1, -16),
		Size = UDim2.new(0, 520, 0, 110),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.15,
	})
	UIKit.corner(panel, 12)
	ui.driveSpeed = UIKit.label(panel, "0", { Position = UDim2.new(0, 16, 0, 6), Size = UDim2.new(0, 170, 0, 56), Font = T.fontBold, TextSize = 52 })
	UIKit.label(panel, "km/h", { Position = UDim2.new(0, 16, 0, 60), Size = UDim2.new(0, 120, 0, 20), TextSize = 14, TextColor3 = T.subtext })
	ui.driveInfo = UIKit.label(panel, "", { Position = UDim2.new(0, 190, 0, 8), Size = UDim2.new(0, 320, 0, 28), Font = T.fontBold, TextSize = 22 })
	ui.driveSub = UIKit.label(panel, "", { Position = UDim2.new(0, 190, 0, 38), Size = UDim2.new(0, 320, 0, 22), TextSize = 14, TextColor3 = T.subtext })
	ui.driveHelp = UIKit.label(panel, "W/S or triggers: throttle/brake  •  A/D or stick: steer  •  B: braking assist", { Position = UDim2.new(0, 16, 0, 84), Size = UDim2.new(1, -32, 0, 20), TextSize = 12, TextColor3 = T.subtext })
	ui.driveButton = UIKit.button(panel, "Hand back (H)", function()
		RaceUI.driveButtonPressed()
	end, { Position = UDim2.new(0, 380, 0, 44), Size = UDim2.new(0, 130, 0, 34), BackgroundColor3 = T.accent })
	ui.driveWarning = UIKit.label(hud, "", {
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 120),
		Size = UDim2.new(0, 500, 0, 40),
		TextXAlignment = Enum.TextXAlignment.Center,
		Font = T.fontBold,
		TextSize = 28,
		TextColor3 = T.bad,
	})
	ui.qualiPanel = UIKit.frame(hud, {
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 10),
		Size = UDim2.new(0, 520, 0, 100),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.15,
		Visible = false,
	})
	UIKit.corner(ui.qualiPanel, 12)
	ui.qualiTimer = UIKit.label(ui.qualiPanel, "", { Position = UDim2.new(0, 16, 0, 6), Size = UDim2.new(1, -32, 0, 44), Font = T.fontBold, TextSize = 36, TextXAlignment = Enum.TextXAlignment.Center })
	ui.qualiInfo = UIKit.label(ui.qualiPanel, "", { Position = UDim2.new(0, 16, 0, 54), Size = UDim2.new(1, -32, 0, 40), TextSize = 14, TextXAlignment = Enum.TextXAlignment.Center, TextColor3 = T.subtext })
	buildTouchControls(hud)
	ui.driveHud = hud
end

---------------------------------------------------------------------
-- Updating the screen
---------------------------------------------------------------------
function RaceUI.carForSlot(slot)
	local snap = race.snap
	if not snap then
		return nil
	end
	for _, c in ipairs(snap.cars) do
		local info = race.infoByKey[c.k]
		if info and info.isPlayer and info.slot == slot then
			return c, info
		end
	end
	return nil
end

local function setTyre(holder, compound, size)
	if holder:GetAttribute("Compound") == compound then
		return
	end
	holder:SetAttribute("Compound", compound)
	UIKit.clear(holder)
	UIKit.tyreBadge(holder, compound, size)
end

function RaceUI.refreshCameraLabel()
	ui.camButton.Text = "Camera: " .. RaceViewer.getCameraMode()
	ui.focusLabel.Text = RaceViewer.focusName()
end

function RaceUI.refreshBoard()
	local snap = race.snap
	if not snap then
		return
	end
	local ordered = table.clone(snap.cars)
	table.sort(ordered, function(a, b)
		return a.p < b.p
	end)
	local clock = RaceViewer.getClock()
	local focus = RaceViewer.getFocusKey()
	for i, row in ipairs(ui.rows) do
		local c = ordered[i]
		if c then
			local info = race.infoByKey[c.k]
			row.key = c.k
			row.frame.Visible = true
			row.pos.Text = tostring(c.p)
			row.bar.BackgroundColor3 = info.color
			row.code.Text = info.code
			row.code.TextColor3 = info.isPlayer and T.gold or T.text
			local gapText = race.gapMode == "gap" and c.gap or c.int
			if c.p == 1 then
				gapText = c.fin and "🏁" or "Leader"
			end
			row.gap.Text = c.dnf and "OUT" or (gapText or "")
			setTyre(row.tyreHolder, c.cp, 18)
			row.wear.Text = c.dnf and "" or (c.w .. "%")
			local status = ""
			if c.dnf then
				status = "DNF"
			elseif c.fin then
				status = "🏁"
			elseif c.pit and clock < c.pit[4] then
				status = "PIT"
			elseif c.pt then
				status = "IN"
			elseif c.man then
				status = "YOU"
			end
			row.status.Text = status
			row.frame.BackgroundColor3 = (c.k == focus) and T.panel3 or ((i % 2 == 0) and T.panel2 or T.panel)
		else
			row.frame.Visible = false
		end
	end
end

function RaceUI.refreshTeam()
	for slot = 1, 2 do
		local p = ui.team[slot]
		local c, info = RaceUI.carForSlot(slot)
		if not c then
			p.card.Visible = false
		else
			p.card.Visible = true
			local stateText = c.dnf and "  -  RETIRED" or (c.fin and "  -  FINISHED" or "")
			p.name.Text = string.format("P%d  %s%s", c.p, info.name, stateText)
			p.name.TextColor3 = info.color:Lerp(Color3.new(1, 1, 1), 0.4)
			p.times.Text = string.format("Last %s   Best %s   Stops %d", Config.formatLapTime(c.last), Config.formatLapTime(c.best), c.st or 0)
			setTyre(p.tyreHolder, c.cp, 22)
			p.tyreText.Text = string.format("%s  •  %d%% worn", Config.Tyres[c.cp].name, c.w)
			p.wearFill.Size = UDim2.new(math.clamp(1 - c.w / 100, 0, 1), 0, 1, 0)
			p.wearFill.BackgroundColor3 = c.w > 70 and T.bad or (c.w > 45 and T.warn or T.good)
			for compound, b in pairs(p.compoundButtons) do
				local selected = race.pitChoice[slot] == compound
				b.BackgroundColor3 = selected and Config.Tyres[compound].color or T.panel3
				b.TextColor3 = selected and UIKit.contrastText(Config.Tyres[compound].color) or Config.Tyres[compound].color
			end
			local running = not c.dnf and not c.fin
			if c.pt then
				p.box.Text = "Boxing this lap (" .. Config.Tyres[c.pc or race.pitChoice[slot]].short .. ") - cancel"
				p.box.BackgroundColor3 = T.warn
			elseif c.req then
				p.box.Text = "Boxing next lap (" .. Config.Tyres[c.req].short .. ") - cancel"
				p.box.BackgroundColor3 = T.warn
			else
				p.box.Text = "BOX for " .. Config.Tyres[race.pitChoice[slot]].name
				p.box.BackgroundColor3 = T.accent
			end
			UIKit.setEnabled(p.box, running)
			p.auto.Text = c.auto and "Strategist: AUTO\n(click for manual)" or "Strategist: MANUAL\n(click for auto)"
			p.auto.BackgroundColor3 = c.auto and Color3.fromRGB(30, 90, 60) or T.panel3
			local canTake = c.can and running and not race.manualKey
			UIKit.setEnabled(p.take, canTake == true)
			p.take.Text = c.man and "YOU ARE DRIVING" or "TAKE THE WHEEL"
		end
	end
end

local function refreshTop()
	local snap = race.snap
	if not snap then
		return
	end
	ui.lap.Text = snap.chequered and "🏁 FINISH" or string.format("LAP %d / %d", snap.lap, snap.laps)
	local w = snap.weather
	if w then
		ui.weather.Text = string.format("%s  •  Track %d%% wet", w.label, math.floor(w.wetness * 100 + 0.5))
	end
	if snap.fastest then
		local info = race.infoByKey[snap.fastest.key]
		ui.fastest.Text = "Fastest lap: " .. (info and info.code or "") .. "  " .. Config.formatLapTime(snap.fastest.time)
	else
		ui.fastest.Text = ""
	end
	ui.sc.Visible = snap.sc == true
	for i, b in ipairs(ui.speedButtons) do
		b.BackgroundColor3 = (i == snap.speedIndex) and T.accent or T.panel3
		UIKit.setEnabled(b, snap.manualKey == nil)
	end
end

---------------------------------------------------------------------
-- Events from the server
---------------------------------------------------------------------
function RaceUI.startRace(info)
	race.active = true
	race.info = info
	race.infoByKey = {}
	race.snap = nil
	race.manualKey = nil
	race.lightsOutAt = nil
	for _, car in ipairs(info.cars) do
		race.infoByKey[car.k] = car
	end
	-- Default pit tyre choice: the next sensible dry compound.
	race.pitChoice = { "Hard", "Medium" }
	if ui.resultsFrame then
		ui.resultsFrame:Destroy()
		ui.resultsFrame = nil
	end
	UIKit.clear(ui.radioList)
	ui.radioCount = 0
	ctx.setHubVisible(false)
	local built = TrackBuilder.current
	if not built or built.id ~= info.trackId then
		TrackBuilder.build(info.trackId)
	end
	RaceViewer.start(info)
	root.Visible = true
	ui.teamHolder.Visible = true
	ui.lightsFrame.Visible = true
	ui.lightsText.Text = "Get ready..."
	RaceUI.refreshCameraLabel()
end

function RaceUI.onSnapshot(snap)
	if not race.active then
		return
	end
	race.snap = snap
	race.manualKey = snap.manualKey
	RaceViewer.applySnapshot(snap)
	if not snap.started then
		local lit = math.clamp(5 - math.floor(snap.countdown), 0, 5)
		for i, l in ipairs(ui.lights) do
			l.BackgroundColor3 = i <= lit and Color3.fromRGB(235, 20, 20) or Color3.fromRGB(50, 10, 10)
		end
	end
	refreshTop()
	RaceUI.refreshBoard()
	RaceUI.refreshTeam()
	if DriveController.isActive() and race.manualKey then
		local c = RaceUI.carForSlotKey(race.manualKey)
		if c then
			ui.driveInfo.Text = string.format("P%d   •   Lap %d / %d", c.p, math.min(c.ld + 1, snap.laps), snap.laps)
		end
	end
end

function RaceUI.carForSlotKey(key)
	if not race.snap then
		return nil
	end
	for _, c in ipairs(race.snap.cars) do
		if c.k == key then
			return c
		end
	end
	return nil
end

function RaceUI.onLights()
	for _, l in ipairs(ui.lights) do
		l.BackgroundColor3 = Color3.fromRGB(50, 10, 10)
	end
	ui.lightsText.Text = "LIGHTS OUT AND AWAY WE GO!"
	race.lightsOutAt = os.clock()
end

function RaceUI.addRadio(msg)
	if not ui.radioList then
		return
	end
	local color = msg.role == "driver" and T.gold or (msg.role == "strategist" and T.accent2 or T.good)
	ui.radioCount += 1
	UIKit.paragraph(ui.radioList, string.format('<font color="#%s"><b>%s:</b></font> %s', color:ToHex(), msg.speaker, msg.text), {
		TextColor3 = T.text,
		TextSize = 13,
		LayoutOrder = ui.radioCount,
	})
	local labels = {}
	for _, child in ipairs(ui.radioList:GetChildren()) do
		if child:IsA("TextLabel") then
			table.insert(labels, child)
		end
	end
	if #labels > 40 then
		table.sort(labels, function(a, b)
			return a.LayoutOrder < b.LayoutOrder
		end)
		labels[1]:Destroy()
	end
	task.defer(function()
		ui.radioList.CanvasPosition = Vector2.new(0, math.max(0, ui.radioList.AbsoluteCanvasSize.Y - ui.radioList.AbsoluteSize.Y))
	end)
end

function RaceUI.onTakeoverStart(payload)
	local built = TrackBuilder.current
	if not built then
		return
	end
	race.manualKey = payload.key
	local path = built.path
	RaceViewer.setManual(payload.key)
	RaceViewer.setFocus(payload.key)
	local idx = TrackPath.indexAt(path, payload.startDist)
	ui.teamHolder.Visible = false
	ui.driveHud.Visible = true
	ui.qualiPanel.Visible = false
	ui.driveButton.Text = "Hand back (H)"
	ui.driveInfo.Text = payload.driver
	ui.driveSub.Text = "You are driving. Faster laps gain real time!"
	DriveController.start({
		path = path,
		mode = "race",
		startDist = payload.startDist,
		lapsDone = payload.lapsDone,
		gripMul = payload.gripMul,
		speedMul = payload.speedMul,
		startSpeed = path.speed[idx] * payload.speedMul * 0.95,
		otherCars = RaceViewer.otherCars,
		onReport = function(cum)
			ctx.raceCommand("DriveUpdate", { cum = cum })
		end,
		onHud = function(h)
			ui.driveSpeed.Text = tostring(h.kmh)
			ui.driveWarning.Text = h.wrongWay and "WRONG WAY" or (h.onRoad and "" or "OFF TRACK")
			ui.driveSub.Text = "Braking assist: " .. (h.assist and "ON" or "OFF") .. "   •   " .. built.track.name
		end,
		setCarCFrame = function(cf)
			RaceViewer.setCarCFrame(payload.key, cf)
		end,
	})
end

function RaceUI.onTakeoverEnd(_payload)
	if DriveController.isActive() and not quali then
		DriveController.stop()
	end
	race.manualKey = nil
	RaceViewer.setManual(nil)
	ui.driveHud.Visible = false
	ui.driveWarning.Text = ""
	if race.active and not ui.resultsFrame then
		ui.teamHolder.Visible = true
	end
end

function RaceUI.driveButtonPressed()
	if quali then
		RaceUI.finishQualiDrive(nil, 99, true)
	elseif race.manualKey then
		ctx.raceCommand("HandBack", {})
	end
end

local function closeRace()
	race.active = false
	RaceViewer.stop()
	root.Visible = false
	ui.driveHud.Visible = false
	if ui.resultsFrame then
		ui.resultsFrame:Destroy()
		ui.resultsFrame = nil
	end
	ctx.setHubVisible(true)
	ctx.refreshHub()
end

function RaceUI.onFinished(summary)
	if DriveController.isActive() then
		DriveController.stop()
	end
	race.manualKey = nil
	ui.driveHud.Visible = false
	ui.teamHolder.Visible = false
	local frame = UIKit.frame(root.Parent, {
		Name = "Results",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5, 0, 0.5, 0),
		Size = UDim2.new(0, 720, 0.88, 0),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.05,
		ZIndex = 20,
	})
	UIKit.corner(frame, 14)
	UIKit.stroke(frame, T.accent, 2)
	ui.resultsFrame = frame
	local scroll = UIKit.scroll(frame, { Position = UDim2.new(0, 0, 0, 0), Size = UDim2.new(1, 0, 1, -64) })
	UIKit.padding(scroll, 12, 16)
	UIKit.list(scroll, nil, 8)
	UIKit.title(scroll, "🏁 " .. summary.trackName .. " - Race result" .. (summary.wet and " (wet race)" or ""), 22)
	local rows = {}
	for _, r in ipairs(summary.results) do
		table.insert(rows, {
			tostring(r.pos),
			{ text = r.name .. (r.fastestLap and "  ⏱" or ""), color = r.isPlayer and T.gold or nil },
			{ text = r.teamName, color = r.color },
			r.status,
			r.points > 0 and ("+" .. r.points) or "",
		})
	end
	UIKit.table(scroll, {
		{ "POS", 0.07 },
		{ "DRIVER", 0.3 },
		{ "TEAM", 0.26 },
		{ "TIME / STATUS", 0.27 },
		{ "PTS", 0.1, Enum.TextXAlignment.Right },
	}, rows, 21, function(i)
		local r = summary.results[i]
		return r and r.isPlayer and Color3.fromRGB(60, 52, 22) or nil
	end)
	for _, line in ipairs(summary.income) do
		UIKit.label(scroll, line.label .. ":  <b>" .. Config.formatMoney(line.amount) .. "</b>", { TextSize = 14, TextColor3 = line.amount >= 0 and T.good or T.bad })
	end
	UIKit.label(scroll, "Total: <b>" .. Config.formatMoney(summary.net) .. "</b>   •   Budget now " .. Config.formatMoney(summary.budget), { TextSize = 16 })
	UIKit.button(frame, summary.podium and "🏆 To the podium!" or "Back to the paddock", function()
		frame:Destroy()
		ui.resultsFrame = nil
		if summary.podium then
			root.Visible = false
			race.active = false -- stop the race camera so the podium camera can take over
			PodiumScene.play(summary.podium, summary.trackName, function()
				closeRace()
			end)
		else
			closeRace()
		end
	end, {
		AnchorPoint = Vector2.new(0.5, 1),
		Position = UDim2.new(0.5, 0, 1, -12),
		Size = UDim2.new(0, 260, 0, 42),
		BackgroundColor3 = T.good,
		ZIndex = 21,
	})
end

---------------------------------------------------------------------
-- Q3 flying lap
---------------------------------------------------------------------
function RaceUI.startQualiDrive(drive)
	local built = TrackBuilder.current
	if not built or built.id ~= drive.trackId then
		TrackBuilder.build(drive.trackId)
		built = TrackBuilder.current
	end
	local path = built.path
	ctx.setHubVisible(false)
	local color = Config.teamColor("PLAYER", ctx.state and ctx.state.colorIndex or 1)
	local model = RaceViewer.buildCar(color, "YOU", true)
	model.Parent = workspace
	quali = { drive = drive, model = model, started = os.clock(), done = false }
	ui.driveHud.Visible = true
	ui.qualiPanel.Visible = true
	ui.driveButton.Text = "Abort lap"
	ui.driveInfo.Text = "Q3 - " .. drive.driver
	ui.qualiTimer.Text = "Out lap"
	ui.qualiInfo.Text = string.format("Banker lap %s   •   Provisional pole %s\nCross the line to start your flying lap.", Config.formatLapTime(drive.banker), Config.formatLapTime(drive.pole))
	local limitTime = TrackPath.profileTime(path, drive.gripMul, drive.speedMul) * 3 + 60
	DriveController.start({
		path = path,
		mode = "quali",
		startDist = path.length - 280,
		gripMul = drive.gripMul,
		speedMul = drive.speedMul,
		startSpeed = 55,
		setCarCFrame = function(cf)
			model.PrimaryPart.CFrame = cf
		end,
		onHud = function(h)
			ui.driveSpeed.Text = tostring(h.kmh)
			ui.driveWarning.Text = h.wrongWay and "WRONG WAY" or (h.onRoad and "" or "TRACK LIMITS")
			ui.driveSub.Text = "Track limits: " .. h.cuts .. " / 3   •   Braking assist: " .. (h.assist and "ON" or "OFF")
			if h.timing then
				ui.qualiTimer.Text = Config.formatLapTime(h.lapTime * drive.timeScale)
				ui.qualiTimer.TextColor3 = h.cuts >= 3 and T.bad or T.text
			end
			if os.clock() - quali.started > limitTime then
				RaceUI.finishQualiDrive(nil, 99, true)
			end
		end,
		onLapDone = function(seconds, cuts)
			RaceUI.finishQualiDrive(seconds, cuts, false)
		end,
	})
end

function RaceUI.finishQualiDrive(seconds, cuts, aborted)
	if not quali or quali.done then
		return
	end
	quali.done = true
	DriveController.stop()
	local current = quali
	local drive = current.drive
	if not aborted then
		ui.qualiTimer.Text = Config.formatLapTime(seconds * drive.timeScale)
		ui.qualiInfo.Text = cuts >= 3 and "Lap deleted: too many track limits warnings." or "Lap complete!"
	end
	-- Finish in a separate thread so the frame update that called us isn't held up.
	task.spawn(function()
		task.wait(aborted and 0.2 or 2)
		current.model:Destroy()
		quali = nil
		ui.driveHud.Visible = false
		ui.qualiPanel.Visible = false
		ui.driveWarning.Text = ""
		ctx.setHubVisible(true)
		ctx.request("Q3DriveResult", { time = seconds, cuts = cuts, aborted = aborted })
	end)
end

---------------------------------------------------------------------
-- Every frame
---------------------------------------------------------------------
function RaceUI.update(dt)
	if race.active then
		RaceViewer.updateCars(dt)
		if not DriveController.isActive() then
			RaceViewer.updateCamera(dt)
		end
		RaceViewer.updateWeather()
		if race.lightsOutAt and os.clock() - race.lightsOutAt > 2 then
			race.lightsOutAt = nil
			ui.lightsFrame.Visible = false
		end
	end
end

function RaceUI.isBusy()
	return race.active or quali ~= nil or PodiumScene.isPlaying()
end

function RaceUI.init(context)
	ctx = context
	root = UIKit.frame(ctx.gui, {
		Name = "Race",
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundTransparency = 1,
		Visible = false,
	})
	buildLeaderboard()
	buildTopBar()
	buildRadio()
	buildTeamPanels()
	buildLights()
	buildDriveHud()
	UserInputService.InputBegan:Connect(function(input, processed)
		if processed then
			return
		end
		if input.KeyCode == Enum.KeyCode.H or input.KeyCode == Enum.KeyCode.ButtonX then
			if race.manualKey and not quali then
				ctx.raceCommand("HandBack", {})
			end
		end
	end)
end

return RaceUI
