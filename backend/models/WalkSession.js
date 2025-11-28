const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WalkSessionSchema = new Schema({
  host: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  route: { type: Schema.Types.ObjectId, ref: 'Route' },
  // state: planning | active | finished | cancelled
  state: { type: String, enum: ['planning','active','finished','cancelled'], default: 'planning' },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  invited: [{ type: Schema.Types.ObjectId, ref: 'User' }], // pending invites
  liveLocations: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    loc: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] } // [lon,lat]
    },
    ts: { type: Date, default: Date.now }
  }],
  startedAt: Date,
  endedAt: Date,
  createdAt: { type: Date, default: Date.now }
});
WalkSessionSchema.index({ 'liveLocations.loc': '2dsphere' });
module.exports = mongoose.model('WalkSession', WalkSessionSchema);
