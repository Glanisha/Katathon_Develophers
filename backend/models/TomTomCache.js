const mongoose = require('mongoose');
const { Schema } = mongoose;

const TomTomCacheSchema = new Schema({
  snapshotAt: { type: Date, default: Date.now, index: true },
  // geometry (Point/Line) bounding or segment id
  bbox: {
    type: { type: String, enum: ['Polygon'], default: 'Polygon' },
    coordinates: { type: [[[Number]]] } // polygon coordinates if using tiles
  },
  // raw TomTom response (small subset)
  data: Schema.Types.Mixed,
  // computed simplified congestion metric 0..1
  congestionScore: { type: Number, default: 0 },
  // references to affected segments (array of segment ids)
  affectedSegments: [{ type: Schema.Types.ObjectId, ref: 'RouteSegment' }],
  // expire after e.g. 5 minutes (set TTL index)
  createdAt: { type: Date, default: Date.now, index: true }
});
// TTL index - set TTL value when creating index, e.g. 300 seconds
// TomTomCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

module.exports = mongoose.model('TomTomCache', TomTomCacheSchema);
