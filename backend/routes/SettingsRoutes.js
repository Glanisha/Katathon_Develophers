const express = require("express");
const router = express.Router();
const auth = require("../middleware/AuthMiddleware");
const User = require("../models/User");

// Default settings object
const defaultSettings = {
  profile: {
    displayName: "",
  },
  privacy: {
    shareLiveLocation: true,
    showApproxLocation: false,
    showAsNearby: true,
    friendRequestMode: "everyone",
  },
  mapPreferences: {
    defaultRouteType: "safest",
    distanceUnit: "km",
    defaultZoom: "normal",
    theme: "light",
  },
  notifications: {
    friendRequests: true,
    friendAccepted: true,
    chatMessages: true,
    nearbyIncidents: true,
    emailFriendRequests: false,
    emailEmergencyChanges: false,
  },
  chat: {
    allowFrom: "allFriends",
    readReceipts: true,
  },
  emergency: {
    sosAutoShareRouteAtNight: false,
    sosMessage:
      "I feel unsafe. This is my current location and route. Please check on me.",
  },
};

// helper: deep-merge existing + new + defaults
const mergeSettings = (current = {}, incoming = {}) => {
  return {
    ...defaultSettings,
    ...current,
    ...incoming,
    profile: {
      ...defaultSettings.profile,
      ...(current.profile || {}),
      ...(incoming.profile || {}),
    },
    privacy: {
      ...defaultSettings.privacy,
      ...(current.privacy || {}),
      ...(incoming.privacy || {}),
    },
    mapPreferences: {
      ...defaultSettings.mapPreferences,
      ...(current.mapPreferences || {}),
      ...(incoming.mapPreferences || {}),
    },
    notifications: {
      ...defaultSettings.notifications,
      ...(current.notifications || {}),
      ...(incoming.notifications || {}),
    },
    chat: {
      ...defaultSettings.chat,
      ...(current.chat || {}),
      ...(incoming.chat || {}),
    },
    emergency: {
      ...defaultSettings.emergency,
      ...(current.emergency || {}),
      ...(incoming.emergency || {}),
    },
  };
};

// GET /api/settings
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const merged = mergeSettings(user.settings || {}, {});
    return res.json({ settings: merged });
  } catch (err) {
    console.error("Get settings error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/settings
router.put("/", auth, async (req, res) => {
  try {
    const updates = req.body.settings || req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const merged = mergeSettings(user.settings || {}, updates);
    user.settings = merged;

    await user.save();
    return res.json({ settings: merged });
  } catch (err) {
    console.error("Update settings error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
