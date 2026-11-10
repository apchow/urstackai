// UrStack AI PayU CLI Utility
// Generates SHA-512 signed payment fields for PayU integration
// Usage: node payu-cli.js --price 9 --item "UrStack AI Package"
// GitHub: https://github.com/apchow/urstackai
// Live: https://urstack-ai.vercel.app

const crypto = require("crypto");

// Parse CLI args manually
const args = process.argv.slice(2);
let priceUsd = 9;
let itemName = "UrStack AI Digital Package";
let merchantKey = "";
let merchantSalt = "";
let origin = "https://urstack-ai.vercel.app";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--price" && args[i + 1]) { priceUsd = parseInt(args[i + 1]); i++; }
  else if (args[i] === "--item" && args[i + 1]) { itemName = args[i + 1]; i++; }
  else if (args[i] === "--merchant-key" && args[i + 1]) { merchantKey = args[i + 1]; i++; }
  else if (args[i] === "--merchant-salt" && args[i + 1]) { merchantSalt = args[i + 1]; i++; }
  else if (args[i] === "--origin" && args[i + 1]) { origin = args[i + 1]; i++; }
}

// Price mapping (Indian Rupees from USD)
const INR_PRICE_MAP = {
  3: 249,
  7: 599,
  9: 749,
  17: 1399,
  19: 1599,
  29: 2449,
  39: 3299
};

// Calculate INR amount
const canonicalInr = INR_PRICE_MAP[Number(priceUsd)] || (Number(priceUsd) * 84);
const amountFormatted = `${canonicalInr}.00`;

// Generate transaction ID
const txnid = "UR-" + Date.now();

// Default customer info
const name = "Customer";
const email = "customer@example.com";
const phone = "";

// Generate SHA-512 hash
const udf1 = "workflow";
const udf2 = "";

// Build hash sequence (exact format from vercel serverless function)
const hashSequence = `${merchantKey}|${txnid}|${amountFormatted}|${itemName}|${name}|${email}|${udf1}|${udf2}|||||||||${merchantSalt}`;
const sha512Hash = crypto.createHash("sha512").update(hashSequence, "utf8").digest("hex");

// Callback URL
const callbackUrl = `${origin.replace(/\/$/, "")}/api/payu-callback`;

console.log("=".repeat(60));
console.log("🔥 UrStack AI PayU CLI Utility");
console.log(".repeat(60)");
console.log(`📦 Item: ${itemName}`);
console.log(`💰 Price: $${priceUsd} = ₹${canonicalInr} (${amountFormatted})`);
console.log(`🆔 Transaction ID: ${txnid}`);
console.log(`👤 Customer: ${name} (${email})`);
console.log(`🔗 Callback URL: ${callbackUrl}`);
console.log("");
console.log("🔐 Generated SHA-512 Hash Fields:");
console.log(".repeat(60)");
console.log(`key: ${merchantKey}`);
console.log(`txnid: ${txnid}`);
console.log(`amount: ${amountFormatted}`);
console.log(`productinfo: ${itemName}`);
console.log(`firstname: ${name}`);
console.log(`email: ${email}`);
console.log(`phone: ${phone}`);
console.log(`udf1: ${udf1}`);
console.log(`udf2: ${udf2}`);
console.log(`surl: ${callbackUrl}`);
console.log(`furl: ${callbackUrl}`);
console.log(`hash: ${sha512Hash}`);
console.log("");
console.log("📋 Usage Example (cURL):");
console.log(".repeat(60)");
console.log(`curl -X POST https://secure.payu.in/_payment \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "key=${merchantKey}&txnid=${txnid}&amount=${amountFormatted}&productinfo=${encodeURIComponent(itemName)}&firstname=${name}&email=${email}&phone=${phone}&udf1=${udf1}&udf2=${udf2}&surl=${callbackUrl}&furl=${callbackUrl}&hash=${sha512Hash}`);
console.log("");
console.log("📚 Documentation: https://github.com/apchow/urstackai");
console.log("🌐 Live Site: https://urstack-ai.vercel.app");
console.log(".repeat(60)");
