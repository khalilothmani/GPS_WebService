// routes/gps_ingest.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Imports the pool

// POST /api/gps/push
router.post('/push', (req, res) => {
  const {
    device_imei,
    latitude,
    longitude,
    speed,
    heading,
    battery_voltage,
    signal_strength
  } = req.body;

  // 1. Validation
  if (!device_imei || !latitude || !longitude) {
    return res.status(400).json({ error: 'Missing IMEI, Lat or Lon' });
  }

  // 2. Find GPS Device ID from IMEI
  const findDeviceSql = 'SELECT id FROM gps_devices WHERE device_imei = ? LIMIT 1';

  db.query(findDeviceSql, [device_imei], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Device not found or not registered' });
    }
    
    const gpsId = results[0].id;

    // 3. Insert Data into gps_data table
    const insertSql = `
      INSERT INTO gps_data 
      (gps_id, latitude, longitude, speed, heading, battery_voltage, signal_strength)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(insertSql, [gpsId, latitude, longitude, speed, heading, battery_voltage, signal_strength], (insertErr) => {
      if (insertErr) {
        console.error(insertErr);
        return res.status(500).json({ error: 'Failed to save GPS data' });
      }

      // 4. Update "Last Seen" timestamp on the device
      db.query('UPDATE gps_devices SET last_seen = NOW() WHERE id = ?', [gpsId]);

      res.status(200).json({ message: 'Data saved successfully' });
    });
  });
});

module.exports = router;
