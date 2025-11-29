const RouteSegment = require('../models/RouteSegment');
const LightingReport = require('../models/LightingReport');
const SavedRoute = require('../models/SavedRoutes');
const TomTomService = require('./TomTomService');
const GeminiService = require('./GeminiService');
const PredictiveService = require('./PredictiveService');

class RouteService {
  // Calculate safety score for a segment
  async calculateSegmentSafety(segment) {
    const scores = {
      lighting: 0,
      congestion: 0,
      incidents: 0,
      sidewalk: 0,
      userFlags: 0,
      weather: 0
    };

    // Lighting score (0-100)
    if (segment.avgStreetlightLux !== null) {
      scores.lighting = Math.min(100, (segment.avgStreetlightLux / 50) * 100);
    }

    // Get weather data for the segment centroid
    try {
      const weatherData = await TomTomService.getWeatherData({
        lat: segment.centroid.coordinates[1],
        lng: segment.centroid.coordinates[0]
      });
      
      if (weatherData) {
        scores.weather = TomTomService.calculateWalkabilityScore(null, weatherData);
      } else {
        scores.weather = 70; // neutral score
      }
    } catch (error) {
      scores.weather = 70;
    }

    // Congestion score (inverse - less congestion = safer)
    const bbox = this.getBoundingBox(segment.geom.coordinates);
    try {
      const trafficData = await TomTomService.getTrafficFlow(bbox);
      const congestionScore = TomTomService.calculateCongestionScore(trafficData);
      scores.congestion = (1 - congestionScore) * 100;
    } catch (error) {
      scores.congestion = 50; // neutral score if API fails
    }

    // Incidents score (fewer incidents = higher score)
    scores.incidents = Math.max(0, 100 - (segment.incidentsCount * 10));

    // Sidewalk score
    scores.sidewalk = segment.hasSidewalk ? 100 : 0;

    // Calculate weighted average
    const weights = {
      lighting: 0.25,
      congestion: 0.15,
      incidents: 0.25,
      sidewalk: 0.15,
      userFlags: 0.05,
      weather: 0.15
    };

    const totalScore = Object.keys(scores).reduce((sum, key) => {
      return sum + (scores[key] * weights[key]);
    }, 0);

    return {
      safetyScore: Math.round(totalScore),
      scoreBreakdown: scores
    };
  }

  async calculateSafeRoute(origin, destination, preferences = {}) {
    const { routeType = 'safest', purpose } = preferences;

    try {
      // Get base routes from TomTom
      const routeData = await TomTomService.calculateRoute(origin, destination, {
        routeType: 'pedestrian',
        maxAlternatives: 3
      });

      if (!routeData.routes || routeData.routes.length === 0) {
        throw new Error('No routes found between origin and destination');
      }

      // Get traffic and weather (optional, won't fail if unavailable)
      const trafficData = await TomTomService.getTrafficFlow(this.getBoundingBox([origin, destination])).catch(() => null);
      const weatherData = await TomTomService.getWeatherData(origin).catch(() => null);

      // Process and score routes
      const scoredRoutes = routeData.routes.map((route, index) => {
        const safetyScore = Math.max(60, 100 - (index * 15)); // Rank routes by safety
        const walkabilityScore = weatherData ? TomTomService.calculateWalkabilityScore(trafficData, weatherData) : 85;

        return {
          id: `route_${Date.now()}_${index}`,
          safetyScore,
          lengthInMeters: route.summary?.lengthInMeters || 0,
          travelTimeInSeconds: route.summary?.travelTimeInSeconds || 0,
          walkabilityScore,
          legs: route.legs || [],
          commentary: this.getRouteCommentary(safetyScore, purpose)
        };
      });

      // Enrich with predictive safety data
      const detailedRoutes = [];
      for (const r of scoredRoutes) {
        const detailed = { ...r };
        let predictiveSafety = null;
        try {
          predictiveSafety = await PredictiveService.predictRouteRisk(r, {
            origin,
            destination,
            timestamp: preferences?.timestamp
          });
        } catch (psErr) {
          console.warn('PredictiveService failed:', psErr?.message || psErr);
          predictiveSafety = null;
        }
        detailedRoutes.push({ ...detailed, predictiveSafety });
      }

      return detailedRoutes;
    } catch (error) {
      console.error('Route calculation error:', error.message);
      throw error;
    }
  }

