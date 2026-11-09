// Vercel Serverless Function: Multi-Channel Dispatcher (Signup, Newsletter, Purchase, Help)
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const {
      type = "order",
      sku = "workflow",
      itemName = "UrStack Package",
      txnid = "UR-LIVE",
      name = "Customer",
      email = "chowdharyapoorv26txg@gmail.com",
      topic = "General Inquiry",
      message = "",
      provider = "email",
      licenseKey = "URSTACK-LICENSE",
      timestamp = new Date().toISOString()
    } = payload;

    const notifyEmail = process.env.NOTIFY_EMAIL || "chowdharyapoorv26txg@gmail.com";
    const resendApiKey = process.env.RESEND_API_KEY || "re_7xMtVq5t_KrUQWrDyjdcqoYimbN7tFpNU";
    const webhookUrl = process.env.NOTIFY_WEBHOOK_URL || "";
    const senderEmail = process.env.SENDER_EMAIL || "UrStack AI <onboarding@resend.dev>";

    const results = { founderEmailSent: false, customerEmailSent: false, webhookSent: false };

    if (webhookUrl) {
      let textMsg = "";
      if (type === "help") textMsg = `💬 *Help Query* from ${name} (${email}) [${topic}]: ${message}`;
      else if (type === "signup" || type === "newsletter_subscribe") textMsg = `📬 *New Subscriber* ${name} (${email}) via ${provider}`;
      else textMsg = `⚡ *Order Fulfilled* ${itemName} for ${name} (${email}) | Key: ${licenseKey}`;

      try {
        const whRes = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: `⚡ UrStack Event: ${type}`, text: textMsg, topic: "urstack_apoorv_alerts", payload })
        });
        results.webhookSent = whRes.ok;
      } catch (e) {}
    }

    if (resendApiKey) {
      try {
        if (type === "help") {
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: senderEmail,
              to: [notifyEmail],
              reply_to: email,
              subject: `[URSTACK HELP DESK] ${topic} — from ${name} (${email})`,
              html: `<div style="font-family:sans-serif;padding:20px;background:#0d1117;color:#fff;"><h2>Help Query: ${topic}</h2><p>From: ${name} (${email})</p><p>${message}</p></div>`
            })
          });
          results.founderEmailSent = r.ok;
        } else if (type === "signup" || type === "newsletter_subscribe") {
          const r1 = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: senderEmail,
              to: [email],
              reply_to: notifyEmail,
              subject: "Welcome to UrStack AI — Your Account & Daily Brief Subscription Active",
              html: `<p>Welcome ${name}! Your account is active on <a href="https://urstack-ai.vercel.app">urstack-ai.vercel.app</a> and you are subscribed to The UrStack Morning Brief.</p>`
            })
          });
          results.customerEmailSent = r1.ok;
        } else {
          const r2 = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: senderEmail,
              to: [email],
              reply_to: notifyEmail,
              subject: `UrStack AI Order Confirmed: ${itemName} (Key: ${licenseKey})`,
              html: `<p>Your order for <strong>${itemName}</strong> is confirmed. License: <code>${licenseKey}</code>. Re-download your 7-file ZIP anytime at <a href="https://urstack-ai.vercel.app">urstack-ai.vercel.app</a>.</p>`
            })
          });
          results.customerEmailSent = r2.ok;
        }
      } catch (e) {}
    }

    return res.status(200).json({ status: "success", type, notifyEmail, ...results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
