const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/AuthMiddleware');
const WalkSession = require('../models/WalkSession');
const Route = require('../models/Route');

const router = express.Router();

// Simple in-memory cache for report results with TTL
const reportCache = new Map();
const CACHE_TTL_SECONDS = parseInt(process.env.REPORT_CACHE_TTL_SECONDS || '30', 10);

function getCachedReport(key) {
  const entry = reportCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    reportCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedReport(key, value, ttlSeconds = CACHE_TTL_SECONDS) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  reportCache.set(key, { value, expiresAt });
}

// Helper: compute per-user distance from liveLocations (Haversine)
function computeDistanceFromLiveLocations(session, userId) {
  if (!session || !Array.isArray(session.liveLocations)) return 0;
  const points = session.liveLocations
    .filter(ll => ll.user && String(ll.user) === String(userId) && ll.loc && Array.isArray(ll.loc.coordinates))
    .map(ll => ({ lon: ll.loc.coordinates[0], lat: ll.loc.coordinates[1], ts: new Date(ll.ts) }))
    .sort((a,b) => a.ts - b.ts);
  if (points.length < 2) return 0;
  let distance = 0;
  for (let i = 1; i < points.length; i++) {
    distance += haversineMeters(points[i-1].lat, points[i-1].lon, points[i].lat, points[i].lon);
  }
  return distance;
}

// Helper: haversine distance in meters
function haversineMeters(lat1, lon1, lat2, lon2) {
  function toRad(x) { return (x * Math.PI) / 180; }
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// GET /api/reports/users/me/weekly?start=ISO&end=ISO
// Returns aggregated weekly activity for the authenticated user
router.get('/users/me/weekly', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const qStart = req.query.start ? new Date(req.query.start) : new Date(Date.now() - 7*24*60*60*1000);
    const qEnd = req.query.end ? new Date(req.query.end) : new Date();

    const cacheKey = `weekly:${String(userId)}:${qStart.toISOString()}:${qEnd.toISOString()}`;
    const cached = getCachedReport(cacheKey);
    if (cached) return res.json(cached);

    // Find sessions where user was host or a participant and the session intersects the period
    const sessions = await WalkSession.find({
      state: 'finished',
      $or: [ { host: userId }, { participants: userId } ],
      // session started or ended in range
      $or: [
        { startedAt: { $gte: qStart, $lte: qEnd } },
        { endedAt: { $gte: qStart, $lte: qEnd } },
        { $and: [ { startedAt: { $lte: qStart } }, { endedAt: { $gte: qEnd } } ] }
      ]
    }).populate('route').lean();

    let totalDurationSeconds = 0;
    let totalDistanceMeters = 0;
    const sessionSummaries = [];

    for (const s of sessions) {
      const started = s.startedAt ? new Date(s.startedAt) : null;
      const ended = s.endedAt ? new Date(s.endedAt) : null;
      const durationSeconds = started && ended ? Math.max(0, Math.floor((ended - started)/1000)) : 0;
      totalDurationSeconds += durationSeconds;

      // distance: always compute from liveLocations for accuracy
      const distanceMeters = computeDistanceFromLiveLocations(s, userId);

      totalDistanceMeters += distanceMeters;

      // collect a lightweight path sample (first/last up to 50 points)
      let path = [];
      if (Array.isArray(s.liveLocations) && s.liveLocations.length > 0) {
        const pts = s.liveLocations
          .filter(ll => ll.user && String(ll.user) === String(userId) && ll.loc && Array.isArray(ll.loc.coordinates))
          .map(ll => ({ lat: ll.loc.coordinates[1], lon: ll.loc.coordinates[0], ts: ll.ts }))
          .sort((a,b) => new Date(a.ts) - new Date(b.ts));
        // downsample if too many
        if (pts.length > 100) {
          const step = Math.ceil(pts.length / 100);
          for (let i=0;i<pts.length;i+=step) path.push(pts[i]);
        } else {
          path = pts;
        }
      }

      sessionSummaries.push({
        sessionId: s._id,
        routeId: s.route ? s.route._id : null,
        title: s.route ? (s.route.title || null) : null,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        durationSeconds,
        distanceMeters: Math.round(distanceMeters),
        path
      });
    }

    // simple top-places heuristic: take last location points of each session and cluster by rounded coords
    const placeCounts = {};
    for (const s of sessionSummaries) {
      const last = s.path && s.path.length ? s.path[s.path.length-1] : null;
      if (!last) continue;
      // bucket to 3 decimals (~100m precision)
      const key = `${Number(last.lat).toFixed(3)},${Number(last.lon).toFixed(3)}`;
      placeCounts[key] = (placeCounts[key] || 0) + 1;
    }
    const topPlaces = Object.entries(placeCounts)
      .map(([k,v]) => {
        const [lat,lon] = k.split(',');
        return { lat: Number(lat), lon: Number(lon), visits: v };
      })
      .sort((a,b) => b.visits - a.visits)
      .slice(0,10);

    const result = {
      userId,
      period: { start: qStart, end: qEnd },
      sessionsCount: sessions.length,
      totalDurationSeconds,
      totalDistanceMeters: Math.round(totalDistanceMeters),
      sessions: sessionSummaries,
      topPlaces
    };
    setCachedReport(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Weekly report error', err);
    res.status(500).json({ error: 'Server error generating weekly report' });
  }
});

