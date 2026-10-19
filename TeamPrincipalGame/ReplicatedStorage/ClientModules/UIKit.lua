--[[
	UIKit (ModuleScript)
	Location: ReplicatedStorage > ClientModules > UIKit

	Small helpers for building the interface in code: panels, labels, buttons,
	lists, progress bars, tyre badges, pop-up windows and toast messages.
	Every screen in the game is made with these, so the style stays consistent.
]]

local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))

local UIKit = {}

UIKit.Theme = {
	bg = Color3.fromRGB(14, 16, 24),
	panel = Color3.fromRGB(24, 27, 38),
	panel2 = Color3.fromRGB(33, 37, 52),
	panel3 = Color3.fromRGB(44, 49, 68),
	accent = Color3.fromRGB(225, 30, 60),
	accent2 = Color3.fromRGB(0, 170, 255),
	text = Color3.fromRGB(240, 242, 248),
	subtext = Color3.fromRGB(160, 166, 186),
	good = Color3.fromRGB(60, 205, 110),
	bad = Color3.fromRGB(235, 70, 70),
	warn = Color3.fromRGB(245, 190, 40),
	gold = Color3.fromRGB(255, 205, 60),
	purple = Color3.fromRGB(180, 90, 255),
	font = Enum.Font.Gotham,
	fontMedium = Enum.Font.GothamMedium,
	fontBold = Enum.Font.GothamBold,
}
local T = UIKit.Theme

-- Creates an instance, sets properties and parents it last (faster).
function UIKit.make(className, props, parent)
	local inst = Instance.new(className)
	if props then
		for k, v in pairs(props) do
			inst[k] = v
		end
	end
	if parent then
		inst.Parent = parent
	end
	return inst
end
local make = UIKit.make

function UIKit.corner(inst, radius)
	return make("UICorner", { CornerRadius = UDim.new(0, radius or 8) }, inst)
end

function UIKit.stroke(inst, color, thickness, transparency)
	return make("UIStroke", {
		Color = color or T.panel3,
		Thickness = thickness or 1,
		Transparency = transparency or 0,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
	}, inst)
end

function UIKit.padding(inst, all, horizontal)
	local v = UDim.new(0, all or 8)
	local h = UDim.new(0, horizontal or all or 8)
	return make("UIPadding", { PaddingTop = v, PaddingBottom = v, PaddingLeft = h, PaddingRight = h }, inst)
end

function UIKit.list(inst, direction, gap, hAlign, vAlign)
	return make("UIListLayout", {
		FillDirection = direction or Enum.FillDirection.Vertical,
		Padding = UDim.new(0, gap or 6),
		SortOrder = Enum.SortOrder.LayoutOrder,
		HorizontalAlignment = hAlign or Enum.HorizontalAlignment.Left,
		VerticalAlignment = vAlign or Enum.VerticalAlignment.Top,
	}, inst)
end

function UIKit.frame(parent, props)
	local p = {
		BackgroundColor3 = T.panel,
		BorderSizePixel = 0,
		Size = UDim2.new(1, 0, 0, 40),
	}
	if props then
		for k, v in pairs(props) do
			p[k] = v
		end
	end
	return make("Frame", p, parent)
end

-- A rounded panel that grows to fit its contents vertically.
function UIKit.card(parent, props)
	local f = UIKit.frame(parent, {
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundColor3 = T.panel,
	})
	if props then
		for k, v in pairs(props) do
			f[k] = v
		end
	end
	UIKit.corner(f, 10)
	UIKit.padding(f, 10, 12)
	UIKit.list(f, nil, 6)
	return f
end

function UIKit.label(parent, text, props)
	local p = {
		BackgroundTransparency = 1,
		Text = text or "",
		TextColor3 = T.text,
		Font = T.font,
		TextSize = 16,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextYAlignment = Enum.TextYAlignment.Center,
		Size = UDim2.new(1, 0, 0, 22),
		TextWrapped = true,
		RichText = true,
	}
	if props then
		for k, v in pairs(props) do
			p[k] = v
		end
	end
	return make("TextLabel", p, parent)
end

-- A label that grows to fit long text.
function UIKit.paragraph(parent, text, props)
	local l = UIKit.label(parent, text, {
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		TextColor3 = T.subtext,
		TextSize = 15,
	})
	if props then
		for k, v in pairs(props) do
			l[k] = v
		end
	end
	return l
end

function UIKit.title(parent, text, size)
	return UIKit.label(parent, text, { Font = T.fontBold, TextSize = size or 22, Size = UDim2.new(1, 0, 0, (size or 22) + 8) })
end

