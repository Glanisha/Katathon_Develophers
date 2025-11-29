const TomTomService = require('./TomTomService');
const GeminiService = require('./GeminiService');
const SafetyScoreService = require('./SafetyScoreService');

class MapService {
  async calculateRoutes(origin, destination, preferences = {}) {
    const { routeType = 'safest', purpose } = preferences;

    try {
      // Get route from TomTom
      const routeData = await TomTomService.calculateRoute(origin, destination, {
        routeType: routeType === 'fastest' ? 'fastest' : 'shortest',
        maxAlternatives: 3
      });

      if (!routeData?.routes || routeData.routes.length === 0) {
        throw new Error('No routes found');
      }

      // Calculate bounding box for traffic/weather
      const firstRoute = routeData.routes[0];
      const routePoints = firstRoute.legs?.flatMap(l => l.points) || [];
      const bbox = SafetyScoreService.getRouteBoundingBox(routePoints);

      // Fetch contextual data
      const [trafficData, weatherData] = await Promise.all([
        bbox ? TomTomService.getTrafficFlow(bbox) : null,
        TomTomService.getWeatherData(origin)
      ]);

      // Process each route with comprehensive safety scoring
      const processedRoutes = await Promise.all(
        routeData.routes.map(async (route, index) => {
          const points = route.legs?.flatMap(l => l.points) || [];
          
          // Calculate comprehensive safety score
          const safetyData = await SafetyScoreService.calculateComprehensiveSafetyScore(
            points,
            trafficData,
            weatherData
          );

          // Get POIs along route for suggestions
          const midPoint = points[Math.floor(points.length / 2)];
          let nearbyPOIs = [];
          let geminiSuggestions = null;

          if (midPoint && purpose) {
            try {
              nearbyPOIs = await TomTomService.searchPOI(purpose, {
                lat: midPoint.latitude ?? midPoint.lat,
                lng: midPoint.longitude ?? midPoint.lng
              });

              geminiSuggestions = await GeminiService.suggestStops(
                purpose,
                route,
                nearbyPOIs.results || []
              );
            } catch (err) {
              console.warn('POI/Gemini error:', err.message);
            }
          }

          // Generate route commentary
          let commentary = '';
          try {
            commentary = await GeminiService.generateRouteCommentary(
              purpose || 'walking',
              { ...route, safetyScore: safetyData.overallScore },
              weatherData
            );
          } catch (err) {
            commentary = this.generateFallbackCommentary(safetyData);
          }

          return {
            id: `route_${index}`,
            lengthInMeters: route.summary?.lengthInMeters || 0,
            travelTimeInSeconds: route.summary?.travelTimeInSeconds || 0,
            legs: route.legs || [],
            
            // Safety metrics
            safetyScore: safetyData.overallScore,
            safetyLevel: safetyData.safetyLevel,
            safetyColor: safetyData.safetyColor,
            safetyDetails: safetyData.components,
            safetyMetadata: safetyData.metadata,
            
            // Individual scores for display
            incidentScore: safetyData.components.incidents.score,
            lightingScore: safetyData.components.lighting.score,
            congestionScore: safetyData.components.congestion.score,
            walkabilityScore: safetyData.components.walkability.score,
            
            // Detailed breakdowns
            incidentDetails: safetyData.components.incidents.details,
            lightingDetails: safetyData.components.lighting.details,
            congestionDetails: safetyData.components.congestion.details,
            walkabilityDetails: safetyData.components.walkability.details,
            
            // AI suggestions
            suggestions: geminiSuggestions?.suggestions || [],
            commentary: commentary || geminiSuggestions?.commentary || '',
            
            // Weather info
            weather: weatherData?.results?.[0] || null
          };
        })
      );

      // Sort routes based on preference
      if (routeType === 'safest') {
        processedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
      } else if (routeType === 'fastest') {
        processedRoutes.sort((a, b) => a.travelTimeInSeconds - b.travelTimeInSeconds);
      } else {
        // balanced: weighted combination
        processedRoutes.sort((a, b) => {
          const aScore = a.safetyScore * 0.6 + (1 - a.travelTimeInSeconds / 3600) * 40;
          const bScore = b.safetyScore * 0.6 + (1 - b.travelTimeInSeconds / 3600) * 40;
          return bScore - aScore;
        });
      }

      return { routes: processedRoutes };
    } catch (error) {
      console.error('MapService calculateRoutes error:', error);
      throw error;
    }
  }

  generateFallbackCommentary(safetyData) {
    const { safetyLevel, components, metadata } = safetyData;
    const parts = [];

    // Overall assessment
    if (safetyLevel === 'excellent' || safetyLevel === 'good') {
      parts.push('This route appears safe for walking.');
    } else if (safetyLevel === 'moderate') {
      parts.push('This route has moderate safety - stay aware of your surroundings.');
    } else {
      parts.push('Exercise caution on this route due to safety concerns.');
    }

    // Lighting note if relevant
    if (metadata.isDarkHours && components.lighting.score < 60) {
      parts.push('Lighting conditions are poor - consider a well-lit alternative.');
    }

    // Incident note
    if (components.incidents.details.count > 0) {
      parts.push(`${components.incidents.details.count} recent incident(s) reported nearby.`);
    }

    // Congestion note
    if (components.congestion.details.congestionLevel === 'heavy' ||
        components.congestion.details.congestionLevel === 'severe') {
      parts.push('Expect crowded conditions along this route.');
    }

    return parts.join(' ');
  }
}

module.exports = new MapService();