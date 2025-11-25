const express = require('express');
const AuthService = require('../services/AuthService');
const authMiddleware = require('../middleware/AuthMiddleware');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const result = await AuthService.signup(name, email, password, phone);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await AuthService.login(email, password);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  // For JWT, logout is handled client-side by removing the token
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