-- Button with hover effect. onClick runs when clicked, tapped or pressed on a gamepad.
function UIKit.button(parent, text, onClick, props)
	local color = (props and props.BackgroundColor3) or T.accent
	local b = make("TextButton", {
		Text = text,
		Font = T.fontBold,
		TextSize = 15,
		TextColor3 = Color3.new(1, 1, 1),
		BackgroundColor3 = color,
		AutoButtonColor = false,
		BorderSizePixel = 0,
		Size = UDim2.new(0, 160, 0, 34),
		TextWrapped = true,
	}, parent)
	if props then
		for k, v in pairs(props) do
			b[k] = v
		end
	end
	UIKit.corner(b, 8)
	local base = b.BackgroundColor3
	b.MouseEnter:Connect(function()
		if b.Active then
			b.BackgroundColor3 = base:Lerp(Color3.new(1, 1, 1), 0.15)
		end
	end)
	b.MouseLeave:Connect(function()
		b.BackgroundColor3 = base
	end)
	if onClick then
		b.Activated:Connect(function()
			if b.Active then
				onClick(b)
			end
		end)
	end
	return b
end

-- Greys a button out (or back in).
function UIKit.setEnabled(button, enabled)
	button.Active = enabled
	button.AutoButtonColor = false
	button.TextTransparency = enabled and 0 or 0.5
	button.BackgroundTransparency = enabled and 0 or 0.5
end

function UIKit.scroll(parent, props)
	local s = make("ScrollingFrame", {
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		Size = UDim2.new(1, 0, 1, 0),
		CanvasSize = UDim2.new(0, 0, 0, 0),
		AutomaticCanvasSize = Enum.AutomaticSize.Y,
		ScrollingDirection = Enum.ScrollingDirection.Y,
		ScrollBarThickness = 6,
		ScrollBarImageColor3 = T.panel3,
	}, parent)
	if props then
		for k, v in pairs(props) do
			s[k] = v
		end
	end
	return s
end

-- A horizontal row that holds buttons or labels side by side.
function UIKit.row(parent, height, gap)
	local r = UIKit.frame(parent, { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, height or 34) })
	UIKit.list(r, Enum.FillDirection.Horizontal, gap or 8, nil, Enum.VerticalAlignment.Center)
	return r
end

-- Removes every GUI child (keeps layouts, padding and corners).
function UIKit.clear(frame)
	for _, child in ipairs(frame:GetChildren()) do
		if child:IsA("GuiObject") then
			child:Destroy()
		end
	end
end

-- Progress bar (fraction 0-1).
function UIKit.bar(parent, fraction, color, props)
	local back = UIKit.frame(parent, { BackgroundColor3 = T.panel3, Size = UDim2.new(1, 0, 0, 8) })
	if props then
		for k, v in pairs(props) do
			back[k] = v
		end
	end
	UIKit.corner(back, 4)
	local fill = UIKit.frame(back, {
		BackgroundColor3 = color or T.accent2,
		Size = UDim2.new(math.clamp(fraction or 0, 0, 1), 0, 1, 0),
		Name = "Fill",
	})
	UIKit.corner(fill, 4)
	return back, fill
end

-- A labelled stat bar: "Pace  ███████░░ 87"
function UIKit.statBar(parent, name, value, color)
	local r = UIKit.frame(parent, { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 18) })
	UIKit.label(r, name, { Size = UDim2.new(0, 110, 1, 0), TextSize = 13, TextColor3 = T.subtext })
	UIKit.bar(r, value / 100, color, { Position = UDim2.new(0, 112, 0.5, -4), Size = UDim2.new(1, -150, 0, 8) })
	UIKit.label(r, tostring(math.floor(value + 0.5)), {
		Position = UDim2.new(1, -34, 0, 0),
		Size = UDim2.new(0, 34, 1, 0),
		TextSize = 13,
		Font = T.fontBold,
		TextXAlignment = Enum.TextXAlignment.Right,
	})
	return r
end

-- Coloured circle with the tyre letter (S, M, H, I, W).
function UIKit.tyreBadge(parent, compound, size)
	local tyre = Config.Tyres[compound] or Config.Tyres.Medium
	size = size or 20
	local b = UIKit.frame(parent, {
		Size = UDim2.new(0, size, 0, size),
		BackgroundColor3 = Color3.fromRGB(20, 20, 20),
	})
	UIKit.corner(b, size)
	UIKit.stroke(b, tyre.color, math.max(2, size / 8))
	UIKit.label(b, tyre.short, {
		Size = UDim2.new(1, 0, 1, 0),
		TextXAlignment = Enum.TextXAlignment.Center,
		Font = T.fontBold,
		TextSize = math.floor(size * 0.6),
		TextColor3 = tyre.color,
	})
	return b
end

