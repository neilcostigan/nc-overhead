// Provider router. Reads {provider, apiKey, baseUrl, model} off the
// per-request settings, falls back to env vars / defaults, dispatches
// to the right backend client.
//
// Used by /api/explain and /api/analyse so the routing logic lives in
// one place and stays testable.

import { callGemini } from "./_gemini.js";
import { callOpenAI } from "./_openai.js";

/**
 * @param {string} prompt
 * @param {object} settings  { provider?, apiKey?, baseUrl?, model? }
 *                            from the browser localStorage
 * @param {object} opts      { maxTokens?, temperature? }
 */
export async function callLlm(prompt, settings = {}, opts = {}) {
  const provider = pickProvider(settings);
  if (provider === "openai") {
    return callOpenAI(prompt, {
      key:     settings.apiKey  || process.env.OPENAI_API_KEY,
      baseUrl: settings.baseUrl || process.env.OPENAI_BASE_URL,
      model:   settings.model   || process.env.OPENAI_MODEL,
      ...opts
    });
  }
  // Default Gemini
  return callGemini(prompt, {
    key: settings.apiKey || process.env.GEMINI_API_KEY,
    ...opts
  });
}

function pickProvider(settings) {
  const p = (settings.provider || "").toLowerCase();
  if (p === "openai" || p === "gemini") return p;
  // Auto: prefer whichever has a key configured (user-side first, then env).
  if (settings.apiKey) return p || "gemini";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "gemini";  // will 503 with clear message
}
