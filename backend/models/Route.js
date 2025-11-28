const mongoose = require('mongoose');
const { Schema } = mongoose;

const RouteSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  title: { type: String },
  segments: [{ type: Schema.Types.ObjectId, ref: 'RouteSegment' }], // ordered
  totalDistanceMeters: Number,
  estimatedTimeSeconds: Number,
  createdAt: { type: Date, default: Date.now },
  isPublic: { type: Boolean, default: false },
  computedSafetyScore: { type: Number, default: 0 }, // aggregated score
  metadata: { type: Schema.Types.Mixed } // e.g. TomTom polyline, provider
});
module.exports = mongoose.model('Route', RouteSchema);
