// UrStack AI Notify CLI Utility
// Dispatcher helper for Signup, Newsletter, Purchase, and Help events
// GitHub: https://github.com/apchow/urstackai
// Live: https://urstack-ai.vercel.app

const crypto = require("crypto");

// Simplified version - just prints the notification structure
// Full integration uses Resend API and webhook URLs

function generateNotification(type, options = {}) {
  const payload = {
    type: type || "order",
    sku: options.sku || "workflow",
    itemName: options.itemName || "UrStack Package",
    txnid: options.txnid || "UR-LIVE",
    name: options.name || "Customer",
    email: options.email || "chowdharyapoorv26txg@gmail.com",
    topic: options.topic || "General Inquiry",
    message: options.message || "",
    provider: options.provider || "email",
    licenseKey: options.licenseKey || "URSTACK-LICENSE",
    timestamp: new Date().toISOString()
  };

  const line = "=".repeat(60);
  console.log(line);
  console.log("📬 UrStack AI Notify CLI Utility");
  console.log(line);
  console.log(`📋 Event Type: ${payload.type}`);
  console.log(`📦 SKU: ${payload.sku}`);
  console.log(`📦 Item: ${payload.itemName}`);
  console.log(`🆔 Transaction: ${payload.txnid}`);
  console.log(`👤 Name: ${payload.name}`);
  console.log(`📧 Email: ${payload.email}`);
  console.log(`🎯 Topic: ${payload.topic}`);
  console.log(`💬 Message: ${payload.message}`);
  console.log(`📡 Provider: ${payload.provider}`);
  console.log(`🔑 License Key: ${payload.licenseKey}`);
  console.log(`⏰ Timestamp: ${payload.timestamp}`);
  console.log("");
  console.log("📬 Expected Actions:");
  console.log("  1. Send webhook to NOTIFY_WEBHOOK_URL");
  console.log("  2. Send email via Resend API");
  console.log("  3. Founder notification to NOTIFY_EMAIL");
  console.log("");
  console.log("📚 Documentation: https://github.com/apchow/urstackai");
  console.log("🌐 Live Site: https://urstack-ai.vercel.app");
  console.log(line);

  return payload;
}

// CLI usage
const args = process.argv.slice(2);
let type = "order";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--type" && args[i + 1]) { type = args[i + 1]; i++; }
  else if (args[i] === "--help") { break; }
}

// Example usage demonstrations
console.log("\n---\n");

console.log("1. Order Fulfilled:");
generateNotification("order", {
  sku: "workflow",
  itemName: "UrStack AI Digital Package",
  name: "John Doe",
  email: "john@example.com",
  licenseKey: "URSTACK-KEY-001"
});

console.log("\n2. Help Query:");
generateNotification("help", {
  topic: "Payment Issue",
  message: "I'm having trouble with my purchase",
  name: "Jane Smith",
  email: "jane@example.com"
});

console.log("\n3. Newsletter Signup:");
generateNotification("signup", {
  type: "newsletter_subscribe",
  name: "New Subscriber",
  email: "subscriber@example.com"
});

console.log("\n4. Purchase Complete:");
generateNotification("purchase", {
  sku: "premium",
  itemName: "Workflow Vault Pass",
  name: "Premium User",
  email: "premium@example.com",
  licenseKey: "URSTACK-VIP-001"
});

console.log("\n" + "=".repeat(60));
console.log("📦 All notification types ready for Resend/webhook integration");
console.log("🌐 Live Site: https://urstack-ai.vercel.app");
console.log("📚 GitHub: https://github.com/apchow/urstackai");
console.log("=".repeat(60));
