#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> 
#include <WiFiClientSecure.h>

// --- Network Settings ---
const char* ssid = "D3vilsT0uchh";
const char* password = "whiletrue";

// Your Render Cloud URL
const char* serverName = "https://gps-webservice.onrender.com/api/gps/push"; 

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected for Testing!");
}

void loop() {
  // SIMULATED DATA: Tunis, Tunisia Coordinates
  double fakeLat = 36.8065; 
  double fakeLon = 10.1815;
  float fakeSpeed = 15.5;
  int fakeHeading = 180;

  Serial.println("\n--- Starting Simulation Transmission ---");
  sendDataToDatabase(fakeLat, fakeLon, fakeSpeed, fakeHeading);
  
  Serial.println("Waiting 10 seconds for next test...");
  delay(10000); 
}

void sendDataToDatabase(double lat, double lon, float speed, int heading) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure *client = new WiFiClientSecure;
    if(client) {
      client->setInsecure(); // Required for Render HTTPS

      HTTPClient http;
      
      Serial.println("📤 Sending Simulated Data to Render...");
      if (http.begin(*client, serverName)) { 
        http.addHeader("Content-Type", "application/json");

        // Prepare JSON Data
        StaticJsonDocument<256> doc;
        doc["device_imei"] = "ESP32_ALZ_01"; 
        doc["latitude"] = lat;
        doc["longitude"] = lon;
        doc["speed"] = speed;
        doc["heading"] = heading;
        doc["battery_voltage"] = 3.8; // Simulated battery

        String requestBody;
        serializeJson(doc, requestBody);

        int httpResponseCode = http.POST(requestBody);

        if (httpResponseCode > 0) {
          Serial.print("✅ Server Response Code: ");
          Serial.println(httpResponseCode);
          Serial.print("Payload: ");
          Serial.println(http.getString());
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