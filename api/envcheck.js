// TEMPORARY diagnostic - presence/lengths only, never values.
module.exports = (req, res) => {
  const names = Object.keys(process.env).filter((n) => /PAYU|DEPLOY_MARKER/.test(n)).sort();
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    vercelEnv: process.env.VERCEL_ENV || null,
    deploymentUrl: process.env.VERCEL_URL || null,
    marker: process.env.DEPLOY_MARKER || null,
    payuVars: names,
    keyLength: (process.env.PAYU_MERCHANT_KEY || "").length,
    saltLength: (process.env.PAYU_MERCHANT_SALT || "").length
  });
};
