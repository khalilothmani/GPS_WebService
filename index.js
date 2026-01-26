const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log('🚀 Starting GPS WebService...');
console.log('📊 Loading environment variables...');

// Database Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { 
        rejectUnauthorized: false 
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000
});

// Test database connection on startup
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully!');
        connection.release();
        
        // Check tables
        return pool.execute("SHOW TABLES LIKE 'gps_%'");
    })
    .then(([tables]) => {
        console.log('📋 Available GPS tables:', tables.map(t => t[Object.keys(t)[0]]));
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        console.error('💡 Make sure:');
        console.error('   1. Aiven MySQL service is RUNNING (not paused)');
        console.error('   2. .env file has correct credentials');
        console.error('   3. Database hostname is correct');
    });

// API to get latest GPS data (for frontend map)
app.get('/api/gps/latest', async (req, res) => {
    try {
        console.log('📡 Fetching latest GPS data...');
        
        const [rows] = await pool.execute(
            `SELECT 
                latitude, 
                longitude, 
                speed, 
                heading, 
                battery_voltage,
                created_at
             FROM gps_data 
             ORDER BY created_at DESC 
             LIMIT 1`
        );
        
        if (rows.length === 0) {
            return res.json({
                message: 'No GPS data available yet',
                latitude: 40.7128,
                longitude: -74.0060,
                speed: 0,
                direction: 0,
                altitude: 0,
                timestamp: new Date().toISOString()
            });
        }
        
        const data = rows[0];
        console.log('📍 Latest GPS position:', {
            lat: data.latitude,
            lng: data.longitude,
            speed: data.speed,
            time: data.created_at
        });
        
        res.json({
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            speed: data.speed || 0,
            direction: data.heading || 0,
            altitude: 0,
            battery_voltage: data.battery_voltage,
            timestamp: data.created_at || new Date().toISOString()
        });
        
    } catch (err) {
        console.error('❌ Error fetching GPS data:', err.message);
        res.status(500).json({ 
            error: 'Database error',
            details: err.message 
        });
    }
});

// API to get GPS history (last 10 positions)
app.get('/api/gps/history', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT 
                latitude, 
                longitude, 
                speed, 
                heading,
                created_at
             FROM gps_data 
             ORDER BY created_at DESC 
             LIMIT 10`
        );
        
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ESP32 Data Push Endpoint
app.post('/api/gps/push', async (req, res) => {
    console.log('📍 Received GPS data from ESP32:', req.body);
    
    const { device_imei, latitude, longitude, speed, heading, battery_voltage } = req.body;
    
    if (!device_imei || !latitude || !longitude) {
        return res.status(400).json({ 
            error: 'Missing required fields',
            required: ['device_imei', 'latitude', 'longitude']
        });
    }
    
    try {
        // Check if device exists
        const [devices] = await pool.execute(
            'SELECT id FROM gps_devices WHERE device_imei = ?',
            [device_imei]
        );
        
        let gps_id;
        
        if (devices.length === 0) {
            console.log(`📱 Creating new device: ${device_imei}`);
            // Insert new device
            const [insertResult] = await pool.execute(
                'INSERT INTO gps_devices (device_imei) VALUES (?)',
                [device_imei]
            );
            gps_id = insertResult.insertId;
        } else {
            gps_id = devices[0].id;
        }
        
        // Insert GPS data
        await pool.execute(
            `INSERT INTO gps_data 
                (gps_id, latitude, longitude, speed, heading, battery_voltage) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [gps_id, latitude, longitude, speed || 0, heading || 0, battery_voltage || 0]
        );
        
        console.log('✅ GPS data saved successfully!');
        console.log(`   Location: ${latitude}, ${longitude}`);
        console.log(`   Device ID: ${gps_id}`);
        
        res.json({ 
            success: true,
            message: 'GPS data saved',
            device_id: gps_id
        });
        
    } catch (err) {
        console.error('❌ Database error:', err.message);
        
        // Try to create tables if they don't exist
        if (err.code === 'ER_NO_SUCH_TABLE') {
            try {
                console.log('🔄 Creating missing tables...');
                await createTables();
                
                // Retry the insert
                const [insertResult] = await pool.execute(
                    'INSERT INTO gps_devices (device_imei) VALUES (?)',
                    [device_imei]
                );
                const gps_id = insertResult.insertId;
                
                await pool.execute(
                    `INSERT INTO gps_data 
                        (gps_id, latitude, longitude, speed, heading, battery_voltage) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [gps_id, latitude, longitude, speed || 0, heading || 0, battery_voltage || 0]
                );
                
                console.log('✅ Tables created and data saved!');
                res.json({ 
                    success: true,
                    message: 'Tables created and data saved'
                });
                
            } catch (createErr) {
                console.error('❌ Failed to create tables:', createErr.message);
                res.status(500).json({ 
                    error: 'Table creation failed',
                    details: createErr.message
                });
            }
        } else {
            res.status(500).json({ 
                error: 'Database error',
                details: err.message
            });
        }
    }
});

// Create tables if they don't exist
async function createTables() {
    // Create gps_devices table
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS gps_devices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            device_imei VARCHAR(20) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            INDEX idx_created_at (created_at)
        )
    `);
    
    console.log('✅ Database tables created/verified');
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const [result] = await pool.execute('SELECT 1 as ok');
        res.json({ 
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString(),
            service: 'GPS WebService',
            version: '1.0.0'
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'unhealthy',
            database: 'disconnected',
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log(`🚀 GPS WebService is LIVE on port ${PORT}`);
    console.log(`🌍 Frontend: http://localhost:${PORT}`);
    console.log(`📍 API Endpoints:`);
    console.log(`   GET  /api/gps/latest  - Get latest GPS position`);
    console.log(`   POST /api/gps/push    - Receive data from ESP32`);
    console.log(`   GET  /api/health      - Health check`);
    console.log('='.repeat(50) + '\n');
    
    // Create tables on startup
    createTables().catch(err => {
        console.error('Table creation error:', err.message);
    });
});
