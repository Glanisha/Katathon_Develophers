const express = require("express");
const router = express.Router();
const EmergencyContact = require("../models/EmergencyContact");

// ADD CONTACT
router.post("/add", async (req, res) => {
  try {
    const { userId, name, phone, relation } = req.body;

    const count = await EmergencyContact.countDocuments({ userId });
    if (count >= 5) {
      return res.status(400).json({ message: "Maximum 5 contacts allowed." });
    }

    const contact = await EmergencyContact.create({
      userId,
      name,
      phone,
      relation
    });

    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET CONTACTS
router.get("/:userId", async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({ userId: req.params.userId });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE CONTACT
router.delete("/:id", async (req, res) => {
  try {
    await EmergencyContact.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
