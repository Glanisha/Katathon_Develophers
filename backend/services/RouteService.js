const RouteSegment = require('../models/RouteSegment');
const LightingReport = require('../models/LightingReport');
const TomTomService = require('./TomTomService');

class RouteService {
  // Calculate safety score for a segment
  async calculateSegmentSafety(segment) {
    const scores = {
      lighting: 0,
      congestion: 0,
      incidents: 0,
      sidewalk: 0,
      userFlags: 0
    };

    // Lighting score (0-100)
    if (segment.avgStreetlightLux !== null) {
      scores.lighting = Math.min(100, (segment.avgStreetlightLux / 50) * 100);
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
      lighting: 0.3,
      congestion: 0.2,
      incidents: 0.3,
      sidewalk: 0.15,
      userFlags: 0.05
    };

    const totalScore = Object.keys(scores).reduce((sum, key) => {
      return sum + (scores[key] * weights[key]);
    }, 0);

    return {
      safetyScore: Math.round(totalScore),
      scoreBreakdown: scores
    };
  }

  // Get nearby lighting reports
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

  // Calculate safest route
  async calculateSafeRoute(origin, destination, preferences = {}) {
    const { routeType = 'safest' } = preferences;

    // Get base route from TomTom
    const routeData = await TomTomService.calculateRoute(origin, destination, {
      routeType: 'shortest' // Get multiple route options
    });

    const routes = routeData.routes || [];
    const analyzedRoutes = [];

    for (const route of routes) {
      const legs = route.legs || [];
      let totalSafetyScore = 0;
      let segmentCount = 0;

      for (const leg of legs) {
        const points = leg.points || [];
        
        for (let i = 0; i < points.length - 1; i++) {
          const start = [points[i].longitude, points[i].latitude];
          const end = [points[i + 1].longitude, points[i + 1].latitude];

          // Find or create segment
          let segment = await RouteSegment.findOne({
            'geom.coordinates': { $all: [start, end] }
          });

          if (!segment) {
            segment = await this.createSegment(start, end);
          }

          // Calculate safety
          const safety = await this.calculateSegmentSafety(segment);
          totalSafetyScore += safety.safetyScore;
          segmentCount++;
        }
      }

      const avgSafetyScore = segmentCount > 0 ? totalSafetyScore / segmentCount : 0;

      analyzedRoutes.push({
        ...route,
        safetyScore: avgSafetyScore,
        lengthInMeters: route.summary.lengthInMeters,
        travelTimeInSeconds: route.summary.travelTimeInSeconds
      });
    }

    // Sort by safety score (highest first) or by user preference
    if (routeType === 'safest') {
      analyzedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
    } else if (routeType === 'fastest') {
      analyzedRoutes.sort((a, b) => a.travelTimeInSeconds - b.travelTimeInSeconds);
    } else {
      // Balanced: weight both safety and time
      analyzedRoutes.sort((a, b) => {
        const scoreA = (a.safetyScore * 0.6) - (a.travelTimeInSeconds * 0.0001);
        const scoreB = (b.safetyScore * 0.6) - (b.travelTimeInSeconds * 0.0001);
        return scoreB - scoreA;
      });
    }

    return analyzedRoutes;
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