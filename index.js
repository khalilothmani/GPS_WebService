const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false } // Required for Aiven
});

// The route your ESP32 is calling
app.post('/api/gps/push', async (req, res) => {
    const { device_imei, latitude, longitude, speed, heading, battery_voltage } = req.body;

    console.log(`📥 Received data from IMEI: ${device_imei}`);

    try {
        // 1. Find the device ID from the IMEI
        const [devices] = await pool.execute(
            'SELECT id FROM gps_devices WHERE device_imei = ?', 
            [device_imei]
        );

        if (devices.length === 0) {
            console.log("❌ Device not found in database");
            return res.status(404).json({ error: "Device not registered" });
        }

        const gps_id = devices[0].id;

        // 2. Insert the data into gps_data table
        const query = `
            INSERT INTO gps_data (gps_id, latitude, longitude, speed, heading, battery_voltage) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        await pool.execute(query, [
            gps_id, 
            latitude || 0, 
            longitude || 0, 
            speed || 0, 
            heading || 0, 
            battery_voltage || 0
        ]);

        console.log("✅ Data saved successfully");
        res.status(200).json({ message: "Data saved successfully" });

    } catch (err) {
        console.error("🔥 Database Error:", err.message);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

// Default route to check if server is alive
app.get('/', (req, res) => {
    res.send('GPS Tracking Server is Online 🚀');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
