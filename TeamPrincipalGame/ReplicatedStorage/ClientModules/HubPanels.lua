--[[
	HubPanels (ModuleScript)
	Location: ReplicatedStorage > ClientModules > HubPanels

	The information tabs of the main menu: Standings, Calendar, Objectives and
	Records, plus the end-of-season window and the "record broken" celebration.
]]

local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))

local ClientModules = script.Parent
local UIKit = require(ClientModules:WaitForChild("UIKit"))

local T = UIKit.Theme
local HubPanels = {}

local ctx = nil

function HubPanels.init(context)
	ctx = context
end

local function duration(seconds)
	seconds = math.max(0, math.floor(seconds))
	local d = seconds // 86400
	local h = (seconds % 86400) // 3600
	local m = (seconds % 3600) // 60
	if d > 0 then
		return string.format("%dd %dh", d, h)
	end
	return string.format("%dh %dm", h, m)
end

---------------------------------------------------------------------
-- Standings
---------------------------------------------------------------------
function HubPanels.renderStandings(parent, s)
	local dCard = UIKit.card(parent, { LayoutOrder = 1 })
	UIKit.title(dCard, "Drivers' championship - Season " .. s.season, 22)
	local drivers = s.standings.drivers
	if #drivers == 0 then
		UIKit.paragraph(dCard, "No races yet this season.")
	else
		local rows = {}
		for i, d in ipairs(drivers) do
			table.insert(rows, {
				tostring(i),
				{ text = d.name, color = d.isPlayer and T.gold or nil },
				{ text = d.teamName or "", color = d.color },
				tostring(d.wins),
				tostring(d.podiums),
				tostring(d.points),
			})
		end
		UIKit.table(dCard, {
			{ "POS", 0.08 },
			{ "DRIVER", 0.32 },
			{ "TEAM", 0.3 },
			{ "WINS", 0.1, Enum.TextXAlignment.Right },
			{ "PODIUMS", 0.1, Enum.TextXAlignment.Right },
			{ "PTS", 0.1, Enum.TextXAlignment.Right },
		}, rows, 22, function(i)
			return drivers[i] and drivers[i].isPlayer and Color3.fromRGB(60, 52, 22) or nil
		end)
	end

	local tCard = UIKit.card(parent, { LayoutOrder = 2 })
	UIKit.title(tCard, "Constructors' championship", 22)
	local teams = s.standings.teams
	if #teams == 0 then
		UIKit.paragraph(tCard, "No races yet this season.")
	else
		local rows = {}
		for i, t in ipairs(teams) do
			table.insert(rows, {
				tostring(i),
				{ text = t.name, color = t.isPlayer and T.gold or t.color },
				tostring(t.wins),
				tostring(t.points),
			})
		end
		UIKit.table(tCard, {
			{ "POS", 0.1 },
			{ "TEAM", 0.6 },
			{ "WINS", 0.15, Enum.TextXAlignment.Right },
			{ "PTS", 0.15, Enum.TextXAlignment.Right },
		}, rows, 24, function(i)
			return teams[i] and teams[i].isPlayer and Color3.fromRGB(60, 52, 22) or nil
		end)
	end

	if #s.history > 0 then
		local hCard = UIKit.card(parent, { LayoutOrder = 3 })
		UIKit.title(hCard, "Past seasons", 20)
		for i = #s.history, 1, -1 do
			local h = s.history[i]
			UIKit.label(hCard, string.format("Season %d: champion <b>%s</b> (%s)  •  constructors <b>%s</b>  •  you finished <b>P%d</b> with %d pts", h.season, h.driverChampion, h.driverChampionTeam, h.constructorsChampion, h.yourPosition, h.yourPoints), { TextSize = 14 })
		end
	end
end

---------------------------------------------------------------------
-- Calendar
---------------------------------------------------------------------
function HubPanels.renderCalendar(parent, s)
	local card = UIKit.card(parent, { LayoutOrder = 1 })
	UIKit.title(card, "Season " .. s.season .. " calendar", 22)
	for _, c in ipairs(s.calendar) do
		local r = UIKit.frame(card, {
			Size = UDim2.new(1, 0, 0, 44),
			BackgroundColor3 = c.current and Color3.fromRGB(70, 30, 40) or T.panel2,
		})
		UIKit.corner(r, 6)
		UIKit.label(r, tostring(c.round), {
			Position = UDim2.new(0, 10, 0, 0),
			Size = UDim2.new(0, 30, 1, 0),
			Font = T.fontBold,
			TextSize = 18,
		})
		UIKit.label(r, "<b>" .. c.name .. "</b>", {
			Position = UDim2.new(0, 46, 0, 2),
			Size = UDim2.new(0.45, -46, 0, 20),
			TextSize = 15,
		})
		UIKit.label(r, c.description, {
			Position = UDim2.new(0, 46, 0, 22),
			Size = UDim2.new(0.45, -46, 0, 18),
			TextSize = 12,
			TextColor3 = T.subtext,
			TextTruncate = Enum.TextTruncate.AtEnd,
			TextWrapped = false,
		})
		local status
		if c.result then
			local best = c.result.yourBest > 0 and ("your best P" .. c.result.yourBest) or ""
			status = string.format("Winner: %s (%s)   %s", c.result.winner, c.result.winnerTeam, best)
		elseif c.current then
			status = "<b>THIS WEEKEND</b>"
		else
			status = "Upcoming"
		end
		UIKit.label(r, status, {
			Position = UDim2.new(0.45, 10, 0, 0),
			Size = UDim2.new(0.55, -20, 1, 0),
			TextSize = 14,
			TextColor3 = c.current and T.gold or T.subtext,
		})
	end
