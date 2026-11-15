// TEMPORARY diagnostic - reports only presence/length of payment env vars, never values.
module.exports = (req, res) => {
  const k = process.env.PAYU_MERCHANT_KEY;
  const s = process.env.PAYU_MERCHANT_SALT;
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    vercelEnv: process.env.VERCEL_ENV || null,
    keyPresent: typeof k === "string" && k.length > 0,
    keyLength: k ? k.length : 0,
    saltPresent: typeof s === "string" && s.length > 0,
    saltLength: s ? s.length : 0,
    payuVarNames: Object.keys(process.env).filter((n) => n.startsWith("PAYU")).sort()
  });
};
