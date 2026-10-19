--[[
	TrackPath (ModuleScript)
	Location: ReplicatedStorage > Shared > TrackPath

	Turns a circuit's waypoint list into a smooth racing line made of evenly
	spaced samples. Both the server (race timing) and the client (drawing cars,
	driving) use it, so a car's position always matches on both sides.

	Key ideas:
	  * Distance "d" is measured in studs along the centreline from the start line.
	  * A speed profile (slow in corners, fast on straights) is worked out once.
	    "Time fraction" is how far through a lap a car is in time, which lets the
	    server say "car is 40% through its lap" and the client turn that into a
	    spot on the track where the car is slower in corners.
]]

local Shared = script.Parent
local Config = require(Shared:WaitForChild("Config"))

local TrackPath = {}

local cache = {}

-- Centripetal Catmull-Rom spline point between p1 and p2 (t from 0 to 1).
-- The centripetal version never makes loops or kinks between close points.
local function catmullRom(p0, p1, p2, p3, t)
	local function knot(a, b)
		return math.max((b - a).Magnitude ^ 0.5, 0.0001)
	end
	local t0 = 0
	local t1 = t0 + knot(p0, p1)
	local t2 = t1 + knot(p1, p2)
	local t3 = t2 + knot(p2, p3)
	local tt = t1 + (t2 - t1) * t
	local a1 = p0 * ((t1 - tt) / (t1 - t0)) + p1 * ((tt - t0) / (t1 - t0))
	local a2 = p1 * ((t2 - tt) / (t2 - t1)) + p2 * ((tt - t1) / (t2 - t1))
	local a3 = p2 * ((t3 - tt) / (t3 - t2)) + p3 * ((tt - t2) / (t3 - t2))
	local b1 = a1 * ((t2 - tt) / (t2 - t0)) + a2 * ((tt - t0) / (t2 - t0))
	local b2 = a2 * ((t3 - tt) / (t3 - t1)) + a3 * ((tt - t1) / (t3 - t1))
	return b1 * ((t2 - tt) / (t2 - t1)) + b2 * ((tt - t1) / (t2 - t1))
end

local function flat(v)
	local f = Vector3.new(v.X, 0, v.Z)
	if f.Magnitude < 1e-6 then
		return Vector3.new(0, 0, -1)
	end
	return f.Unit
end

-- Builds the speed profile and cumulative lap time for a given grip and top speed.
local function buildProfile(path, gripMul, speedMul)
	local n = path.n
	local ds = path.ds
	local vmax = Config.Drive.TopSpeed * speedMul
	local aLat = Config.Drive.LateralGrip * gripMul
	local accel = Config.Drive.Accel * math.max(0.6, speedMul)
	local brake = Config.Drive.Brake * gripMul
	local v = table.create(n, 0)
	for i = 1, n do
		local c = math.abs(path.curv[i])
		local limit = vmax
		if c > 1e-5 then
			limit = math.min(vmax, math.sqrt(aLat / c))
		end
		v[i] = math.max(limit, 12)
	end
	-- Two passes around the loop so braking and acceleration wrap past the start line.
	for _ = 1, 2 do
		for i = 1, n do
			local prev = v[(i - 2) % n + 1]
			v[i] = math.min(v[i], math.sqrt(prev * prev + 2 * accel * ds))
		end
		for i = n, 1, -1 do
			local nxt = v[i % n + 1]
			v[i] = math.min(v[i], math.sqrt(nxt * nxt + 2 * brake * ds))
		end
	end
	local times = table.create(n + 1, 0)
	local total = 0
	for i = 1, n do
		times[i] = total
		local nxt = v[i % n + 1]
		total += ds / ((v[i] + nxt) * 0.5)
	end
	times[n + 1] = total
	return v, times, total
end

function TrackPath.get(track)
	local cached = cache[track.id]
	if cached then
		return cached
	end

	local scale = Config.Track.Scale
	local origin = Config.Track.Origin
	local raw = {}
	for i, p in ipairs(track.points) do
		raw[i] = Vector3.new(p[1] * scale, p[3] or 0, -p[2] * scale)
	end
	local count = #raw

	-- 1. Smooth spline through the waypoints.
	local dense = {}
	for i = 1, count do
		local p0 = raw[(i - 2) % count + 1]
		local p1 = raw[i]
		local p2 = raw[i % count + 1]
		local p3 = raw[(i + 1) % count + 1]
		local steps = math.max(2, math.ceil((p2 - p1).Magnitude / 2))
		for s = 0, steps - 1 do
			table.insert(dense, catmullRom(p0, p1, p2, p3, s / steps))
		end
	end

	-- 2. Re-sample at an even spacing.
	local denseCount = #dense
	local cum = table.create(denseCount + 1, 0)
	for i = 2, denseCount + 1 do
		local a = dense[i - 1]
		local b = dense[(i - 1) % denseCount + 1]
		cum[i] = cum[i - 1] + (b - a).Magnitude
	end
	local length = cum[denseCount + 1]
	local n = math.max(50, math.floor(length / Config.Track.SampleSpacing))
	local ds = length / n
	local pos = table.create(n)
	local j = 1
	for i = 1, n do
		local target = (i - 1) * ds
		while j < denseCount and cum[j + 1] < target do
			j += 1
		end
		local a = dense[j]
		local b = dense[j % denseCount + 1]
		local segLen = cum[j + 1] - cum[j]
		local f = segLen > 0 and (target - cum[j]) / segLen or 0
		pos[i] = origin + a:Lerp(b, math.clamp(f, 0, 1))
	end

	-- 3. Direction, right-hand side and curvature at every sample.
	local tan = table.create(n)
	local right = table.create(n)
	for i = 1, n do
		local a = pos[(i - 2) % n + 1]
		local b = pos[i % n + 1]
		tan[i] = flat(b - a)
		right[i] = tan[i]:Cross(Vector3.yAxis)
	end
	local curv = table.create(n, 0)
	local k = 3
	for i = 1, n do
		local t1 = tan[(i - 1 - k) % n + 1]
		local t2 = tan[(i - 1 + k) % n + 1]
		local dot = math.clamp(t1:Dot(t2), -1, 1)
		local angle = math.acos(dot)
		local sign = t1:Cross(t2).Y >= 0 and 1 or -1 -- positive = left turn
		curv[i] = sign * angle / (2 * k * ds)
	end

	local path = {
		id = track.id,
		track = track,
		n = n,
		ds = ds,
		length = length,
		pos = pos,
		tan = tan,
		right = right,
		curv = curv,
		width = Config.Track.Width,
		runoff = track.street and Config.Track.StreetRunoff or Config.Track.Runoff,
		pitSide = track.pitSide or -1,
		pitHalf = track.pitHalf or 200,
		profiles = {},
	}
	local speed, times, total = buildProfile(path, 1, 1)
	path.speed = speed
	path.times = times
	path.profileTime = total
	path.profiles["1_1"] = total

	cache[track.id] = path
	return path