end

---------------------------------------------------------------------
-- Objectives
---------------------------------------------------------------------
local function objectiveList(parent, list, which, order)
	for i, o in ipairs(list) do
		local card = UIKit.card(parent, { LayoutOrder = order + i })
		local r = UIKit.frame(card, { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 24) })
		UIKit.label(r, (o.done and "✅ " or "🎯 ") .. o.text, { Size = UDim2.new(1, -200, 1, 0), Font = T.fontMedium })
		UIKit.label(r, "Reward: " .. o.rewardText, {
			Position = UDim2.new(1, -200, 0, 0),
			Size = UDim2.new(0, 200, 1, 0),
			TextColor3 = T.gold,
			TextSize = 14,
			TextXAlignment = Enum.TextXAlignment.Right,
		})
		UIKit.bar(card, o.progress / math.max(1, o.target), o.done and T.good or T.accent2)
		local footer = UIKit.row(card, 30)
		UIKit.label(footer, string.format("%s / %s", tostring(o.progress), tostring(o.target)), { Size = UDim2.new(0, 120, 1, 0), TextSize = 14, TextColor3 = T.subtext })
		if o.claimed then
			UIKit.label(footer, "Reward claimed ✓", { Size = UDim2.new(0, 200, 1, 0), TextColor3 = T.good, TextSize = 14 })
		elseif o.done then
			UIKit.button(footer, "Claim reward", function()
				ctx.request("ClaimObjective", { which = which, id = o.id })
			end, { Size = UDim2.new(0, 160, 0, 28), BackgroundColor3 = T.gold, TextColor3 = Color3.new(0, 0, 0) })
		end
	end
end

function HubPanels.renderObjectives(parent, s)
	local o = s.objectives
	local d = UIKit.card(parent, { LayoutOrder = 1 })
	UIKit.title(d, "Daily objectives", 22)
	UIKit.label(d, "New ones in " .. duration(o.dailyResetIn) .. " (resets at midnight UTC)", { TextColor3 = T.subtext, TextSize = 14 })
	objectiveList(parent, o.daily, "daily", 10)
	local w = UIKit.card(parent, { LayoutOrder = 50 })
	UIKit.title(w, "Weekly objectives", 22)
	UIKit.label(w, "New ones in " .. duration(o.weeklyResetIn) .. " (resets Monday 00:00 UTC)", { TextColor3 = T.subtext, TextSize = 14 })
	objectiveList(parent, o.weekly, "weekly", 60)
end

---------------------------------------------------------------------
-- Records
---------------------------------------------------------------------
function HubPanels.renderRecords(parent, s)
	local rec = s.records
	local sum = rec.summary
	local head = UIKit.card(parent, { LayoutOrder = 1 })
	UIKit.title(head, "Your career", 22)
	UIKit.label(head, string.format("Races <b>%d</b>   •   Wins <b>%d</b>   •   Podiums <b>%d</b>   •   Poles <b>%d</b>   •   Points <b>%d</b>   •   Constructors' titles <b>%d</b>", sum.races, sum.wins, sum.podiums, sum.poles, sum.points, sum.constructorsTitles))
	UIKit.paragraph(head, "Beat the real Formula 1 records below. Driver records count the best driver who raced for your team.")
	for i, r in ipairs(rec.records) do
		local card = UIKit.card(parent, { LayoutOrder = 1 + i })
		if r.broken then
			card.BackgroundColor3 = Color3.fromRGB(60, 50, 15)
		end
		local top = UIKit.frame(card, { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 24) })
		UIKit.label(top, (r.broken and "🏆 " or "") .. "<b>" .. r.label .. "</b>", { Size = UDim2.new(1, -220, 1, 0) })
		UIKit.label(top, "You: <b>" .. r.valueText .. "</b>  /  Record: <b>" .. r.targetText .. "</b>", {
			Position = UDim2.new(1, -220, 0, 0),
			Size = UDim2.new(0, 220, 1, 0),
			TextXAlignment = Enum.TextXAlignment.Right,
			TextSize = 14,
			TextColor3 = r.broken and T.gold or T.text,
		})
		UIKit.label(card, "Record holder: " .. r.holder .. (r.broken and "   -   BEATEN BY YOUR TEAM!" or ""), { TextSize = 13, TextColor3 = r.broken and T.gold or T.subtext })
		UIKit.bar(card, r.progress, r.broken and T.gold or T.accent2)
	end
end

