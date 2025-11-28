const User = require("../models/User");
const Alert = require("../models/Alert");
const EmergencyContact = require("../models/EmergencyContact");
const twilio = require("twilio");

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

async function sendSMS(to, message) {
  try {
    return await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to,
    });
  } catch (err) {
    console.log(`Twilio error sending to ${to}:`, err.message);
    return { success: false, error: err.message, to };
  }
}

async function sendAlertToFriends(userId, message) {
  if (!userId) throw new Error("userId is required");
  if (!message) throw new Error("message is required");

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const contacts = await EmergencyContact.find({ userId });
  if (contacts.length === 0) throw new Error("No emergency contacts saved");

  const smsText = `🚨 SAFEWALK ALERT 🚨
${user.name} needs help!
Message: ${message}`;

  const results = [];

  for (const c of contacts) {
    if (!c.phone) continue;

    const smsResult = await sendSMS(c.phone, smsText);
    results.push({ contact: c, smsResult });

    try {
      await Alert.create({
        user: user._id,
        type: "emergency_alert",
        payload: { sentTo: c.phone, message },
        channel: "sms",
      });
    } catch (err) {
      console.log("Failed to save alert in DB for", c.phone, err.message);
    }
  }

  return {
    success: true,
    message: "Alert processed for all emergency contacts",
    results,
  };
}

module.exports = { sendAlertToFriends };
