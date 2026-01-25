>const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Database Pool (with SSL for Aiven)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('Database configuration loaded:', {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Test database connection on startup
async function testDbConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully!');
        connection.release();
        
        // Check if tables exist
        const [tables] = await pool.execute('SHOW TABLES');
        console.log('📊 Available tables:', tables.map(t => t[Object.keys(t)[0]]));
        
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    }
}

testDbConnection();

// API to get the newest GPS position for the map - UPDATED with all fields
app.get('/api/gps/latest', async (req, res) => {
    try {
        console.log('📡 Fetching latest GPS data...');
        
        // Get all available fields from your database
        const [rows] = await pool.execute(
            `SELECT 
                latitude, 
                longitude, 
                speed, 
                heading as direction, 
                battery_voltage,
                created_at as timestamp
             FROM gps_data 
             ORDER BY created_at DESC 
             LIMIT 1`
        );
        
        if (rows.length === 0) {
            console.log('No GPS data found in database');
            // Return default data for testing
            return res.json({
                latitude: 40.7128,
                longitude: -74.0060,
                speed: 0,
                direction: 0,
                altitude: 0,
                battery_voltage: 0,
                timestamp: new Date().toISOString(),
                message: 'No GPS data available yet'
            });
        }
        
        const data = rows[0];
        console.log('📍 Latest GPS data:', {
            lat: data.latitude,
            lng: data.longitude,
            speed: data.speed,
            direction: data.direction,
            time: data.timestamp
        });
        
        // Transform data to match frontend expectations
        const responseData = {
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            speed: data.speed !== null ? data.speed : 0,
            direction: data.direction !== null ? data.direction : 0,
            altitude: 0, // Your database doesn't have altitude field
            battery_voltage: data.battery_voltage,
            timestamp: data.timestamp || new Date().toISOString()
        };
        
        res.json(responseData);
        
    } catch (err) {
        console.error('❌ Error fetching latest GPS data:', err.message);
        res.status(500).json({ 
            error: 'Database error', 
            details: err.message,
            // Fallback data for frontend testing
            latitude: 40.7128,
            longitude: -74.0060,
            speed: 50,
            direction: 180,
            altitude: 100,
            timestamp: new Date().toISOString()
        });
    }
});

// API to get GPS history (for the history panel)
app.get('/api/gps/history', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT 
                latitude, 
                longitude, 
                speed, 
                heading as direction,
                created_at as timestamp
             FROM gps_data 
             ORDER BY created_at DESC 
             LIMIT 10`
        );
        
        res.json(rows);
    } catch (err) {
        console.error('Error fetching GPS history:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// The endpoint for your ESP32 (unchanged)
app.post('/api/gps/push', async (req, res) => {
    const { device_imei, latitude, longitude, speed, heading, battery_voltage } = req.body;
    console.log(`📍 Received GPS data for device: ${device_imei}`, {
        lat: latitude,
        lng: longitude,
        speed,
        heading,
        battery: battery_voltage
    });

    try {
        // 1. Get the internal device ID
        const [devices] = await pool.execute(
            'SELECT id FROM gps_devices WHERE device_imei = ?', 
            [device_imei]
        );
        
        if (devices.length === 0) {
            console.error("❌ Device not found in database!");
            return res.status(404).json({ error: "Device not found" });
        }

        const gps_id = devices[0].id;

        // 2. Insert into gps_data
        await pool.execute(
            `INSERT INTO gps_data 
                (gps_id, latitude, longitude, speed, heading, battery_voltage) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [gps_id, latitude, longitude, speed, heading, battery_voltage]
        );

        console.log('✅ GPS data saved to database');
        res.status(200).json({ 
            message: "Success",
            received: {
                latitude,
                longitude,
                speed,
                heading,
                battery_voltage
            }
        });
        
    } catch (err) {
        console.error("❌ Database Error:", err.message);
        res.status(500).json({ 
            error: "Database error", 
            details: err.message 
        });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const [result] = await pool.execute('SELECT 1');
        res.json({ 
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'unhealthy',
            database: 'disconnected',
            error: err.message 
        });
    }
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback for all other routes
app.get('*', (req, res) => {
    res.redirect('/');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Web interface: http://localhost:${PORT}`);
    console.log(`📍 GPS API endpoint: http://localhost:${PORT}/api/gps/latest`);
});
