# GPS Tracking System - Complete Project Documentation

## Project Overview

This is a real-time GPS tracking system built with **ESP32 microcontroller**, **Node.js web server**, and **MySQL database hosted on Aiven**. The system allows GPS devices to send location data via HTTPS, stores it in a cloud database, and displays it on a live web dashboard.

### Key Features
- ✅ Real-time GPS tracking with ESP32 devices
- ✅ Live web dashboard with interactive map
- ✅ Cloud MySQL database (Aiven)
- ✅ Automatic device registration
- ✅ Speed, heading, and battery voltage monitoring
- ✅ HTTPS secure communication
- ✅ Deployed on Render cloud platform

---

## System Architecture

```
┌─────────────┐       HTTPS        ┌─────────────────┐       MySQL       ┌──────────────┐
│   ESP32     │  ───────────────>  │  Node.js Server │  ──────────────>  │    Aiven     │
│   + GPS     │   JSON payload     │  (Render Cloud) │   SSL Connection  │   Database   │
│   + WiFi    │                    │                 │                   │              │
└─────────────┘                    └─────────────────┘                   └──────────────┘
                                            │
                                            │ HTTP/WebSocket
                                            ▼
                                    ┌─────────────────┐
                                    │  Web Dashboard  │
                                    │  (Leaflet Map)  │
                                    └─────────────────┘
```

### Data Flow
1. **ESP32** reads GPS coordinates and sensor data
2. **ESP32** sends HTTPS POST request with JSON payload to server
3. **Node.js server** validates and processes the data
4. **Server** stores data in Aiven MySQL database
5. **Web dashboard** fetches latest GPS data via API
6. **Map** displays real-time location with markers

---

## Technology Stack

### Hardware
- **ESP32 DevKit** - WiFi-enabled microcontroller
- **GPS Module** - NEO-6M or similar (optional for testing)
- **SIM800L** - GSM/GPRS module for cellular connectivity (optional)
- **Power Supply** - 3.7V LiPo battery or USB power

### Backend
- **Node.js** (v16+) - JavaScript runtime
- **Express.js** - Web framework
- **MySQL2** - Database driver with promise support
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### Database
- **MySQL 8.0** - Relational database
- **Aiven Cloud** - Managed database hosting
- **SSL/TLS** - Secure database connections

### Frontend
- **HTML5/CSS3/JavaScript** - Web interface
- **Leaflet.js** - Interactive map library
- **OpenStreetMap** - Map tiles

### Deployment
- **Render** - Web server hosting
- **GitHub** - Version control and deployment source
- **Aiven** - Database hosting

---

## Complete Setup Workflow

### Step 1: Database Setup (Aiven)

1. **Create Aiven Account**
   - Go to https://aiven.io
   - Sign up for free tier

2. **Create MySQL Service**
   - Click "Create Service"
   - Select MySQL 8.0
   - Choose free tier plan
   - Select region (closest to your location)
   - Name: `gps-tracking-db`
   - Click "Create Service"

3. **Get Connection Details**
   - Wait for service to start (2-3 minutes)
   - Navigate to "Overview" tab
   - Copy connection details:
     - Host
     - Port
     - User
     - Password
     - Database name
   - Download SSL certificate (if required)

4. **Import Database Schema**
   - Option A: Automatic (recommended)
     - The Node.js server will create tables on first run
   
   - Option B: Manual
     - Go to Aiven console → "SQL Editor"
     - Copy contents of `database/aiven-schema.sql`
     - Paste and execute

5. **Verify Database**
   ```sql
   SHOW TABLES;
   -- Should show: gps_devices, gps_data
   
   SELECT * FROM gps_devices;
   -- Should show empty or sample devices
   ```

### Step 2: Server Deployment (Render)

1. **Push Code to GitHub**
   ```bash
   cd webServGPS-clean
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/gps-webservice.git
   git push -u origin main
   ```

2. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

3. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - Name: `gps-webservice`
     - Environment: `Node`
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Plan: Free

