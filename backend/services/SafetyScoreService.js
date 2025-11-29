const IncidentReport = require('../models/IncidentReport');
const LightingReport = require('../models/LightingReport');

class SafetyScoreService {
  constructor() {
    // Time windows for lighting relevance
    this.EVENING_START = 17; // 5 PM
    this.NIGHT_START = 20;   // 8 PM
    this.NIGHT_END = 6;      // 6 AM
  }

  // Check if current time is during dark hours
  isDarkHours() {
    const hour = new Date().getHours();
    return hour >= this.EVENING_START || hour < this.NIGHT_END;
  }

  // Get lighting weight based on time of day
  getLightingWeight() {
    const hour = new Date().getHours();
    if (hour >= this.NIGHT_START || hour < this.NIGHT_END) {
      return 1.0; // Full weight at night
    } else if (hour >= this.EVENING_START) {
      return 0.7; // Partial weight in evening
    }
    return 0.1; // Minimal weight during day
  }

  // Calculate bounding box from route points
  getRouteBoundingBox(routePoints, bufferKm = 0.5) {
    if (!routePoints || routePoints.length === 0) return null;

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    for (const point of routePoints) {
      const lat = point.latitude ?? point.lat;
      const lng = point.longitude ?? point.lng ?? point.lon;
      if (lat == null || lng == null) continue;
      
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }

    // Add buffer (approximately 0.5km = ~0.0045 degrees)
    const buffer = bufferKm * 0.009;
    return {
      minLat: minLat - buffer,
      maxLat: maxLat + buffer,
      minLon: minLng - buffer,
      maxLon: maxLng + buffer
    };
  }

  // Fetch incidents along route
  async getIncidentsAlongRoute(routePoints) {
    const bbox = this.getRouteBoundingBox(routePoints);
    if (!bbox) return [];

    try {
      const incidents = await IncidentReport.find({
        status: 'active',
        'location.latitude': { $gte: bbox.minLat, $lte: bbox.maxLat },
        'location.longitude': { $gte: bbox.minLon, $lte: bbox.maxLon },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      }).lean();

      return incidents;
    } catch (error) {
      console.error('Error fetching incidents:', error);
      return [];
    }
  }

  // Fetch lighting reports along route
  async getLightingAlongRoute(routePoints) {
    const bbox = this.getRouteBoundingBox(routePoints);
    if (!bbox) return [];

    try {
      const reports = await LightingReport.find({
        'location.coordinates': {
          $geoWithin: {
            $box: [
              [bbox.minLon, bbox.minLat],
              [bbox.maxLon, bbox.maxLat]
            ]
          }
        },
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }).lean();

      return reports;
    } catch (error) {
      console.error('Error fetching lighting reports:', error);
      return [];
    }
  }

  // Calculate incident score (0-100, higher is safer)
  calculateIncidentScore(incidents) {
    if (!incidents || incidents.length === 0) return { score: 100, details: { count: 0, breakdown: {} } };

    let penaltyPoints = 0;
    const breakdown = { fine: 0, moderate: 0, dangerous: 0 };

    for (const incident of incidents) {
      const severity = incident.severity || 'moderate';
      breakdown[severity] = (breakdown[severity] || 0) + 1;

      // Penalty based on severity and verification
      const verificationMultiplier = Math.min(1 + (incident.verifications || 0) * 0.2, 2);
      
      switch (severity) {
        case 'dangerous':
          penaltyPoints += 25 * verificationMultiplier;
          break;
        case 'moderate':
          penaltyPoints += 15 * verificationMultiplier;
          break;
        case 'fine':
          penaltyPoints += 5 * verificationMultiplier;
          break;
      }
    }

    const score = Math.max(0, 100 - penaltyPoints);
    return {
      score: Math.round(score),
      details: {
        count: incidents.length,
        breakdown,
        recentIncidents: incidents.slice(0, 5).map(i => ({
          title: i.title,
          severity: i.severity,
          category: i.category,
          verifications: i.verifications
        }))
      }
    };
  }

