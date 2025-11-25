const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async suggestStops(purpose, route, nearbyPOIs) {
    try {
      const prompt = `
        A user is planning a walk with the purpose: "${purpose}"
        
        Route information:
        - Distance: ${route.summary?.lengthInMeters}m
        - Duration: ${route.summary?.travelTimeInSeconds}s
        - Start: ${route.legs?.[0]?.points?.[0] ? `${route.legs[0].points[0].latitude}, ${route.legs[0].points[0].longitude}` : 'Unknown'}
        - End: ${route.legs?.[route.legs.length-1]?.points?.slice(-1)[0] ? `${route.legs[route.legs.length-1].points.slice(-1)[0].latitude}, ${route.legs[route.legs.length-1].points.slice(-1)[0].longitude}` : 'Unknown'}
        
        Nearby points of interest:
        ${nearbyPOIs.map(poi => `- ${poi.poi?.name || poi.address?.freeformAddress}: ${poi.poi?.categories?.join(', ') || 'General'}`).join('\n')}
        
        Based on the user's purpose and available POIs, suggest 3-5 relevant stops or provide commentary about the route. 
        Focus on places that match their purpose (e.g., cafes for socializing, parks for exercise, museums for culture).
        
        If no destination is specified and they want to explore, suggest interesting places to visit.
        
        Respond in JSON format:
        {
          "suggestions": [
            {
              "name": "Place name",
              "description": "Why this matches their purpose",
              "coordinates": {"lat": 0, "lng": 0},
              "type": "category"
            }
          ],
          "commentary": "General advice about the route for their purpose"
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          suggestions: [],
          commentary: text
        };
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      return {
        suggestions: [],
        commentary: 'Unable to generate suggestions at this time.'
      };
    }
  }

  async generateRouteCommentary(purpose, routeData, weatherData) {
    try {
      const prompt = `
        Generate helpful commentary for a walking route with purpose: "${purpose}"
        
        Route details:
        - Distance: ${routeData.summary?.lengthInMeters || 0}m
        - Duration: ${Math.round((routeData.summary?.travelTimeInSeconds || 0) / 60)} minutes
        - Safety score: ${routeData.safetyScore || 'Unknown'}
        
        Weather: ${weatherData ? JSON.stringify(weatherData.results?.[0]?.weather) : 'Not available'}
        
        Provide practical advice in 2-3 sentences about the route considering their purpose and conditions.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini commentary error:', error);
      return 'Have a safe walk!';
    }
  }
}

module.exports = new GeminiService();