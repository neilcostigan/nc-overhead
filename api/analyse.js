// Vercel serverless function — sends the current visible aircraft list to
// Gemini and asks for a one-paragraph "what's going on overhead right now"
// summary plus a few bullets on the standout flights.
//
// Before calling the LLM, fans out to adsbdb.com to enrich each callsign
// with airline + origin/destination so the model has something concrete to
// say beyond "altitudes and speeds". Route lookups are aggressively cached
// (6 h) so repeat calls on the same fleet are essentially free.
//
// Endpoint: POST /api/analyse
//   body: { city: "ARN", aircraft: [{hex, flight, alt_baro, gs, track, lat, lon, distNm}, ...] }
//
// Returns: { text, model, enriched: <int> } or { error }
//
// Requires GEMINI_API_KEY env var (same one used by /api/explain).

import { callGemini } from "./_gemini.js";

const ADSBDB_URL = "https://api.adsbdb.com/v0/callsign";

// Short cache for analysis text so a double-click doesn't waste a call.
const CACHE_MS = 60 * 1000;
const cache = new Map();

// Route enrichment cache — 6 h, keyed by callsign.
const ROUTE_CACHE_MS = 6 * 60 * 60 * 1000;
const routeCache = new Map();

/** Fetch the adsbdb.com route for a callsign, with caching. Returns
 *  { airline, origin, destination, originName, destName } or null. */
async function fetchRoute(callsign) {
  if (!callsign) return null;
  const cs = callsign.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,8}$/.test(cs)) return null;
  const now = Date.now();
  const hit = routeCache.get(cs);
  if (hit && now - hit.ts < ROUTE_CACHE_MS) return hit.value;
  try {
    const r = await fetch(`${ADSBDB_URL}/${cs}`, {
      headers: { "Accept": "application/json",
                 "User-Agent": "nc-overhead/0.1" }
    });
    if (!r.ok) { routeCache.set(cs, { ts: now, value: null }); return null; }
    const data = await r.json();
    const fr = data?.response?.flightroute || {};
    const value = {
      airline:     fr.airline?.name || null,
      origin:      fr.origin?.iata_code || fr.origin?.icao_code || null,
      destination: fr.destination?.iata_code || fr.destination?.icao_code || null,
      originName:  fr.origin?.municipality   || fr.origin?.name   || null,
      destName:    fr.destination?.municipality || fr.destination?.name || null,
    };
    routeCache.set(cs, { ts: now, value });
    return value;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(503).json({
      error: "Analyse disabled — set GEMINI_API_KEY in Vercel env vars"
    });
  }
  const { city = "", aircraft = [], mode = "scene" } = req.body || {};
  if (!Array.isArray(aircraft) || aircraft.length === 0) {
    return res.status(400).json({ error: "no aircraft in payload" });
  }

  // Mode-specific aircraft selection.
  //   scene     — closest 25 (mix of arrivals, departures, transits)
  //   overflies — high & far: alt ≥ 25 000 ft AND dist ≥ 30 nm, top 25 by alt
  let candidates;
  if (mode === "overflies") {
    candidates = aircraft
      .filter(a => typeof a.alt_baro === "number" && a.alt_baro >= 25000)
      .filter(a => typeof a.distNm === "number" && a.distNm >= 30)
      .sort((a, b) => (b.alt_baro || 0) - (a.alt_baro || 0));
  } else {
    candidates = aircraft.slice(); // already sorted by distance in the client
  }
  if (candidates.length === 0) {
    return res.status(200).json({
      text: mode === "overflies"
          ? "_Nothing high overhead right now — no aircraft above FL250 in range._"
          : "_No aircraft visible to summarise._",
      model: null,
      enriched: 0
    });
  }

  // Cache key includes mode so the two views don't collide.
  const fp = candidates.slice(0, 30).map(a => a.hex || "").sort().join(",");
  const ckey = mode + "|" + city + "|" + fp.slice(0, 200);
  const now = Date.now();
  const hit = cache.get(ckey);
  if (hit && now - hit.ts < CACHE_MS) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json({ text: hit.text, model: hit.model });
  }

  // Enrich the top 25 with route + airline in parallel. Each lookup hits
  // adsbdb.com (free, no auth). 25 is a balance: covers the user's
  // interesting set without making adsbdb angry.
  const top = candidates.slice(0, 25);
  const routes = await Promise.allSettled(top.map(a => fetchRoute(a.flight)));
  let enrichedCount = 0;

  const lines = top.map((a, i) => {
    const cs = (a.flight || "").trim() || "(no callsign)";
    const alt = a.alt_baro === "ground" ? "ground"
              : (typeof a.alt_baro === "number" ? Math.round(a.alt_baro) + " ft" : "?");
    const spd = typeof a.gs === "number" ? Math.round(a.gs) + " kt" : "?";
    const trk = typeof a.track === "number" ? Math.round(a.track) + "°" : "?";
    const dist = typeof a.distNm === "number" ? Math.round(a.distNm) + " nm" : "?";

    const r = routes[i].status === "fulfilled" ? routes[i].value : null;
    let suffix = "";
    if (r) {
      enrichedCount++;
      const route = r.origin && r.destination
          ? `${r.origin}→${r.destination}` : null;
      const airline = r.airline || null;
      const cityRoute = r.originName && r.destName
          ? `(${r.originName}→${r.destName})` : null;
      suffix = "  " + [airline, route, cityRoute].filter(Boolean).join("  ");
    }

    return `  ${cs.padEnd(10)}  ${(a.hex||"").padEnd(7)}  alt ${alt}  spd ${spd}  trk ${trk}  dist ${dist}${suffix}`;
  }).join("\n");

  const prompt = mode === "overflies"
      ? overfliesPrompt({ city, all: aircraft, top, lines })
      : scenePrompt   ({ city, all: aircraft, top, lines });

  const result = await callGemini(prompt, { key, maxTokens: 600 });
  if (result.error) {
    return res.status(502).json({
      error: result.error,
      status: result.status,
      body: result.body,
      model: result.model
    });
  }
  cache.set(ckey, { ts: now, text: result.text, model: result.model });
  res.setHeader("X-Cache", "MISS");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    text: result.text,
    model: result.model,
    enriched: enrichedCount
  });
}

