--[[
	HubUI (ModuleScript)
	Location: ReplicatedStorage > ClientModules > HubUI

	The main menu between sessions. It has a top bar (team, budget, upgrade
	points, saving) and tabs:
	  Weekend    - run practice, qualifying and start the race; see results
	  Team       - your drivers, reserve, pit crew and strategists
	  Market     - hire new people
	  Car        - spend money or upgrade points on car development
	  Standings, Calendar, Objectives, Records - drawn by HubPanels
	Every button sends a request to the server, which checks it and replies
	with the new game state.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))

local ClientModules = script.Parent
local UIKit = require(ClientModules:WaitForChild("UIKit"))
local HubPanels = require(ClientModules:WaitForChild("HubPanels"))

local T = UIKit.Theme
local HubUI = {}

local ctx = nil
local root, content, topBar, navHolder
local currentTab = "Weekend"
local navButtons = {}
local chosenTyres = { "Medium", "Medium" }
local tyreChoiceRound = -1
local TABS = { "Weekend", "Team", "Market", "Car", "Standings", "Calendar", "Objectives", "Records" }

---------------------------------------------------------------------
-- Helpers
---------------------------------------------------------------------
local function money(v)
	return Config.formatMoney(v)
end

local function teamColor()
	local s = ctx.state
	return Config.teamColor("PLAYER", s and s.colorIndex or 1)
end

local function difficultyText(v)
	if v < 0.35 then
		return "Easy"
	elseif v < 0.6 then
		return "Medium"
	elseif v < 0.8 then
		return "Hard"
	end
	return "Very hard"
end

local function confirm(titleText, message, onYes)
	UIKit.modal(ctx.gui, titleText, function(body, close)
		UIKit.paragraph(body, message, { TextColor3 = T.text })
		local r = UIKit.row(body, 38)
		UIKit.button(r, "Confirm", function()
			close()
			onYes()
		end, { BackgroundColor3 = T.good })
		UIKit.button(r, "Cancel", close, { BackgroundColor3 = T.panel3 })
	end, 460)
end

local function act(action, args)
	return ctx.request(action, args)
end

-- A small results table for practice / qualifying / grid rows.
local function timingTable(parent, rows, cutoff)
	local list = {}
	local best = rows[1] and rows[1].time
	for i, r in ipairs(rows) do
		local gap = ""
		if i > 1 and r.time and best then
			gap = string.format("+%.3f", r.time - best)
		end
		table.insert(list, {
			tostring(r.gridPos or r.pos or i),
			{ text = r.name .. (r.driven and "  (you drove)" or ""), color = r.isPlayer and T.gold or nil },
			{ text = r.teamName, color = r.color },
			r.time and Config.formatLapTime(r.time) or "No time",
			gap,
		})
	end
	UIKit.table(parent, {
		{ "POS", 0.08 },
		{ "DRIVER", 0.34 },
		{ "TEAM", 0.28 },
		{ "TIME", 0.16, Enum.TextXAlignment.Right },
		{ "GAP", 0.14, Enum.TextXAlignment.Right },
	}, list, 22, function(i)
		local r = rows[i]
		if r and r.isPlayer then
			return Color3.fromRGB(60, 52, 22)
		end
		if cutoff and i > cutoff then
			return Color3.fromRGB(58, 30, 34)
		end
		return nil
	end)
end

---------------------------------------------------------------------
-- Weekend tab
---------------------------------------------------------------------
local function sessionStrip(parent, stage)
	local strip = UIKit.row(parent, 34, 6)
	for i, name in ipairs(Config.SessionOrder) do
		local done = stage > i
		local current = stage == i
		local chip = UIKit.frame(strip, {
			Size = UDim2.new(0, 74, 0, 30),
			BackgroundColor3 = current and T.accent or (done and Color3.fromRGB(35, 80, 50) or T.panel2),
			LayoutOrder = i,
		})
		UIKit.corner(chip, 6)
		UIKit.label(chip, (done and "✓ " or "") .. name, {
			Size = UDim2.new(1, 0, 1, 0),
			TextXAlignment = Enum.TextXAlignment.Center,
			Font = T.fontBold,
			TextSize = 14,
		})
	end
end

local function playerQ3Rows(w)
	local list = {}
	local q2 = w.quali and w.quali.Q2
	if q2 then
		for i, r in ipairs(q2) do
			if i <= Config.Race.QualiCutoffs[2] and r.isPlayer then
				table.insert(list, r)
			end
		end
	end
	return list
end

