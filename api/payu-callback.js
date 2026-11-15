// Vercel Serverless Function: Unified PayU Server-Side Signer & Live Callback Verifier
const crypto = require("crypto");

const INR_PRICE_MAP = { 3: 249, 7: 599, 9: 749, 17: 1399, 19: 1599, 29: 2449, 39: 3299 };

module.exports = async (req, res) => {
  try {
    const contentType = (req.headers && req.headers["content-type"]) || "";
    // Mode 1: JSON Request from Client Checkout -> Sign PayU SHA-512 Request Server-Side
    if (contentType.includes("application/json") || (req.body && typeof req.body === "object" && req.body.priceUsd !== undefined)) {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const {
        txnid = "UR-" + Date.now(),
        priceUsd = 9,
        itemName = "UrStack AI Digital Package",
        name = "Customer",
        email = "chowdharyapoorv26txg@gmail.com",
        phone = "",
        sku = "workflow",
        extraUrl = "",
        origin = "https://urstack-ai.vercel.app"
      } = body;

      const merchantKey = process.env.PAYU_MERCHANT_KEY || "";
      const merchantSalt = process.env.PAYU_MERCHANT_SALT || "";
      const actionUrl = process.env.PAYU_ACTION_URL || (process.env.PAYU_ENV === "test" ? "https://test.payu.in/_payment" : "https://secure.payu.in/_payment");

      if (!merchantKey || !merchantSalt) {
        return res.status(503).json({
          error: "missing_server_credentials",
          status: "missing_server_credentials",
          message: "Set PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT in Vercel Environment Variables to enable live gateway signing."
        });
      }

      const canonicalInr = INR_PRICE_MAP[Number(priceUsd)] || (Number(priceUsd) * 84);
      const amountFormatted = `${canonicalInr}.00`;
      const udf1 = sku || "workflow";
      const udf2 = extraUrl || "";
      // PayU request hash order: key|txnid|amount|productinfo|firstname|email|udf1..udf10|salt
      const hashSequence = [merchantKey, txnid, amountFormatted, itemName, name, email,
        udf1, udf2, "", "", "", "", "", "", "", "", merchantSalt].join("|");
      const sha512Hash = crypto.createHash("sha512").update(hashSequence, "utf8").digest("hex");
      const callbackUrl = `${origin.replace(/\/$/, "")}/api/payu-callback`;

      return res.status(200).json({
        status: "ready",
        actionUrl,
        fields: {
          key: merchantKey, txnid, amount: amountFormatted, productinfo: itemName,
          firstname: name, email, phone, udf1, udf2, surl: callbackUrl, furl: callbackUrl, hash: sha512Hash
        }
      });
    }

    // Mode 2: Form-Urlencoded Callback from PayU -> Verify Reverse SHA-512 Hash & Redirect
    let params;
    if (typeof req.body === "string") {
      params = new URLSearchParams(req.body);
    } else if (req.body && typeof req.body === "object") {
      params = new URLSearchParams(req.body);
    } else {
      params = new URLSearchParams();
    }

    const status = (params.get("status") || "").toLowerCase();
    const txnid = params.get("txnid") || "UR-PAYU-" + Date.now();
    const amount = params.get("amount") || "";
    const productinfo = params.get("productinfo") || "UrStack AI Digital Package";
    const firstname = params.get("firstname") || "Valued Customer";
    const email = params.get("email") || "chowdharyapoorv26txg@gmail.com";
    const udf1 = params.get("udf1") || "workflow";
    const udf2 = params.get("udf2") || "";
    const udf3 = params.get("udf3") || "";
    const udf4 = params.get("udf4") || "";
    const udf5 = params.get("udf5") || "";
    const key = params.get("key") || process.env.PAYU_MERCHANT_KEY || "";
    const postedHash = (params.get("hash") || "").toLowerCase();
    const additionalCharges = params.get("additionalCharges") || "";

    if (status !== "success") {
      res.setHeader("Cache-Control", "no-cache");
      return res.redirect(303, `/?payment_failed=1&txnid=${encodeURIComponent(txnid)}`);
    }

    const merchantSalt = process.env.PAYU_MERCHANT_SALT || "";
    if (!merchantSalt || !postedHash) {
      // Fail closed: an unverifiable callback must never be fulfilled.
      res.setHeader("Cache-Control", "no-cache");
      return res.redirect(303, `/?payment_failed=1&reason=verification_unavailable&txnid=${encodeURIComponent(txnid)}`);
    }
    if (merchantSalt && postedHash) {
      // PayU reverse hash order: salt|status|udf10..udf1|email|firstname|productinfo|amount|txnid|key
      const revUdFs = [
        params.get("udf10") || "", params.get("udf9") || "", params.get("udf8") || "",
        params.get("udf7") || "", params.get("udf6") || "", udf5, udf4, udf3, udf2, udf1
      ];
      const baseReverseSeq = [merchantSalt, params.get("status") || "success"]
        .concat(revUdFs)
        .concat([email, firstname, productinfo, amount, txnid, key])
        .join("|");
      const fullReverseSeq = additionalCharges ? `${additionalCharges}|${baseReverseSeq}` : baseReverseSeq;
      const expectedHash = crypto.createHash("sha512").update(fullReverseSeq, "utf8").digest("hex").toLowerCase();
      if (expectedHash !== postedHash) {
        res.setHeader("Cache-Control", "no-cache");
        return res.redirect(303, `/?payment_failed=1&reason=hash_mismatch&txnid=${encodeURIComponent(txnid)}`);
      }
    }

    const targetUrl = `/?fulfilled=1&txnid=${encodeURIComponent(txnid)}&sku=${encodeURIComponent(udf1)}&item=${encodeURIComponent(productinfo)}&name=${encodeURIComponent(firstname)}&email=${encodeURIComponent(email)}&extraUrl=${encodeURIComponent(udf2)}`;
    res.setHeader("Cache-Control", "no-cache");
    return res.redirect(303, targetUrl);
  } catch (err) {
    return res.redirect(302, "/?payment_failed=1");
  }
};
