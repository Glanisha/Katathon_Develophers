const mongoose = require('mongoose');
const { Schema } = mongoose;

const IncidentReportSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String, required: true }, // Cloudinary URL
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  severity: { 
    type: String, 
    enum: ['fine', 'moderate', 'dangerous'],
    default: 'moderate'
  },
  category: {
    type: String,
    enum: ['accident', 'riot', 'pothole', 'flooding', 'structural_damage', 'debris', 'other'],
    required: true
  },
  geminiAnalysis: {
    confidence: Number,
    description: String
  },
  verifications: {
    type: Number,
    default: 0
  },
  points: {
    type: Number,
    default: 10 // base points for reporting
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'false_report'],
    default: 'active'
  },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('IncidentReport', IncidentReportSchema);