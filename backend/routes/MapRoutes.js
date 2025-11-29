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

// POST /api/map/nearby-friends
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

// POST /api/map/lighting-reports
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

// GET /api/map/leaderboard - Get user and friends stats
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = 'month' } = req.query; // week, month, all

    // Calculate date filter based on period
    let dateFilter = {};
    if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { createdAt: { $gte: weekAgo } };
    } else if (period === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { createdAt: { $gte: monthAgo } };
    }

    // Get user's friends list
    const Friends = require('../models/Friends');
    const friendships = await Friends.find({
      users: userId,
      status: 'accepted'
    }).populate('users', 'name email');

    const friendIds = friendships.flatMap(f => 
      f.users.filter(u => u._id.toString() !== userId.toString()).map(u => u._id)
    );
    friendIds.push(userId); // Include current user

    // Aggregate route statistics
    const SavedRoute = require('../models/SavedRoutes');
    const stats = await SavedRoute.aggregate([
      {
        $match: {
          user: { $in: friendIds },
          status: { $in: ['completed', 'active'] },
          ...dateFilter
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $group: {
          _id: '$user',
          name: { $first: '$userInfo.name' },
          totalWalks: { $sum: 1 },
          totalDistance: { $sum: { $ifNull: ['$routeData.lengthInMeters', 0] } },
          totalTime: { $sum: { $ifNull: ['$routeData.travelTimeInSeconds', 0] } },
          avgSafetyScore: { $avg: { $ifNull: ['$routeData.safetyScore', 0] } },
          completedWalks: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { totalWalks: -1, totalDistance: -1 }
      }
    ]);

    // Format leaderboard data
    const leaderboard = stats.map((stat, index) => ({
      rank: index + 1,
      userId: stat._id,
      name: stat.name,
      totalWalks: stat.totalWalks,
      totalDistanceKm: Math.round(stat.totalDistance / 1000 * 100) / 100,
      totalTimeHours: Math.round(stat.totalTime / 3600 * 10) / 10,
      avgSafetyScore: Math.round(stat.avgSafetyScore),
      completedWalks: stat.completedWalks,
      isCurrentUser: stat._id.toString() === userId.toString()
    }));

    // Get current user's specific stats
    const currentUserStats = leaderboard.find(l => l.isCurrentUser) || {
      rank: 0,
      totalWalks: 0,
      totalDistanceKm: 0,
      avgSafetyScore: 0,
      completedWalks: 0
    };

    res.json({
      period,
      currentUser: currentUserStats,
      leaderboard,
      friendsCount: friendIds.length - 1 // exclude current user
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;