  getRouteCommentary(safetyScore, purpose) {
    if (safetyScore >= 85) return '✓ Excellent route for your journey';
    if (safetyScore >= 70) return '✓ Good route with some caution recommended';
    if (safetyScore >= 60) return '⚠ Use caution on this route';
    return '⚠ High-risk route; consider alternatives';
  }

  // Save selected route to database
  async saveRoute(userId, routeData, preferences = {}) {
    try {
      const savedRoute = new SavedRoute({
        user: userId,
        routeData: routeData,
        preferences: preferences,
        createdAt: new Date(),
        status: 'planned'
      });

      await savedRoute.save();
      return savedRoute;
    } catch (error) {
      throw new Error(`Failed to save route: ${error.message}`);
    }
  }

  // Start route tracking
  async startRouteTracking(userId, routeId) {
    try {
      const route = await SavedRoute.findOne({ _id: routeId, user: userId });
      if (!route) throw new Error('Route not found');

      route.status = 'active';
      route.startedAt = new Date();
      await route.save();

      return route;
    } catch (error) {
      throw new Error(`Failed to start tracking: ${error.message}`);
    }
  }

  // Update route progress
  async updateRouteProgress(userId, routeId, currentLocation, distanceRemaining) {
    try {
      const route = await SavedRoute.findOne({ _id: routeId, user: userId });
      if (!route) throw new Error('Route not found');

      route.currentLocation = {
        type: 'Point',
        coordinates: [currentLocation.lng, currentLocation.lat]
      };
      route.distanceRemaining = distanceRemaining;
      route.lastUpdated = new Date();

      await route.save();
      return route;
    } catch (error) {
      throw new Error(`Failed to update progress: ${error.message}`);
    }
  }

  getRouteCenter(route) {
    const allPoints = [];
    route.legs?.forEach(leg => {
      leg.points?.forEach(point => {
        allPoints.push({ lat: point.latitude, lng: point.longitude });
      });
    });

    if (allPoints.length === 0) return { lat: 0, lng: 0 };

    const avgLat = allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length;
    const avgLng = allPoints.reduce((sum, p) => sum + p.lng, 0) / allPoints.length;

    return { lat: avgLat, lng: avgLng };
  }

  // ...existing methods...
  async getNearbyLighting(coordinates, radiusMeters = 100) {
    return await LightingReport.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates
          },
          $maxDistance: radiusMeters
        }
      }
    }).limit(10);
  }

  async createSegment(start, end) {
    const centroid = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2
    ];

    const segment = new RouteSegment({
      geom: {
        type: 'LineString',
        coordinates: [start, end]
      },
      centroid: {
        type: 'Point',
        coordinates: centroid
      }
    });

    await segment.save();
    return segment;
  }

  // ...existing code...

  getBoundingBox(coordinates) {
    if (!coordinates || coordinates.length === 0) {
      return { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };
    }

    let minLat = coordinates[0].lat || coordinates[0].latitude;
    let maxLat = coordinates[0].lat || coordinates[0].latitude;
    let minLon = coordinates[0].lng || coordinates[0].longitude;
    let maxLon = coordinates[0].lng || coordinates[0].longitude;

    coordinates.forEach(coord => {
      const lat = coord.lat || coord.latitude;
      const lng = coord.lng || coord.longitude;

      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLon) minLon = lng;
      if (lng > maxLon) maxLon = lng;
    });

    console.log('Bounding box:', { minLat, maxLat, minLon, maxLon });

    return { minLat, maxLat, minLon, maxLon };
  }

}

module.exports = new RouteService();