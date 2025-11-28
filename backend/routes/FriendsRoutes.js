const express = require('express');
const FriendsService = require('../services/FriendsService');
const authMiddleware = require('../middleware/AuthMiddleware');
const User = require('../models/User');

const router = express.Router();

// Send friend request
router.post('/send-request', authMiddleware, async (req, res) => {
  try {
    const { toUserId } = req.body;
    const fromUserId = req.user.id;

    if (!toUserId) return res.status(400).json({ error: 'toUserId required' });

    const request = await FriendsService.sendFriendRequest(fromUserId, toUserId);
    res.json({ message: 'Friend request sent', request });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Accept friend request
router.post('/accept-request/:requestId', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const friendship = await FriendsService.acceptFriendRequest(userId, requestId);
    res.json({ message: 'Friend request accepted', friendship });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Reject friend request
router.post('/reject-request/:requestId', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    await FriendsService.rejectFriendRequest(userId, requestId);
    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all friends
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const friends = await FriendsService.getFriends(userId);
    res.json({ friends });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending requests
router.get('/pending-requests', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await FriendsService.getPendingRequests(userId);
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get friends with live location
router.get('/with-location', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const friends = await FriendsService.getFriendsWithLocation(userId);
    res.json({ friends });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Block user
router.post('/block/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    await FriendsService.blockUser(currentUserId, userId);
    res.json({ message: 'User blocked' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Unblock user
router.post('/unblock/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    await FriendsService.unblockUser(currentUserId, userId);
    res.json({ message: 'User unblocked' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Remove friend
router.post('/remove/:friendId', authMiddleware, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    await FriendsService.removeFriend(userId, friendId);
    res.json({ message: 'Friend removed' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update interaction
router.post('/update-interaction/:friendId', authMiddleware, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    const friendship = await FriendsService.updateInteraction(userId, friendId);
    res.json({ friendship });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/all-users', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const users = await User.find(
      { _id: { $ne: userId } },
      'name email profile.displayName profile.avatarUrl profile.bio'
    );
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;