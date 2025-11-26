const axios = require('axios');

class TomTomService {
  constructor() {
    this.apiKey = process.env.TOMTOM_API_KEY;
    this.baseUrl = 'https://api.tomtom.com';
  }

  // Calculate route – cleaned, safe, fully working request format
  async calculateRoute(origin, destination, options = {}) {
    const {
      routeType = 'shortest',
      avoid = [],
      maxAlternatives = 3
    } = options;

    try {
      const response = await axios.get(
        `${this.baseUrl}/routing/1/calculateRoute/${origin.lat},${origin.lng}:${destination.lat},${destination.lng}/json`,
        {
          params: {
            key: this.apiKey,
            travelMode: 'pedestrian',   // works without conflict now
            maxAlternatives,
            ...(avoid.length > 0 && { avoid: avoid.join(',') }) // only sent if not empty
          }
        }
      );

      return response.data;

    } catch (error) {
      console.log("TomTom detailed error:", error.response?.data || error.message);
      throw new Error(`TomTom routing error: ${error.response?.data?.error || error.message}`);
    }
  }

// ...existing code...

  // Traffic flow data
  async getTrafficFlow(bbox) {
    try {
      if (!this.apiKey) return null;

      // Calculate center point from bbox
      const centerLat = (bbox.minLat + bbox.maxLat) / 2;
      const centerLng = (bbox.minLon + bbox.maxLon) / 2;

      // Point format must be: lat,lng
      const point = `${centerLat},${centerLng}`;

      console.log('Traffic flow request:', { point, zoom: 10 });

      const response = await axios.get(
        `${this.baseUrl}/traffic/services/4/flowSegmentData/absolute/10/json`,
        {
          params: {
            key: this.apiKey,
            point: point,  // Explicitly format as lat,lng
            unit: 'KMPH'
          }
        }
      );

      console.log('Traffic flow success');
      return response.data;
    } catch (error) {
      console.log('Traffic flow error:', error.response?.data || error.message);
      return null;
    }
  }

// ...existing code...

  // Weather data – use free alternative or skip
  async getWeatherData(coordinates) {
    try {
      // TomTom weather requires premium tier; use Open-Meteo free API instead
      const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          current: 'temperature_2m,weather_code,wind_speed_10m,precipitation',
          temperature_unit: 'celsius'
        }
      });
      
      // Transform Open-Meteo response to match expected format
      if (response.data?.current) {
        return {
          results: [{
            weather: [{ id: response.data.current.weather_code }],
            temperature: { value: response.data.current.temperature_2m }
          }]
        };
      }
      return null;
    } catch (error) {
      console.log("Weather error:", error.message);
      return null;
    }
  }

// ...existing code...

  // Points of Interest Search
  async searchPOI(query, coordinates, radius = 1000) {
    try {
      const response = await axios.get(`${this.baseUrl}/search/2/search/${encodeURIComponent(query)}.json`, {
        params: {
          key: this.apiKey,
          lat: coordinates.lat,
          lon: coordinates.lng,
          radius,
          limit: 20
        }
      });
      return response.data;
    } catch (error) {
      console.log("POI search error:", error.response?.data || error.message);
      return { results: [] };
    }
  }

  // Walkability Score
  calculateWalkabilityScore(trafficData, weatherData) {
    let score = 100;

    if (trafficData?.flowSegmentData?.currentSpeed) {
      const speed = trafficData.flowSegmentData.currentSpeed;
      if (speed > 30) score -= 20;
      if (speed > 50) score -= 30;
    }

    if (weatherData?.results?.[0]) {
      const weather = weatherData.results[0];
      const id = weather.weather?.[0]?.id;

      if (id >= 200 && id < 600) score -= 40;
      if (id >= 600 && id < 700) score -= 30;
      if (weather.temperature?.value < 0) score -= 20;
      if (weather.temperature?.value > 35) score -= 15;
    }

    return Math.max(0, score);
  }

  // Congestion Score
  calculateCongestionScore(trafficData) {
    if (!trafficData?.flowSegmentData?.currentSpeed) return 0.5;

    const current = trafficData.flowSegmentData.currentSpeed;
    const free = trafficData.flowSegmentData.freeFlowSpeed || current;

    return 1 - (current / free);
  }
}

module.exports = new TomTomService();
