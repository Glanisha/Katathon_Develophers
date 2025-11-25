const User = require('../models/User');

class UserService {
  // Find friends near a location
  async findFriendsNearby(userId, coordinates, radiusMeters = 5000) {
    const user = await User.findById(userId).populate('friends');
    
    if (!user || !user.friends.length) {
      return [];
    }

    // In a real app, you'd query a separate collection tracking user locations
    // For now, return friends who have discovery enabled
    const nearbyFriends = user.friends.filter(friend => 
      friend.privacy.discovery && friend.privacy.shareLiveLocation
    );

    return nearbyFriends.map(friend => ({
      id: friend._id,
      name: friend.name,
      displayName: friend.profile?.displayName || friend.name,
      avatarUrl: friend.profile?.avatarUrl
    }));
  }
}

module.exports = new UserService();
