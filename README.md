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
├── esp32-arduino/        # ESP32 + GPS + SIM800L code
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

## Environment Variables

Create a `.env` file with:

```
DB_HOST=your-aiven-host.aivencloud.com
DB_USER=your-username
DB_PASS=your-password
DB_NAME=your-database
DB_PORT=your-port
PORT=10000
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

### Render

1. Create new Web Service
2. Connect GitHub repository
3. Set environment variables in Render dashboard
4. Deploy

### Aiven Database

1. Create MySQL service on Aiven
2. Copy connection details to `.env`
3. Database tables will be created automatically on first run

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

### ESP32 with SIM800L

See [`esp32-arduino/README.md`](esp32-arduino/README.md) for complete setup instructions including:

- Hardware wiring diagram
- Required Arduino libraries
- Configuration steps
- Troubleshooting guide

**Quick Start:**
1. Wire GPS module and SIM800L to ESP32
2. Install required libraries (TinyGPS++, TinyGSM, ArduinoJson)
3. Update APN and server URL in `.ino` file
4. Upload to ESP32

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
