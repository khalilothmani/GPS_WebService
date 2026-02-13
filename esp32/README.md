# ESP32 Power-Efficient GPS Tracker

Arduino firmware for ESP32 with GPS module, SIM800L GSM/GPRS, and intelligent power management using an accelerometer.

## Hardware Requirements

- **ESP32 DevKit** - Main microcontroller
- **NEO-6M GPS Module** - GPS receiver with UART interface
- **SIM800L GSM/GPRS Module** - Cellular connectivity
- **ADXL345 Accelerometer (GY-291)** - 3-axis motion sensor
- **AO3415A P-Channel MOSFET** - High-side switch for SIM800L power control
- **TP4056 Charging Module** - LiPo battery charge controller
- **3.7V LiPo Battery** - Power source (1000-2000mAh recommended)
- **SIM Card** - with active data plan
- **Resistors** - 10kΩ (x2 for MOSFET), 100kΩ (x2 for battery voltage divider)

## Complete Wiring Diagram

### GPS Module (NEO-6M)
```
GPS TX → ESP32 GPIO 3 (RX)
GPS RX → ESP32 GPIO 1 (TX)
GPS VCC → 3.3V
GPS GND → GND
```

### SIM800L Module
```
SIM800L TX → ESP32 GPIO 26 (RX)
SIM800L RX → ESP32 GPIO 27 (TX)
SIM800L VCC → MOSFET Drain (switched power)
SIM800L GND → Common GND
SIM800L Power: 3.7-4.2V (critical!)
```

### ADXL345 Accelerometer (I2C Interface)
```
ADXL345 SDA → ESP32 GPIO 21
ADXL345 SCL → ESP32 GPIO 22
ADXL345 VCC → 3.3V
ADXL345 GND → GND
```

### AO3415A MOSFET (P-Channel - High-Side Switch)
```
MOSFET Source (S) → Battery+ / TP4056 OUT+ (3.7-4.2V)
MOSFET Drain (D) → SIM800L VCC
MOSFET Gate (G) → 10kΩ resistor → ESP32 GPIO 32
MOSFET Gate (G) → 10kΩ pull-up resistor → Source (S)
```

**MOSFET Operation:**
- GPIO 32 HIGH (3.3V) → Gate-Source voltage = -0.5V → MOSFET OFF → SIM800L unpowered
- GPIO 32 LOW (0V) → Gate-Source voltage = -3.7V → MOSFET ON → SIM800L powered

### TP4056 Charging Module
```
TP4056 IN+ → 5V USB/Solar input
TP4056 IN- → GND
TP4056 BAT+ → LiPo Battery positive
TP4056 BAT- → LiPo Battery negative / GND
TP4056 OUT+ → ESP32 VIN (or 5V) AND MOSFET Source
TP4056 OUT- → Common GND
```

### Battery Voltage Monitor (Voltage Divider)
```
Battery+ → 100kΩ resistor → ESP32 GPIO 34 (ADC) → 100kΩ resistor → GND
```

**Voltage Divider Calculation:**
- LiPo voltage: 3.0V - 4.2V
- After divider: 1.5V - 2.1V (safe for ESP32 ADC max 3.3V)
- Code multiplies reading by 2.0 to get actual battery voltage

### Power Distribution
```
                    ┌─────────────────────┐
    5V USB ─────────┤ TP4056 IN+          │
    GND ────────────┤ TP4056 IN-          │
                    │                     │
    Battery+ ───────┤ TP4056 BAT+         │
    Battery- ───────┤ TP4056 BAT-         │
                    │                     │
    ESP32 VIN ──────┤ TP4056 OUT+  ├──────┤ MOSFET Source
    GND ────────────┤ TP4056 OUT-         │
                    └─────────────────────┘
                    
    MOSFET Drain ───> SIM800L VCC (switched power)
```

## Required Arduino Libraries

Install via Arduino Library Manager:

1. **TinyGPS++** by Mikal Hart - GPS parsing
2. **TinyGSM** by Volodymyr Shymanskyy - SIM800L communication
3. **ArduinoJson** by Benoit Blanchon - JSON encoding
4. **Adafruit_ADXL345** - Accelerometer driver
5. **Adafruit_Sensor** - Unified sensor library (dependency)

## Configuration

Edit these values in `esp32_gps_sim800l.ino`:

```cpp
// Cellular Network Settings
const char apn[] = "internet";           // Your carrier's APN
const char gprsUser[] = "";              // Leave empty for most carriers
const char gprsPass[] = "";              // Leave empty for most carriers

// Server Configuration
const char server[] = "gps-webservice.onrender.com";  // Your server URL (without https://)
const char endpoint[] = "/api/gps/push";              // API endpoint
const int port = 80;                                   // HTTP port (80 for HTTP, 443 for HTTPS)

// Device Identification
const char* deviceIMEI = "SIM800L_TRACKER_001";  // Unique device ID
```

