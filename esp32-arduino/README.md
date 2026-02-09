# ESP32 GPS Tracker with SIM800L

Arduino code for ESP32 with GPS module and SIM800L GSM/GPRS module.

## Hardware Requirements

- **ESP32 Development Board**
- **GPS Module** (NEO-6M or similar with UART)
- **SIM800L GSM/GPRS Module**
- **SIM Card** with data plan
- **Power Supply** (SIM800L requires stable power, recommend external 4.2V)

## Wiring

### GPS Module
- GPS RX → ESP32 GPIO 16
- GPS TX → ESP32 GPIO 17
- VCC → 3.3V or 5V
- GND → GND

### SIM800L Module
- SIM800L RX → ESP32 GPIO 27
- SIM800L TX → ESP32 GPIO 26
- VCC → 4.2V (external power recommended)
- GND → GND (common ground with ESP32)

## Configuration

Edit these values in the `.ino` file:

```cpp
const char apn[] = "internet";           // Your SIM card APN
const char server[] = "your-server.com"; // Your Render server URL
const char* deviceIMEI = "YOUR_DEVICE";  // Unique device identifier
```

## Required Libraries

Install via Arduino Library Manager:

1. **TinyGPS++** by Mikal Hart
2. **TinyGSM** by Volodymyr Shymanskyy
3. **ArduinoJson** by Benoit Blanchon

## Upload Instructions

1. Open `esp32_gps_sim800l.ino` in Arduino IDE
2. Select **Board:** "ESP32 Dev Module"
3. Select **Port:** Your ESP32 COM port
4. Update configuration values (APN, server URL, device IMEI)
5. Click Upload

## Features

- Connects to cellular network via SIM800L
- Reads GPS coordinates from GPS module
- Sends data to server every 30 seconds
- JSON payload with location, speed, heading, battery
- Automatic retry on connection failure

## Troubleshooting

**SIM800L not connecting:**
- Check power supply (needs stable 3.7-4.2V, 2A capable)
- Verify SIM card has data plan and is activated
- Check APN settings for your carrier

**GPS not getting fix:**
- Ensure GPS antenna has clear view of sky
- Wait 2-5 minutes for initial GPS fix
- Check GPS module LED (should blink when locked)

**Server connection fails:**
- Verify server URL is correct
- Check cellular signal strength
- Ensure port 80 is accessible

## Data Format

Sends HTTP POST to `/api/gps/push`:

```json
{
  "device_imei": "SIM800L_TRACKER_001",
  "latitude": 36.8065,
  "longitude": 10.1815,
  "speed": 25.5,
  "heading": 180.0,
  "battery_voltage": 4.0
}
```
