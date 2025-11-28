const express = require('express');
const IncidentService = require('../services/IncidentService');
const authMiddleware = require('../middleware/AuthMiddleware');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use multer memory storage (avoid multer-storage-cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// Create incident report
router.post('/report', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, location } = req.body;
    const userId = req.user.id;

    if (!title || !description || !category || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Convert buffer to data URI and upload to Cloudinary
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: 'safewalk_incidents',
      resource_type: 'auto'
    });

    const incidentData = {
      title,
      description,
      category,
      location: JSON.parse(location)
    };

    // use secure_url returned by Cloudinary
    const incident = await IncidentService.createIncident(userId, incidentData, uploadResult.secure_url);

    res.json({
      message: 'Incident reported successfully',
      incident,
      pointsEarned: incident.points
    });
  } catch (error) {
    console.error('Report incident error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all incidents (for map)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const { minLat, maxLat, minLng, maxLng } = req.query;
    
    let bounds = null;
    if (minLat && maxLat && minLng && maxLng) {
      bounds = {
        minLat: parseFloat(minLat),
        maxLat: parseFloat(maxLat),
        minLng: parseFloat(minLng),
        maxLng: parseFloat(maxLng)
      };
    }

    const incidents = await IncidentService.getIncidents(bounds);
    res.json({ incidents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get incidents by severity
router.get('/severity/:severity', authMiddleware, async (req, res) => {
  try {
    const { severity } = req.params;
    const incidents = await IncidentService.getIncidentsBySeverity(severity);
    res.json({ incidents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify incident
router.post('/verify/:incidentId', authMiddleware, async (req, res) => {
  try {
    const { incidentId } = req.params;
    const incident = await IncidentService.verifyIncident(incidentId);
    res.json({ message: 'Incident verified', incident });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve incident
router.post('/resolve/:incidentId', authMiddleware, async (req, res) => {
  try {
    const { incidentId } = req.params;
    const incident = await IncidentService.resolveIncident(incidentId);
    res.json({ message: 'Incident resolved', incident });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's incidents
router.get('/user/reports', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const incidents = await IncidentService.getUserIncidents(userId);
    res.json({ incidents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;