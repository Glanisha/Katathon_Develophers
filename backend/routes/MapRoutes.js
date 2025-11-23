const express = require('express');
const RouteService = require('../services/RouteService');
const UserService = require('../services/UserService');
const authMiddleware = require('../middleware/AuthMiddleware');

const router = express.Router();

// POST /api/map/calculate-route
router.post('/calculate-route', authMiddleware, async (req, res) => {
  try {
    const { origin, destination, preferences } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    const routes = await RouteService.calculateSafeRoute(origin, destination, preferences);
    res.json({ routes });
  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/map/nearby-friends
router.post('/nearby-friends', authMiddleware, async (req, res) => {
  try {
    const { coordinates, radius } = req.body;
    const userId = req.user._id;

    const friends = await UserService.findFriendsNearby(userId, coordinates, radius);
    res.json({ friends });
  } catch (error) {
    console.error('Nearby friends error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/map/lighting-reports
router.post('/lighting-reports', authMiddleware, async (req, res) => {
  try {
    const { coordinates, radius } = req.body;

    const reports = await RouteService.getNearbyLighting(coordinates, radius);
    res.json({ reports });
  } catch (error) {
    console.error('Lighting reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/map/report-lighting
router.post('/report-lighting', authMiddleware, async (req, res) => {
  try {
    const { coordinates, luxEstimate, notes, photoUrl } = req.body;
    const userId = req.user._id;

    const LightingReport = require('../models/LightingReport');
    const report = new LightingReport({
      user: userId,
      location: {
        type: 'Point',
        coordinates: coordinates
      },
      luxEstimate,
      notes,
      photoUrl
    });

    await report.save();
    res.status(201).json({ report });
  } catch (error) {
    console.error('Report lighting error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;