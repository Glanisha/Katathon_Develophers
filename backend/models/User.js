const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true }, // hashed with bcrypt/argon2
  name: { type: String, required: true },
  phone: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now, index: true },

  profile: {
    displayName: String,
    avatarUrl: String,
    bio: String,
    preferredSafetyMode: { type: String, enum: ['safest','fastest','balanced'], default: 'safest' }
  },

  privacy: {
    shareLiveLocation: { type: Boolean, default: false },
    shareWithFriendsOnly: { type: Boolean, default: true },
    discovery: { type: Boolean, default: true } // appear in "find partner" results
  },

  // friend management (small-scale). For high volume use separate collection.
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blocked: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // basic metrics / rewards
  points: { type: Number, default: 0 },
  contributionsCount: { type: Number, default: 0 },

  // for login device tracking / push
  devices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Device' }]
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', UserSchema);
