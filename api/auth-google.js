// Vercel Serverless Function: verifies a Google Sign-In ID token and issues a
// signed, HttpOnly session cookie. The browser never sees AUTH_SECRET.
const crypto = require("crypto");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const AUTH_SECRET = process.env.AUTH_SECRET || "";
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const COOKIE = "urstack_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

let cache = { at: 0, keys: [] };

async function getKeys() {
  if (cache.keys.length && Date.now() - cache.at < 60 * 60 * 1000) return cache.keys;
  const r = await fetch(JWKS_URL);
  if (!r.ok) throw new Error("jwks_unavailable");
  const j = await r.json();
  cache = { at: Date.now(), keys: j.keys || [] };
  return cache.keys;
}

function decodePart(part) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

async function verifyIdToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("malformed_token");
  const header = decodePart(parts[0]);
  const payload = decodePart(parts[1]);
  if (header.alg !== "RS256") throw new Error("unsupported_alg");

  const keys = await getKeys();
  const jwk = keys.find((k) => k.kid === header.kid) || keys[0];
  if (!jwk) throw new Error("no_signing_key");

  const pub = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const ok = crypto.createVerify("RSA-SHA256")
    .update(parts[0] + "." + parts[1])
    .verify(pub, Buffer.from(parts[2], "base64url"));
  if (!ok) throw new Error("bad_signature");

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) throw new Error("expired");
  if (!["accounts.google.com", "https://accounts.google.com"].includes(payload.iss)) throw new Error("bad_issuer");
  if (payload.aud !== CLIENT_ID) throw new Error("bad_audience");
  if (!payload.email || payload.email_verified === false) throw new Error("email_not_verified");
  return payload;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  if (!CLIENT_ID || !AUTH_SECRET) {
    return res.status(503).json({ error: "auth_not_configured", message: "Set GOOGLE_CLIENT_ID and AUTH_SECRET." });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: "invalid_json" });
  }

  try {
    const p = await verifyIdToken(body.credential);
    const user = {
      sub: p.sub,
      email: String(p.email).toLowerCase(),
      name: p.name || "",
      picture: p.picture || "",
      provider: "google"
    };
    const payload = Buffer.from(JSON.stringify(Object.assign({}, user, { exp: Date.now() + MAX_AGE_SECONDS * 1000 }))).toString("base64url");
    const sig = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
    res.setHeader("Set-Cookie", COOKIE + "=" + payload + "." + sig + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + MAX_AGE_SECONDS);
    return res.status(200).json({ status: "signed_in", user });
  } catch (err) {
    return res.status(401).json({ error: "invalid_credential", message: err.message });
  }
};