  // Calculate lighting score (0-100, higher is better lit)
  calculateLightingScore(lightingReports) {
    const weight = this.getLightingWeight();
    
    if (!lightingReports || lightingReports.length === 0) {
      // No data: assume moderate lighting during day, poor at night
      const baseScore = this.isDarkHours() ? 50 : 80;
      return {
        score: Math.round(baseScore),
        weight,
        details: {
          reportsCount: 0,
          avgLux: null,
          timeOfDay: this.getTimeOfDayLabel()
        }
      };
    }

    // Calculate average lux from reports
    const luxValues = lightingReports
      .filter(r => r.luxEstimate != null)
      .map(r => r.luxEstimate);

    if (luxValues.length === 0) {
      return {
        score: 70,
        weight,
        details: {
          reportsCount: lightingReports.length,
          avgLux: null,
          timeOfDay: this.getTimeOfDayLabel()
        }
      };
    }

    const avgLux = luxValues.reduce((a, b) => a + b, 0) / luxValues.length;

    // Score based on lux levels
    // < 10 lux: very dark (dangerous)
    // 10-50 lux: dim (poor)
    // 50-100 lux: moderate
    // 100-300 lux: well lit
    // > 300 lux: bright
    let score;
    if (avgLux < 10) score = 20;
    else if (avgLux < 50) score = 40;
    else if (avgLux < 100) score = 60;
    else if (avgLux < 300) score = 80;
    else score = 95;

    return {
      score: Math.round(score),
      weight,
      details: {
        reportsCount: lightingReports.length,
        avgLux: Math.round(avgLux),
        timeOfDay: this.getTimeOfDayLabel(),
        description: this.getLightingDescription(avgLux)
      }
    };
  }

  getTimeOfDayLabel() {
    const hour = new Date().getHours();
    if (hour >= this.NIGHT_START || hour < this.NIGHT_END) return 'night';
    if (hour >= this.EVENING_START) return 'evening';
    if (hour >= 12) return 'afternoon';
    return 'morning';
  }

  getLightingDescription(avgLux) {
    if (avgLux == null) return 'No lighting data available';
    if (avgLux < 10) return 'Very poorly lit area - use caution';
    if (avgLux < 50) return 'Dimly lit - street lights may be sparse';
    if (avgLux < 100) return 'Moderately lit area';
    if (avgLux < 300) return 'Well lit with good visibility';
    return 'Brightly lit area';
  }

  // Calculate congestion score (0-100, higher is less congested)
  calculateCongestionScore(trafficData) {
    if (!trafficData?.flowSegmentData) {
      return {
        score: 75, // Assume moderate if no data
        details: {
          currentSpeed: null,
          freeFlowSpeed: null,
          congestionLevel: 'unknown'
        }
      };
    }

    const current = trafficData.flowSegmentData.currentSpeed || 0;
    const freeFlow = trafficData.flowSegmentData.freeFlowSpeed || current;
    const ratio = freeFlow > 0 ? current / freeFlow : 1;

    // Score based on speed ratio
    const score = Math.round(ratio * 100);

    let congestionLevel;
    if (ratio >= 0.9) congestionLevel = 'free_flow';
    else if (ratio >= 0.7) congestionLevel = 'light';
    else if (ratio >= 0.5) congestionLevel = 'moderate';
    else if (ratio >= 0.3) congestionLevel = 'heavy';
    else congestionLevel = 'severe';

    return {
      score: Math.min(100, score),
      details: {
        currentSpeed: Math.round(current),
        freeFlowSpeed: Math.round(freeFlow),
        congestionLevel,
        description: this.getCongestionDescription(congestionLevel)
      }
    };
  }

  getCongestionDescription(level) {
    const descriptions = {
      free_flow: 'Roads are clear with minimal traffic',
      light: 'Light traffic - easy walking conditions',
      moderate: 'Moderate traffic - some congestion',
      heavy: 'Heavy traffic - crowded sidewalks possible',
      severe: 'Severe congestion - expect delays',
      unknown: 'Traffic data unavailable'
    };
    return descriptions[level] || descriptions.unknown;
  }

