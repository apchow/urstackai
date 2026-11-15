// Vercel Serverless Function: clears the session cookie.
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Set-Cookie", "urstack_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  return res.status(200).json({ status: "signed_out" });
};