### Advanced Tuning Parameters

```cpp
// Motion Detection Sensitivity
const float motionThresholdStart = 2.0;  // Higher = less sensitive (start motion)
const float motionThresholdEnd = 1.0;    // Lower = more responsive (end motion)

// Timing Configuration
const unsigned long transmitInterval = 10000;         // 10 seconds between transmissions
const unsigned long activeWindowDuration = 180000;    // 3 minutes active window
const unsigned long modemInitDelay = 10000;           // 10 seconds for SIM800L initialization
```

## Upload Instructions

1. Open `esp32_gps_sim800l.ino` in Arduino IDE
2. Select **Board:** "ESP32 Dev Module"
3. Select **Port:** Your ESP32 COM port
4. Configure settings above (APN, server, device ID)
5. Click **Upload**
6. Open **Serial Monitor** at **115200 baud**

## How It Works

### Power Management State Machine

The system operates in three states:

```
┌──────────────┐
│ IDLE_STATE   │ ← SIM800L powered OFF, monitoring accelerometer
└──────┬───────┘
       │ Motion detected
       ▼
┌──────────────┐
│ INIT_STATE   │ ← MOSFET ON, waiting for SIM800L to initialize (10s)
└──────┬───────┘
       │ Initialization complete
       ▼
┌──────────────┐
│ ACTIVE_STATE │ ← Transmitting GPS data every 10 seconds
└──────┬───────┘
       │ No motion for 3 minutes
       ▼
     [Return to IDLE]
```

### Motion Detection Algorithm

1. **Continuous Monitoring**: ADXL345 reads X, Y, Z acceleration at ~10Hz
2. **Delta Calculation**: Compares current reading to previous reading
3. **Threshold Check**: Total motion = |ΔX| + |ΔY| + |ΔZ|
4. **Hysteresis**: Different thresholds for starting (2.0) vs ending (1.0) motion
5. **Filtering**: Prevents false triggers from minor vibrations

### Active Window Behavior

- **Motion Detected** → Enable MOSFET → Wait 10s for SIM800L init → Start transmitting
- **GPS Data** → Sent every 10 seconds via HTTP POST
- **Motion Continues** → Active window extends (resets 3-minute countdown)
- **Stationary for 3 min** → Disable MOSFET → Return to idle → Save power

### SIM800L Initialization Time

After MOSFET enables power, SIM800L requires:
- **~3 seconds**: Module boot-up
- **~5-7 seconds**: Network registration
- **~10 seconds total**: Ready to send HTTP requests

The firmware waits 10 seconds in INIT_STATE to ensure reliable connectivity.

## Power Consumption

### Current Draw Measurements

| State | Components Active | Current | Battery Life (1000mAh) |
|-------|-------------------|---------|------------------------|
| **IDLE** | ESP32 + GPS + ADXL345 | ~100mA | 10 hours |
| **ACTIVE (idle)** | + SIM800L (connected) | ~200mA | 5 hours |
| **ACTIVE (transmit)** | + SIM800L (TX burst) | ~500-800mA | 1.5-2 hours |

### Battery Life Estimates

**Scenario 1: Stationary Person (Sleeping/Working)**
- 100% IDLE mode
- Power: 100mA
- **Battery life: 10+ hours** (limited by GPS power draw)

**Scenario 2: Typical Usage (Office Worker/Student)**
- 10% ACTIVE, 90% IDLE
- Average power: ~130mA
- **Battery life: 12-15 hours** (1000mAh) or **24-30 hours** (2000mAh)

**Scenario 3: Continuous Movement (Hiking/Running)**
- 100% ACTIVE mode
- Average power: ~400mA (with transmission bursts)
- **Battery life: 2.5 hours** (1000mAh) or **5 hours** (2000mAh)

### Power Optimization Tips

1. **GPS Module**: Use low-power GPS modules (e.g., u-blox M8) → saves 20-30mA
2. **ESP32 Sleep**: Implement deep sleep in IDLE state → saves 70-80mA
3. **Larger Battery**: Use 2000mAh → doubles battery life
4. **Solar Charging**: 5V 1W solar panel → extends indefinitely in sunny locations
5. **Transmission Interval**: Increase to 30s → reduces average current by 10-15%

## Serial Monitor Output

