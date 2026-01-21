#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> 
#include <TinyGPS++.h>
#include <WiFiClientSecure.h>

// --- Network Settings ---
const char* ssid = "Halfaouin 2";
const char* password = "123456789";

// Your Render Cloud URL
const char* serverName = "https://gps-webservice.onrender.com/api/gps/push"; 

// --- GPS Settings ---
TinyGPSPlus gps;
HardwareSerial SerialGPS(2); // GPS TX=16, RX=17

void setup() {
  Serial.begin(115200);
  // Default baud rate for NEO-6M is usually 9600
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
}

void loop() {
  // Read data from GPS module
  while (SerialGPS.available() > 0) {
    if (gps.encode(SerialGPS.read())) {
      // Only send if the location is valid and updated
      if (gps.location.isUpdated() && gps.location.isValid()) {
        sendDataToDatabase(gps.location.lat(), gps.location.lng());
      }
    }
  }

  // Error check if GPS is not talking
  if (millis() > 5000 && gps.charsProcessed() < 10) {
    Serial.println("❌ Error: No GPS detected. Check wiring (TX/RX)!");
    delay(2000);
  }
}

void sendDataToDatabase(double lat, double lon) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure *client = new WiFiClientSecure;
    if(client) {
      // This tells the ESP32 to ignore the SSL certificate check 
      // (Commonly needed for Render/Cloud services on ESP32)
      client->setInsecure(); 

      HTTPClient http;
      
      Serial.println("📤 Connecting to Render Cloud...");
      if (http.begin(*client, serverName)) { 
        http.addHeader("Content-Type", "application/json");

        // Prepare JSON Data
        StaticJsonDocument<256> doc;
        doc["device_imei"] = "ESP32_ALZ_01"; // IMPORTANT: Ensure this IMEI exists in your Aiven DB
        doc["latitude"] = lat;
        doc["longitude"] = lon;
        doc["speed"] = gps.speed.kmph();
        doc["heading"] = gps.course.deg();
        doc["battery_voltage"] = 3.3;

        String requestBody;
        serializeJson(doc, requestBody);

        int httpResponseCode = http.POST(requestBody);

        if (httpResponseCode > 0) {
          Serial.print("✅ Server Response Code: ");
          Serial.println(httpResponseCode);
          String payload = http.getString();
          Serial.println("Response: " + payload);
        } else {
          Serial.print("❌ HTTP Error: ");
          Serial.println(http.errorToString(httpResponseCode).c_str());
        }
        http.end();
      }
      delete client;
    }
  } else {
    Serial.println("❌ WiFi Disconnected!");
  }
}
