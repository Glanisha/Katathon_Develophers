const Friends = require('../models/Friends');
const User = require('../models/User');

class FriendsService {
  // Send friend request
  async sendFriendRequest(fromUserId, toUserId) {
    if (fromUserId === toUserId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if already friends or request exists
    const existing = await Friends.findOne({
      users: { $all: [fromUserId, toUserId] }
    });

    if (existing) {
      if (existing.status === 'accepted') throw new Error('Already friends');
      if (existing.status === 'pending') throw new Error('Friend request already sent');
      if (existing.status === 'blocked') throw new Error('User is blocked');
    }

    const friendRequest = new Friends({
      users: [fromUserId, toUserId],
      status: 'pending',
      initiatedBy: fromUserId
    });

    return await friendRequest.save();
  }

  // Accept friend request
  async acceptFriendRequest(userId, requestId) {
    const friendRequest = await Friends.findById(requestId);

    if (!friendRequest) throw new Error('Friend request not found');
    if (!friendRequest.users.includes(userId)) throw new Error('Unauthorized');
    if (friendRequest.status !== 'pending') throw new Error('Request already processed');

    friendRequest.status = 'accepted';
    friendRequest.acceptedAt = new Date();

    return await friendRequest.save();
  }

  // Reject/Delete friend request
  async rejectFriendRequest(userId, requestId) {
    const friendRequest = await Friends.findById(requestId);

    if (!friendRequest) throw new Error('Friend request not found');
    if (!friendRequest.users.includes(userId)) throw new Error('Unauthorized');

    await Friends.findByIdAndDelete(requestId);
    return { message: 'Friend request rejected' };
  }

  // Get all friends for a user
  async getFriends(userId) {
    const friendships = await Friends.find({
      users: userId,
      status: 'accepted'
    }).populate('users');

    // Extract the other user from each friendship
    const friends = friendships.map(friendship => {
      const friend = friendship.users.find(u => u._id.toString() !== userId);
      return {
        _id: friend._id,
        name: friend.name,
        email: friend.email,
        displayName: friend.profile?.displayName,
        avatarUrl: friend.profile?.avatarUrl,
        bio: friend.profile?.bio,
        shareLiveLocation: friend.privacy?.shareLiveLocation,
        friendshipId: friendship._id
      };
    });

    return friends;
  }

  // Get pending friend requests
  async getPendingRequests(userId) {
    const requests = await Friends.find({
      users: userId,
      status: 'pending'
    }).populate('initiatedBy');

    return requests.map(req => ({
      _id: req._id,
      initiatedBy: {
        _id: req.initiatedBy._id,
        name: req.initiatedBy.name,
        displayName: req.initiatedBy.profile?.displayName,
        avatarUrl: req.initiatedBy.profile?.avatarUrl
      },
      createdAt: req.createdAt
    }));
  }

  // Block a user
  async blockUser(userId, blockUserId) {
    let friendship = await Friends.findOne({
      users: { $all: [userId, blockUserId] }
    });

    if (!friendship) {
      friendship = new Friends({
        users: [userId, blockUserId],
        status: 'blocked',
        blockedAt: new Date()
      });
    } else {
      friendship.status = 'blocked';
      friendship.blockedAt = new Date();
    }

    return await friendship.save();
  }

  // Unblock a user
  async unblockUser(userId, blockUserId) {
    const friendship = await Friends.findOne({
      users: { $all: [userId, blockUserId] },
      status: 'blocked'
    });

    if (!friendship) throw new Error('User is not blocked');

    await Friends.findByIdAndDelete(friendship._id);
    return { message: 'User unblocked' };
  }

  // Remove a friend
  async removeFriend(userId, friendId) {
    const friendship = await Friends.findOne({
      users: { $all: [userId, friendId] },
      status: 'accepted'
    });

    if (!friendship) throw new Error('Friendship not found');

    await Friends.findByIdAndDelete(friendship._id);
    return { message: 'Friend removed' };
  }

  // Update interaction metadata
  async updateInteraction(userId, friendId) {
    const friendship = await Friends.findOne({
      users: { $all: [userId, friendId] },
      status: 'accepted'
    });

    if (!friendship) throw new Error('Friendship not found');

    friendship.metadata.interactionCount += 1;
    friendship.metadata.lastInteractionAt = new Date();

    return await friendship.save();
  }

  // Get friends with live location (who have sharing enabled)
  async getFriendsWithLocation(userId) {
    const friends = await this.getFriends(userId);
    
    // Filter only friends who have location sharing enabled
    return friends.filter(friend => friend.shareLiveLocation === true);
  }
}

module.exports = new FriendsService();