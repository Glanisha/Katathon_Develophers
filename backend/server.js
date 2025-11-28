const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const databaseConfig = require('./config/database');
require('dotenv').config();  
const cors = require('cors'); 

const authRoutes = require('./routes/AuthRoutes');
const mapRoutes = require('./routes/MapRoutes');
const emergencyContactRoutes = require('./routes/emergencyContacts');
const alertRoutes = require('./routes/AlertRoute');   // ⭐ Add this

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect DB
databaseConfig();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/emergency', emergencyContactRoutes);
app.use('/api/alert', alertRoutes);   // ⭐ Add this

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
