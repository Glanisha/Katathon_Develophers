const mongoose = require('mongoose');
const { Schema } = mongoose;

const FriendsSchema = new Schema({
  // For pairwise friendships
  users: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  }],
  
  // Optional: for group friendships/friend circles
  groupName: String,
  groupDescription: String,
  isGroup: { 
    type: Boolean, 
    default: false 
  },
  
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'blocked'], 
    default: 'accepted' 
  },
  
  initiatedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  acceptedAt: Date,
  blockedAt: Date,
  
  // Metadata about the friendship
  metadata: {
    interactionCount: { type: Number, default: 0 },
    lastInteractionAt: Date,
    notes: String,
    tags: [String]
  }
});

// Ensure users array is always sorted to prevent duplicates (for pairwise)
FriendsSchema.pre('save', function(next) {
  if (!this.isGroup && this.users.length === 2) {
    const userStrings = this.users.map(u => u.toString()).sort();
    this.users = userStrings.map(u => mongoose.Types.ObjectId(u));
  }
  next();
});

// Create compound index to prevent duplicate pairwise friendships
FriendsSchema.index({ users: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Friends', FriendsSchema);
