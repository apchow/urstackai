// Vercel Serverless Function: returns the signed-in user from the session cookie.
const crypto = require("crypto");
const AUTH_SECRET = process.env.AUTH_SECRET || "";
const COOKIE = "urstack_session";

function readCookie(header) {
  const out = {};
  String(header || "").split(";").forEach((pair) => {
    const i = pair.indexOf("=");
    if (i > 0) out[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  });
  return out;
}

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!AUTH_SECRET) return res.status(200).json({ user: null, configured: false });

  const raw = readCookie(req.headers && req.headers.cookie)[COOKIE];
  if (!raw || raw.indexOf(".") < 0) return res.status(200).json({ user: null });

  const payload = raw.slice(0, raw.indexOf("."));
  const sig = raw.slice(raw.indexOf(".") + 1);
  const expected = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(200).json({ user: null });
  }

  try {
    const user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!user.exp || user.exp < Date.now()) return res.status(200).json({ user: null });
    delete user.exp;
    return res.status(200).json({ user });
  } catch (e) {
    return res.status(200).json({ user: null });
  }
};
