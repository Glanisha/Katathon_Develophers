const EmergencyContact = require('../models/EmergencyContact');

// Simplified: no Twilio for now — return preview with body + contact phones so client uses device SMS
const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_COUNTRY_CODE || '91';

function normalizePhoneNumber(raw) {
  if (!raw) return raw;
  let s = String(raw).trim();
  s = s.replace(/[\s()+-]+/g, '');
  if (s.startsWith('+')) return s;
  s = s.replace(/^0+/, '');
  return `+${DEFAULT_COUNTRY_CODE}${s}`;
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

  // sendAlert now returns preview data only (client will send SMS via device)
  async sendAlert(user, payload = {}) {
    const debug = ['[EmergencyService] sendAlert called (preview mode)'];
    const contacts = await EmergencyContact.find({ userId: user._id }).limit(10);
    debug.push(`[EmergencyService] contacts found: ${contacts.length}`);

    if (!contacts || contacts.length === 0) {
      debug.push('[EmergencyService] no contacts configured');
      throw new Error('No emergency contacts configured');
    }

    const reason = payload.reason || 'manual';
    const loc = payload.location;
    const battery = payload.batteryLevel;
    const fromName = (user && (user.profile?.displayName || user.name)) || 'Contact';

    let mapLink = '';
    if (loc && loc.latitude != null && loc.longitude != null) {
      mapLink = `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
      debug.push(`[EmergencyService] mapLink: ${mapLink}`);
    } else {
      debug.push('[EmergencyService] no valid location provided');
    }

    const body = `${fromName} sent an emergency alert (${reason}).${battery ? ` Battery:${battery}% .` : ''} ${mapLink ? `Location: ${mapLink}` : ''}`.trim();
    debug.push(`[EmergencyService] message body prepared (length ${body.length})`);

    const to = contacts.map(c => normalizePhoneNumber(c.phone)).filter(Boolean);
    debug.push(`[EmergencyService] normalized recipients: ${JSON.stringify(to)}`);

    // Return preview so frontend can open device SMS composer
    return { preview: true, to, body, debug };
  }
}

module.exports = new EmergencyService();