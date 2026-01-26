const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// Log environment variables (without password)
console.log('📊 Environment Check:');
console.log('- DB_HOST:', process.env.DB_HOST);
console.log('- DB_USER:', process.env.DB_USER);
console.log('- DB_NAME:', process.env.DB_NAME);
console.log('- DB_PORT:', process.env.DB_PORT);
console.log('- PORT:', process.env.PORT);
console.log('- Password length:', process.env.DB_PASS ? process.env.DB_PASS.length : 'NOT SET');

// Database Pool
let pool;
try {
    pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 16496,
        ssl: { 
            rejectUnauthorized: false 
        },
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    console.log('✅ Database pool created successfully');
} catch (err) {
    console.error('❌ Failed to create database pool:', err.message);
}

// Test database connection
async function testDbConnection() {
    if (!pool) {
        console.error('❌ Database pool not initialized');
        return false;
    }
    
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connection successful!');
        
        // Test query
        const [rows] = await connection.query('SELECT NOW() as time, DATABASE() as db');
        console.log('📊 Database info:', rows[0]);
        
        // Check if gps_data table exists
        try {
            const [tables] = await connection.query(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name IN ('gps_data', 'gps_devices')",
                [process.env.DB_NAME]
            );
            console.log('📋 Found tables:', tables.map(t => t.table_name));
        } catch (tableErr) {
            console.log('ℹ️ Could not check tables:', tableErr.message);
        }
        
        connection.release();
        return true;
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('Full error:', err);
        return false;
    }
}

// Call on startup
testDbConnection().then(success => {
    if (!success) {
        console.log('⚠️ Starting server without database connection');
    }
});

// Basic health check
app.get('/api/health', async (req, res) => {
    try {
        if (!pool) {
            return res.json({ 
                status: 'degraded', 
                database: 'not_initialized',
                server: 'running',
                timestamp: new Date().toISOString()
            });
        }
        
        const [result] = await pool.query('SELECT 1 as ok');
        res.json({ 
            status: 'healthy',
            database: 'connected',
            server: 'running',
            timestamp: new Date().toISOString(),
            test_query: result[0]
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'unhealthy',
            database: 'disconnected',
            server: 'running',
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API to get latest GPS data
app.get('/api/gps/latest', async (req, res) => {
    console.log('📡 GET /api/gps/latest requested');
    
    if (!pool) {
        console.log('⚠️ No database connection, returning test data');
        return res.json({
            latitude: 40.7128,
            longitude: -74.0060,
            speed: 50,
            direction: 180,
            altitude: 100,
            timestamp: new Date().toISOString(),
            message: 'Test data - Database not connected'
        });
    }
    
    try {
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
            console.log('ℹ️ No GPS data found in database');
            return res.json({
                latitude: 40.7128,
                longitude: -74.0060,
                speed: 0,
                direction: 0,
                altitude: 0,
                timestamp: new Date().toISOString(),
                message: 'No GPS data available yet'
            });
        }
        
        const data = rows[0];
        console.log('📍 Returning GPS data:', {
            lat: data.latitude,
            lng: data.longitude,
            time: data.timestamp
        });
        
        res.json({
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            speed: data.speed || 0,
            direction: data.direction || 0,
            altitude: 0,
            battery_voltage: data.battery_voltage,
            timestamp: data.timestamp || new Date().toISOString()
        });
        
    } catch (err) {
        console.error('❌ Error in /api/gps/latest:', err.message);
        res.status(500).json({
            error: 'Database error',
            details: err.message,
            test_data: {
                latitude: 40.7128,
                longitude: -74.0060,
                speed: 50,
                direction: 180,
                altitude: 100,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// POST endpoint for ESP32
app.post('/api/gps/push', async (req, res) => {
    console.log('📍 POST /api/gps/push:', req.body);
    
    if (!pool) {
        console.error('❌ No database connection');
        return res.status(500).json({ 
            error: 'Database not available',
            received: req.body
        });
    }
    
    const { device_imei, latitude, longitude, speed, heading, battery_voltage } = req.body;
    
    try {
        // First, try to insert or get device
        let gps_id;
        
        // Check if device exists
        const [devices] = await pool.execute(
            'SELECT id FROM gps_devices WHERE device_imei = ?',
            [device_imei]
        );
        
        if (devices.length === 0) {
            console.log(`📱 Device ${device_imei} not found, creating entry...`);
            // Insert new device
            const [insertResult] = await pool.execute(
                'INSERT INTO gps_devices (device_imei) VALUES (?)',
                [device_imei]
            );
            gps_id = insertResult.insertId;
            console.log(`✅ Created new device with ID: ${gps_id}`);
        } else {
            gps_id = devices[0].id;
            console.log(`📱 Found existing device ID: ${gps_id}`);
        }
        
        // Insert GPS data
        await pool.execute(
            `INSERT INTO gps_data 
                (gps_id, latitude, longitude, speed, heading, battery_voltage) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [gps_id, latitude, longitude, speed, heading, battery_voltage]
        );
        
        console.log('✅ GPS data saved successfully');
        res.json({ 
            success: true,
            message: "Data saved",
            device_id: gps_id
        });
        
    } catch (err) {
        console.error('❌ Error saving GPS data:', err.message);
        console.error('Full error:', err);
        
        // Try without device check (direct insert)
        try {
            await pool.execute(
                `INSERT INTO gps_data 
                    (latitude, longitude, speed, heading, battery_voltage) 
                 VALUES (?, ?, ?, ?, ?)`,
                [latitude, longitude, speed, heading, battery_voltage]
            );
            console.log('✅ Saved without device mapping');
            res.json({ 
                success: true,
                message: "Data saved (no device mapping)"
            });
        } catch (secondErr) {
            res.status(500).json({ 
                error: 'Database error',
                details: secondErr.message,
                received: req.body
            });
        }
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
    console.log(`🌍 Web interface: http://localhost:${PORT}`);
    console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📍 GPS API: http://localhost:${PORT}/api/gps/latest`);
});
