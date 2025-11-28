const mongoose = require('mongoose');
const { Schema } = mongoose;

const RewardSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String }, // 'mapillary_upload','incident_report','lighting_report'
  points: Number,
  refId: Schema.Types.ObjectId, // reference to contribution (LightingReport, Incident, etc)
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Reward', RewardSchema);
