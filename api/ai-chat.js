// Vercel Serverless Function: Coarena Model API proxy (OpenAI-compatible).
// Keeps COARENA_API_KEY strictly server-side — it must never reach the browser.
// POST /api/ai-chat  { prompt }  or  { messages: [...] }
// POST /api/ai-chat  { action: "feedback", replyId, rating, comment }
// GET  /api/ai-chat  -> { status, baseUrl, model }

const BASE_URL = (process.env.COARENA_BASE_URL || "https://coarena.ai/api/v1").replace(/\/$/, "");
const DEFAULT_MODEL = process.env.COARENA_MODEL || "claude-fable-5";

const MAX_MESSAGES = 24;
const MAX_CHARS_PER_MESSAGE = 8000;
const MAX_TOTAL_CHARS = 24000;
const MAX_OUTPUT_TOKENS = 2048;

// Coarena accepts "up"/"down" (also good/bad, 1/-1, true/false) or null to clear.
// Accept 1-5 star input too: 4-5 => up, 1-2 => down, 3 => null (neutral, removes rating).
function normalizeRating(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "up" : "down";
  if (typeof value === "number") return value >= 4 ? "up" : value <= 2 ? "down" : null;
  if (typeof value === "string") {
    const t = value.trim().toLowerCase();
    if (["up", "good", "true", "1"].includes(t)) return "up";
    if (["down", "bad", "false", "-1"].includes(t)) return "down";
    const n = Number(t);
    if (Number.isFinite(n)) return n >= 4 ? "up" : n <= 2 ? "down" : null;
  }
  return "invalid";
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch (e) {
      return null;
    }
  }
  return req.body;
}

function normalizeMessages(body) {
  if (Array.isArray(body.messages)) {
    return body.messages
      .filter((m) => m && typeof m.content === "string" && m.content.trim())
      .slice(0, MAX_MESSAGES)
      .map((m) => ({
        role: ["system", "user", "assistant"].includes(m.role) ? m.role : "user",
        content: m.content.slice(0, MAX_CHARS_PER_MESSAGE)
      }));
  }
  if (typeof body.prompt === "string" && body.prompt.trim()) {
    return [{ role: "user", content: body.prompt.trim().slice(0, MAX_CHARS_PER_MESSAGE) }];
  }
  return [];
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const apiKey = process.env.COARENA_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "missing_server_credentials",
      message: "Set COARENA_API_KEY in Vercel Environment Variables to enable the AI endpoints."
    });
  }

  if (req.method === "GET") {
    return res.status(200).json({ status: "ok", baseUrl: BASE_URL, model: DEFAULT_MODEL });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = parseBody(req);
  if (!body) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  // ---- feedback: rate a previous reply ----
  if (body.action === "feedback") {
    const normalized = normalizeRating(body.rating);
    if (!(body.requestId || body.replyId) || normalized === "invalid") {
      return res.status(400).json({ error: "requestId (the reply id) and a valid rating are required" });
    }
    try {
      const upstream = await fetch(BASE_URL + "/feedback", {
        method: "POST",
        headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: String(body.requestId || body.replyId),
          rating: normalized,
          comment: typeof body.comment === "string" ? body.comment.slice(0, 1000) : undefined
        })
      });
      const text = await upstream.text();
      return res.status(upstream.ok ? 200 : upstream.status).json({
        status: upstream.ok ? "recorded" : "error",
        upstreamStatus: upstream.status,
        detail: text.slice(0, 600)
      });
    } catch (err) {
      return res.status(502).json({ error: "feedback_failed", message: err.message });
    }
  }

  // ---- chat completion ----
  const messages = normalizeMessages(body);
  if (!messages.length) {
    return res.status(400).json({ error: "Provide a non-empty prompt or messages array" });
  }

  const totalChars = messages.reduce((n, m) => n + m.content.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    return res.status(413).json({ error: "Conversation too large", limit: MAX_TOTAL_CHARS });
  }

  const model = typeof body.model === "string" && /^[A-Za-z0-9._\/-]{1,64}$/.test(body.model)
    ? body.model
    : DEFAULT_MODEL;

  const maxTokens = Math.min(MAX_OUTPUT_TOKENS, Math.max(16, Number(body.maxTokens) || 512));

  try {
    const upstream = await fetch(BASE_URL + "/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model: model, messages: messages, max_tokens: maxTokens })
    });

    const raw = await upstream.text();
    if (!upstream.ok) {
      return res.status(upstream.status === 429 ? 429 : 502).json({
        error: "upstream_error",
        upstreamStatus: upstream.status,
        detail: raw.slice(0, 600)
      });
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({ error: "invalid_upstream_response" });
    }

    const choice = data.choices && data.choices[0];
    return res.status(200).json({
      status: "success",
      id: data.id || null,
      requestId: upstream.headers.get("x-coarena-request-id") || data.id || null,
      model: data.model || model,
      reply: choice && choice.message ? choice.message.content : null,
      usage: data.usage || null
    });
  } catch (err) {
    return res.status(502).json({ error: "upstream_unreachable", message: err.message });
  }
};
