const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const databaseConfig = require('./config/database');
require('dotenv').config();  
const cors = require('cors'); 

const authRoutes = require('./routes/AuthRoutes');
const mapRoutes = require('./routes/MapRoutes');
const emergencyContactRoutes = require('./routes/emergencyContacts');
const alertRoutes = require('./routes/AlertRoute');   
const FriendsRoutes = require("./routes/FriendsRoutes");
const LocationRoutes = require("./routes/LocationRoutes");
const ReportsRoutes = require("./routes/ReportsRoutes");
const markerRoutes = require('./routes/MarkerRoutes');
const chatRoutes = require('./routes/chatRoutes');
const settingsRoutes = require('./routes/SettingsRoutes');




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
app.use('/api/markers', markerRoutes);

// Start Server
//friend and location routes
app.use("/api/friends", FriendsRoutes);
app.use("/api/location", LocationRoutes);
app.use('/api/chats', chatRoutes);
// reports
app.use('/api/reports', ReportsRoutes);
app.use('/api/settings', settingsRoutes);



// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
