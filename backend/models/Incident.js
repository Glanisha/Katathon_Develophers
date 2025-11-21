const IncidentSchema = new Schema({
  reporter: { type: Schema.Types.ObjectId, ref: 'User' }, // optional
  source: { type: String, enum: ['user','city_feed','tomtom','other'], default: 'user' },
  type: { type: String, required: true }, // 'crime','accident','hazard','streetlight_out'
  description: String,
  severity: { type: Number, min: 1, max: 5, default: 3 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lon, lat]
  },
  relatedSegment: { type: Schema.Types.ObjectId, ref: 'RouteSegment' }, // optional link
  createdAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date } // optional TTL for transient flags
});

// geospatial index for queries
IncidentSchema.index({ location: '2dsphere' });
module.exports = mongoose.model('Incident', IncidentSchema);
