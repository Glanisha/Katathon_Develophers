const mongoose = require('mongoose');

const savedRouteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  routeData: {
    type: Object,
    required: true
  },
  preferences: {
    purpose: String,
    routeType: {
      type: String,
      enum: ['safest', 'fastest', 'balanced'],
      default: 'safest'
    }
  },
  status: {
    type: String,
    enum: ['planned', 'active', 'completed', 'cancelled'],
    default: 'planned'
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  distanceRemaining: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  startedAt: Date,
  completedAt: Date,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

savedRouteSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('SavedRoute', savedRouteSchema);