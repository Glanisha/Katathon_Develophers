const mongoose = require('mongoose');
const { Schema } = mongoose;

const LightingReportSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  luxEstimate: Number, // user device sensor or derived
  photoUrl: String,
  notes: String,
  createdAt: { type: Date, default: Date.now }
});
LightingReportSchema.index({ location: '2dsphere' });
module.exports = mongoose.model('LightingReport', LightingReportSchema);