// GET /api/reports/users/me/daily?start=ISO&end=ISO
// Returns aggregated daily activity for the authenticated user (default: last 24 hours)
router.get('/users/me/daily', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const qStart = req.query.start ? new Date(req.query.start) : new Date(Date.now() - 24*60*60*1000);
    const qEnd = req.query.end ? new Date(req.query.end) : new Date();

    const cacheKey = `daily:${String(userId)}:${qStart.toISOString()}:${qEnd.toISOString()}`;
    const cached = getCachedReport(cacheKey);
    if (cached) return res.json(cached);

    const sessions = await WalkSession.find({
      state: 'finished',
      $or: [ { host: userId }, { participants: userId } ],
      $or: [
        { startedAt: { $gte: qStart, $lte: qEnd } },
        { endedAt: { $gte: qStart, $lte: qEnd } },
        { $and: [ { startedAt: { $lte: qStart } }, { endedAt: { $gte: qEnd } } ] }
      ]
    }).populate('route').lean();

    let totalDurationSeconds = 0;
    let totalDistanceMeters = 0;
    const sessionSummaries = [];

    for (const s of sessions) {
      const started = s.startedAt ? new Date(s.startedAt) : null;
      const ended = s.endedAt ? new Date(s.endedAt) : null;
      const durationSeconds = started && ended ? Math.max(0, Math.floor((ended - started)/1000)) : 0;
      totalDurationSeconds += durationSeconds;

      // always compute distance from liveLocations
      const distanceMeters = computeDistanceFromLiveLocations(s, userId);
      totalDistanceMeters += distanceMeters;

      let path = [];
      if (Array.isArray(s.liveLocations) && s.liveLocations.length > 0) {
        const pts = s.liveLocations
          .filter(ll => ll.user && String(ll.user) === String(userId) && ll.loc && Array.isArray(ll.loc.coordinates))
          .map(ll => ({ lat: ll.loc.coordinates[1], lon: ll.loc.coordinates[0], ts: ll.ts }))
          .sort((a,b) => new Date(a.ts) - new Date(b.ts));
        if (pts.length > 100) {
          const step = Math.ceil(pts.length / 100);
          for (let i=0;i<pts.length;i+=step) path.push(pts[i]);
        } else {
          path = pts;
        }
      }

      sessionSummaries.push({
        sessionId: s._id,
        routeId: s.route ? s.route._id : null,
        title: s.route ? (s.route.title || null) : null,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        durationSeconds,
        distanceMeters: Math.round(distanceMeters),
        path
      });
    }

    const placeCounts = {};
    for (const s of sessionSummaries) {
      const last = s.path && s.path.length ? s.path[s.path.length-1] : null;
      if (!last) continue;
      const key = `${Number(last.lat).toFixed(3)},${Number(last.lon).toFixed(3)}`;
      placeCounts[key] = (placeCounts[key] || 0) + 1;
    }
    const topPlaces = Object.entries(placeCounts)
      .map(([k,v]) => {
        const [lat,lon] = k.split(',');
        return { lat: Number(lat), lon: Number(lon), visits: v };
      })
      .sort((a,b) => b.visits - a.visits)
      .slice(0,10);

    const result = {
      userId,
      period: { start: qStart, end: qEnd },
      sessionsCount: sessions.length,
      totalDurationSeconds,
      totalDistanceMeters: Math.round(totalDistanceMeters),
      sessions: sessionSummaries,
      topPlaces
    };
    setCachedReport(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Daily report error', err);
    res.status(500).json({ error: 'Server error generating daily report' });
  }
});

// GET /api/reports/users/me/safety-stats
// Calculate overall user safety score based on walk sessions, route safety, and incidents
router.get('/users/me/safety-stats', auth, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const cacheKey = `safety-stats:${userId}`;

    // Check cache first
    const cached = getCachedReport(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch user's walk sessions from past 30 days for safety calculation
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sessions30Days = await WalkSession.find({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo }
    }).populate('route');

    // Also fetch ALL-TIME sessions for total walk count
    const allTimeSessions = await WalkSession.find({
      user: userId
    }).lean().select('_id');

    let totalSafetyScore = 0;
    let routeCount = 0;
    let incidentCount = 0;
    let sessionCount = sessions30Days.length;
    let allTimeSessionCount = allTimeSessions.length;

    // Aggregate safety scores from routes (30 days)
    for (const session of sessions30Days) {
      if (session.route && session.route.segments && Array.isArray(session.route.segments)) {
        for (const segment of session.route.segments) {
          if (segment.safetyScore) {
            totalSafetyScore += segment.safetyScore;
            routeCount++;
          }
        }
      }
    }

    // Count incidents in the user's walk sessions (30 days)
    for (const session of sessions30Days) {
      if (session.incidents) {
        incidentCount += Array.isArray(session.incidents) ? session.incidents.length : 0;
      }
    }

    // Calculate overall safety score (0-100)
    let overallSafetyScore = 75; // baseline
    if (routeCount > 0) {
      const avgRouteScore = totalSafetyScore / routeCount;
      overallSafetyScore = avgRouteScore;
    }

    // Adjust for incidents (each incident reduces score by ~5 points, max -25)
    const incidentPenalty = Math.min(25, incidentCount * 5);
    overallSafetyScore = Math.max(0, overallSafetyScore - incidentPenalty);

    // Round to nearest integer
    overallSafetyScore = Math.round(overallSafetyScore);

    const result = {
      safetyScore: overallSafetyScore,
      routeCount,
      sessionCount,
      allTimeSessionCount,
      incidentCount,
      averageRouteScore: routeCount > 0 ? Math.round(totalSafetyScore / routeCount) : null,
      period: 'last_30_days',
      allTimePeriod: 'all_time'
    };

    setCachedReport(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Safety stats error', err);
    res.status(500).json({ error: 'Server error calculating safety stats' });
  }
});

module.exports = router;