4. **Set Environment Variables**
   - In Render dashboard → "Environment"
   - Add variables from your Aiven connection:
     ```
     DB_HOST=your-aiven-host.aivencloud.com
     DB_USER=avnadmin
     DB_PASS=your-password
     DB_NAME=defaultdb
     DB_PORT=12345
     PORT=10000
     ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (3-5 minutes)
   - Note your service URL: `https://gps-webservice.onrender.com`

### Step 3: ESP32 Setup

1. **Install Arduino IDE**
   - Download from https://arduino.cc
   - Install ESP32 board support

2. **Install Required Libraries**
   - Open Arduino IDE
   - Go to Sketch → Include Library → Manage Libraries
   - Install:
     - `ArduinoJson` by Benoit Blanchon
     - `TinyGPS++` by Mikal Hart (if using real GPS)
     - `TinyGSM` (if using SIM800L)

3. **Configure ESP32 Code**
   - Open `esp32-arduino/espCodeTest.ino`
   - Update WiFi credentials:
     ```cpp
     const char* ssid = "YourWiFiName";
     const char* password = "YourWiFiPassword";
     ```
   - Update server URL:
     ```cpp
     const char* serverName = "https://gps-webservice.onrender.com/api/gps/push";
     ```

4. **Upload Code**
   - Connect ESP32 via USB
   - Select board: "ESP32 Dev Module"
   - Select correct COM port
   - Click Upload
   - Open Serial Monitor (115200 baud)

5. **Verify Operation**
   - Check Serial Monitor for "WiFi Connected"
   - Watch for "Server Response Code: 200"
   - Check web dashboard for incoming data

### Step 4: Testing and Verification

1. **Check Server Health**
   ```bash
   curl https://gps-webservice.onrender.com/api/health
   # Should return: {"status":"healthy","database":"connected"}
   ```

2. **View Latest GPS Data**
   ```bash
   curl https://gps-webservice.onrender.com/api/gps/latest
   # Should return JSON with latitude, longitude, etc.
   ```

3. **Access Web Dashboard**
   - Open browser
   - Navigate to: `https://gps-webservice.onrender.com`
   - You should see a map with your GPS location

4. **Test ESP32 Push**
   - ESP32 should send data every 10 seconds (test mode)
   - Watch Serial Monitor for confirmation
   - Refresh dashboard to see updates

---

## Database Schema Details

### Tables

#### `gps_devices`
Stores registered GPS devices
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- device_imei: VARCHAR(50) UNIQUE (device identifier)
- created_at: TIMESTAMP (registration time)
- updated_at: TIMESTAMP (last update)
```

#### `gps_data`
Stores GPS location points
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- gps_id: INT FOREIGN KEY → gps_devices(id)
- latitude: DECIMAL(10,8) (GPS latitude)
- longitude: DECIMAL(11,8) (GPS longitude)
- speed: DECIMAL(5,2) (km/h)
- heading: DECIMAL(5,2) (degrees, 0-360)
- battery_voltage: DECIMAL(4,2) (volts)
- created_at: TIMESTAMP (data point time)
```

### Indexes
- Fast device lookups by IMEI
- Efficient time-based queries
- Optimized location searches

---

## API Reference

### POST `/api/gps/push`
**Purpose:** Receive GPS data from ESP32  
**Request Body:**
```json
{
  "device_imei": "ESP32_001",
  "latitude": 36.8065,
  "longitude": 10.1815,
  "speed": 15.5,
  "heading": 180.0,
  "battery_voltage": 3.7
}
```
**Response:**
```json
{
  "success": true,
  "device_id": 1
}
```

### GET `/api/gps/latest`
**Purpose:** Get most recent GPS location  
**Response:**
```json
{
  "latitude": 36.8065,
  "longitude": 10.1815,
  "speed": 15.5,
  "direction": 180.0,
  "battery_voltage": 3.7,
  "device_imei": "ESP32_001",
  "timestamp": "2026-02-09T18:30:00.000Z"
}
```

### GET `/api/devices`
**Purpose:** List all registered devices  
**Response:**
```json
[
  {
    "id": 1,
    "device_imei": "ESP32_001",
    "total_points": 145,
    "last_seen": "2026-02-09T18:30:00.000Z"
  }
]
```

