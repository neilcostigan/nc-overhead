// Vercel serverless function — fetches up to ~60 minutes of past
// position fixes for a single aircraft from OpenSky's public
// /tracks/all endpoint. Used by the 3D view to bootstrap visible
// trails on first open so the user doesn't have to wait for live
// ticks to build them up.
//
// Endpoint: GET /api/track?hex=ABC123
//
// Returns: { hex, path: [[lat, lon, altFt, t], ...] }  (oldest first)
// or       { hex, missing: true }
//
// OpenSky is free, no key required for public endpoints; rate-limited
// to a few requests per second per IP. We cache aggressively (60 s
// per hex) so an open 3D view doesn't hammer them.

const UPSTREAM = "https://opensky-network.org/api/tracks/all";

const CACHE_MS = 60 * 1000;
const cache = new Map();   // hex → { ts, body }

const M_TO_FT = 3.28084;

export default async function handler(req, res) {
  const hex = (req.query.hex || "").toString().trim().toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(hex)) {
    return res.status(400).json({ error: "hex must be 6 hex chars" });
  }
  const now = Date.now();
  const hit = cache.get(hex);
  if (hit && now - hit.ts < CACHE_MS) {
    res.setHeader("X-Cache", "HIT");
    return ok(res, hit.body);
  }

  try {
    // time=0 → latest available track segment
    const r = await fetch(`${UPSTREAM}?icao24=${hex}&time=0`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "nc-overhead/0.1 (https://overhead-nc.vercel.app)"
      }
    });
    if (r.status === 404) {
      const body = { hex, missing: true };
      cache.set(hex, { ts: now, body });
      return ok(res, body);
    }
    if (!r.ok) {
      return res.status(200).json({ hex, _upstream: r.status });
    }
    const data = await r.json();
    // path: [[time, lat, lon, baroAltMetres, heading, onGround], ...]
    const raw = Array.isArray(data.path) ? data.path : [];
    const path = raw.map(p => ([
      p[1],                                        // lat
      p[2],                                        // lon
      typeof p[3] === "number" ? p[3] * M_TO_FT    // alt → ft
                                : 0,
      p[0] ? p[0] * 1000 : now                     // t (ms)
    ])).filter(p => typeof p[0] === "number" && typeof p[1] === "number");
    const body = { hex, path };
    cache.set(hex, { ts: now, body });
    res.setHeader("X-Cache", "MISS");
    ok(res, body);
  } catch (e) {
    res.status(200).json({ hex, _error: String(e) });
  }
}

function ok(res, body) {
  res.setHeader("Cache-Control", "public, s-maxage=60");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json(body);
}