-- Simple table. columns = { {title, width (0-1 of row), align} }, rows = list of cell lists.
-- A cell can be a string or { text = ..., color = ... }. rowColor(i) can tint a row.
function UIKit.table(parent, columns, rows, rowHeight, rowColor)
	rowHeight = rowHeight or 24
	local holder = UIKit.frame(parent, {
		BackgroundTransparency = 1,
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
	})
	UIKit.list(holder, nil, 2)
	local function makeRow(cells, isHeader, index)
		local r = UIKit.frame(holder, {
			Size = UDim2.new(1, 0, 0, rowHeight),
			BackgroundColor3 = isHeader and T.panel3 or ((rowColor and rowColor(index)) or (index % 2 == 0 and T.panel2 or T.panel)),
			LayoutOrder = isHeader and 0 or index,
		})
		UIKit.corner(r, 4)
		local x = 0
		for c, col in ipairs(columns) do
			local cell = cells[c]
			local text, color = cell, nil
			if type(cell) == "table" then
				text, color = cell.text, cell.color
			end
			UIKit.label(r, tostring(text or ""), {
				Position = UDim2.new(x, 6, 0, 0),
				Size = UDim2.new(col[2], -8, 1, 0),
				TextSize = isHeader and 12 or 14,
				Font = isHeader and T.fontBold or T.font,
				TextColor3 = color or (isHeader and T.subtext or T.text),
				TextXAlignment = col[3] or Enum.TextXAlignment.Left,
				TextTruncate = Enum.TextTruncate.AtEnd,
				TextWrapped = false,
			})
			x += col[2]
		end
	end
	local header = {}
	for i, col in ipairs(columns) do
		header[i] = col[1]
	end
	makeRow(header, true, 0)
	for i, cells in ipairs(rows) do
		makeRow(cells, false, i)
	end
	return holder
end

---------------------------------------------------------------------
-- Toasts and pop-up windows
---------------------------------------------------------------------
local toastHolder = nil

function UIKit.initToasts(gui)
	toastHolder = UIKit.frame(gui, {
		Name = "Toasts",
		BackgroundTransparency = 1,
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 70),
		Size = UDim2.new(0, 520, 0, 300),
		ZIndex = 50,
	})
	UIKit.list(toastHolder, nil, 6, Enum.HorizontalAlignment.Center)
end

-- kind: "good", "bad", "gold" or nil
function UIKit.toast(text, kind, seconds)
	if not toastHolder or not text or text == "" then
		return
	end
	local color = T.panel2
	if kind == "good" then
		color = Color3.fromRGB(30, 110, 60)
	elseif kind == "bad" then
		color = Color3.fromRGB(130, 35, 40)
	elseif kind == "gold" then
		color = Color3.fromRGB(150, 110, 10)
	end
	local f = UIKit.frame(toastHolder, {
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundColor3 = color,
		ZIndex = 50,
	})
	UIKit.corner(f, 8)
	UIKit.padding(f, 8, 12)
	UIKit.label(f, text, {
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		TextXAlignment = Enum.TextXAlignment.Center,
		Font = T.fontMedium,
		ZIndex = 51,
	})
	task.delay(seconds or 3.5, function()
		if f.Parent then
			local tween = TweenService:Create(f, TweenInfo.new(0.4), { BackgroundTransparency = 1 })
			tween:Play()
			for _, d in ipairs(f:GetDescendants()) do
				if d:IsA("TextLabel") then
					TweenService:Create(d, TweenInfo.new(0.4), { TextTransparency = 1 }):Play()
				end
			end
			tween.Completed:Wait()
			f:Destroy()
		end
	end)
end

-- Centered pop-up window. build(content) fills it. Returns the window and a close function.
function UIKit.modal(gui, titleText, build, width)
	local shade = UIKit.frame(gui, {
		Name = "Modal",
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundColor3 = Color3.new(0, 0, 0),
		BackgroundTransparency = 0.35,
		ZIndex = 40,
		Active = true,
	})
	local window = UIKit.frame(shade, {
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5, 0, 0.5, 0),
		Size = UDim2.new(0, width or 560, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundColor3 = T.panel,
		ZIndex = 41,
	})
	UIKit.corner(window, 12)
	UIKit.stroke(window, T.accent, 2)
	UIKit.padding(window, 16, 18)
	UIKit.list(window, nil, 10)
	make("UISizeConstraint", { MaxSize = Vector2.new(width or 560, 640) }, window)
	UIKit.title(window, titleText, 24)
	local content = UIKit.frame(window, {
		BackgroundTransparency = 1,
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
	})
	UIKit.list(content, nil, 8)
	local function close()
		shade:Destroy()
	end
	build(content, close)
	-- Every descendant draws above the shade.
	for _, d in ipairs(window:GetDescendants()) do
		if d:IsA("GuiObject") then
			d.ZIndex = 42
		end
	end
	return window, close
end

function UIKit.money(v)
	return Config.formatMoney(v)
end

-- Text colour that reads well on top of a team colour.
function UIKit.contrastText(color)
	local lum = 0.299 * color.R + 0.587 * color.G + 0.114 * color.B
	return lum > 0.6 and Color3.new(0, 0, 0) or Color3.new(1, 1, 1)
end

return UIKit