local function idealTyre(wetness)
	if wetness >= 0.62 then
		return "Wet"
	elseif wetness >= 0.17 then
		return "Inter"
	end
	return nil
end

local function renderActions(parent, s)
	local w = s.weekend
	local card = UIKit.card(parent, { LayoutOrder = 5 })
	if not s.setupDone then
		UIKit.title(card, "Welcome, Team Principal!", 20)
		UIKit.paragraph(card, "Pick your team name and colours to start your career.")
		UIKit.button(card, "Set up my team", function()
			HubUI.showSetup()
		end, { Size = UDim2.new(0, 220, 0, 38) })
		return
	end
	if not s.ready then
		UIKit.title(card, "Build your team first", 20)
		UIKit.paragraph(card, "You need two race drivers, a pit crew and at least one strategist. A reserve driver is optional but helps if someone gets injured.")
		local r = UIKit.row(card, 38)
		UIKit.button(r, "Quick Setup (auto-hire)", function()
			act("QuickSetup")
		end, { Size = UDim2.new(0, 230, 0, 36), BackgroundColor3 = T.good })
		UIKit.button(r, "Go to the Market", function()
			HubUI.showTab("Market")
		end, { Size = UDim2.new(0, 190, 0, 36), BackgroundColor3 = T.panel3 })
		return
	end
	local stage = w.stage
	if stage <= 3 then
		UIKit.title(card, Config.SessionOrder[stage] .. ": choose a practice programme", 20)
		UIKit.paragraph(card, "Each practice session makes your team a little faster this weekend. Practice is quick: it is simulated instantly.")
		for _, prog in ipairs(Config.PracticePrograms) do
			local r = UIKit.row(card, 40)
			UIKit.button(r, "Run " .. Config.SessionOrder[stage] .. ": " .. prog.label, function()
				act("RunPractice", { program = prog.id })
			end, { Size = UDim2.new(0, 260, 0, 36) })
			UIKit.label(r, prog.desc, { Size = UDim2.new(1, -280, 1, 0), TextColor3 = T.subtext, TextSize = 14 })
		end
		UIKit.button(card, "Skip the rest of practice", function()
			act("SkipPractice")
		end, { Size = UDim2.new(0, 240, 0, 32), BackgroundColor3 = T.panel3 })
	elseif stage == 4 or stage == 5 then
		local name = Config.SessionOrder[stage]
		UIKit.title(card, "Qualifying: " .. name, 20)
		local out = stage == 4 and "16-20" or "11-15"
		UIKit.paragraph(card, "Everyone sets their best lap. The slowest five (P" .. out .. ") are knocked out and start from those grid places.")
		UIKit.button(card, "Run " .. name, function()
			act("RunQualifying", {})
		end, { Size = UDim2.new(0, 220, 0, 40) })
	elseif stage == 6 then
		UIKit.title(card, "Qualifying: Q3 - the top ten fight for pole", 20)
		if w.pendingDrive then
			UIKit.paragraph(card, "Your Q3 lap is in progress...")
			return
		end
		UIKit.paragraph(card, "Simulate Q3, or take the wheel and drive a flying lap yourself. Your driver has already set a banker lap; your lap only counts if it is faster. Go off the track three times and your lap is deleted.")
		local r = UIKit.row(card, 40)
		UIKit.button(r, "Simulate Q3", function()
			act("RunQualifying", { mode = "sim" })
		end, { Size = UDim2.new(0, 180, 0, 36) })
		for _, row in ipairs(playerQ3Rows(w)) do
			UIKit.button(r, "Drive the lap: " .. row.name, function()
				local resp = act("RunQualifying", { mode = "drive", slot = row.slot })
				if resp and resp.ok and resp.extra and resp.extra.drive then
					ctx.startQualiDrive(resp.extra.drive)
				end
			end, { Size = UDim2.new(0, 280, 0, 36), BackgroundColor3 = T.purple })
		end
	elseif stage == 7 then
		UIKit.title(card, "Race: " .. w.laps .. " laps", 20)
		UIKit.paragraph(card, "Choose each car's starting tyres, then start the race. In a dry race each car must use two different dry compounds (or get a 10 second penalty). Your strategist can make pit calls for you (Auto) or you can call them yourself.")
		if tyreChoiceRound ~= w.round then
			tyreChoiceRound = w.round
			local wet = idealTyre(w.weather.wetness)
			chosenTyres = { wet or "Medium", wet or "Hard" }
		end
		local slots = {}
		for slot = 1, 2 do
			local d = s.team.drivers["race" .. slot]
			slots[slot] = d and d.name or ("Car " .. slot)
		end
		for slot = 1, 2 do
			local r = UIKit.row(card, 34, 6)
			UIKit.label(r, slots[slot] .. ":", { Size = UDim2.new(0, 190, 1, 0), Font = T.fontMedium })
			for _, compound in ipairs(Config.TyreOrder) do
				local tyre = Config.Tyres[compound]
				local selected = chosenTyres[slot] == compound
				UIKit.button(r, tyre.name, function()
					chosenTyres[slot] = compound
					HubUI.refresh()
				end, {
					Size = UDim2.new(0, 100, 0, 30),
					BackgroundColor3 = selected and tyre.color or T.panel3,
					TextColor3 = selected and UIKit.contrastText(tyre.color) or T.text,
				})
			end
		end
		UIKit.button(card, "START THE RACE", function()
			act("StartRace", { tyres = { chosenTyres[1], chosenTyres[2] } })
		end, { Size = UDim2.new(0, 260, 0, 46), TextSize = 18, BackgroundColor3 = T.good })
	else
		local sum = w.raceSummary
		UIKit.title(card, "Race result: " .. w.trackName, 20)
		if sum then
			local rows = {}
			local shown = {}
			for _, r in ipairs(sum.results) do
				if r.pos <= 10 or r.isPlayer then
					table.insert(rows, {
						tostring(r.pos),
						{ text = r.name, color = r.isPlayer and T.gold or nil },
						{ text = r.teamName, color = r.color },
						r.status,
						r.points > 0 and ("+" .. r.points) or "",
					})
					table.insert(shown, r)
				end
			end
			UIKit.table(card, {
				{ "POS", 0.08 },
				{ "DRIVER", 0.3 },
				{ "TEAM", 0.26 },
				{ "TIME", 0.26 },
				{ "PTS", 0.1, Enum.TextXAlignment.Right },
			}, rows, 22, function(i)
				return shown[i] and shown[i].isPlayer and Color3.fromRGB(60, 52, 22) or nil
			end)
			UIKit.title(card, "Money", 18)
			for _, line in ipairs(sum.income) do
				local r = UIKit.row(card, 20)
				UIKit.label(r, line.label, { Size = UDim2.new(0, 260, 1, 0), TextSize = 14, TextColor3 = T.subtext })
				UIKit.label(r, money(line.amount), { Size = UDim2.new(0, 120, 1, 0), TextSize = 14, TextColor3 = line.amount >= 0 and T.good or T.bad })
			end
			UIKit.label(card, "Total this race: <b>" .. money(sum.net) .. "</b>", { TextColor3 = sum.net >= 0 and T.good or T.bad })
		end
		local lastRound = s.round >= Config.RoundsPerSeason
		UIKit.button(card, lastRound and "Finish the season" or "Continue to the next round", function()
			local resp = act("Continue")
			if resp and resp.ok and resp.extra and resp.extra.season then
				HubPanels.showSeasonSummary(resp.extra.season)
			end
		end, { Size = UDim2.new(0, 280, 0, 42), BackgroundColor3 = T.good })
	end
