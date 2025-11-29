const mongoose = require('mongoose');
const { Schema } = mongoose;

const LightingReportSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lon, lat]
  },
  luxEstimate: { type: Number },
  notes: { type: String, default: '' },
  photoUrl: { type: String },
  createdAt: { type: Date, default: Date.now, index: true }
});

// geospatial index for queries
LightingReportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('LightingReport', LightingReportSchema);
