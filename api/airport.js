// Vercel serverless function — resolves an IATA or ICAO code to airport
// metadata (name, lat, lon). Used by:
//   1. The dropdown's "Custom…" text input
//   2. The radar's route-line rendering when an aircraft is selected
//
// Endpoint: GET /api/airport?code=DUB
//
// Returns: { iata, icao, name, city, country, lat, lon } or
//          { code, missing: true } when the code isn't in our bundled
//          ~200-airport table. (No upstream fallback — keeps cold start
//          fast and avoids extra dependencies.)

import { findAirport } from "./_airports.js";

export default function handler(req, res) {
  const code = (req.query.code || "").toString().trim().toUpperCase();
  if (!/^[A-Z0-9]{3,4}$/.test(code)) {
    return res.status(400).json({ error: "code must be 3 (IATA) or 4 (ICAO) chars" });
  }
  const hit = findAirport(code);
  res.setHeader("Cache-Control", "public, s-maxage=86400");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (!hit) return res.status(200).json({ code, missing: true });
  res.status(200).json(hit);
}
