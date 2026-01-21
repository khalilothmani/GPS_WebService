const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database Pool (with SSL for Aiven)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false } 
});

// The endpoint for your ESP32
app.post('/api/gps/push', async (req, res) => {
    const { device_imei, latitude, longitude, speed, heading, battery_voltage } = req.body;
    console.log(`Received data for: ${device_imei}`);

    try {
        // 1. Get the internal device ID
        const [devices] = await pool.execute('SELECT id FROM gps_devices WHERE device_imei = ?', [device_imei]);
        
        if (devices.length === 0) {
            console.error("Device not found!");
            return res.status(404).json({ error: "Device not found" });
        }

        const gps_id = devices[0].id;

        // 2. Insert into gps_data
        await pool.execute(
            'INSERT INTO gps_data (gps_id, latitude, longitude, speed, heading, battery_voltage) VALUES (?, ?, ?, ?, ?, ?)',
            [gps_id, latitude, longitude, speed, heading, battery_voltage]
        );

        res.status(200).json({ message: "Success" });
    } catch (err) {
        console.error("Database Error:", err.message);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

app.get('/', (req, res) => res.send('GPS Server Active 🚀'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
