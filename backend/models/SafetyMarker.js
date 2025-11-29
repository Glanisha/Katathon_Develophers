// backend/models/SafetyMarker.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const SafetyMarkerSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  category: { type: String, enum: ["Suspicious","Harassment","Accident","Danger","Other"], default: "Other" },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  imageUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SafetyMarker', SafetyMarkerSchema);
