#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> 
#include <WiFiClientSecure.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

const char* serverName = "https://gps-webservice.onrender.com/api/gps/push"; 

void setup() {
  Serial.begin(115200);
  
  Serial.print("Connecting to WiFi: ");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected for Testing!");
}

void loop() {
  double fakeLat = 35.8065; 
  double fakeLon = 10.6816;
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
      client->setInsecure();

      HTTPClient http;
      
      Serial.println(" Sending Simulated Data to Render...");
      if (http.begin(*client, serverName)) { 
        http.addHeader("Content-Type", "application/json");

        StaticJsonDocument<256> doc;
        doc["device_imei"] = "Esp-1-test"; 
        doc["latitude"] = lat;
        doc["longitude"] = lon;
        doc["speed"] = speed;
        doc["heading"] = heading;
        doc["battery_voltage"] = 3.8;

        String requestBody;
        serializeJson(doc, requestBody);

        int httpResponseCode = http.POST(requestBody);

        if (httpResponseCode > 0) {
          Serial.print(" Server Response Code: ");
          Serial.println(httpResponseCode);
          Serial.print("Payload: ");
          Serial.println(http.getString());
        } else {
          Serial.print(" HTTP Error: ");
          Serial.println(http.errorToString(httpResponseCode).c_str());
        }
        http.end();
      }
      delete client;
    }
  } else {
    Serial.println(" WiFi Disconnected!");
  }
}
