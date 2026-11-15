// Vercel Serverless Function: exposes only the public Google client ID.
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  return res.status(200).json({ clientId, configured: Boolean(clientId) });
};
