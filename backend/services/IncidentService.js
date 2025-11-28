const IncidentReport = require('../models/IncidentReport');
const User = require('../models/User');
const Reward = require('../models/Reward');
const GeminiService = require('./GeminiService');

class IncidentService {
  // Create incident report
  async createIncident(userId, incidentData, imageUrl) {
    try {
      // Analyze image with Gemini
      const analysis = await GeminiService.analyzeIncidentImage(imageUrl, incidentData.description);

      const incident = new IncidentReport({
        user: userId,
        title: incidentData.title,
        description: incidentData.description,
        imageUrl,
        location: incidentData.location,
        category: incidentData.category,
        severity: analysis.severity || 'moderate',
        geminiAnalysis: {
          confidence: analysis.confidence,
          description: analysis.description
        },
        points: this.calculatePoints(analysis.severity)
      });

      const savedIncident = await incident.save();

      // Award points to user
      await User.findByIdAndUpdate(userId, {
        $inc: { points: savedIncident.points }
      });

      // Create reward record
      const reward = new Reward({
        user: userId,
        type: 'incident_report',
        points: savedIncident.points,
        refId: savedIncident._id
      });
      await reward.save();

      return savedIncident;
    } catch (error) {
      console.error('Create incident error:', error);
      throw error;
    }
  }

  // Get all incidents (for map display)
  async getIncidents(bounds = null, limit = 100) {
    try {
      let query = { status: 'active' };

      if (bounds) {
        query.location = {
          $geoWithin: {
            $box: [
              [bounds.minLng, bounds.minLat],
              [bounds.maxLng, bounds.maxLat]
            ]
          }
        };
      }

      const incidents = await IncidentReport.find(query)
        .populate('user', 'name profile.displayName profile.avatarUrl')
        .sort({ createdAt: -1 })
        .limit(limit);

      return incidents;
    } catch (error) {
      console.error('Get incidents error:', error);
      throw error;
    }
  }

  // Get incidents by severity
  async getIncidentsBySeverity(severity) {
    try {
      return await IncidentReport.find({ severity, status: 'active' })
        .populate('user', 'name profile.displayName')
        .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Get incidents by severity error:', error);
      throw error;
    }
  }

  // Verify incident (upvote)
  async verifyIncident(incidentId) {
    try {
      const incident = await IncidentReport.findByIdAndUpdate(
        incidentId,
        { $inc: { verifications: 1 } },
        { new: true }
      );
      return incident;
    } catch (error) {
      console.error('Verify incident error:', error);
      throw error;
    }
  }

  // Mark as resolved
  async resolveIncident(incidentId) {
    try {
      return await IncidentReport.findByIdAndUpdate(
        incidentId,
        { status: 'resolved', updatedAt: new Date() },
        { new: true }
      );
    } catch (error) {
      console.error('Resolve incident error:', error);
      throw error;
    }
  }

  // Calculate points based on severity
  calculatePoints(severity) {
    const points = {
      'fine': 5,
      'moderate': 10,
      'dangerous': 20
    };
    return points[severity] || 10;
  }

  // Get user incident reports
  async getUserIncidents(userId) {
    try {
      return await IncidentReport.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(50);
    } catch (error) {
      console.error('Get user incidents error:', error);
      throw error;
    }
  }
}

module.exports = new IncidentService();