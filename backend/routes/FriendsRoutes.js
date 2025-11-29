const express = require("express");
const router = express.Router();
const User = require("../models/User");
// the middleware file is named `AuthMiddleware.js`
const auth = require("../middleware/AuthMiddleware");
const FriendRequest = require("../models/FriendRequest");

// Send a friend request (by email or first name)
router.post("/request", auth, async (req, res) => {
  try {
    const { query } = req.body; // can be email or name fragment
    if (!query || !query.trim())
      return res.status(400).json({ message: "Invalid query" });

    const me = await User.findById(req.user.id);

    let toUser = null;
    if (query.includes("@")) {
      toUser = await User.findOne({ email: query.toLowerCase().trim() });
    } else {
      // simple first-name / prefix match (case-insensitive)
      const nameRegex = new RegExp("^" + query.trim(), "i");
      toUser = await User.findOne({ name: nameRegex });
    }

    if (!toUser) return res.status(404).json({ message: "User not found" });
    if (toUser._id.equals(me._id))
      return res.status(400).json({ message: "You cannot add yourself" });
    if (me.friends.includes(toUser._id))
      return res.status(400).json({ message: "Already friends" });

    // ensure there isn't already a pending request between these users
    const existing = await FriendRequest.findOne({
      $or: [
        { from: me._id, to: toUser._id },
        { from: toUser._id, to: me._id },
      ],
      status: "pending",
    });
    if (existing)
      return res
        .status(400)
        .json({ message: "There is already a pending friend request" });

    const reqDoc = new FriendRequest({ from: me._id, to: toUser._id });
    await reqDoc.save();

    console.log("Friend request created:", {
      from: me._id,
      to: toUser._id,
      requestId: reqDoc._id,
    });
    res.json({ message: "Friend request sent", requestId: reqDoc._id });
  } catch (err) {
    console.error("Send friend request error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get my friends with location info
router.get("/list", auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).populate(
      "friends",
      "name email location privacy"
    );

    // return in an object so frontend can read `res.data.friends`
    res.json({ friends: me.friends });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Remove a friend
router.delete("/:id", auth, async (req, res) => {
  try {
    const friendId = req.params.id;
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      console.error("Remove friend: invalid id", {
        friendId,
        userId: req.user && req.user.id,
        authHeader: req.headers?.authorization,
      });
      return res.status(400).json({ message: "Invalid friend id" });
    }
    const me = await User.findById(req.user.id);
    if (!me) {
      console.error("Remove friend: user not found", {
        userId: req.user && req.user.id,
        authHeader: req.headers?.authorization,
      });
      return res.status(401).json({ message: "User not found" });
    }
    const friend = await User.findById(friendId);

    if (!friend) return res.status(404).json({ message: "Friend not found" });
    console.log("Remove friend request", {
      userId: me._id.toString(),
      friendId,
      authHeader: req.headers?.authorization,
    });

    // remove references both ways
    me.friends = me.friends.filter((f) => f.toString() !== friendId);
    friend.friends = friend.friends.filter(
      (f) => f.toString() !== me._id.toString()
    );

    await me.save();
    await friend.save();

    // optionally clean up any pending friend requests between them
    await FriendRequest.updateMany(
      {
        $or: [
          { from: me._id, to: friend._id },
          { from: friend._id, to: me._id },
        ],
      },
      { status: "declined" }
    );

    res.json({ message: "Friend removed" });
  } catch (err) {
    console.error("Remove friend error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get incoming friend requests (to me)
router.get("/requests", auth, async (req, res) => {
  try {
    const incoming = await FriendRequest.find({
      to: req.user.id,
      status: "pending",
    }).populate("from", "name email");
    res.json({ requests: incoming });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get outgoing friend requests (sent by me)
router.get("/requests/sent", auth, async (req, res) => {
  try {
    const outgoing = await FriendRequest.find({
      from: req.user.id,
      status: "pending",
    }).populate("to", "name email");
    res.json({ requests: outgoing });
  } catch (err) {
    console.error("Fetch sent requests error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Cancel a sent friend request (sender can cancel)
router.delete("/requests/:id", auth, async (req, res) => {
  try {
    const reqId = req.params.id;
    const requestDoc = await FriendRequest.findById(reqId);
    if (!requestDoc)
      return res.status(404).json({ message: "Request not found" });
    if (requestDoc.from.toString() !== req.user.id)
      return res
        .status(403)
        .json({ message: "Not authorized to cancel this request" });

    if (requestDoc.status !== "pending")
      return res.status(400).json({ message: "Request already handled" });

    await FriendRequest.deleteOne({ _id: reqId });
    res.json({ message: "Friend request canceled" });
  } catch (err) {
    console.error("Cancel friend request error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Approve a friend request
router.post("/requests/:id/approve", auth, async (req, res) => {
  try {
    const reqId = req.params.id;
    const requestDoc = await FriendRequest.findById(reqId);
    if (!requestDoc)
      return res.status(404).json({ message: "Request not found" });
    if (requestDoc.to.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    if (requestDoc.status !== "pending")
      return res.status(400).json({ message: "Request already handled" });

    const me = await User.findById(req.user.id);
    const other = await User.findById(requestDoc.from);

    if (!me.friends.includes(other._id)) me.friends.push(other._id);
    if (!other.friends.includes(me._id)) other.friends.push(me._id);

    await me.save();
    await other.save();

    requestDoc.status = "accepted";
    await requestDoc.save();

    console.log("Friend request approved:", {
      from: requestDoc.from,
      to: req.user.id,
      bothNowFriends: true,
    });
    res.json({ message: "Friend request accepted" });
  } catch (err) {
    console.error("Approve friend request error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Decline a friend request
router.post("/requests/:id/decline", auth, async (req, res) => {
  try {
    const reqId = req.params.id;
    const requestDoc = await FriendRequest.findById(reqId);
    if (!requestDoc)
      return res.status(404).json({ message: "Request not found" });
    if (requestDoc.to.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    requestDoc.status = "declined";
    await requestDoc.save();
    res.json({ message: "Friend request declined" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
