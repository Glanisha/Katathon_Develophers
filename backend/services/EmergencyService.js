const EmergencyContact = require('../models/EmergencyContact');

// Twilio credentials from environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

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

  // Send actual SMS via Twilio using environment credentials
  async sendAlert(user, payload = {}) {
    // Validate Twilio credentials
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
      throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER environment variables.');
    }

    const debug = ['[EmergencyService] sendAlert called (Twilio mode)'];
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

    const body = `${fromName} sent an emergency alert (${reason}).${battery ? ` Battery:${battery}%.` : ''} ${mapLink ? ` Location: ${mapLink}` : ''}`.trim();
    debug.push(`[EmergencyService] message body prepared (length ${body.length})`);

    const to = contacts.map(c => normalizePhoneNumber(c.phone)).filter(Boolean);
    debug.push(`[EmergencyService] normalized recipients: ${JSON.stringify(to)}`);

    // Send SMS to each contact via Twilio
    const results = [];
    for (const phone of to) {
      try {
        debug.push(`[EmergencyService] sending SMS to ${phone}`);
        
        // Use node-fetch or axios to call Twilio API
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            'To': phone,
            'From': TWILIO_FROM_NUMBER,
            'Body': body
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          debug.push(`[EmergencyService] SMS sent successfully to ${phone}, SID: ${data.sid}`);
          results.push({ to: phone, status: 'sent', sid: data.sid });
        } else {
          debug.push(`[EmergencyService] SMS failed to ${phone}: ${data.message || 'Unknown error'}`);
          results.push({ to: phone, status: 'failed', error: data.message });
        }
      } catch (err) {
        debug.push(`[EmergencyService] SMS error for ${phone}: ${err.message}`);
        results.push({ to: phone, status: 'error', error: err.message });
      }
    }

    debug.push(`[EmergencyService] SMS sending complete. Results: ${JSON.stringify(results)}`);

    // Return success info (not preview)
    return { 
      success: true, 
      results, 
      body, 
      debug,
      sentCount: results.filter(r => r.status === 'sent').length,
      failedCount: results.filter(r => r.status !== 'sent').length
    };
  }
}

module.exports = new EmergencyService();