const axios = require('axios');

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const TOMTOM_BASE_URL = 'https://api.tomtom.com';

class TomTomService {
  // Get traffic flow data
  async getTrafficFlow(bbox) {
    try {
      const { minLon, minLat, maxLon, maxLat } = bbox;
      const response = await axios.get(
        `${TOMTOM_BASE_URL}/traffic/services/4/flowSegmentData/absolute/10/json`,
        {
          params: {
            key: TOMTOM_API_KEY,
            point: `${(minLat + maxLat) / 2},${(minLon + maxLon) / 2}`,
            unit: 'KMPH'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('TomTom API error:', error.message);
      throw new Error('Failed to fetch traffic data');
    }
  }

  // Get route with traffic consideration
  async calculateRoute(origin, destination, options = {}) {
    try {
      const response = await axios.get(
        `${TOMTOM_BASE_URL}/routing/1/calculateRoute/${origin.lat},${origin.lon}:${destination.lat},${destination.lon}/json`,
        {
          params: {
            key: TOMTOM_API_KEY,
            traffic: true,
            routeType: options.routeType || 'fastest',
            travelMode: 'pedestrian',
            ...options
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('TomTom routing error:', error.message);
      throw new Error('Failed to calculate route');
    }
  }

  // Calculate congestion score (0-1, where 1 is most congested)
  calculateCongestionScore(flowData) {
    if (!flowData || !flowData.flowSegmentData) return 0;
    
    const { currentSpeed, freeFlowSpeed } = flowData.flowSegmentData;
    if (!freeFlowSpeed || freeFlowSpeed === 0) return 0;
    
    const ratio = currentSpeed / freeFlowSpeed;
    return Math.max(0, Math.min(1, 1 - ratio));
  }
}

module.exports = new TomTomService();