end

local function renderResults(parent, s)
	local w = s.weekend
	local stage = w.stage
	local card
	if stage >= 7 and w.gridRows then
		card = UIKit.card(parent, { LayoutOrder = 6 })
		UIKit.title(card, "Starting grid", 18)
		timingTable(card, w.gridRows)
	elseif stage == 6 and w.quali.Q2 then
		card = UIKit.card(parent, { LayoutOrder = 6 })
		UIKit.title(card, "Q2 result (red = knocked out)", 18)
		timingTable(card, w.quali.Q2, Config.Race.QualiCutoffs[2])
	elseif stage == 5 and w.quali.Q1 then
		card = UIKit.card(parent, { LayoutOrder = 6 })
		UIKit.title(card, "Q1 result (red = knocked out)", 18)
		timingTable(card, w.quali.Q1, Config.Race.QualiCutoffs[1])
	elseif w.practice then
		card = UIKit.card(parent, { LayoutOrder = 6 })
		local wx = w.practice.weather
		UIKit.title(card, w.practice.name .. " result (" .. (wx and wx.label or "") .. ")", 18)
		timingTable(card, w.practice.rows)
	end
end

local function renderRadioLog(parent)
	local log = ctx.radioLog
	if #log == 0 then
		return
	end
	local card = UIKit.card(parent, { LayoutOrder = 7 })
	UIKit.title(card, "Team radio", 18)
	for i = math.max(1, #log - 7), #log do
		local m = log[i]
		local color = m.role == "driver" and T.gold or (m.role == "strategist" and T.accent2 or T.good)
		UIKit.paragraph(card, string.format('<font color="#%s"><b>%s:</b></font> %s', color:ToHex(), m.speaker, m.text), { TextColor3 = T.text, TextSize = 14 })
	end
end

local function renderWeekend(parent, s)
	local w = s.weekend
	local header = UIKit.card(parent, { LayoutOrder = 1 })
	UIKit.title(header, string.format("Round %d of %d: %s", w.round, Config.RoundsPerSeason, w.trackName), 24)
	UIKit.paragraph(header, w.description)
	local f = w.facts
	local facts = string.format(
		"Race distance: <b>%d laps</b>   •   Lap: <b>%.2f km</b>   •   Overtaking: <b>%s</b>   •   Rain chance: <b>%d%%</b>   •   Favours: <b>%s</b>%s%s",
		w.laps,
		w.lengthM / 1000,
		difficultyText(f.overtaking),
		math.floor(f.rain * 100 + 0.5),
		f.power > 0.6 and "power" or (f.power < 0.35 and "cornering" or "balance"),
		f.night and "   •   <b>Night race</b>" or "",
		f.street and "   •   <b>Street circuit</b>" or ""
	)
	UIKit.paragraph(header, facts, { TextColor3 = T.text, TextSize = 14 })
	sessionStrip(header, w.stage)

	local info = UIKit.card(parent, { LayoutOrder = 2 })
	UIKit.label(info, string.format("Weather: <b>%s</b>  (track %d%% wet)   •   %s", w.weather.label, math.floor(w.weather.wetness * 100 + 0.5), w.forecast or ""))
	UIKit.label(info, string.format("Weekend preparation: setup <b>-%.2fs</b>  •  tyre wear <b>-%d%%</b>  •  qualifying <b>-%.2fs</b>", w.bonus.setup, math.floor(w.bonus.long * 100 + 0.5), w.bonus.quali), { TextColor3 = T.subtext, TextSize = 14 })
	for _, note in ipairs(w.notes or {}) do
		UIKit.label(info, "⚠ " .. note, { TextColor3 = T.warn, TextSize = 14 })
	end

	renderActions(parent, s)
	renderResults(parent, s)
	renderRadioLog(parent)
end

---------------------------------------------------------------------
-- Team tab
---------------------------------------------------------------------
local function driverCard(parent, slot, label, d, order)
	local card = UIKit.card(parent, { LayoutOrder = order })
	if not d then
		UIKit.title(card, label .. ": empty seat", 18)
		UIKit.button(card, "Find a driver in the Market", function()
			HubUI.showTab("Market")
		end, { Size = UDim2.new(0, 260, 0, 32), BackgroundColor3 = T.panel3 })
		return
	end
	UIKit.title(card, string.format("%s: %s  <font color=\"#%s\">(%s, %s, age %d)</font>", label, d.name, T.subtext:ToHex(), d.code, d.nation, d.age), 18)
	UIKit.label(card, string.format("Overall <b>%d</b>   •   Salary %s per race", d.overall, money(d.salary)), { TextColor3 = T.subtext, TextSize = 14 })
	if (d.injuredRounds or 0) > 0 then
		UIKit.label(card, "Injured: misses " .. d.injuredRounds .. " more race(s)", { TextColor3 = T.bad, TextSize = 14 })
	end
	UIKit.statBar(card, "Pace", d.pace, T.accent)
	UIKit.statBar(card, "Consistency", d.consistency, T.accent2)
	UIKit.statBar(card, "Wet weather", d.wet, Color3.fromRGB(70, 140, 255))
	UIKit.statBar(card, "Overtaking", d.overtaking, T.warn)
	UIKit.statBar(card, "Tyre care", d.tyres, T.good)
	local r = UIKit.row(card, 34)
	local severance = math.floor(d.fee * Config.SeveranceRate)
	UIKit.button(r, "Release (" .. money(severance) .. ")", function()
		confirm("Release " .. d.name .. "?", "This costs " .. money(severance) .. " in severance. The seat will be empty until you hire someone.", function()
			act("FireDriver", { slot = slot })
		end)
	end, { Size = UDim2.new(0, 200, 0, 30), BackgroundColor3 = T.panel3 })
	if slot == "reserve" then
		for i = 1, 2 do
			UIKit.button(r, "Promote to Driver " .. i, function()
				act("SwapReserve", { slot = "race" .. i })
			end, { Size = UDim2.new(0, 190, 0, 30), BackgroundColor3 = T.accent2 })
		end
	end
end

local function renderTeam(parent, s)
	local team = s.team
	local head = UIKit.card(parent, { LayoutOrder = 0 })
	UIKit.title(head, s.teamName, 24)
	UIKit.label(head, string.format("Total salaries: <b>%s per race</b>   •   Strategy calls %d / planning %d", money(team.salaries), math.floor(team.strategy.calls), math.floor(team.strategy.planning)), { TextColor3 = T.subtext })
	driverCard(parent, "race1", "Driver 1", team.drivers.race1, 1)
	driverCard(parent, "race2", "Driver 2", team.drivers.race2, 2)
	driverCard(parent, "reserve", "Reserve", team.drivers.reserve, 3)

	local crewCard = UIKit.card(parent, { LayoutOrder = 4 })
	local crew = team.crew
	if crew then
		UIKit.title(crewCard, "Pit crew: " .. crew.name, 18)
		UIKit.label(crewCard, string.format("Crew chief %s   •   Typical stop %.2fs   •   Salary %s per race", crew.chief or "-", 1.9 + (100 - crew.speed) * 0.022, money(math.floor(crew.fee * Config.SalaryRate))), { TextColor3 = T.subtext, TextSize = 14 })
		UIKit.statBar(crewCard, "Speed", crew.speed, T.accent)
		UIKit.statBar(crewCard, "Reliability", crew.reliability, T.good)
		UIKit.button(crewCard, "Train the crew (+" .. Config.CrewTraining.Step .. " speed) " .. money(Config.CrewTraining.Cost), function()
			act("TrainCrew")
		end, { Size = UDim2.new(0, 320, 0, 32), BackgroundColor3 = T.accent2 })
	else
		UIKit.title(crewCard, "Pit crew: none hired", 18)
		UIKit.button(crewCard, "Hire a crew in the Market", function()
			HubUI.showTab("Market")
		end, { Size = UDim2.new(0, 260, 0, 32), BackgroundColor3 = T.panel3 })
	end

	for i = 1, 2 do
		local slot = "s" .. i
		local st = team.strategists[slot]
		local card = UIKit.card(parent, { LayoutOrder = 4 + i })
		if st then
			UIKit.title(card, "Strategist " .. i .. ": " .. st.name, 18)
			UIKit.label(card, "Salary " .. money(math.floor(st.fee * Config.SalaryRate)) .. " per race", { TextColor3 = T.subtext, TextSize = 14 })
			UIKit.statBar(card, "Call quality", st.calls, T.accent2)
			UIKit.statBar(card, "Planning", st.planning, T.purple)
			UIKit.button(card, "Release (" .. money(math.floor(st.fee * Config.SeveranceRate)) .. ")", function()
				act("FireStrategist", { slot = slot })
			end, { Size = UDim2.new(0, 200, 0, 30), BackgroundColor3 = T.panel3 })
		else
			UIKit.title(card, "Strategist " .. i .. ": empty", 18)
			UIKit.paragraph(card, i == 1 and "Strategists decide when to pit and react to the weather." or "A second strategist adds a little extra to the first one's calls.")
		end
	end
end

---------------------------------------------------------------------
-- Market tab
---------------------------------------------------------------------
local function hireButton(parent, text, occupant, fee, onYes)
	UIKit.button(parent, text, function()
		if occupant then
			local severance = math.floor(occupant.fee * Config.SeveranceRate)
			confirm("Replace " .. occupant.name .. "?", string.format("Hiring costs %s plus %s severance to release %s.", money(fee), money(severance), occupant.name), onYes)
		else
			onYes()
		end
	end, { Size = UDim2.new(0, 150, 0, 30), BackgroundColor3 = T.good, TextSize = 13 })
end

local function renderMarket(parent, s)
	local team = s.team
	local m = team.market
	local head = UIKit.card(parent, { LayoutOrder = 0 })
	UIKit.title(head, "Market", 24)
	UIKit.paragraph(head, "Hiring fees are paid now. Salaries are paid after every race (" .. math.floor(Config.SalaryRate * 100) .. "% of the fee). New people appear every few rounds.")
	local r = UIKit.row(head, 36)
	UIKit.button(r, "Quick Setup (fill empty seats)", function()
		act("QuickSetup")
	end, { Size = UDim2.new(0, 260, 0, 32), BackgroundColor3 = T.accent2 })
	UIKit.button(r, "Scout new options (" .. money(Config.Market.RefreshCost) .. ")", function()
		act("RefreshMarket")
	end, { Size = UDim2.new(0, 260, 0, 32), BackgroundColor3 = T.panel3 })

	local dHead = UIKit.card(parent, { LayoutOrder = 1 })
	UIKit.title(dHead, "Drivers", 20)
	for i, d in ipairs(m.drivers) do
		local card = UIKit.card(parent, { LayoutOrder = 1 + i })
		UIKit.label(card, string.format("<b>%s</b>  (%s, %s, age %d)   •   Overall <b>%d</b>   •   Fee <b>%s</b>", d.name, d.code, d.nation, d.age, d.overall, money(d.fee)))
		UIKit.label(card, string.format("Pace %d  •  Consistency %d  •  Wet %d  •  Overtaking %d  •  Tyre care %d", d.pace, d.consistency, d.wet, d.overtaking, d.tyres), { TextColor3 = T.subtext, TextSize = 14 })
		local row = UIKit.row(card, 32, 6)
		for _, slotInfo in ipairs({ { "race1", "Sign: Driver 1" }, { "race2", "Sign: Driver 2" }, { "reserve", "Sign: Reserve" } }) do
			local occupant = team.drivers[slotInfo[1]]
			hireButton(row, slotInfo[2], occupant, d.fee, function()
				act("HireDriver", { id = d.id, slot = slotInfo[1] })
			end)
		end
	end

	local cHead = UIKit.card(parent, { LayoutOrder = 50 })
	UIKit.title(cHead, "Pit crews", 20)
	for i, c in ipairs(m.crews) do
		local card = UIKit.card(parent, { LayoutOrder = 50 + i })
		UIKit.label(card, string.format("<b>%s</b> (chief %s)   •   Speed <b>%d</b>   •   Reliability <b>%d</b>   •   Fee <b>%s</b>", c.name, c.chief or "-", c.speed, c.reliability, money(c.fee)))
		local row = UIKit.row(card, 32)
		hireButton(row, "Hire crew", team.crew, c.fee, function()
			act("HireCrew", { id = c.id })
		end)
	end

	local sHead = UIKit.card(parent, { LayoutOrder = 70 })
	UIKit.title(sHead, "Strategists", 20)
	for i, st in ipairs(m.strategists) do
		local card = UIKit.card(parent, { LayoutOrder = 70 + i })
		UIKit.label(card, string.format("<b>%s</b>   •   Call quality <b>%d</b>   •   Planning <b>%d</b>   •   Fee <b>%s</b>", st.name, st.calls, st.planning, money(st.fee)))
		local row = UIKit.row(card, 32, 6)
		for slotIndex = 1, 2 do
			local slot = "s" .. slotIndex
			hireButton(row, "Hire as Strategist " .. slotIndex, team.strategists[slot], st.fee, function()
				act("HireStrategist", { id = st.id, slot = slot })
			end)
		end
	end
end

---------------------------------------------------------------------
-- Car tab
---------------------------------------------------------------------
local function renderCar(parent, s)
	local team = s.team
	local head = UIKit.card(parent, { LayoutOrder = 0 })
	UIKit.title(head, "Car development", 24)
	UIKit.paragraph(head, string.format("Overall car rating: <b>%d</b>. Each upgrade adds +%d. Pay with money, or with %d upgrade points (you have %d). Upgrades get more expensive as a rating climbs, and new rules each winter pull every car back a little.", team.carRating, Config.Upgrade.Step, Config.Upgrade.PointsCost, s.upgradePoints))
	for i, area in ipairs(Config.Upgrade.Areas) do
		local info = team.car[area]
		local card = UIKit.card(parent, { LayoutOrder = i })
		UIKit.title(card, Config.Upgrade.Labels[area] .. ": " .. info.rating, 18)
		UIKit.paragraph(card, Config.Upgrade.Descriptions[area])
		UIKit.bar(card, info.rating / 100, T.accent2, { Size = UDim2.new(1, 0, 0, 10) })
		local r = UIKit.row(card, 34)
		local maxed = info.rating >= Config.Upgrade.Max
		local b1 = UIKit.button(r, maxed and "Maxed out" or ("Upgrade for " .. money(info.cost)), function()
			act("UpgradeCar", { area = area })
		end, { Size = UDim2.new(0, 220, 0, 30), BackgroundColor3 = T.good })
		local b2 = UIKit.button(r, "Use " .. Config.Upgrade.PointsCost .. " upgrade points", function()
			act("UpgradeCar", { area = area, usePoints = true })
		end, { Size = UDim2.new(0, 220, 0, 30), BackgroundColor3 = T.purple })
		UIKit.setEnabled(b1, not maxed and s.budget >= info.cost)
		UIKit.setEnabled(b2, not maxed and s.upgradePoints >= Config.Upgrade.PointsCost)
	end
	local compare = UIKit.card(parent, { LayoutOrder = 10 })
	UIKit.title(compare, "How you compare (average track)", 18)
	local list = {}
	for _, t in ipairs(team.aiTeams) do
		table.insert(list, { name = t.name, rating = t.rating, color = t.color })
	end
	table.insert(list, { name = s.teamName .. " (you)", rating = team.carRating, color = teamColor(), you = true })
	table.sort(list, function(a, b)
		return a.rating > b.rating
	end)
	for _, entry in ipairs(list) do
		local r = UIKit.frame(compare, { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 20) })
		UIKit.label(r, entry.name, { Size = UDim2.new(0, 220, 1, 0), TextSize = 14, Font = entry.you and T.fontBold or T.font, TextColor3 = entry.you and T.gold or T.text })
		UIKit.bar(r, (entry.rating - 50) / 50, entry.color, { Position = UDim2.new(0, 230, 0.5, -5), Size = UDim2.new(1, -280, 0, 10) })
		UIKit.label(r, tostring(entry.rating), { Position = UDim2.new(1, -40, 0, 0), Size = UDim2.new(0, 40, 1, 0), TextXAlignment = Enum.TextXAlignment.Right, TextSize = 14 })
	end
