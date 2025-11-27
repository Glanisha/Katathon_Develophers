const User = require('../models/User');

// helper: distance between 2 lat/lng points in meters
function distanceInMeters(lat1, lng1, lat2, lng2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000; // earth radius in m

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class UserService {
  // ---------- NEW: update user's live location ----------
  async updateUserLocation(userId, { lat, lng }) {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new Error('lat and lng must be numbers');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        location: {
          lat,
          lng,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    return user;
  }

  // ---------- NEW: add friend by email ----------
  async addFriend(userId, friendEmail) {
    const me = await User.findById(userId);
    if (!me) throw new Error('User not found');

    const friend = await User.findOne({ email: friendEmail.toLowerCase() });
    if (!friend) throw new Error('User not found');
    if (friend._id.equals(me._id)) throw new Error('You cannot add yourself');

    // add both sides if not already friends
    if (!me.friends.some((id) => id.equals(friend._id))) {
      me.friends.push(friend._id);
    }
    if (!friend.friends.some((id) => id.equals(me._id))) {
      friend.friends.push(me._id);
    }

    await me.save();
    await friend.save();

    return friend;
  }

  // ---------- NEW: list my friends ----------
  async getFriends(userId) {
    const user = await User.findById(userId).populate(
      'friends',
      'name email profile location privacy'
    );
    if (!user) throw new Error('User not found');
    return user.friends;
  }

  // ---------- UPDATED: find friends near a location ----------
  // coordinates: { lat, lng }, radiusMeters: number
  async findFriendsNearby(userId, coordinates, radiusMeters = 5000) {
    const { lat, lng } = coordinates || {};
    if (typeof lat !== 'number' || typeof lng !== 'number') return [];

    const user = await User.findById(userId).populate('friends');
    if (!user || !user.friends.length) {
      return [];
    }

    const nearbyFriends = user.friends
      .filter((friend) => {
        // privacy + location checks
        if (
          !friend.privacy?.discovery ||
          !friend.privacy?.shareLiveLocation ||
          !friend.location ||
          typeof friend.location.lat !== 'number' ||
          typeof friend.location.lng !== 'number'
        ) {
          return false;
        }

        const d = distanceInMeters(
          lat,
          lng,
          friend.location.lat,
          friend.location.lng
        );
        return d <= radiusMeters;
      })
      .map((friend) => ({
        id: friend._id,
        name: friend.name,
        displayName: friend.profile?.displayName || friend.name,
        avatarUrl: friend.profile?.avatarUrl,
        lat: friend.location.lat,
        lng: friend.location.lng,
        updatedAt: friend.location.updatedAt,
      }));

    return nearbyFriends;
  }
}

module.exports = new UserService();
