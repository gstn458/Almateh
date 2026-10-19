--[[
	TrackBuilder (ModuleScript)
	Location: ReplicatedStorage > ClientModules > TrackBuilder

	Builds the 3D circuit on the player's own screen from the waypoint list:
	grass, road, white edge lines, red and white kerbs, barriers, the pit lane
	with garages, the start/finish gantry, grid boxes, grandstands and scenery
	(trees, or buildings for street circuits). Night races get floodlights.

	The track is built by the client (not the server) so that every player can
	be at a different circuit in their own career at the same time.
	Long straight pieces are merged into single parts to keep the part count low.
]]

local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("Config"))
local Tracks = require(Shared:WaitForChild("Tracks"))
local TrackPath = require(Shared:WaitForChild("TrackPath"))

local TrackBuilder = {}
TrackBuilder.current = nil

local UP = Vector3.yAxis
local HASH_CELL = 40

local function newPart(props, parent)
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanTouch = false
	p.CanQuery = false
	p.CastShadow = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in pairs(props) do
		p[k] = v
	end
	p.Parent = parent
	return p
end

---------------------------------------------------------------------
-- Spatial hash of the centreline, used to keep walls and scenery off the road
---------------------------------------------------------------------
local function cellKey(x, z)
	return math.floor(x / HASH_CELL) .. "," .. math.floor(z / HASH_CELL)
end

local function buildHash(path)
	local hash = {}
	for i = 1, path.n do
		local p = path.pos[i]
		local key = cellKey(p.X, p.Z)
		local list = hash[key]
		if not list then
			list = {}
			hash[key] = list
		end
		table.insert(list, i)
	end
	return hash
end

-- True if "point" is within "radius" of a part of the track that is not near sample "index".
local function nearOtherSection(path, hash, point, index, radius)
	local cells = math.ceil(radius / HASH_CELL)
	local cx, cz = math.floor(point.X / HASH_CELL), math.floor(point.Z / HASH_CELL)
	local r2 = radius * radius
	for dx = -cells, cells do
		for dz = -cells, cells do
			local list = hash[(cx + dx) .. "," .. (cz + dz)]
			if list then
				for _, j in ipairs(list) do
					local sep = math.abs(j - (index or -1000))
					sep = math.min(sep, path.n - sep)
					if index == nil or sep > 20 then
						local q = path.pos[j]
						local ddx, ddz = q.X - point.X, q.Z - point.Z
						if ddx * ddx + ddz * ddz < r2 and math.abs(q.Y - point.Y) < 6 then
							return true
						end
					end
				end
			end
		end
	end
	return false
end

---------------------------------------------------------------------
-- Merges consecutive samples along an offset line into straight runs.
-- include(i) can skip samples. Returns a list of {a, b} point pairs.
---------------------------------------------------------------------
local function runs(path, lateral, include, maxLen, maxAngleDeg, firstIndex, lastIndex)
	local segs = {}
	local cosLimit = math.cos(math.rad(maxAngleDeg or 4))
	local startP, prevP, dir = nil, nil, nil
	local n = path.n
	firstIndex = firstIndex or 1
	local count = lastIndex and ((lastIndex - firstIndex) % n) or n
	for step = 0, count do
		local i = (firstIndex - 1 + step) % n + 1
		local ok = include == nil or include(i)
		local p = path.pos[i] + path.right[i] * lateral
		if not ok then
			if startP and prevP and (prevP - startP).Magnitude > 0.5 then
				table.insert(segs, { startP, prevP })
			end
			startP, dir = nil, nil
		elseif not startP then
			startP, dir = p, nil
		else
			local stepVec = p - prevP
			if stepVec.Magnitude > 0.01 then
				local stepDir = stepVec.Unit
				if not dir then
					dir = stepDir
				end
				if (p - startP).Magnitude > (maxLen or 80) or stepDir:Dot(dir) < cosLimit then
					table.insert(segs, { startP, prevP })
					startP, dir = prevP, stepDir
				end
			end
		end
		prevP = p
	end
	if startP and prevP and (prevP - startP).Magnitude > 0.5 then
		table.insert(segs, { startP, prevP })
	end
	return segs