end

---------------------------------------------------------------------
-- Layout
---------------------------------------------------------------------
local renderers = {
	Weekend = renderWeekend,
	Team = renderTeam,
	Market = renderMarket,
	Car = renderCar,
	Standings = function(parent, s)
		HubPanels.renderStandings(parent, s)
	end,
	Calendar = function(parent, s)
		HubPanels.renderCalendar(parent, s)
	end,
	Objectives = function(parent, s)
		HubPanels.renderObjectives(parent, s, ctx)
	end,
	Records = function(parent, s)
		HubPanels.renderRecords(parent, s)
	end,
}

local function renderTopBar()
	UIKit.clear(topBar)
	local s = ctx.state
	if not s then
		return
	end
	UIKit.frame(topBar, { Size = UDim2.new(0, 8, 1, 0), BackgroundColor3 = teamColor() })
	UIKit.label(topBar, s.teamName, {
		Position = UDim2.new(0, 20, 0, 4),
		Size = UDim2.new(0, 300, 0, 26),
		Font = T.fontBold,
		TextSize = 22,
	})
	UIKit.label(topBar, string.format("Season %d  •  Round %d of %d", s.season, s.round, Config.RoundsPerSeason), {
		Position = UDim2.new(0, 20, 0, 30),
		Size = UDim2.new(0, 300, 0, 20),
		TextSize = 14,
		TextColor3 = T.subtext,
	})
	UIKit.label(topBar, "Budget  <b>" .. money(s.budget) .. "</b>", {
		Position = UDim2.new(0, 340, 0, 0),
		Size = UDim2.new(0, 220, 1, 0),
		TextSize = 20,
		TextColor3 = s.budget >= 0 and T.gold or T.bad,
	})
	UIKit.label(topBar, "Upgrade points  <b>" .. s.upgradePoints .. "</b>", {
		Position = UDim2.new(0, 570, 0, 0),
		Size = UDim2.new(0, 220, 1, 0),
		TextSize = 18,
		TextColor3 = T.purple,
	})
	UIKit.label(topBar, ctx.saveText or (s.saving and "Saving on" or "Saving off"), {
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -130, 0, 0),
		Size = UDim2.new(0, 330, 1, 0),
		TextSize = 13,
		TextColor3 = s.saving and T.subtext or T.warn,
		TextXAlignment = Enum.TextXAlignment.Right,
	})
	UIKit.button(topBar, "Save now", function()
		act("SaveNow")
	end, {
		AnchorPoint = Vector2.new(1, 0.5),
		Position = UDim2.new(1, -12, 0.5, 0),
		Size = UDim2.new(0, 105, 0, 32),
		BackgroundColor3 = T.panel3,
	})
