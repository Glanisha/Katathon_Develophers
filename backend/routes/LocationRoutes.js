const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/AuthMiddleware");

// Update my GPS location
router.post("/update", auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await User.findByIdAndUpdate(req.user.id, {
      location: { lat, lng, updatedAt: new Date() }
    });
    res.json({ message: "Location updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get friends who share location
router.get("/friends", auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id)
      .populate("friends", "name email location privacy");

    const visibleFriends = me.friends.filter(
      (f) => f.privacy.shareLiveLocation === true
    );

    res.json(visibleFriends);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
