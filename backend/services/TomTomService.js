const axios = require('axios');

class TomTomService {
  constructor() {
    this.apiKey = process.env.TOMTOM_API_KEY;
    this.baseUrl = 'https://api.tomtom.com';
  }

  // Calculate route with multiple options
  async calculateRoute(origin, destination, options = {}) {
    const { routeType = 'shortest', avoid = [], maxAlternatives = 3 } = options;
    
    try {
      // validate inputs
      if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') {
        throw new Error('Invalid origin coordinates');
      }
      if (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
        throw new Error('Invalid destination coordinates');
      }

      // validate routeType against known allowed values. TomTom rejects unknown routeType strings.
      const allowedRouteTypes = ['shortest', 'fastest'];
      const providedRt = String(routeType || '').toLowerCase();
      const finalRouteType = allowedRouteTypes.includes(providedRt) ? providedRt : 'shortest';

      // helpful debug log (will appear in server logs)
      console.debug('TomTom calculateRoute request', { origin, destination, options: { routeType: finalRouteType, avoid, maxAlternatives } });
      // Build params and only include `avoid` when provided (TomTom rejects empty arrays)
      const params = {
        key: this.apiKey,
        routeType: finalRouteType,
        maxAlternatives: Number(maxAlternatives) || 3,
        travelMode: 'pedestrian',
        instructionsType: 'text'
      };

      // TomTom rejects hilliness/windingness for pedestrian routing with all cost models.
      // Do not include these params for pedestrian mode.

      if (Array.isArray(avoid) && avoid.length > 0) {
        params.avoid = avoid.join(',');
      }

      const response = await axios.get(`${this.baseUrl}/routing/1/calculateRoute/${origin.lat},${origin.lng}:${destination.lat},${destination.lng}/json`, { params });
      return response.data;
    } catch (error) {
      // include TomTom response body if available for easier debugging
      const details = error.response?.data ? `: ${JSON.stringify(error.response.data)}` : '';
      console.error('TomTom routing error', error.response?.status, error.response?.data || error.message);
      throw new Error(`TomTom routing error: ${error.message}${details}`);
    }
  }

  // Get traffic flow data
  async getTrafficFlow(bbox) {
    try {
      const response = await axios.get(`${this.baseUrl}/traffic/services/4/flowSegmentData/absolute/10/json`, {
        params: {
          key: this.apiKey,
          point: `${(bbox.minLat + bbox.maxLat) / 2},${(bbox.minLon + bbox.maxLon) / 2}`,
          unit: 'KMPH'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Traffic flow error:', error);
      return null;
    }
  }

  // Get weather data
  async getWeatherData(coordinates) {
    try {
      const response = await axios.get(`${this.baseUrl}/weather/1/current.json`, {
        params: {
          key: this.apiKey,
          query: `${coordinates.lat},${coordinates.lng}`,
          details: true
        }
      });
      return response.data;
    } catch (error) {
      console.error('Weather error:', error);
      return null;
    }
  }

  // Search for points of interest
  async searchPOI(query, coordinates, radius = 1000) {
    try {
      const response = await axios.get(`${this.baseUrl}/search/2/search/${encodeURIComponent(query)}.json`, {
        params: {
          key: this.apiKey,
          lat: coordinates.lat,
          lon: coordinates.lng,
          radius: radius,
          limit: 20
        }
      });
      return response.data;
    } catch (error) {
      console.error('POI search error:', error);
      return { results: [] };
    }
  }

  // Calculate walkability score
  calculateWalkabilityScore(trafficData, weatherData) {
    let score = 100;
    
    if (trafficData?.flowSegmentData?.currentSpeed) {
      const speed = trafficData.flowSegmentData.currentSpeed;
      if (speed > 30) score -= 20; // High traffic reduces walkability
      if (speed > 50) score -= 30;
    }

    if (weatherData?.results?.[0]) {
      const weather = weatherData.results[0];
      if (weather.weather?.[0]?.id) {
        const weatherId = weather.weather[0].id;
        if (weatherId >= 200 && weatherId < 600) score -= 40; // Rain/storms
        if (weatherId >= 600 && weatherId < 700) score -= 30; // Snow
        if (weather.temperature?.value < 0) score -= 20; // Freezing
        if (weather.temperature?.value > 35) score -= 15; // Too hot
      }
    }

    return Math.max(0, score);
  }

  calculateCongestionScore(trafficData) {
    if (!trafficData?.flowSegmentData?.currentSpeed) return 0.5;
    
    const currentSpeed = trafficData.flowSegmentData.currentSpeed;
    const freeFlowSpeed = trafficData.flowSegmentData.freeFlowSpeed || currentSpeed;
    
    return 1 - (currentSpeed / freeFlowSpeed);
  }
}

module.exports = new TomTomService();