#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <ArduinoJson.h>

#define TINY_GSM_MODEM_SIM800
#include <TinyGsmClient.h>

const char apn[]      = "internet";
const char gprsUser[] = "";
const char gprsPass[] = "";

const char server[]   = "gps-webservice.onrender.com";
const char endpoint[] = "/api/gps/push";
const int  port       = 80;

const char* deviceIMEI = "SIM800L_TRACKER_001";
const float batteryVoltage = 4.0;

#define MODEM_RX 27
#define MODEM_TX 26
#define GPS_RX    16
#define GPS_TX    17

TinyGPSPlus gps;
HardwareSerial SerialGPS(2);
HardwareSerial SerialAT(1);

TinyGsm modem(SerialAT);
TinyGsmClient client(modem);

unsigned long lastTransmitTime = 0;
const unsigned long transmitInterval = 30000;

void setup() {
  Serial.begin(115200);
  delay(10);

  SerialGPS.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  
  SerialAT.begin(9600, SERIAL_8N1, MODEM_RX, MODEM_TX);
  delay(3000);

  Serial.println("Initializing modem...");
  modem.restart();

  Serial.print("Connecting to network...");
  if (!modem.waitForNetwork()) {
    Serial.println(" fail");
    delay(10000);
    return;
  }
  Serial.println(" success");

  Serial.print("Connecting to GPRS (APN: ");
  Serial.print(apn);
  Serial.print(")...");
  if (!modem.gprsConnect(apn, gprsUser, gprsPass)) {
    Serial.println(" fail");
    delay(10000);
    return;
  }
  Serial.println(" success");
}

void loop() {
  while (SerialGPS.available() > 0) {
    gps.encode(SerialGPS.read());
  }

  if (millis() - lastTransmitTime > transmitInterval) {
    if (gps.location.isValid()) {
      sendToServer();
      lastTransmitTime = millis();
    } else {
      Serial.println("Waiting for GPS fix...");
    }
  }
}

void sendToServer() {
  Serial.println("Connecting to server...");
  
  if (!client.connect(server, port)) {
    Serial.println("Connection failed");
    return;
  }

  StaticJsonDocument<200> doc;
  doc["device_imei"] = deviceIMEI;
  doc["latitude"] = gps.location.lat();
  doc["longitude"] = gps.location.lng();
  doc["speed"] = gps.speed.kmph();
  doc["heading"] = gps.course.deg();
  doc["battery_voltage"] = batteryVoltage;

  String jsonString;
  serializeJson(doc, jsonString);

  client.print(String("POST ") + endpoint + " HTTP/1.1\r\n");
  client.print(String("Host: ") + server + "\r\n");
  client.println("Connection: close");
  client.println("Content-Type: application/json");
  client.print("Content-Length: ");
  client.println(jsonString.length());
  client.println();
  client.println(jsonString);

  while (client.connected()) {
    String line = client.readStringUntil('\n');
    if (line == "\r") break;
  }
  Serial.println("Data sent!");
  client.stop();
}
