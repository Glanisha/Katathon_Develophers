const IncidentReport = require('../models/IncidentReport');
const TomTomService = require('./TomTomService');

class PredictiveService {
  // Accepts route (from TomTom / your RouteService) and options { origin, destination, timestamp }
  async predictRouteRisk(route = {}, options = {}) {
    try {
      const now = options.timestamp ? new Date(options.timestamp) : new Date();

      // Normalize sample points: try multiple shapes (latitude/longitude or lat/lng)
      const rawPoints = (route.legs || []).flatMap(leg => (leg.points || []));
      const samplePoints = rawPoints.slice(0, 50).map(p => ({
        latitude: (p.latitude ?? p.lat ?? p.latitiude ?? null),
        longitude: (p.longitude ?? p.lon ?? p.lng ?? p.long ?? null)
      })).filter(p => p.latitude != null && p.longitude != null);

      // quick fallback if no points available
      if (samplePoints.length === 0) {
        return this._emptyPrediction(now);
      }

      const radiusMeters = 200;
      const latLngPad = radiusMeters / 111320; // approx degrees
      const sinceDate = new Date();
      sinceDate.setMonth(sinceDate.getMonth() - 12);

      // Query IncidentReport using range queries matching your schema (location.latitude/longitude)
      let incidents = [];
      try {
        const pts = samplePoints.slice(0, Math.min(12, samplePoints.length));
        const queries = pts.map(p => IncidentReport.find({
          'location.latitude': { $gte: p.latitude - latLngPad, $lte: p.latitude + latLngPad },
          'location.longitude': { $gte: p.longitude - latLngPad, $lte: p.longitude + latLngPad },
          createdAt: { $gte: sinceDate }
        }).lean().limit(50));
        const results = await Promise.all(queries);
        incidents = [].concat(...results);
        // dedupe
        const seen = new Set();
        incidents = incidents.filter(i => {
          const id = String(i._id || i.id || JSON.stringify(i));
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      } catch (err) {
        console.warn('PredictiveService: incident query failed', err?.message || err);
        incidents = [];
      }

      // incidents by hour
      const incidentsByHour = new Array(24).fill(0);
      incidents.forEach(it => {
        const dt = new Date(it.createdAt || it.created_at || now);
        if (!isNaN(dt.getTime())) incidentsByHour[dt.getHours()] += 1;
      });

      const avgPerHour = incidents.length ? incidents.length / 24 : 0;
      const hourScores = incidentsByHour.map(c => (avgPerHour > 0 ? Math.min(1, c / (avgPerHour * 2)) : 0));

      // Optional TomTom signals (guarded)
      let congestion = 0;
      let weatherPenalty = 0;
      try {
        if (TomTomService && typeof TomTomService.getTrafficFlow === 'function') {
          const bbox = this._pointsToBbox(samplePoints);
          const traffic = bbox ? await TomTomService.getTrafficFlow(bbox) : null;
          
          // Get raw congestion value
          const rawCongestion = (TomTomService.calculateCongestionScore ? TomTomService.calculateCongestionScore(traffic) : (traffic?.score ?? 0)) || 0;
          
          // Normalize congestion to 0-100 range if needed
          if (rawCongestion <= 1) {
            // If it's already normalized (0-1), convert to 0-100
            congestion = Math.round(rawCongestion * 100);
          } else if (rawCongestion <= 10) {
            // If it's 0-10 scale, convert to 0-100
            congestion = Math.round(rawCongestion * 10);
          } else {
            // Assume it's already 0-100 scale
            congestion = Math.round(Math.min(100, Math.max(0, rawCongestion)));
          }
          
          console.log(`PredictiveService: rawCongestion=${rawCongestion}, normalized=${congestion}`);
        }
        if (TomTomService && typeof TomTomService.getWeatherData === 'function') {
          const mid = samplePoints[Math.floor(samplePoints.length / 2)];
          const w = await TomTomService.getWeatherData({ lat: mid.latitude, lng: mid.longitude }).catch(()=>null);
          if (w?.precipitationProbability > 0.4 || w?.windSpeed > 12) weatherPenalty = 0.1;
        }
      } catch (err) {
        console.warn('PredictiveService: TomTom signals failed', err?.message || err);
      }

      const nowHour = now.getHours();
      const in30 = new Date(now.getTime() + 30 * 60000);
      const in30Hour = in30.getHours();

      const baseRiskForHour = (h) => {
        const incidentFactor = hourScores[h] || 0;
        // Fix: Use congestion as percentage (0-100) and normalize properly
        const congestionFactor = (congestion || 0) / 100;
        return Math.min(1, incidentFactor * 0.7 + congestionFactor * 0.25 + weatherPenalty * 0.2);
      };

      const scoreNow = Math.round((1 - baseRiskForHour(nowHour)) * 100);
      const scoreIn30 = Math.round((1 - baseRiskForHour(in30Hour)) * 100);
      const after22Raw = Math.min(1, baseRiskForHour(22) + 0.12);
      const scoreAfter22 = Math.round((1 - after22Raw) * 100);

      const timeSeries = [
        { offsetMinutes: 0, score: scoreNow },
        { offsetMinutes: 30, score: scoreIn30 },
        { offsetMinutes: 120, score: Math.round((1 - baseRiskForHour((nowHour + 2) % 24)) * 100) },
        { offsetMinutes: 480, score: Math.round((1 - baseRiskForHour((nowHour + 8) % 24)) * 100) }
      ];

      const explanation = [
        `Historical incidents nearby: ${incidents.length}`,
        `Estimated congestion: ${Math.round(congestion)}/100`,
        weatherPenalty ? `Weather adds minor risk` : `Weather nominal`
      ].join(' · ');

      return {
        predictionTimestamp: now.toISOString(),
        now: scoreNow,
        in30Min: scoreIn30,
        after22: scoreAfter22,
        timeSeries,
        explanation,
        rawSignals: { incidentsCount: incidents.length, incidentsByHour, congestion, weatherPenalty }
      };
    } catch (err) {
      console.error('PredictiveService.predictRouteRisk unexpected error', err);
      return this._emptyPrediction(new Date());
    }
  }

  _emptyPrediction(now) {
    const score = 85;
    return {
      predictionTimestamp: now.toISOString(),
      now: score,
      in30Min: score,
      after22: score,
      timeSeries: [{ offsetMinutes: 0, score }, { offsetMinutes: 30, score }],
      explanation: 'No data available',
      rawSignals: {}
    };
  }

  _pointsToBbox(points = []) {
    if (!points || points.length === 0) return null;
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    points.forEach(p => {
      minLat = Math.min(minLat, p.latitude);
      maxLat = Math.max(maxLat, p.latitude);
      minLng = Math.min(minLng, p.longitude);
      maxLng = Math.max(maxLng, p.longitude);
    });
    const pad = 0.002;
    return { minLat: minLat - pad, maxLat: maxLat + pad, minLng: minLng - pad, maxLng: maxLng + pad };
  }
}

module.exports = new PredictiveService();