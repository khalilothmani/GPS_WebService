const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

console.log('GPS WebService Starting...');

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

async function createTables() {
    try {
        console.log('Checking database tables...');
        
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS gps_devices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_imei VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_imei (device_imei)
            )
        `);
        
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
        
        console.log('Database tables verified/created');
    } catch (err) {
        console.error('Error creating tables:', err.message);
    }
}

createTables();

app.post('/api/gps/push', async (req, res) => {
    console.log('\\nReceived GPS data from ESP32:');
    console.log('   Device:', req.body.device_imei);
    console.log('   Location:', req.body.latitude, req.body.longitude);
    
    const { device_imei, latitude, longitude, speed, heading, battery_voltage } = req.body;
    
    if (!device_imei || !latitude || !longitude) {
        return res.status(400).json({ 
            error: 'Missing required fields',
            required: ['device_imei', 'latitude', 'longitude']
        });
    }
    
    try {
        let gps_id;
        const [devices] = await pool.execute(
            'SELECT id FROM gps_devices WHERE device_imei = ?',
            [device_imei.substring(0, 50)]
        );
        
        if (devices.length === 0) {
            const [insertResult] = await pool.execute(
                'INSERT INTO gps_devices (device_imei) VALUES (?)',
                [device_imei.substring(0, 50)]
            );
            gps_id = insertResult.insertId;
            console.log(`Created new device ID: ${gps_id}`);
        } else {
            gps_id = devices[0].id;
            console.log(`Found existing device ID: ${gps_id}`);
        }
        
        await pool.execute(
            `INSERT INTO gps_data 
                (gps_id, latitude, longitude, speed, heading, battery_voltage) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [gps_id, latitude, longitude, speed || 0, heading || 0, battery_voltage || 0]
        );
        
        console.log('GPS data saved to database');
        res.json({ success: true, device_id: gps_id });
        
    } catch (err) {
        console.error('Database error:', err.message);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/gps/latest', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT 
                g.latitude, 
                g.longitude, 
                g.speed, 
                g.heading as direction,
                g.battery_voltage,
                g.created_at as timestamp,
                d.device_imei
             FROM gps_data g
             JOIN gps_devices d ON g.gps_id = d.id
             ORDER BY g.created_at DESC 
             LIMIT 1`
        );
        
        if (rows.length === 0) {
            return res.json({
                latitude: 36.8065,
                longitude: 10.1815,
                speed: 0,
                direction: 0,
                device_imei: 'None',
                timestamp: new Date().toISOString()
            });
        }
        
        const data = rows[0];
        res.json({
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            speed: data.speed || 0,
            direction: data.direction || 0,
            device_imei: data.device_imei,
            battery_voltage: data.battery_voltage || 0,
            timestamp: data.timestamp
        });
        
    } catch (err) {
        console.error('Error fetching GPS data:', err.message);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/devices', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT d.*, COUNT(g.id) as total_points, MAX(g.created_at) as last_seen
             FROM gps_devices d
             LEFT JOIN gps_data g ON d.id = g.gps_id
             GROUP BY d.id`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        await pool.execute('SELECT 1');
        res.json({ status: 'healthy', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'unhealthy', error: err.message });
    }
});

app.delete('/api/clear', async (req, res) => {
    try {
        await pool.execute('DELETE FROM gps_data');
        await pool.execute('DELETE FROM gps_devices');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
