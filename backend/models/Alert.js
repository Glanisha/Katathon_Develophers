const AlertSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true }, // 'entered_low_safety', 'nearby_incident', ...
  payload: Schema.Types.Mixed,
  channel: { type: String, enum: ['push','sms','email','whatsapp'] },
  sentAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});
module.exports = mongoose.model('Alert', AlertSchema);
