const EmergencyContact = require('../models/EmergencyContact');
const twilio = require('twilio');

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;

let twilioClient = null;
if (TWILIO_SID && TWILIO_TOKEN) {
  twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);
}

class EmergencyService {
  async listForUser(userId) {
    return EmergencyContact.find({ userId }).sort({ createdAt: -1 });
  }

  async createForUser(userId, { name, phone, relation }) {
    const contact = new EmergencyContact({ userId, name, phone, relation });
    return contact.save();
  }

  async deleteForUser(userId, contactId) {
    return EmergencyContact.findOneAndDelete({ _id: contactId, userId });
  }

  // sendAlert(user, { reason, location, batteryLevel, settings })
  async sendAlert(user, payload = {}) {
    const contacts = await EmergencyContact.find({ userId: user._id }).limit(5);
    if (!contacts || contacts.length === 0) {
      throw new Error('No emergency contacts configured');
    }

    const reason = payload.reason || 'manual';
    const loc = payload.location;
    const battery = payload.batteryLevel;
    const settings = payload.settings || {};
    const fromName = user.profile?.displayName || user.name || 'Contact';

    let mapLink = '';
    if (loc && loc.latitude != null && loc.longitude != null) {
      mapLink = `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
    }

    const body = `${fromName} sent an emergency alert (${reason}).${battery ? ` Battery:${battery}% .` : ''} ${mapLink ? `Location: ${mapLink}` : ''}`;

    if (!twilioClient) {
      // Dev fallback: return preview
      return { preview: true, to: contacts.map(c => c.phone), body };
    }

    const results = [];
    for (const c of contacts.slice(0, 5)) {
      try {
        const sms = await twilioClient.messages.create({
          body,
          from: TWILIO_FROM,
          to: c.phone
        });

        if (settings.allowCalls) {
          await twilioClient.calls.create({
            to: c.phone,
            from: TWILIO_FROM,
            twiml: `<Response><Say>Emergency alert from ${fromName}. Check your messages for details.</Say></Response>`
          });
        }

        results.push({ to: c.phone, sid: sms.sid, status: 'sent' });
      } catch (err) {
        results.push({ to: c.phone, error: err.message || err, status: 'failed' });
      }
    }

    return { results, body };
  }
}

module.exports = new EmergencyService();