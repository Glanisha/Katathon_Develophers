const RouteSegmentSchema = new Schema({
  // geometry as LineString for segment
  geom: {
    type: { type: String, enum: ['LineString'], default: 'LineString' },
    coordinates: { type: [[Number]], required: true } // [ [lon,lat], [lon,lat], ... ]
  },

  // centroid cached for quick queries
  centroid: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere' } // [lon,lat]
  },

  // static metadata
  hasSidewalk: { type: Boolean, default: null },
  streetName: { type: String },
  avgStreetlightLux: { type: Number, default: null }, // normalized lighting
  mapillaryCoverage: { type: Boolean, default: false },

  // dynamic metrics (updated by aggregator)
  safetyScore: { type: Number, default: 0 }, // composite normalized 0..100
  scoreBreakdown: {
    lighting: Number,
    congestion: Number,
    incidents: Number,
    sidewalk: Number,
    userFlags: Number
  },

  // historic counters
  incidentsCount: { type: Number, default: 0 },
  lastIncidentAt: { type: Date },

  // TomTom snapshot metadata (latest)
  tomtomSnapshotId: { type: Schema.Types.ObjectId, ref: 'TomTomCache' },

  updatedAt: { type: Date, default: Date.now, index: true }
});

// geospatial index for centroid and geom
RouteSegmentSchema.index({ centroid: '2dsphere' });
RouteSegmentSchema.index({ geom: '2dsphere' });

module.exports = mongoose.model('RouteSegment', RouteSegmentSchema);