end

-- Ideal lap time (seconds of real driving) for a given grip and top-speed multiplier.
function TrackPath.profileTime(path, gripMul, speedMul)
	local key = string.format("%.2f_%.2f", gripMul, speedMul)
	local cachedTime = path.profiles[key]
	if cachedTime then
		return cachedTime
	end
	local _, _, total = buildProfile(path, gripMul, speedMul)
	path.profiles[key] = total
	return total
end

function TrackPath.wrap(path, d)
	return d % path.length
end

-- Position and forward direction at distance d.
function TrackPath.posAt(path, d)
	d = d % path.length
	local f = d / path.ds
	local i = math.floor(f) + 1
	local frac = f - (i - 1)
	local i2 = i % path.n + 1
	local p = path.pos[i]:Lerp(path.pos[i2], frac)
	local t = path.tan[i]:Lerp(path.tan[i2], frac)
	if t.Magnitude < 1e-6 then
		t = path.tan[i]
	end
	return p, t.Unit
end

function TrackPath.rightAt(path, d)
	local _, t = TrackPath.posAt(path, d)
	return t:Cross(Vector3.yAxis)
end

function TrackPath.indexAt(path, d)
	d = d % path.length
	return math.floor(d / path.ds) + 1
end

-- A CFrame on the track at distance d, shifted sideways by "lateral" studs (positive = right).
function TrackPath.cframeAt(path, d, lateral, height)
	local p, t = TrackPath.posAt(path, d)
	local r = t:Cross(Vector3.yAxis)
	local at = p + r * (lateral or 0) + Vector3.new(0, height or 0, 0)
	-- Look slightly ahead so cars tilt up and down over the bridge.
	local ahead = TrackPath.posAt(path, d + 4) + r * (lateral or 0) + Vector3.new(0, height or 0, 0)
	if (ahead - at).Magnitude < 0.01 then
		ahead = at + t
	end
	return CFrame.lookAt(at, ahead)
end

-- Fraction of lap time (0-1) at distance d.
function TrackPath.fracAtDist(path, d)
	d = d % path.length
	local f = d / path.ds
	local i = math.floor(f) + 1
	local frac = f - (i - 1)
	local a = path.times[i]
	local b = path.times[i + 1]
	return (a + (b - a) * frac) / path.profileTime
end

-- Distance (studs) at a fraction (0-1) of lap time. Binary search on the time table.
function TrackPath.distAtFrac(path, frac)
	frac = math.clamp(frac, 0, 1)
	local target = frac * path.profileTime
	local times = path.times
	local lo, hi = 1, path.n + 1
	while hi - lo > 1 do
		local mid = (lo + hi) // 2
		if times[mid] <= target then
			lo = mid
		else
			hi = mid
		end
	end
	local a = times[lo]
	local b = times[lo + 1] or path.profileTime
	local f = b > a and (target - a) / (b - a) or 0
	return ((lo - 1) + f) * path.ds
end

-- Finds the closest centreline point to a world position.
-- hint: index to search around (keeps the bridge crossing from confusing it).
-- Returns: index, distance along the lap, sideways offset (positive = right).
function TrackPath.nearest(path, worldPos, hint, window)
	local n = path.n
	local bestI, bestD = 1, math.huge
	local function test(i)
		local p = path.pos[i]
		local dx, dz, dy = worldPos.X - p.X, worldPos.Z - p.Z, (worldPos.Y - p.Y) * 3
		local dd = dx * dx + dz * dz + dy * dy
		if dd < bestD then
			bestD = dd
			bestI = i
		end
	end
	if hint then
		local w = window or 40
		for o = -w, w do
			test((hint - 1 + o) % n + 1)
		end
	else
		for i = 1, n do
			test(i)
		end
	end
	local p = path.pos[bestI]
	local t = path.tan[bestI]
	local offset = worldPos - p
	local along = (bestI - 1) * path.ds + offset:Dot(t)
	local lateral = offset:Dot(path.right[bestI])
	return bestI, along % path.length, lateral
end

-- Where grid slot "slot" (1 = pole) sits: distance and sideways offset.
function TrackPath.gridSlot(path, slot)
	local d = -(16 + (slot - 1) * 9)
	local lateral = (slot % 2 == 1) and -4.5 or 4.5
	return d, lateral
end

return TrackPath