end

-- A flat strip between two points (top surface at the points' height + lift).
local function strip(parent, a, b, width, thickness, color, material, lift)
	local len = (b - a).Magnitude
	if len < 0.05 then
		return nil
	end
	local mid = (a + b) / 2
	local cf = CFrame.lookAt(mid, b) * CFrame.new(0, (lift or 0) - thickness / 2, 0)
	return newPart({
		Size = Vector3.new(width, thickness, len + 0.6),
		CFrame = cf,
		Color = color,
		Material = material or Enum.Material.SmoothPlastic,
	}, parent)
end

---------------------------------------------------------------------
-- Build
---------------------------------------------------------------------
local function setLighting(track)
	if track.night then
		Lighting.ClockTime = 20.6
		Lighting.Brightness = 1.2
		Lighting.OutdoorAmbient = Color3.fromRGB(90, 90, 110)
	else
		Lighting.ClockTime = 14.2
		Lighting.Brightness = 2.2
		Lighting.OutdoorAmbient = Color3.fromRGB(128, 128, 128)
	end
	Lighting.FogEnd = 100000
end

-- progress(fraction, text) is called while building. Yields while it builds.
function TrackBuilder.build(trackId, progress)
	local track = Tracks.ById[trackId]
	if not track then
		return nil
	end
	if TrackBuilder.current and TrackBuilder.current.id == trackId then
		return TrackBuilder.current
	end
	-- Already being built (for example by the menu): wait for that build.
	if TrackBuilder.buildingId == trackId then
		while TrackBuilder.buildingId == trackId do
			task.wait(0.1)
		end
		return TrackBuilder.current
	end
	TrackBuilder.buildingId = trackId
	TrackBuilder.clear()
	progress = progress or function() end

	local path = TrackPath.get(track)
	local W = Config.Track.Width
	local runoff = path.runoff
	local origin = Config.Track.Origin
	local rng = Random.new(#track.id * 7919 + track.lengthM)
	local hash = buildHash(path)

	local folder = Instance.new("Folder")
	folder.Name = "LocalTrack"
	folder.Parent = workspace

	local partCount = 0
	local function tick()
		partCount += 1
		if partCount % 120 == 0 then
			task.wait()
		end
	end

	local asphalt = Color3.fromRGB(52, 54, 60)
	local roadParts = {}

	-- Bounds
	local minX, maxX, minZ, maxZ = math.huge, -math.huge, math.huge, -math.huge
	for i = 1, path.n do
		local p = path.pos[i]
		minX, maxX = math.min(minX, p.X), math.max(maxX, p.X)
		minZ, maxZ = math.min(minZ, p.Z), math.max(maxZ, p.Z)
	end
	local center = Vector3.new((minX + maxX) / 2, origin.Y, (minZ + maxZ) / 2)
	local radius = math.max(maxX - minX, maxZ - minZ) / 2

	progress(0.05, "Laying the grass")
	-- 1. Grass tiles (a part can be at most 2048 studs long).
	local margin = 320
	local x0, x1 = minX - margin, maxX + margin
	local z0, z1 = minZ - margin, maxZ + margin
	local tile = 2000
	local groundColor = track.street and Color3.fromRGB(105, 105, 110) or Color3.fromRGB(70, 125, 60)
	local groundMaterial = track.street and Enum.Material.Concrete or Enum.Material.Grass
	local x = x0
	while x < x1 do
		local sx = math.min(tile, x1 - x)
		local z = z0
		while z < z1 do
			local sz = math.min(tile, z1 - z)
			newPart({
				Name = "Ground",
				Size = Vector3.new(sx, 2, sz),
				CFrame = CFrame.new(x + sx / 2, origin.Y - 1.25, z + sz / 2),
				Color = groundColor,
				Material = groundMaterial,
			}, folder)
			z += tile
		end
		x += tile
	end

	progress(0.15, "Building the road")
	-- 2. Road surface, with round joints so corners have no gaps.
	local roadSegs = runs(path, 0, nil, 90, 4)
	for _, seg in ipairs(roadSegs) do
		local road = strip(folder, seg[1], seg[2], W, 1, asphalt, Enum.Material.Asphalt, 0)
		if road then
			table.insert(roadParts, road)
		end
		local joint = newPart({
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(1, W, W),
			CFrame = CFrame.new(seg[1] - UP * 0.5) * CFrame.Angles(0, 0, math.pi / 2),
			Color = asphalt,
			Material = Enum.Material.Asphalt,
		}, folder)
		table.insert(roadParts, joint)
		tick()
	end

	progress(0.3, "Painting the lines")
	-- 3. White edge lines.
	for _, side in ipairs({ -1, 1 }) do
		for _, seg in ipairs(runs(path, side * (W / 2 - 0.7), nil, 60, 3)) do
			strip(folder, seg[1], seg[2], 0.6, 0.1, Color3.fromRGB(235, 235, 235), nil, 0.06)
			tick()
		end
	end

	progress(0.4, "Fitting the kerbs")
	-- 4. Red and white kerbs in the corners.
	for i = 1, path.n - 2, 2 do
		if math.abs(path.curv[i]) > 1 / 140 then
			local j = i + 2
			for _, side in ipairs({ -1, 1 }) do
				local a = path.pos[i] + path.right[i] * side * (W / 2 + 1.1)
				local b = path.pos[j] + path.right[j] * side * (W / 2 + 1.1)
				local color = ((i // 2) % 2 == 0) and Color3.fromRGB(215, 30, 35) or Color3.fromRGB(245, 245, 245)
				strip(folder, a, b, 2.2, 0.4, color, nil, 0.12)
				tick()
			end
		end
	end

	-- Pit lane area (indices near the start/finish line).
	local pitSide = path.pitSide
	local pitHalf = path.pitHalf
	local function inPitZone(i, extra)
		local d = (i - 1) * path.ds
		local fromLine = math.min(d, path.length - d)
		return fromLine <= pitHalf + (extra or 0)
	end

	progress(0.5, "Putting up the barriers")
	-- 5. Barriers, skipped where they would cross another part of the track.
	local wallHeight = track.street and 3.4 or 2.2
	local wallColor = track.street and Color3.fromRGB(200, 200, 195) or Color3.fromRGB(185, 190, 200)
	local wallMaterial = track.street and Enum.Material.Concrete or Enum.Material.Metal
	for _, side in ipairs({ -1, 1 }) do
		local lateral = side * (W / 2 + runoff)
		local include = function(i)
			if side == pitSide and inPitZone(i, 70) then
				return false
			end
			local p = path.pos[i] + path.right[i] * lateral
			return not nearOtherSection(path, hash, p, i, W / 2 + 5)
		end
		for _, seg in ipairs(runs(path, lateral, include, 70, 5)) do
			local a, b = seg[1], seg[2]
			local len = (b - a).Magnitude
			if len > 0.5 then
				newPart({
					Size = Vector3.new(1, wallHeight, len + 0.8),
					CFrame = CFrame.lookAt((a + b) / 2, b) * CFrame.new(0, wallHeight / 2, 0),
					Color = wallColor,
					Material = wallMaterial,
				}, folder)
				tick()
			end
		end
	end

	progress(0.62, "Building the pit lane")
	-- 6. Pit lane, pit wall, entry/exit roads and garages.
	local pitLat = pitSide * Config.Track.PitLaneOffset
	local pitW = Config.Track.PitLaneWidth
	local firstPit = TrackPath.indexAt(path, -pitHalf)
	local lastPit = TrackPath.indexAt(path, pitHalf)
	for _, seg in ipairs(runs(path, pitLat, nil, 80, 4, firstPit, lastPit)) do
		strip(folder, seg[1], seg[2], pitW, 1, Color3.fromRGB(62, 64, 70), Enum.Material.Asphalt, 0)
		tick()
	end
	local function lanePoint(d, lateral)
		local p = TrackPath.posAt(path, d)
		return p + TrackPath.rightAt(path, d) * lateral
	end
	strip(folder, lanePoint(-pitHalf - 60, pitSide * (W / 2 - 3)), lanePoint(-pitHalf, pitLat), 10, 1, asphalt, Enum.Material.Asphalt, -0.02)
	strip(folder, lanePoint(pitHalf, pitLat), lanePoint(pitHalf + 60, pitSide * (W / 2 - 3)), 10, 1, asphalt, Enum.Material.Asphalt, -0.02)
	local wallLat = pitSide * (W / 2 + (Config.Track.PitLaneOffset - pitW / 2 - W / 2) / 2)
	local firstWall = TrackPath.indexAt(path, -pitHalf + 15)
	local lastWall = TrackPath.indexAt(path, pitHalf - 15)
	for _, seg in ipairs(runs(path, wallLat, nil, 80, 4, firstWall, lastWall)) do
		local a, b = seg[1], seg[2]
		newPart({
			Size = Vector3.new(1.2, 1.8, (b - a).Magnitude + 0.5),
			CFrame = CFrame.lookAt((a + b) / 2, b) * CFrame.new(0, 0.9, 0),
			Color = Color3.fromRGB(235, 235, 235),
			Material = Enum.Material.Concrete,
		}, folder)
	end
	-- Garages: one per team, the player's team where its cars stop.
	local teamColors = { Config.PlayerColors[1].color }
	for _, t in ipairs(Config.AITeams) do
		table.insert(teamColors, t.color)
	end
	local garageLat = pitSide * (Config.Track.PitLaneOffset + pitW / 2 + 7)
	local garageIndex = 0
	local d = -pitHalf + 12
	while d < pitHalf - 8 do
		garageIndex += 1
		local p = lanePoint(d, garageLat)
		local _, tangent = TrackPath.posAt(path, d)
		local color = teamColors[(garageIndex - 1) % #teamColors + 1]
		local garage = newPart({
			Name = "Garage",
			Size = Vector3.new(14, 9, 13),
			CFrame = CFrame.lookAt(p, p + tangent) * CFrame.new(0, 4.5, 0),
			Color = Color3.fromRGB(60, 62, 70),
			Material = Enum.Material.Concrete,
		}, folder)
		newPart({
			Size = Vector3.new(14.2, 2, 13.2),
			CFrame = garage.CFrame * CFrame.new(0, 3.6, 0),
			Color = color,
		}, folder)
		d += 16
	end
	-- Pit box markings where the cars stop.
	local stopPoint = lanePoint(pitHalf / 2, pitLat)
	local _, stopTan = TrackPath.posAt(path, pitHalf / 2)
	newPart({
		Size = Vector3.new(6, 0.1, 9),
		CFrame = CFrame.lookAt(stopPoint, stopPoint + stopTan) * CFrame.new(0, 0.06, 0),
		Color = Color3.fromRGB(240, 200, 30),
	}, folder)

	progress(0.72, "Start line and grid")
	-- 7. Start/finish line, gantry and grid boxes.
	local p0, t0 = TrackPath.posAt(path, 0)
	local r0 = t0:Cross(UP)
	local lineCF = CFrame.lookAt(p0, p0 + t0)
	for row = 0, 1 do
		for col = 0, 7 do
			local white = (row + col) % 2 == 0
			local lateral = -W / 2 + (col + 0.5) * (W / 8)
			newPart({
				Size = Vector3.new(W / 8, 0.12, 1.5),
				CFrame = lineCF * CFrame.new(lateral, 0.07, (row - 0.5) * 1.5),
				Color = white and Color3.new(1, 1, 1) or Color3.new(0.05, 0.05, 0.05),
			}, folder)
		end
	end
	for _, side in ipairs({ -1, 1 }) do
		newPart({
			Size = Vector3.new(1.5, 12, 1.5),
			CFrame = CFrame.new(p0 + r0 * side * (W / 2 + 3) + UP * 6),
			Color = Color3.fromRGB(40, 40, 45),
			Material = Enum.Material.Metal,
		}, folder)
	end
	local beam = newPart({
		Size = Vector3.new(W + 8, 3, 1.5),
		CFrame = lineCF * CFrame.new(0, 12.5, 0),
		Color = Color3.fromRGB(30, 30, 35),
	}, folder)
	local sg = Instance.new("SurfaceGui")
	sg.Face = Enum.NormalId.Back
	sg.CanvasSize = Vector2.new(400, 40)
	sg.Parent = beam
	local sgText = Instance.new("TextLabel")
	sgText.Size = UDim2.new(1, 0, 1, 0)
	sgText.BackgroundTransparency = 1
	sgText.Text = string.upper(track.name)
	sgText.TextColor3 = Color3.new(1, 1, 1)
	sgText.Font = Enum.Font.GothamBold
	sgText.TextScaled = true
	sgText.Parent = sg
	for slot = 1, 20 do
		local gd, glat = TrackPath.gridSlot(path, slot)
		local gp, gt = TrackPath.posAt(path, gd + 3)
		local gr = gt:Cross(UP)
		local at = gp + gr * glat
		newPart({
			Size = Vector3.new(4.5, 0.1, 0.5),
			CFrame = CFrame.lookAt(at, at + gt) * CFrame.new(0, 0.06, 0),
			Color = Color3.new(1, 1, 1),
		}, folder)
	end

	progress(0.8, "Building grandstands")
	-- 8. Grandstands opposite the pits.
	local standLat = -pitSide * (W / 2 + runoff + 14)
	for k = -1, 1 do
		local sd = k * 95
		local sp = lanePoint(sd, standLat)
		local _, st = TrackPath.posAt(path, sd)
		local outward = st:Cross(UP) * -pitSide
		local base = CFrame.lookAt(sp, sp + st)
		for stepIndex = 0, 3 do
			local seatColor = teamColors[rng:NextInteger(1, #teamColors)]
			newPart({
				Size = Vector3.new(8, 2 + stepIndex * 2.4, 80),
				CFrame = base * CFrame.new(0, 1 + stepIndex * 1.2, 0) + outward * (stepIndex * 7),
				Color = seatColor:Lerp(Color3.fromRGB(120, 120, 130), 0.4),
				Material = Enum.Material.SmoothPlastic,
			}, folder)
		end
		newPart({
			Size = Vector3.new(34, 1, 84),
			CFrame = base * CFrame.new(0, 16, 0) + outward * 11,
			Color = Color3.fromRGB(230, 230, 235),
		}, folder)
	end

	progress(0.86, "Planting scenery")
	-- 9. Scenery: trees, or buildings on street circuits.
	local placed, attempts = 0, 0
	local wanted = track.street and 110 or 170
	while placed < wanted and attempts < wanted * 6 do
		attempts += 1
		local i = rng:NextInteger(1, path.n)
		local side = rng:NextNumber() < 0.5 and -1 or 1
		local dist = W / 2 + runoff + rng:NextNumber(14, 140)
		local p = path.pos[i] + path.right[i] * side * dist
		p = Vector3.new(p.X, origin.Y, p.Z)
		local clearance = track.street and 40 or 22
		if not nearOtherSection(path, hash, p, nil, W / 2 + runoff + clearance) then
			placed += 1
			if track.street then
				local h = rng:NextNumber(18, 90)
				local sx, sz = rng:NextNumber(18, 36), rng:NextNumber(18, 36)
				local tone = rng:NextNumber(0.55, 0.9)
				newPart({
					Size = Vector3.new(sx, h, sz),
					CFrame = CFrame.new(p + UP * (h / 2)) * CFrame.Angles(0, math.atan2(path.tan[i].X, path.tan[i].Z), 0),
					Color = Color3.new(tone, tone * rng:NextNumber(0.9, 1), tone * rng:NextNumber(0.85, 1.05)),
					Material = Enum.Material.Concrete,
					CastShadow = true,
				}, folder)
			else
				local h = rng:NextNumber(7, 13)
				newPart({
					Shape = Enum.PartType.Cylinder,
					Size = Vector3.new(h, 1.6, 1.6),
					CFrame = CFrame.new(p + UP * (h / 2)) * CFrame.Angles(0, 0, math.pi / 2),
					Color = Color3.fromRGB(100, 70, 45),
					Material = Enum.Material.Wood,
				}, folder)
				local leaf = rng:NextNumber(7, 12)
				newPart({
					Shape = Enum.PartType.Ball,
					Size = Vector3.new(leaf, leaf, leaf),
					CFrame = CFrame.new(p + UP * (h + leaf * 0.3)),
					Color = Color3.fromRGB(40, rng:NextInteger(95, 135), 45),
					Material = Enum.Material.Grass,
					CastShadow = true,
				}, folder)
			end
			tick()
		end
	end

	-- 10. Floodlights for night races.
	if track.night then
		progress(0.94, "Switching on the floodlights")
		local spacing = 110
		local k = 0
		local dist = 0
		while dist < path.length do
			k += 1
			local side = (k % 2 == 0) and 1 or -1
			local i = TrackPath.indexAt(path, dist)
			local p = path.pos[i] + path.right[i] * side * (W / 2 + runoff + 4)
			if not nearOtherSection(path, hash, p, i, W / 2 + 3) then
				local pole = newPart({
					Size = Vector3.new(1, 18, 1),
					CFrame = CFrame.new(p + UP * 9),
					Color = Color3.fromRGB(60, 60, 65),
				}, folder)
				local lamp = newPart({
					Size = Vector3.new(4, 1, 2),
					CFrame = pole.CFrame * CFrame.new(0, 9.5, 0),
					Color = Color3.fromRGB(255, 250, 220),
					Material = Enum.Material.Neon,
				}, folder)
				local light = Instance.new("PointLight")
				light.Range = 60
				light.Brightness = 2.5
				light.Color = Color3.fromRGB(255, 245, 225)
				light.Parent = lamp
			end
			dist += spacing
			tick()
		end
	end

	-- 11. TV camera positions round the lap.
	local tvCams = {}
	local camDist = 0
	local camSide = 1
	while camDist < path.length do
		local i = TrackPath.indexAt(path, camDist)
		local p = path.pos[i] + path.right[i] * camSide * (W / 2 + runoff + 22) + UP * 16
		table.insert(tvCams, { pos = p, d = camDist })
		camDist += 260
		camSide = -camSide
	end

	setLighting(track)
	progress(1, "Ready")
	TrackBuilder.buildingId = nil

	TrackBuilder.current = {
		id = trackId,
		track = track,
		folder = folder,
		path = path,
		center = center,
		radius = radius,
		tvCams = tvCams,
		roadParts = roadParts,
	}
	return TrackBuilder.current
end

-- Makes the road shiny when it is wet.
function TrackBuilder.setWetness(wetness)
	local cur = TrackBuilder.current
	if not cur then
		return
	end
	local reflect = math.clamp(wetness * 0.35, 0, 0.35)
	if cur.lastReflect and math.abs(cur.lastReflect - reflect) < 0.03 then
		return
	end
	cur.lastReflect = reflect
	local color = Color3.fromRGB(52, 54, 60):Lerp(Color3.fromRGB(30, 32, 38), math.clamp(wetness, 0, 1))
	for _, p in ipairs(cur.roadParts) do
		p.Reflectance = reflect
		p.Color = color
	end
end

function TrackBuilder.clear()
	if TrackBuilder.current then
		TrackBuilder.current.folder:Destroy()
		TrackBuilder.current = nil
	end
end

return TrackBuilder
