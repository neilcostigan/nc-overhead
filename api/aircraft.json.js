// Vercel serverless function — fetches public ADS-B data from adsb.fi and
// reshapes it into the dump1090 schema the static index.html expects.
//
// Endpoint: GET /api/aircraft.json?lat=…&lon=…&dist=…
//   lat, lon, dist are optional; default to Stockholm Arlanda, 100 nm.
//
// Why a serverless function rather than fetching adsb.fi directly from
// the browser:
//   1. Avoids any CORS uncertainty if the upstream changes its headers.
//   2. Single shared rate budget (1 req/sec, upstream's limit) instead
//      of one per visitor.
//   3. Lets us hide / swap the upstream URL without shipping a new bundle.
//
// Runtime: Vercel Node 18+. No external deps.

const UPSTREAM = "https://opendata.adsb.fi/api/v3";

// In-memory cache so repeat browser polls within CACHE_MS reuse the same
// upstream response. Vercel functions are short-lived but a warm instance
// holds module state across calls — keeps us well under the 1 req/s limit.
const CACHE_MS = 1500;
const cache = new Map();   // key: "lat,lon,dist" → { ts, body }

export default async function handler(req, res) {
  const lat  = parseFloat(req.query.lat)  || 59.6519;  // ARN default
  const lon  = parseFloat(req.query.lon)  || 17.9186;
  const dist = Math.min(250, parseFloat(req.query.dist) || 100);

  const key = `${lat.toFixed(4)},${lon.toFixed(4)},${Math.round(dist)}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < CACHE_MS) {
    res.setHeader("X-Cache", "HIT");
    return ok(res, hit.body);
  }

  try {
    const url = `${UPSTREAM}/lat/${lat.toFixed(4)}/lon/${lon.toFixed(4)}/dist/${Math.round(dist)}`;
    const r = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "lnrsFlightSense/online (https://github.com/)"
      }
    });
    if (!r.ok) {
      res.status(502).json({ error: `upstream ${r.status}`, upstream: url });
      return;
    }
    const data = await r.json();
    // adsb.fi v3 returns { ac: [...], ctime, ... }
    // dump1090 expects { now, messages, aircraft: [...] }
    const body = {
      now: Math.floor(now / 1000),
      messages: 0,
      aircraft: Array.isArray(data.ac) ? data.ac : []
    };
    cache.set(key, { ts: now, body });
    res.setHeader("X-Cache", "MISS");
    ok(res, body);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}

function ok(res, body) {
  res.setHeader("Cache-Control", "public, s-maxage=1, stale-while-revalidate=5");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json(body);
}