end

function HubUI.refresh()
	if not root then
		return
	end
	renderTopBar()
	for name, b in pairs(navButtons) do
		b.BackgroundColor3 = name == currentTab and T.accent or T.panel2
	end
	local scrollPos = content.CanvasPosition
	UIKit.clear(content)
	local s = ctx.state
	if not s then
		UIKit.label(content, "Loading your career...", { TextSize = 20 })
		return
	end
	local ok, err = pcall(renderers[currentTab], content, s)
	if not ok then
		warn("[HubUI] " .. tostring(err))
		UIKit.label(content, "Could not draw this page: " .. tostring(err), { TextColor3 = T.bad })
	end
	content.CanvasPosition = scrollPos
end

function HubUI.showTab(name)
	if renderers[name] then
		if name ~= currentTab then
			content.CanvasPosition = Vector2.new(0, 0)
		end
		currentTab = name
		HubUI.refresh()
	end
end

function HubUI.setVisible(visible)
	if root then
		root.Visible = visible
	end
end

-- First-time team setup window.
function HubUI.showSetup()
	local nameIndex, colorIndex = 1, 1
	UIKit.modal(ctx.gui, "Create your team", function(body, close)
		UIKit.paragraph(body, "You are the new Team Principal. Choose a name and colours. You start with " .. money(Config.StartingBudget) .. " to hire drivers, a pit crew and strategists, and to develop your car.")
		UIKit.label(body, "<b>Team name</b>")
		local names = UIKit.frame(body, { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y })
		UIKit.make("UIGridLayout", { CellSize = UDim2.new(0, 165, 0, 32), CellPadding = UDim2.new(0, 6, 0, 6) }, names)
		local nameButtons = {}
		local function paintNames()
			for i, b in ipairs(nameButtons) do
				b.BackgroundColor3 = i == nameIndex and T.accent or T.panel3
			end
		end
		for i, n in ipairs(Config.PlayerTeamNames) do
			nameButtons[i] = UIKit.button(names, n, function()
				nameIndex = i
				paintNames()
			end, { TextSize = 13 })
		end
		paintNames()
		UIKit.label(body, "<b>Team colour</b>")
		local colors = UIKit.frame(body, { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y })
		UIKit.make("UIGridLayout", { CellSize = UDim2.new(0, 120, 0, 32), CellPadding = UDim2.new(0, 6, 0, 6) }, colors)
		local colorButtons = {}
		local function paintColors()
			for i, b in ipairs(colorButtons) do
				b.Text = (i == colorIndex and "✓ " or "") .. Config.PlayerColors[i].name
			end
		end
		for i, c in ipairs(Config.PlayerColors) do
			colorButtons[i] = UIKit.button(colors, c.name, function()
				colorIndex = i
				paintColors()
			end, { BackgroundColor3 = c.color, TextColor3 = UIKit.contrastText(c.color), TextSize = 13 })
		end
		paintColors()
		UIKit.button(body, "Start my career", function()
			local resp = act("SetupTeam", { nameIndex = nameIndex, colorIndex = colorIndex })
			if resp and resp.ok then
				close()
			end
		end, { Size = UDim2.new(0, 220, 0, 40), BackgroundColor3 = T.good })
	end, 560)
