const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const databaseConfig = require('./config/database');
require('dotenv').config();  
const cors = require('cors'); 
const authRoutes = require('./routes/AuthRoutes');
const mapRoutes = require('./routes/MapRoutes');
const friendsRoutes = require('./routes/FriendsRoutes');
const incidentRoutes = require('./routes/IncidentRoutes');
const emergencyRoutes = require('./routes/EmergencyRoutes');
const lightingRoute = require("./routes/LightingReportRoute");
const chatRoutes = require('./routes/ChatRoutes');



const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
databaseConfig();

app.use('/api/auth', authRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/emergency-contacts', emergencyRoutes);
app.use("/", lightingRoute);
app.use('/api/chats', chatRoutes);


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});