const RouteSegment = require('../models/RouteSegment');
const LightingReport = require('../models/LightingReport');
const SavedRoute = require('../models/SavedRoutes');
const TomTomService = require('./TomTomService');
const GeminiService = require('./GeminiService');

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

  // Enhanced route calculation with purpose-based suggestions
  async calculateSafeRoute(origin, destination, preferences = {}) {
    const { routeType = 'safest', purpose } = preferences;

    // Get base routes from TomTom
    const routeData = await TomTomService.calculateRoute(origin, destination, {
      routeType: 'shortest',
      maxAlternatives: 3
    });

    const routes = routeData.routes || [];
    const analyzedRoutes = [];

    for (const route of routes) {
      const legs = route.legs || [];
      let totalSafetyScore = 0;
      let segmentCount = 0;

      // Calculate safety for each segment
      for (const leg of legs) {
        const points = leg.points || [];
        
        for (let i = 0; i < points.length - 1; i++) {
          const start = [points[i].longitude, points[i].latitude];
          const end = [points[i + 1].longitude, points[i + 1].latitude];

          let segment = await RouteSegment.findOne({
            'geom.coordinates': { $all: [start, end] }
          });

          if (!segment) {
            segment = await this.createSegment(start, end);
          }

          const safety = await this.calculateSegmentSafety(segment);
          totalSafetyScore += safety.safetyScore;
          segmentCount++;
        }
      }

      const avgSafetyScore = segmentCount > 0 ? totalSafetyScore / segmentCount : 0;

      // Get weather data for the route
      const routeCenter = this.getRouteCenter(route);
      const weatherData = await TomTomService.getWeatherData(routeCenter);

      // Enhance route with additional data
      const enhancedRoute = {
        ...route,
        safetyScore: avgSafetyScore,
        lengthInMeters: route.summary.lengthInMeters,
        travelTimeInSeconds: route.summary.travelTimeInSeconds,
        weatherData: weatherData,
        walkabilityScore: TomTomService.calculateWalkabilityScore(null, weatherData)
      };

      // Get purpose-based suggestions if purpose is provided
      if (purpose) {
        try {
          const nearbyPOIs = await TomTomService.searchPOI(purpose, routeCenter, 1000);
          const suggestions = await GeminiService.suggestStops(purpose, route, nearbyPOIs.results || []);
          const commentary = await GeminiService.generateRouteCommentary(purpose, enhancedRoute, weatherData);
          
          enhancedRoute.suggestions = suggestions;
          enhancedRoute.commentary = commentary;
        } catch (error) {
          console.error('Error generating suggestions:', error);
        }
      }

      analyzedRoutes.push(enhancedRoute);
    }

    // Sort routes based on preference
    if (routeType === 'safest') {
      analyzedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
    } else if (routeType === 'fastest') {
      analyzedRoutes.sort((a, b) => a.travelTimeInSeconds - b.travelTimeInSeconds);
    } else { // balanced
      analyzedRoutes.sort((a, b) => {
        const scoreA = (a.safetyScore * 0.4) + (a.walkabilityScore * 0.3) - (a.travelTimeInSeconds * 0.0001);
        const scoreB = (b.safetyScore * 0.4) + (b.walkabilityScore * 0.3) - (b.travelTimeInSeconds * 0.0001);
        return scoreB - scoreA;
      });
    }

    return analyzedRoutes;
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

  getBoundingBox(coordinates) {
    const lons = coordinates.map(c => c[0]);
    const lats = coordinates.map(c => c[1]);
    
    return {
      minLon: Math.min(...lons),
      minLat: Math.min(...lats),
      maxLon: Math.max(...lons),
      maxLat: Math.max(...lats)
    };
  }
}

module.exports = new RouteService();