### GET `/api/health`
**Purpose:** Server health check  
**Response:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### DELETE `/api/clear`
**Purpose:** Clear all GPS data (use with caution)  
**Response:**
```json
{
  "success": true
}
```

---

## How It All Works Together

### 1. Device Registration
- ESP32 sends first GPS data with unique `device_imei`
- Server checks if device exists in `gps_devices` table
- If new, creates device record automatically
- Returns device ID for reference

### 2. Data Collection
- ESP32 sends GPS data every 10 seconds (configurable)
- Server validates required fields (device_imei, latitude, longitude)
- Data is stored in `gps_data` table with timestamp
- Battery voltage and speed are optional but recommended

### 3. Data Retrieval
- Web dashboard polls `/api/gps/latest` every 5 seconds
- Server queries database for most recent GPS point
- Dashboard updates map marker to new position
- Speed, heading, and battery info displayed in popup

### 4. Data Persistence
- All data stored permanently in Aiven MySQL
- Aiven handles backups automatically
- SSL encryption for all database connections
- Foreign key constraints maintain data integrity

---

## Troubleshooting

### ESP32 Issues

**WiFi won't connect**
- Check SSID and password spelling
- Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- Try moving closer to router
- Check Serial Monitor for error messages

**HTTPS errors**
- Ensure `client->setInsecure()` is called
- Check server URL has `https://`
- Verify server is running (check Render dashboard)

**No GPS fix** (if using real GPS module)
- GPS needs clear sky view
- Wait 30-60 seconds for first fix
- Check antenna connection
- Verify GPS TX/RX wiring

### Server Issues

**Database connection failed**
- Verify environment variables are correct
- Check Aiven service is running
- Ensure SSL is enabled: `ssl: { rejectUnauthorized: false }`
- Test connection from Aiven console

**API returns 500 error**
- Check Render logs for errors
- Verify database tables exist
- Check environment variables

**Render service won't start**
- Check build logs for errors
- Verify `package.json` has correct start script
- Ensure all dependencies are listed
- Check Node.js version compatibility

### Database Issues

**Tables don't exist**
- Server creates tables automatically on first run
- Check Render logs for table creation messages
- Manually run SQL from `database/aiven-schema.sql`

**Connection timeout**
- Check Aiven service status
- Verify firewall/network settings
- Increase `connectTimeout` in db config

---

## Performance Considerations

- **Database queries:** Indexed for fast lookups
- **Connection pooling:** 10 concurrent connections
- **CORS enabled:** Allows dashboard to fetch data
- **Automatic device creation:** No pre-registration needed
- **Timestamp indexing:** Fast time-based queries

---

## Security Features

- ✅ HTTPS only communication
- ✅ SSL database connections
- ✅ Environment variables for secrets
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (parameterized queries)
- ✅ CORS configuration

---

## Future Enhancements

- [ ] Add user authentication
- [ ] Implement geofencing alerts
- [ ] Historical route playback
- [ ] Multiple device tracking on same map
- [ ] Mobile app for dashboard
- [ ] Push notifications
- [ ] Speed alerts
- [ ] Low battery warnings

---

## Project Info

**Author:** Khalil Othmani  
**Purpose:** GPS tracking system for embedded systems project  
**Stack:** ESP32 + Node.js + MySQL + Aiven + Render  
**License:** MIT  
**Last Updated:** February 2026

---

## Support & Resources

- **Aiven Docs:** https://docs.aiven.io/docs/products/mysql
- **Render Docs:** https://render.com/docs
- **ESP32 Docs:** https://docs.espressif.com/projects/esp-idf/
- **Leaflet.js:** https://leafletjs.com/reference.html
- **Arduino JSON:** https://arduinojson.org/

---

## Quick Reference Commands

```bash
# Install dependencies
npm install

# Run locally
npm start

# Check logs on Render
render logs -f

# Test API locally
curl http://localhost:10000/api/health

# Push to GitHub
git add .
git commit -m "Update"
git push
```

---

This project demonstrates a complete IoT system from hardware to cloud deployment. All components work together seamlessly to provide real-time GPS tracking capabilities.