end

function HubUI.init(context)
	ctx = context
	root = UIKit.frame(ctx.gui, {
		Name = "Hub",
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundTransparency = 1,
	})
	topBar = UIKit.frame(root, {
		Name = "TopBar",
		Size = UDim2.new(1, 0, 0, 56),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.05,
	})
	navHolder = UIKit.frame(root, {
		Name = "Nav",
		Position = UDim2.new(0, 0, 0, 56),
		Size = UDim2.new(0, 180, 1, -56),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.1,
	})
	UIKit.padding(navHolder, 10, 10)
	UIKit.list(navHolder, nil, 6)
	for i, name in ipairs(TABS) do
		navButtons[name] = UIKit.button(navHolder, name, function()
			HubUI.showTab(name)
		end, {
			Size = UDim2.new(1, 0, 0, 40),
			LayoutOrder = i,
			BackgroundColor3 = T.panel2,
			TextXAlignment = Enum.TextXAlignment.Left,
			TextSize = 16,
		})
		UIKit.padding(navButtons[name], 0, 14)
	end
	local contentBack = UIKit.frame(root, {
		Name = "ContentBack",
		Position = UDim2.new(0, 190, 0, 66),
		Size = UDim2.new(1, -200, 1, -76),
		BackgroundColor3 = T.bg,
		BackgroundTransparency = 0.2,
	})
	UIKit.corner(contentBack, 12)
	content = UIKit.scroll(contentBack, { Name = "Content" })
	UIKit.padding(content, 12, 14)
	UIKit.list(content, nil, 10)
	HubUI.refresh()
end

return HubUI
