const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

console.log('🚀 GPS WebService Starting...');

// Database Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000
});

// Create tables if they don't exist
async function createTables() {
    try {
        console.log('🔧 Checking database tables...');
        
        // Create gps_devices table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS gps_devices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_imei VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_imei (device_imei)
            )
        `);
        
        // Create gps_data table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS gps_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                gps_id INT,
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                speed DECIMAL(5, 2) DEFAULT 0,
                heading DECIMAL(5, 2) DEFAULT 0,
                battery_voltage DECIMAL(4, 2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (gps_id) REFERENCES gps_devices(id) ON DELETE CASCADE,
                INDEX idx_created_at (created_at),
                INDEX idx_gps_id (gps_id)
            )
        `);
        
        console.log('✅ Database tables verified/created');
    } catch (err) {
        console.error('❌ Error creating tables:', err.message);
    }
}

// Initialize database
createTables();

// ESP32 Data Endpoint
app.post('/api/gps/push', async (req, res) => {
    console.log('\n📍 Received GPS data from ESP32:');
    console.log('   Device:', req.body.device_imei);
    console.log('   Location:', req.body.latitude, req.body.longitude);
    console.log('   Speed:', req.body.speed, 'km/h');
    console.log('   Heading:', req.body.heading, '°');
    
    const { device_imei, latitude, longitude, speed, heading, battery_voltage } = req.body;
    
    // Validate required fields
    if (!device_imei || !latitude || !longitude) {
        return res.status(400).json({ 
            error: 'Missing required fields',
            required: ['device_imei', 'latitude', 'longitude']
        });
    }
    
    try {
        let gps_id;
        
        // Check if device exists
        const [devices] = await pool.execute(
            'SELECT id FROM gps_devices WHERE device_imei = ?',
            [device_imei.substring(0, 50)] // Ensure within VARCHAR(50) limit
        );
        
        if (devices.length === 0) {
            // Create new device
            const [insertResult] = await pool.execute(
                'INSERT INTO gps_devices (device_imei) VALUES (?)',
                [device_imei.substring(0, 50)]
            );
            gps_id = insertResult.insertId;
            console.log(`✅ Created new device ID: ${gps_id}`);
        } else {
            gps_id = devices[0].id;
            console.log(`✅ Found existing device ID: ${gps_id}`);
        }
        
        // Insert GPS data
        await pool.execute(
            `INSERT INTO gps_data 
                (gps_id, latitude, longitude, speed, heading, battery_voltage) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [gps_id, latitude, longitude, speed || 0, heading || 0, battery_voltage || 0]
        );
        
        console.log('✅ GPS data saved to database');
        console.log(`   Location: ${latitude}, ${longitude}`);
        
        res.json({ 
            success: true,
            message: 'GPS data saved successfully',
            device_id: gps_id,
            timestamp: new Date().toISOString()
        });
        
    } catch (err) {
        console.error('❌ Database error:', err.message);
        
        // Try direct insert as fallback
        try {
            await pool.execute(
                `INSERT INTO gps_data 
                    (latitude, longitude, speed, heading, battery_voltage) 
                 VALUES (?, ?, ?, ?, ?)`,
                [latitude, longitude, speed || 0, heading || 0, battery_voltage || 0]
            );
            
            console.log('✅ Saved without device mapping');
            res.json({ 
                success: true,
                message: 'Data saved (no device mapping)'
            });
            
        } catch (secondErr) {
            console.error('❌ All insert attempts failed:', secondErr.message);
            res.status(500).json({ 
                error: 'Database error',
                details: secondErr.message
            });
        }
    }
});

// Get Latest GPS Data
app.get('/api/gps/latest', async (req, res) => {
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
            return res.json({
                latitude: 36.8065,
                longitude: 10.1815,
                speed: 0,
                direction: 0,
                altitude: 0,
                battery_voltage: 0,
                timestamp: new Date().toISOString(),
                message: 'No GPS data available yet'
            });
        }
        
        const data = rows[0];
        
        res.json({
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            speed: data.speed || 0,
            direction: data.direction || 0,
            altitude: 0,
            battery_voltage: data.battery_voltage || 0,
            timestamp: data.timestamp || new Date().toISOString(),
            source: 'database'
        });
        
    } catch (err) {
        console.error('❌ Error fetching GPS data:', err.message);
        res.status(500).json({ 
            error: 'Database error',
            details: err.message
        });
    }
});

// Get GPS History
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
        res.status(500).json({ error: err.message });
    }
});

// Get All Devices
app.get('/api/devices', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT 
                d.id,
                d.device_imei,
                d.created_at,
                COUNT(g.id) as total_points,
                MAX(g.created_at) as last_seen
             FROM gps_devices d
             LEFT JOIN gps_data g ON d.id = g.gps_id
             GROUP BY d.id
             ORDER BY d.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        const [result] = await pool.execute('SELECT 1 as ok');
        
        // Get stats
        const [deviceCount] = await pool.execute('SELECT COUNT(*) as count FROM gps_devices');
        const [dataCount] = await pool.execute('SELECT COUNT(*) as count FROM gps_data');
        const [latestData] = await pool.execute('SELECT MAX(created_at) as latest FROM gps_data');
        
        res.json({
            status: 'healthy',
            server_time: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                connected: true,
                devices: deviceCount[0].count,
                data_points: dataCount[0].count,
                latest_data: latestData[0].latest
            }
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'unhealthy',
            database: 'disconnected',
            error: err.message
        });
    }
});

// Clear Database (for testing)
app.delete('/api/clear', async (req, res) => {
    try {
        await pool.execute('DELETE FROM gps_data');
        await pool.execute('DELETE FROM gps_devices');
        await pool.execute('ALTER TABLE gps_devices AUTO_INCREMENT = 1');
        await pool.execute('ALTER TABLE gps_data AUTO_INCREMENT = 1');
        
        res.json({
            success: true,
            message: 'All data cleared successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log(`🚀 GPS WebService is LIVE on port ${PORT}`);
    console.log(`🌍 Frontend: http://localhost:${PORT}`);
    console.log(`📡 Database: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log('='.repeat(50));
    console.log('\n📊 Available Endpoints:');
    console.log('   GET  /              - Frontend interface');
    console.log('   POST /api/gps/push  - Receive GPS data (ESP32)');
    console.log('   GET  /api/gps/latest- Get latest position');
    console.log('   GET  /api/health    - System health check');
    console.log('   GET  /api/devices   - List all devices');
    console.log('   DELETE /api/clear   - Clear all data (testing)');
    console.log('\n' + '='.repeat(50) + '\n');
});
