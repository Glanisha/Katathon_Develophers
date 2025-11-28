const express = require('express');
const EmergencyService = require('../services/EmergencyService');
const authMiddleware = require('../middleware/AuthMiddleware');

const router = express.Router();

// GET /api/emergency-contacts/    - list
router.get('/', authMiddleware, async (req, res) => {
  try {
    const contacts = await EmergencyService.listForUser(req.user._id);
    res.json({ contacts });
  } catch (err) {
    console.error('Emergency list error:', err);
    res.status(500).json({ error: 'Failed to load contacts' });
  }
});

// POST /api/emergency-contacts/   - create
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, phone, relation } = req.body;
    if (!name || !phone || !relation) return res.status(400).json({ error: 'Missing fields' });
    const contact = await EmergencyService.createForUser(req.user._id, { name, phone, relation });
    res.json({ contact });
  } catch (err) {
    console.error('Emergency create error:', err);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// DELETE /api/emergency-contacts/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await EmergencyService.deleteForUser(req.user._id, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Contact not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Emergency delete error:', err);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// POST /api/emergency-contacts/alert  - trigger alert
router.post('/alert', authMiddleware, async (req, res) => {
  try {
    const result = await EmergencyService.sendAlert(req.user, req.body || {});
    res.json({ result });
  } catch (err) {
    console.error('Emergency alert error:', err);
    res.status(500).json({ error: err.message || 'Failed to send alert' });
  }
});

module.exports = router;