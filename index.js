// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON from ESP32

// Import Routes
const gpsIngestRoute = require('./routes/gps_ingest');

// Use Routes
app.use('/api/gps', gpsIngestRoute);

const PORT = process.env.PORT || 10000;

app.listen(PORT,'0.0.0.0',() => {
  console.log(`GPS Server running on port ${PORT}`);
  console.log(` ESP32 Endpoint: http://192.168.1.4:${PORT}/api/gps/push`);
});