  // Calculate walkability score
  calculateWalkabilityScore(trafficData, weatherData) {
    let score = 100;
    const details = { factors: [] };

    // Traffic impact
    if (trafficData?.flowSegmentData?.currentSpeed) {
      const speed = trafficData.flowSegmentData.currentSpeed;
      if (speed > 50) {
        score -= 30;
        details.factors.push('High-speed traffic nearby');
      } else if (speed > 30) {
        score -= 15;
        details.factors.push('Moderate traffic speeds');
      }
    }

    // Weather impact
    if (weatherData?.results?.[0]) {
      const weather = weatherData.results[0];
      const id = weather.weather?.[0]?.id;
      const temp = weather.temperature?.value;

      if (id >= 200 && id < 300) {
        score -= 40;
        details.factors.push('Thunderstorm conditions');
      } else if (id >= 300 && id < 600) {
        score -= 25;
        details.factors.push('Rainy conditions');
      } else if (id >= 600 && id < 700) {
        score -= 30;
        details.factors.push('Snowy conditions');
      }

      if (temp != null) {
        if (temp < 0) {
          score -= 20;
          details.factors.push('Freezing temperatures');
        } else if (temp < 10) {
          score -= 10;
          details.factors.push('Cold weather');
        } else if (temp > 35) {
          score -= 20;
          details.factors.push('Extreme heat');
        } else if (temp > 30) {
          score -= 10;
          details.factors.push('Hot weather');
        }
      }
    }

    if (details.factors.length === 0) {
      details.factors.push('Good walking conditions');
    }

    return {
      score: Math.max(0, Math.round(score)),
      details
    };
  }

  // Calculate overall safety score with weighted components
  async calculateComprehensiveSafetyScore(routePoints, trafficData, weatherData) {
    // Fetch data
    const incidents = await this.getIncidentsAlongRoute(routePoints);
    const lightingReports = await this.getLightingAlongRoute(routePoints);

    // Calculate component scores
    const incidentScore = this.calculateIncidentScore(incidents);
    const lightingScore = this.calculateLightingScore(lightingReports);
    const congestionScore = this.calculateCongestionScore(trafficData);
    const walkabilityScore = this.calculateWalkabilityScore(trafficData, weatherData);

    // Dynamic weights based on time of day
    const lightingWeight = lightingScore.weight;
    const weights = {
      incident: 0.35,
      lighting: lightingWeight * 0.25,
      congestion: 0.15,
      walkability: 0.25 - (lightingWeight * 0.15) // Reduce walkability weight when lighting matters more
    };

    // Normalize weights
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    Object.keys(weights).forEach(k => weights[k] /= totalWeight);

    // Calculate weighted score
    const overallScore = Math.round(
      incidentScore.score * weights.incident +
      lightingScore.score * weights.lighting +
      congestionScore.score * weights.congestion +
      walkabilityScore.score * weights.walkability
    );

    // Generate safety level
    let safetyLevel, safetyColor;
    if (overallScore >= 80) {
      safetyLevel = 'excellent';
      safetyColor = '#34C759';
    } else if (overallScore >= 65) {
      safetyLevel = 'good';
      safetyColor = '#30D158';
    } else if (overallScore >= 50) {
      safetyLevel = 'moderate';
      safetyColor = '#FF9500';
    } else if (overallScore >= 35) {
      safetyLevel = 'poor';
      safetyColor = '#FF6B00';
    } else {
      safetyLevel = 'dangerous';
      safetyColor = '#FF3B30';
    }

    return {
      overallScore,
      safetyLevel,
      safetyColor,
      components: {
        incidents: incidentScore,
        lighting: lightingScore,
        congestion: congestionScore,
        walkability: walkabilityScore
      },
      weights,
      metadata: {
        timeOfDay: this.getTimeOfDayLabel(),
        isDarkHours: this.isDarkHours(),
        calculatedAt: new Date().toISOString()
      }
    };
  }
}

module.exports = new SafetyScoreService();