function scenePrompt({ city, all, top, lines }) {
  return `You are an aviation assistant. The user is watching live ADS-B traffic
around ${city || "an airport"}. ${all.length} aircraft are currently
in range. The closest ${top.length} are listed below, with airline and
scheduled route appended where adsbdb.com could resolve them.

Write a short paragraph (no headers, no preamble) describing what's
going on in the sky right now — the dominant flow (which airlines and
which routes are most represented, are people arriving or departing),
any standouts (rare routes, unusual altitudes, military or business
traffic if you can spot it from the callsign / airline), and anything
notable.

Then 3-5 bullet points on the most interesting individual flights.
Mention each one by callsign, airline, route, and what makes it
interesting in one short sentence. Keep the whole reply under 180 words.
Stay factual; if you can't identify something, say so.

Aircraft (top ${top.length} of ${all.length}):
${lines}`;
}

function overfliesPrompt({ city, all, top, lines }) {
  return `You are an aviation assistant. The user is watching live ADS-B traffic
around ${city || "an airport"}. Below are the ${top.length} highest aircraft
currently in range (all at or above FL250, at least 30 nm out — so almost
certainly transit traffic rather than arrivals or departures).

Write a short paragraph (no headers, no preamble) describing the
high-altitude flow: which long-haul corridors are running overhead right
now, which way the traffic is moving (e.g. North Atlantic westbound,
European eastbound), which airlines dominate, and anything unusual
(unexpected airline, rare route, very high cruise altitude).

Then 3-5 bullet points on the most striking overflies. Each: callsign,
airline, route, why interesting (one short sentence). Keep the whole
reply under 160 words. Stay factual; if you can't identify a route, say
so rather than guess.

High-altitude aircraft (top ${top.length} of ${all.length} in range):
${lines}`;
}
