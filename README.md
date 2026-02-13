# GPS WebService

GPS Tracking System with ESP32 and Aiven MySQL

## Features

- Real-time GPS tracking with ESP32 devices
- Live dashboard with map visualization
- MySQL database with Aiven
- Automatic device registration
- Speed, heading, and battery monitoring
- SIM800L GSM/GPRS support for cellular connectivity

## Project Structure

```
webServGPS-clean/
├── database/              # Aiven MySQL database schema
│   ├── aiven-schema.sql  # Complete database setup
│   └── README.md         # Database setup guide
├── esp32/                # ESP32 + GPS + SIM800L + Power Management
│   ├── esp32_gps_sim800l.ino  # Arduino sketch
│   └── README.md         # Hardware setup guide
├── public/               # Web dashboard
│   └── index.html       # Live map interface
├── .env.example         # Environment variables template
├── .gitignore          # Git ignore rules
├── index.js            # Node.js Express server
├── package.json        # Dependencies
└── README.md           # This file
```

## Installation

```bash
npm install
```

## Running

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

- `POST /api/gps/push` - Receive GPS data from ESP32
- `GET /api/gps/latest` - Get latest GPS location
- `GET /api/devices` - List all devices
- `GET /api/health` - Health check
- `DELETE /api/clear` - Clear all data

## Deployment

### Render + Aiven

1. Push code to GitHub
2. Create MySQL service on Aiven (get connection details)
3. Create new Web Service on Render
4. Connect your GitHub repository
5. **Configure environment variables in Render dashboard:**
   - `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_PORT` (from Aiven)
   - `PORT=10000`
6. Deploy

**See [DEPLOYMENT.md](DEPLOYMENT.md) for complete step-by-step deployment guide with screenshots and troubleshooting.**

Database tables are created automatically on first run.

## ESP32 Integration

Send POST request to `/api/gps/push` with JSON:

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

## Hardware Setup

### ESP32 Power-Efficient GPS Tracker

**Complete Hardware Components:**
- ESP32 DevKit (WiFi microcontroller)
- NEO-6M GPS Module (location tracking)
- SIM800L GSM/GPRS (cellular connectivity)
- ADXL345 Accelerometer GY-291 (motion detection)
- AO3415A P-Channel MOSFET (power control)
- TP4056 Charging Module (battery management)
- 3.7V LiPo Battery (1000-2000mAh)

**Power Efficiency:**
The system uses **motion-based power management** - the SIM800L cellular module is only powered when movement is detected by the accelerometer. This extends battery life from ~2.5 hours to **12-15 hours** for typical usage.

See [`esp32/README.md`](esp32/README.md) for complete setup instructions including:

- Complete wiring diagram with all components
- MOSFET power control circuit
- Required Arduino libraries
- Configuration and tuning
- Power consumption details
- Troubleshooting guide

**Quick Start:**
1. Wire all components according to diagram in `esp32/README.md`
2. Install libraries (TinyGPS++, TinyGSM, ArduinoJson, Adafruit_ADXL345)
3. Update APN and server URL in `.ino` file
4. Upload to ESP32 and monitor Serial output

### Database Setup

See [`database/README.md`](database/README.md) for manual database setup.

**Note:** Database tables are automatically created by the Node.js server on first run. Manual setup is optional.

## Deployment

### Render

1. Create new Web Service
2. Connect GitHub repository
3. Set environment variables in Render dashboard
4. Deploy

### Aiven Database

1. Create MySQL service on Aiven
2. Copy connection details to `.env`
3. Database tables will be created automatically on first run
