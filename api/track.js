// Vercel serverless function — fetches up to ~60 minutes of past
// position fixes for a single aircraft. Tries OpenSky first
// (/tracks/all), falls back to airplanes.live's /v2/icao/<hex>
// trace endpoint when OpenSky says no.
//
// Endpoint: GET /api/track?hex=ABC123
//
// Returns: { hex, path: [[lat, lon, altFt, t], ...], source }
// or       { hex, missing: true }

const OPENSKY = "https://opensky-network.org/api/tracks/all";
const ALIVE   = "https://api.airplanes.live/v2/icao";  // /<hex>

const CACHE_MS = 60 * 1000;
const cache = new Map();

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

  // 1) Try OpenSky.
  let body = await fetchOpenSky(hex, now);
  if (!body.path || body.path.length < 2) {
    // 2) Fall back to airplanes.live.
    const alt = await fetchAirplanesLive(hex, now);
    if (alt.path && alt.path.length >= 2) body = alt;
    else if (!body.path) body = alt;
  }
  cache.set(hex, { ts: now, body });
  res.setHeader("X-Cache", "MISS");
  ok(res, body);
}

async function fetchOpenSky(hex, now) {
  try {
    const r = await fetch(`${OPENSKY}?icao24=${hex}&time=0`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "nc-overhead/0.1 (https://overhead-nc.vercel.app)"
      }
    });
    if (!r.ok) return { hex, source: "opensky", _upstream: r.status };
    const data = await r.json();
    const raw = Array.isArray(data.path) ? data.path : [];
    const path = raw.map(p => ([
      p[1], p[2],
      typeof p[3] === "number" ? p[3] * M_TO_FT : null,
      p[0] ? p[0] * 1000 : now
    ])).filter(p => typeof p[0] === "number" && typeof p[1] === "number");
    return { hex, source: "opensky", path };
  } catch (e) {
    return { hex, source: "opensky", _error: String(e) };
  }
}

async function fetchAirplanesLive(hex, now) {
  // airplanes.live returns the current state plus a `trace` field for
  // recently-seen aircraft (when its feeders have tracked it).
  try {
    const r = await fetch(`${ALIVE}/${hex}`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "nc-overhead/0.1"
      }
    });
    if (!r.ok) return { hex, source: "alive", _upstream: r.status };
    const data = await r.json();
    // ac[0].trace = [[seen_ago_s, lat, lon, alt_ft, gs, track, ...], ...]
    // newest first; we reverse to oldest-first for the client.
    const ac0 = Array.isArray(data.ac) ? data.ac[0] : null;
    const trace = ac0 && Array.isArray(ac0.trace) ? ac0.trace : [];
    const path = trace
      .filter(p => typeof p[1] === "number" && typeof p[2] === "number")
      .map(p => [
        p[1], p[2],
        typeof p[3] === "number" ? p[3] : null,
        now - (typeof p[0] === "number" ? p[0] * 1000 : 0)
      ])
      .reverse();
    return { hex, source: "alive", path };
  } catch (e) {
    return { hex, source: "alive", _error: String(e) };
  }
}

function ok(res, body) {
  res.setHeader("Cache-Control", "public, s-maxage=60");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json(body);
}
