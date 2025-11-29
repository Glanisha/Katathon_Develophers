const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema({
  sender: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  text: { type: String, required: true },
  meta: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

const ChatSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // user who created thread
  participants: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, name: String }],
  context: { type: Schema.Types.Mixed }, // optional context (routeId, origin/dest etc)
  messages: [MessageSchema],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', ChatSchema);
