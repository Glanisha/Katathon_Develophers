const mongoose = require('mongoose');
const { Schema } = mongoose;

const DeviceSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deviceId: { type: String, required: true }, // client-generated uuid
  pushToken: { type: String }, // FCM/APNS
  lastSeen: { type: Date, default: Date.now, index: true },
  platform: { type: String } // 'android','ios','web'
});
module.exports = mongoose.model('Device', DeviceSchema);
