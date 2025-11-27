const express = require('express');
const RouteService = require('../services/RouteService');
const UserService = require('../services/UserService');
const TomTomService = require('../services/TomTomService');
const authMiddleware = require('../middleware/AuthMiddleware');

const router = express.Router();

// POST /api/map/calculate-route - Enhanced with purpose support
router.post('/calculate-route', authMiddleware, async (req, res) => {
  try {
    const { origin, destination, preferences } = req.body;

    if (!origin) {
      return res.status(400).json({ error: 'Origin is required' });
    }

    // If no destination provided, handle exploration mode
    if (!destination && preferences.purpose) {
      try {
        const nearbyPOIs = await TomTomService.searchPOI(preferences.purpose, origin, 2000);
        return res.json({ 
          explorePOIs: nearbyPOIs.results || [],
          message: 'No destination provided. Here are places to explore based on your purpose.'
        });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to find exploration options' });
      }
    }

    if (!destination) {
      return res.status(400).json({ error: 'Destination is required when not in exploration mode' });
    }

    const routes = await RouteService.calculateSafeRoute(origin, destination, preferences);
    res.json({ routes });
  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/map/save-route
router.post('/save-route', authMiddleware, async (req, res) => {
  try {
    const { routeData, preferences } = req.body;
    const userId = req.user._id;

    const savedRoute = await RouteService.saveRoute(userId, routeData, preferences);
    res.status(201).json({ savedRoute });
  } catch (error) {
    console.error('Save route error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/map/start-tracking
router.post('/start-tracking', authMiddleware, async (req, res) => {
  try {
    const { routeId } = req.body;
    const userId = req.user._id;

    const route = await RouteService.startRouteTracking(userId, routeId);
    res.json({ route });
  } catch (error) {
    console.error('Start tracking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/map/update-progress
router.post('/update-progress', authMiddleware, async (req, res) => {
  try {
    const { routeId, currentLocation, distanceRemaining } = req.body;
    const userId = req.user._id;

    const route = await RouteService.updateRouteProgress(userId, routeId, currentLocation, distanceRemaining);
    res.json({ route });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/map/weather
router.get('/weather/:lat/:lng', authMiddleware, async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const weatherData = await TomTomService.getWeatherData({ lat: parseFloat(lat), lng: parseFloat(lng) });
    res.json({ weather: weatherData });
  } catch (error) {
    console.error('Weather error:', error);
    res.status(500).json({ error: error.message });
  }
});

//
// 🔹 NEW: update current user's live location
// Body: { coordinates: { lat: number, lng: number } }
//
router.post('/update-location', authMiddleware, async (req, res) => {
  try {
    const { coordinates } = req.body; // { lat, lng }
    const userId = req.user._id;

    if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
      return res.status(400).json({ error: 'coordinates must be { lat: number, lng: number }' });
    }

    const user = await UserService.updateUserLocation(userId, coordinates);
    res.json({ user });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: error.message });
  }
});

//
// ✅ Existing: find nearby friends (now using real coordinates from UserService)
// Body: { coordinates: { lat, lng }, radius: number }
//
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
