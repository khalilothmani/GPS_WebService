#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <ArduinoJson.h>

// ============ CONFIGURATION ============
// WiFi Settings
const char* ssid = "D3vilsT0uchh";
const char* password = "whiletrue";

// Server Settings (Your Render URL)
const char* serverUrl = "https://gps-webservice.onrender.com"; // CHANGE THIS
const char* endpoint = "/api/gps/push";

// Device Settings
const char* deviceIMEI = "ESP32_GPS_TRACKER_001"; // Unique ID for your ESP32
const float batteryVoltage = 3.7; // In volts (adjust based on actual measurement)

// GPS Settings
#define GPS_RX_PIN 16  // GPS TX -> ESP32 RX (GPIO16)
#define GPS_TX_PIN 17  // GPS RX -> ESP32 TX (GPIO17)
#define GPS_BAUD 9600

// Transmission Settings
const unsigned long transmitInterval = 30000; // Send data every 30 seconds
unsigned long lastTransmitTime = 0;

// ============ OBJECTS ============
TinyGPSPlus gps;
HardwareSerial gpsSerial(2); // UART2 on ESP32

// ============ VARIABLES ============
float latitude = 0.0;
float longitude = 0.0;
float speed = 0.0;
float heading = 0.0;
int satellites = 0;
bool hasFix = false;

// ============ SETUP ============
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n==================================");
  Serial.println("ESP32 GPS Tracker Starting...");
  Serial.println("==================================");
  
  // Initialize GPS Serial
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("GPS Serial initialized");
  
  // Connect to WiFi
  connectToWiFi();
  
  // Print device info
  Serial.println("\nDevice Information:");
  Serial.println("===================");
  Serial.print("Device IMEI: ");
  Serial.println(deviceIMEI);
  Serial.print("Server URL: ");
  Serial.println(serverUrl);
  Serial.print("Battery Voltage: ");
  Serial.print(batteryVoltage);
  Serial.println("V");
  Serial.println("==================================\n");
}

// ============ MAIN LOOP ============
void loop() {
  // Read GPS data
  readGPS();
  
  // Print GPS status
  printGPSInfo();
  
  // Check if we should transmit
  if (millis() - lastTransmitTime > transmitInterval) {
    if (hasFix) {
      sendToServer();
      lastTransmitTime = millis();
    } else {
      Serial.println("⚠️ No GPS fix - skipping transmission");
    }
  }
  
  delay(1000); // Small delay between loops
}

// ============ FUNCTIONS ============

// Connect to WiFi
void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n❌ WiFi connection failed!");
  }
}

// Read GPS data
void readGPS() {
  while (gpsSerial.available() > 0) {
    char c = gpsSerial.read();
    gps.encode(c);
  }
  
  // Update variables if GPS has fix
  if (gps.location.isValid()) {
    hasFix = true;
    latitude = gps.location.lat();
    longitude = gps.location.lng();
    speed = gps.speed.kmph();
    heading = gps.course.deg();
    satellites = gps.satellites.value();
  } else {
    hasFix = false;
  }
}

// Print GPS information
void printGPSInfo() {
  static unsigned long lastPrint = 0;
  
  if (millis() - lastPrint > 5000) { // Print every 5 seconds
    Serial.println("\n📡 GPS Status:");
    Serial.println("================");
    
    if (hasFix) {
      Serial.print("📍 Location: ");
      Serial.print(latitude, 6);
      Serial.print(", ");
      Serial.print(longitude, 6);
      Serial.println();
      
      Serial.print("🚗 Speed: ");
      Serial.print(speed);
      Serial.println(" km/h");
      
      Serial.print("🧭 Heading: ");
      Serial.print(heading);
      Serial.println("°");
      
      Serial.print("🛰️ Satellites: ");
      Serial.println(satellites);
      
      Serial.print("⏰ Time: ");
      if (gps.time.isValid()) {
        Serial.print(gps.time.hour());
        Serial.print(":");
        Serial.print(gps.time.minute());
        Serial.print(":");
        Serial.print(gps.time.second());
      }
      Serial.println();
    } else {
      Serial.println("🔍 Searching for satellites...");
      Serial.print("Satellites in view: ");
      Serial.println(gps.satellites.value());
    }
    
    Serial.println("================");
    lastPrint = millis();
  }
}

// Send data to server
void sendToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, attempting to reconnect...");
    connectToWiFi();
    
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("❌ Cannot send data - WiFi disconnected");
      return;
    }
  }
  
  Serial.println("\n📤 Sending data to server...");
  
  // Create JSON payload
  String payload = createJSONPayload();
  Serial.println("Payload:");
  Serial.println(payload);
  
  // Create HTTP client
  HTTPClient http;
  String fullUrl = String(serverUrl) + String(endpoint);
  
  Serial.print("Sending to: ");
  Serial.println(fullUrl);
  
  http.begin(fullUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Send POST request
  int httpResponseCode = http.POST(payload);
  
  // Handle response
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("✅ Server Response (Code ");
    Serial.print(httpResponseCode);
    Serial.print("): ");
    Serial.println(response);
  } else {
    Serial.print("❌ POST failed, error: ");
    Serial.println(httpResponseCode);
    Serial.print("Error: ");
    Serial.println(http.errorToString(httpResponseCode));
  }
  
  http.end();
  Serial.println("================");
}

// Create JSON payload
String createJSONPayload() {
  // Use ArduinoJson library (install via Library Manager)
  StaticJsonDocument<512> doc;
  
  doc["device_imei"] = deviceIMEI;
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
  doc["speed"] = speed;
  doc["heading"] = heading;
  doc["battery_voltage"] = batteryVoltage;
  
  String jsonString;
  serializeJson(doc, jsonString);
  return jsonString;
}

// Manual GPS data sender (for testing without GPS module)
void sendManualData() {
  // Only use for testing when you don't have GPS hardware
  latitude = 40.7128 + (random(-100, 100) / 10000.0);
  longitude = -74.0060 + (random(-100, 100) / 10000.0);
  speed = random(0, 120);
  heading = random(0, 360);
  
  sendToServer();
}