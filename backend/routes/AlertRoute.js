const express = require("express");
const router = express.Router();
const { sendAlertToFriends } = require("../services/AlertService");

// SEND ALERT TO EMERGENCY CONTACTS
router.post("/send-to-friends", async (req, res) => {
  const { userId, message } = req.body;

  try {
    const result = await sendAlertToFriends(userId, message);
    return res.json(result);
  } catch (err) {
    console.log("Send alert error:", err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
