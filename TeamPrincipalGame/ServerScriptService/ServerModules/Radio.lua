--[[
	Radio (ModuleScript)
	Location: ServerScriptService > ServerModules > Radio

	Team radio messages. Each message has a speaker role (driver, engineer or
	strategist) and several wordings, so the radio doesn't repeat itself.
	Words in {curly brackets} are filled in with real race details.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Radio = {}

local remote = nil

Radio.Templates = {
	raceStart = { "engineer", {
		"Lights out and away we go! Clean start, {driver}.",
		"Here we go, {driver}. Keep it clean into turn one.",
		"Race start. Tyres are cold, be careful on the first lap.",
	} },
	gainedPlace = { "driver", {
		"Got him! Up to P{pos}.",
		"Move done, I'm P{pos} now!",
		"Easy pass. P{pos}, let's keep going.",
	} },
	lostPlace = { "driver", {
		"He got past me. I'm P{pos}.",
		"Lost a place, P{pos}. My tyres are struggling.",
	} },
	tyre50 = { "engineer", {
		"Tyres at {wear}% wear. Look after them.",
		"Your {compound}s are half gone. Manage the rears.",
	} },
	tyre70 = { "driver", {
		"The rears are going off! How long are we staying out?",
		"Tyres are at {wear}%. I'm starting to slide a lot.",
	} },
	tyre85 = { "driver", {
		"These tyres are finished! I need new ones now!",
		"I've got no grip left, box me!",
	} },
	boxCall = { "engineer", {
		"Box, box. Box this lap for {compound}s.",
		"Box this lap, box this lap. {compound}s are ready.",
	} },
	boxAdvice = { "strategist", {
		"Strategy recommends boxing {driver} now for {compound}s. Your call, boss.",
		"Boss, we should pit {driver} for {compound}s. {reason}",
	} },
	pitGood = { "engineer", {
		"Great stop, {time} seconds! Push now, push.",
		"{time} second stop, brilliant work from the crew!",
	} },
	pitOk = { "engineer", {
		"Stop done, {time} seconds. On to {compound}s.",
	} },
	pitSlow = { "engineer", {
		"Slow stop, {time} seconds. We had a problem with the {part}. Sorry.",
		"Sorry {driver}, {time} seconds. The {part} was stuck.",
	} },
	rainStart = { "strategist", {
		"Rain is starting to fall. The track will get slippery.",
		"We have rain! Watch the grip levels.",
	} },
	rainHeavy = { "strategist", {
		"Heavy rain now! Slicks will be undriveable.",
		"It's pouring down! We need wets or inters.",
	} },
	rainEasing = { "strategist", {
		"Rain is easing off.",
		"The rain is getting lighter.",
	} },
	rainStopped = { "strategist", {
		"Rain has stopped. Track will start to dry.",
		"No more rain. A dry line will appear soon.",
	} },
	wrongTyres = { "driver", {
		"I've got no grip on these tyres! Get me in!",
		"These are the wrong tyres for this, I'm losing seconds!",
	} },
	scDeployed = { "engineer", {
		"Safety car, safety car. {reason}",
		"Safety car is out. {reason} Stay off the brakes.",
	} },
	scEnding = { "engineer", {
		"Safety car in this lap. Get ready for the restart.",
		"Restart coming, warm those tyres.",
	} },
	crashOther = { "engineer", {
		"{name} has crashed. Yellow flags, be careful.",
		"{name} is out of the race.",
	} },
	retiredOther = { "engineer", {
		"{name} has stopped with a problem.",
	} },
	crashTeam = { "driver", {
		"I'm out! I lost it, I'm so sorry guys.",
		"I'm in the wall. Sorry team.",
	} },
	mechanicalTeam = { "driver", {
		"I've lost power! The engine has gone!",
		"Something's broken, I have to stop the car.",
	} },
	mistakeTeam = { "driver", {
		"Locked up and went wide. Lost some time there.",
		"Ran wide, sorry. Back on it now.",
		"Little spin! I'm OK, carrying on.",
	} },
	puncture = { "driver", {
		"Puncture! I've got a puncture!",
	} },
	gapAhead = { "engineer", {
		"Gap to {name} ahead is {gap} seconds.",
		"{name} is {gap} ahead. You're catching.",
	} },
	gapBehind = { "engineer", {
		"{name} is {gap} behind you.",
	} },
	battle = { "engineer", {
		"You're fighting {name}! Boss, you can take the wheel now.",
		"Battle with {name}. This is the moment to take control, boss.",
	} },
	fastestLap = { "engineer", {
		"Purple! Fastest lap of the race, {time}.",
		"That's the fastest lap so far, {time}!",
	} },
	lastLap = { "engineer", {
		"Last lap! Bring it home.",
		"Final lap, {driver}. Everything you've got.",
	} },
	twoCompound = { "engineer", {
		"Remember, we must use a second dry compound before the end, or get a 10 second penalty.",
	} },
	finishWin = { "driver", {
		"YES! WE WON! What a car, thank you everyone!",
		"VICTORY! Unbelievable job, team!",
	} },
	finishPodium = { "driver", {
		"Podium! P{pos}! Great job everyone!",
		"P{pos}, we're on the podium! Thanks guys!",
	} },
	finishPoints = { "engineer", {
		"P{pos}. Good points today, well done.",
		"Chequered flag, P{pos}. Solid work.",
	} },
	finishNoPoints = { "engineer", {
		"P{pos}. Not our day. We'll learn from it.",
		"P{pos} at the flag. We need more pace.",
	} },
	takeoverStart = { "engineer", {
		"You have control, boss. Bring it home!",
	} },
	takeoverEnd = { "engineer", {
		"OK, {driver} has control again.",
	} },
	practiceSetup = { "driver", {
		"The car feels better with the new setup. More confident in the corners.",
		"Good progress on balance. I like the car now.",
	} },
	practiceLong = { "driver", {
		"Long run done. I understand how to look after the tyres here.",
		"Tyre data collected. The {compound} lasted well.",
	} },
	practiceQuali = { "driver", {
		"Low fuel runs done. I know where to find the lap time.",
	} },
	practiceWet = { "engineer", {
		"Wet session, so we didn't learn as much as we wanted.",
	} },
	reserveSim = { "engineer", {
		"Reserve driver {name} found extra pace in the simulator overnight.",
	} },
	qualiOut = { "engineer", {
		"Sorry {driver}, we're out in {stage}. P{pos}.",
		"That's P{pos}, knocked out in {stage}.",
	} },
	qualiThrough = { "engineer", {
		"P{pos}, we're through to {next}!",
	} },
	pole = { "driver", {
		"POLE POSITION! Yes! What a lap!",
	} },
	qualiDone = { "engineer", {
		"P{pos} on the grid tomorrow. Good job.",
	} },
	injured = { "engineer", {
		"{name} is being checked by the doctors after that crash.",
	} },
}

function Radio.init()
	local remotes = ReplicatedStorage:WaitForChild("Remotes")
	remote = remotes:WaitForChild("Radio")
end

local function fill(text, vars)
	return (string.gsub(text, "{(%w+)}", function(key)
		local v = vars[key]
		if v == nil then
			return ""
		end
		return tostring(v)
	end))
end

-- Sends a raw message to one player.
function Radio.send(player, speaker, role, text, slot)
	if remote and player and player.Parent then
		remote:FireClient(player, { speaker = speaker, role = role, text = text, slot = slot, time = os.time() })
	end
end

-- Sends a templated message. vars.driver should hold the driver's name.
-- Returns the text that was sent.
function Radio.say(player, key, vars, rng, slot)
	local template = Radio.Templates[key]
	if not template then
		return nil
	end
	vars = vars or {}
	local role = template[1]
	local options = template[2]
	local text = options[(rng and rng:NextInteger(1, #options)) or 1]
	text = fill(text, vars)
	local speaker
	if role == "driver" then
		speaker = vars.driver or "Driver"
	elseif role == "engineer" then
		speaker = "Race Engineer"
	else
		speaker = "Strategist"
	end
	Radio.send(player, speaker, role, text, slot)
	return text
end

return Radio
