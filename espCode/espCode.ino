ls#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // Required for your backend logic
#include <TinyGPS++.h>

// --- Network Settings ---
const char* ssid = "";
const char* password = "";
// Your server address from index.js
const char* serverUrl = "http://192.168.1.4:5000/api/gps/push"; 

// --- GPS Settings ---
TinyGPSPlus gps;
HardwareSerial SerialGPS(2); // GPS TX=16, RX=17

void setup() {
  Serial.begin(115200);
  // Default baud rate for NEO-6M
  SerialGPS.begin(9600, SERIAL_8N1, 16, 17); 

  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Read data from GPS module
  while (SerialGPS.available() > 0) {
    if (gps.encode(SerialGPS.read())) {
      // Only send if the location has changed and is valid
      if (gps.location.isUpdated() && gps.location.isValid()) {
        sendDataToDatabase(gps.location.lat(), gps.location.lng());
      }
    }
  }

  // Error check if GPS is not talking
  if (millis() > 5000 && gps.charsProcessed() < 10) {
    Serial.println("❌ Error: No GPS detected. Check wiring!");
    delay(2000);
  }
}

void sendDataToDatabase(double lat, double lon) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Create JSON to match your gps_ingest.js requirements
    StaticJsonDocument<256> doc;
    doc["device_imei"] = "ESP32_ALZ_01"; // Must match your SQL DB
    doc["latitude"] = lat;
    doc["longitude"] = lon;
    doc["speed"] = gps.speed.kmph();
    doc["heading"] = gps.course.deg();
    doc["battery_voltage"] = 3.3; // Requirement from your schema

    String requestBody;
    serializeJson(doc, requestBody);

    Serial.println("📤 Sending GPS data to Server...");
    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0) {
      Serial.print("✅ Server Response: ");
      Serial.println(httpResponseCode);
      String payload = http.getString();
      Serial.println(payload); // See the "Data saved successfully" message
    } else {
      Serial.print("❌ HTTP Error: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("❌ WiFi Disconnected!");
  }
}