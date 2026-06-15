// Shared OpenAI-compatible call helper. Parallel to _gemini.js — same
// retry/fallback shape, exposed as callOpenAI(prompt, opts).
//
// "OpenAI-compatible" means it'll also work against any backend that
// implements the Chat Completions API: Ollama (/v1/chat/completions),
// LM Studio, OpenRouter, vLLM, Azure OpenAI, etc. Just point baseUrl
// at the provider.
//
// Default base URL: https://api.openai.com/v1
// Default model:    gpt-4o-mini  (fast + cheap; override per-request)

const DEFAULT_BASE = "https://api.openai.com/v1";
const PRIMARY_FALLBACK = "gpt-4o-mini";   // used if a model fails repeatedly

/**
 * @param {string} prompt
 * @param {object} opts  { key, baseUrl, model, maxTokens, temperature }
 * @returns {{ text, model } | { error, status, body? }}
 */
export async function callOpenAI(prompt, opts = {}) {
  const key = opts.key || process.env.OPENAI_API_KEY;
  if (!key) return { error: "OPENAI_API_KEY not set", status: 503 };

  const baseUrl = (opts.baseUrl || DEFAULT_BASE).replace(/\/$/, "");
  const primary = opts.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const fallback = primary === PRIMARY_FALLBACK ? "gpt-4o" : PRIMARY_FALLBACK;

  const maxTokens   = opts.maxTokens   || 1500;
  const temperature = opts.temperature ?? 0.3;

  const body = JSON.stringify({
    model: primary,
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    temperature
  });

  const attempts = [
    { model: primary,  wait: 0 },
    { model: primary,  wait: 700 },
    { model: fallback, wait: 1500 }
  ];

  let lastErr = { error: "no attempts ran", status: 500 };
  for (const a of attempts) {
    if (a.wait) await sleep(a.wait);
    try {
      const reqBody = a.model === primary
          ? body
          : JSON.stringify({
              model: a.model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: maxTokens,
              temperature
            });
      const r = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + key
        },
        body: reqBody
      });
      if (r.ok) {
        const data = await r.json();
        const text = data?.choices?.[0]?.message?.content || "(empty response)";
        return { text, model: data?.model || a.model };
      }
      const status = r.status;
      const errBody = await r.text().catch(() => "");
      lastErr = {
        error: `openai ${status}`,
        status,
        body: errBody.slice(0, 400),
        model: a.model
      };
      if (status < 500 && status !== 429) break;   // permanent
    } catch (e) {
      lastErr = { error: String(e), status: 500, model: a.model };
    }
  }
  return lastErr;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
