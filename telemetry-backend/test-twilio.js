require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const toNumber = "+923157978827"; // Your verified number

console.log("=========================================");
console.log("TWILIO CREDENTIAL DIAGNOSTIC TEST");
console.log("=========================================");
console.log("Account SID:   ", accountSid || "MISSING ❌");
console.log("Auth Token:    ", authToken ? "LOADED (HIDDEN) ✅" : "MISSING ❌");
console.log("From Number:   ", fromNumber || "MISSING ❌");
console.log("Recipient:     ", toNumber);
console.log("=========================================");

if (!accountSid || !authToken || !fromNumber) {
  console.error("❌ Error: Missing required Twilio settings in telemetry-backend/.env!");
  process.exit(1);
}

const client = twilio(accountSid, authToken);

console.log("Sending test SMS via Twilio...");
client.messages.create({
  body: "🚨 Telemetry Pro - Direct Twilio Credentials Test Message 🚨",
  to: toNumber,
  from: fromNumber
})
.then(message => {
  console.log("\n=========================================");
  console.log("✅ SUCCESS! Message sent successfully.");
  console.log("Message SID:", message.sid);
  console.log("=========================================");
})
.catch(error => {
  console.error("\n=========================================");
  console.error("❌ TWILIO API ERROR:");
  console.error("Code:   ", error.code);
  console.error("Message:", error.message);
  console.error("Status: ", error.status);
  console.error("=========================================");
});