---------------------------------------------------------------------
-- Windows and celebrations
---------------------------------------------------------------------
function HubPanels.showSeasonSummary(summary)
	UIKit.modal(ctx.gui, "Season " .. summary.season .. " complete!", function(body, close)
		if summary.wonDrivers then
			UIKit.label(body, "🏆 Your driver is WORLD CHAMPION!", { TextColor3 = T.gold, Font = T.fontBold, TextSize = 20 })
		end
		if summary.wonConstructors then
			UIKit.label(body, "🏆 You won the CONSTRUCTORS' CHAMPIONSHIP!", { TextColor3 = T.gold, Font = T.fontBold, TextSize = 20 })
		end
		UIKit.label(body, "Drivers' champion: <b>" .. summary.driverChampion .. "</b> (" .. summary.driverChampionTeam .. ")")
		UIKit.label(body, "Constructors' champion: <b>" .. summary.constructorsChampion .. "</b>")
		UIKit.label(body, string.format("Your team finished <b>P%d</b> with <b>%d</b> points.", summary.yourPosition, summary.yourPoints))
		UIKit.label(body, "End-of-season prize money: <b>" .. Config.formatMoney(summary.prize) .. "</b>", { TextColor3 = T.gold })
		UIKit.paragraph(body, "New regulations pull every car back a little. Drivers have aged a year: young ones improve, older ones slow down. The market has been refreshed.")
		UIKit.button(body, "Start the new season", close, { Size = UDim2.new(0, 240, 0, 40), BackgroundColor3 = T.good })
	end, 560)
	if summary.wonDrivers or summary.wonConstructors then
		HubPanels.confetti(ctx.gui, 120)
	end
end

-- Falling paper confetti over the whole screen.
function HubPanels.confetti(gui, count)
	local colors = { T.gold, T.accent, T.accent2, T.good, T.purple, Color3.new(1, 1, 1) }
	local holder = UIKit.frame(gui, { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 60, Name = "Confetti" })
	local rng = Random.new()
	for _ = 1, count or 80 do
		local piece = UIKit.frame(holder, {
			Size = UDim2.new(0, rng:NextInteger(6, 12), 0, rng:NextInteger(10, 18)),
			Position = UDim2.new(rng:NextNumber(), 0, -0.05, -rng:NextInteger(0, 300)),
			BackgroundColor3 = colors[rng:NextInteger(1, #colors)],
			Rotation = rng:NextInteger(0, 360),
			ZIndex = 60,
		})
		local fall = rng:NextNumber(2.5, 4.5)
		TweenService:Create(piece, TweenInfo.new(fall, Enum.EasingStyle.Sine, Enum.EasingDirection.In), {
			Position = UDim2.new(piece.Position.X.Scale + rng:NextNumber(-0.1, 0.1), 0, 1.05, 0),
			Rotation = piece.Rotation + rng:NextInteger(180, 720),
		}):Play()
	end
	task.delay(5, function()
		holder:Destroy()
	end)
end

-- Big banner when a historical record falls.
function HubPanels.celebrateRecord(record)
	local gui = ctx.gui
	local banner = UIKit.frame(gui, {
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5, 0, 0.4, 0),
		Size = UDim2.new(0, 640, 0, 190),
		BackgroundColor3 = Color3.fromRGB(30, 24, 8),
		ZIndex = 70,
	})
	UIKit.corner(banner, 14)
	UIKit.stroke(banner, T.gold, 3)
	UIKit.label(banner, "🏆 RECORD BROKEN! 🏆", {
		Position = UDim2.new(0, 0, 0, 14),
		Size = UDim2.new(1, 0, 0, 48),
		TextXAlignment = Enum.TextXAlignment.Center,
		Font = T.fontBold,
		TextSize = 40,
		TextColor3 = T.gold,
		ZIndex = 71,
	})
	UIKit.label(banner, record.label, {
		Position = UDim2.new(0, 20, 0, 70),
		Size = UDim2.new(1, -40, 0, 30),
		TextXAlignment = Enum.TextXAlignment.Center,
		Font = T.fontBold,
		TextSize = 22,
		ZIndex = 71,
	})
	local valueText = type(record.value) == "number" and (record.value % 1 ~= 0 and string.format("%.2f", record.value) or tostring(record.value)) or tostring(record.value)
	UIKit.label(banner, "Your team: " .. valueText .. "   -   Previous record: " .. tostring(record.target) .. " (" .. record.holder .. ")", {
		Position = UDim2.new(0, 20, 0, 110),
		Size = UDim2.new(1, -40, 0, 50),
		TextXAlignment = Enum.TextXAlignment.Center,
		TextSize = 16,
		TextColor3 = T.subtext,
		ZIndex = 71,
	})
	HubPanels.confetti(gui, 150)
	banner.Size = UDim2.new(0, 0, 0, 0)
	TweenService:Create(banner, TweenInfo.new(0.5, Enum.EasingStyle.Back), { Size = UDim2.new(0, 640, 0, 190) }):Play()
	task.delay(6, function()
		banner:Destroy()
	end)
end

return HubPanels
