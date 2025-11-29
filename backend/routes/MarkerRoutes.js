// backend/routes/MarkerRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const SafetyMarker = require('../models/SafetyMarker');
const { uploadLocalFile } = require('../services/cloudinaryService');
const authMiddleware = require('../middleware/AuthMiddleware');

// POST /api/markers - create a marker (with optional image)
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, lat, lng } = req.body;
    const userId = req.user && req.user._id ? req.user._id : req.body.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!title || !lat || !lng) return res.status(400).json({ error: 'Missing required fields' });

    let imageUrl = null;
    if (req.file) {
      const uploadRes = await uploadLocalFile(req.file.path, 'safewalk/markers');
      imageUrl = uploadRes.secure_url;
    }

    const marker = new SafetyMarker({
      user: userId,
      title,
      description,
      category,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      imageUrl
    });

    await marker.save();
    return res.json(marker);
  } catch (err) {
    console.error('Create marker error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/markers - list markers (optionally bbox or category)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category) filter.category = category;
    const markers = await SafetyMarker.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
    return res.json(markers);
  } catch (err) {
    console.error('List markers error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