### Normal Operation
```
=== ESP32 Power-Efficient GPS Tracker ===
MOSFET OFF (idle mode)
ADXL345 accelerometer detected
GPS initialized
System ready - monitoring for motion...

*** Motion detected! Enabling SIM800L... ***
MOSFET ON - SIM800L powered
Initializing SIM800L modem...
Connecting to network... OK
Connecting to GPRS (internet)... OK
Entering ACTIVE state - will transmit for 3 minutes
Connecting to server...
Data sent! Battery: 3.85V
Active window: 170s remaining
Connecting to server...
Data sent! Battery: 3.84V

*** No motion detected, returning to idle... ***
MOSFET OFF - SIM800L unpowered
```

## Troubleshooting

### ADXL345 Not Detected
- **Check wiring**: Verify SDA (GPIO 21) and SCL (GPIO 22) connections
- **I2C address**: ADXL345 default is 0x53, ensure no conflicts
- **Pull-up resistors**: I2C requires 4.7kΩ pull-ups (often built into GY-291)
- **Power**: Verify 3.3V supply to ADXL345

### MOSFET Not Switching
- **Check gate resistor**: 10kΩ from GPIO 32 to MOSFET gate
- **Pull-up resistor**: 10kΩ from gate to source (keeps off by default)
- **MOSFET orientation**: Ensure Source → Battery+, Drain → SIM800L VCC
- **Test manually**: Set GPIO 32 LOW manually, measure drain voltage (should be ~3.7V)

### SIM800L Not Initializing
- **Wait longer**: Increase `modemInitDelay` to 15000 (15 seconds)
- **Power supply**: SIM800L needs stable 3.7-4.2V with 2A peak capability
- **Network signal**: Ensure SIM card has signal and active data plan
- **Check APN**: Verify APN settings for your carrier

### Battery Voltage Incorrect
- **Check voltage divider**: Should be two 100kΩ resistors
- **ADC reading**: Monitor raw ADC value (should be ~2048 at 3.7V)
- **Multiplier**: Code uses `* 2.0`, adjust if different resistor values

### GPS Not Getting Fix
- **Antenna placement**: GPS needs clear view of sky (not indoors)
- **Wait time**: First fix can take 30-60 seconds
- **LED indicator**: GPS module LED should blink when locked
- **Check wiring**: Verify TX/RX connections (GPS TX → ESP32 RX GPIO 3)

### Server Connection Failed
- **Check URL**: Verify server address (without `https://`)
- **Port**: Should be 80 for HTTP, 443 for HTTPS
- **Cellular signal**: Weak signal can cause connection failures
- **APN settings**: Incorrect APN prevents internet access

### Motion Detection Too Sensitive/Insensitive
- **Adjust thresholds**: Modify `motionThresholdStart` and `motionThresholdEnd`
- **Test values**: Monitor accelerometer readings in Serial Monitor
- **Environment**: Minor body movements when sitting may trigger motion detection
- **Mounting**: Secure device in pocket, bag, or belt for consistent readings

## Data Format

Sends HTTP POST to server endpoint with JSON payload:

```json
{
  "device_imei": "SIM800L_TRACKER_001",
  "latitude": 36.8065,
  "longitude": 10.1815,
  "speed": 25.5,
  "heading": 180.0,
  "battery_voltage": 3.85
}
```

## Testing Without GPS/SIM800L

For testing the power management logic without full hardware:

1. **Accelerometer only**: Comment out GPS and SIM800L initialization
2. **Monitor state changes**: Watch Serial Monitor for state transitions
3. **Verify MOSFET switching**: Measure GPIO 32 voltage (HIGH = 3.3V, LOW = 0V)
4. **Simulate motion**: Shake device to trigger state changes

## Future Enhancements

- [ ] ESP32 deep sleep in IDLE state (reduce power to ~10mA)
- [ ] Low battery shutdown threshold (protect LiPo from over-discharge)
- [ ] Configurable thresholds via SMS commands
- [ ] OTA firmware updates via cellular
- [ ] Odometer and trip tracking
- [ ] Geofence alerts

## Circuit Notes

### Why P-Channel MOSFET?
- **High-side switching**: Controls power supply to SIM800L
- **Logic-level compatible**: AO3415A switches with 3.3V gate voltage
- **Low voltage drop**: Minimal impact on SIM800L supply voltage

### Why TP4056?
- **Safe charging**: Prevents LiPo overcharge/over-discharge
- **Load sharing**: Can power device while charging
- **Status LEDs**: Visual indication of charging state
- **Cheap and reliable**: Standard charging solution

### Battery Considerations
- **Voltage range**: LiPo 3.0V (empty) to 4.2V (full)
- **Capacity**: 1000-2000mAh recommended for daily use
- **Protection**: Use batteries with built-in protection circuit
- **Temperature**: LiPo safe operating range: 0-45°C

## License

MIT License - Free for educational and commercial use
