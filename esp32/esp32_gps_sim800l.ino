#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_ADXL345_U.h>

#define TINY_GSM_MODEM_SIM800
#include <TinyGsmClient.h>

const char apn[]      = "internet";
const char gprsUser[] = "";
const char gprsPass[] = "";

const char server[]   = "gps-webservice.onrender.com";
const char endpoint[] = "/api/gps/push";
const int  port       = 80;

const char* deviceIMEI = "SIM800L_TRACKER_001";

#define MODEM_RX 26
#define MODEM_TX 27
#define GPS_RX   3
#define GPS_TX   1
#define MOSFET_PIN 32
#define BATTERY_PIN 34

#define SDA_PIN 21
#define SCL_PIN 22

Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);

TinyGPSPlus gps;
HardwareSerial SerialGPS(2);
HardwareSerial SerialAT(1);

TinyGsm modem(SerialAT);
TinyGsmClient client(modem);

enum SystemState {
  IDLE_STATE,
  INIT_STATE,
  ACTIVE_STATE
};

SystemState currentState = IDLE_STATE;

unsigned long lastTransmitTime = 0;
unsigned long activeWindowStart = 0;
unsigned long mosfetOnTime = 0;

const unsigned long transmitInterval = 10000;
const unsigned long activeWindowDuration = 180000;
const unsigned long modemInitDelay = 10000;

float prevAccelX = 0, prevAccelY = 0, prevAccelZ = 0;
bool isFirstAccelReading = true;

const float motionThresholdStart = 2.0;
const float motionThresholdEnd = 1.0;

bool sim800lInitialized = false;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("=== ESP32 Power-Efficient GPS Tracker ===");
  
  pinMode(MOSFET_PIN, OUTPUT);
  digitalWrite(MOSFET_PIN, HIGH);
  Serial.println("MOSFET OFF (idle mode)");

  Wire.begin(SDA_PIN, SCL_PIN);
  
  if (!accel.begin()) {
    Serial.println("ERROR: ADXL345 not detected!");
  } else {
    Serial.println("ADXL345 accelerometer detected");
    accel.setRange(ADXL345_RANGE_16_G);
  }

  SerialGPS.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  Serial.println("GPS initialized");

  SerialAT.begin(9600, SERIAL_8N1, MODEM_RX, MODEM_TX);
  
  pinMode(BATTERY_PIN, INPUT);
  
  Serial.println("System ready - monitoring for motion...");
  Serial.println();
}

void loop() {
  while (SerialGPS.available() > 0) {
    gps.encode(SerialGPS.read());
  }

  bool motionDetected = checkMotion();

  switch (currentState) {
    case IDLE_STATE:
      if (motionDetected) {
        Serial.println("\n*** Motion detected! Enabling SIM800L... ***");
        enableSIM800L();
        currentState = INIT_STATE;
        mosfetOnTime = millis();
      }
      delay(100);
      break;

    case INIT_STATE:
      if (millis() - mosfetOnTime > modemInitDelay) {
        Serial.println("Initializing SIM800L modem...");
        initModem();
        currentState = ACTIVE_STATE;
        activeWindowStart = millis();
        lastTransmitTime = 0;
        Serial.println("Entering ACTIVE state - will transmit for 3 minutes");
      }
      delay(100);
      break;

    case ACTIVE_STATE:
      unsigned long activeTime = millis() - activeWindowStart;
      
      if (motionDetected) {
        activeWindowStart = millis();
      }

      if (millis() - lastTransmitTime > transmitInterval) {
        if (gps.location.isValid()) {
          sendToServer();
          lastTransmitTime = millis();
        } else {
          Serial.println("Waiting for GPS fix...");
        }
      }

      if (millis() - activeWindowStart > activeWindowDuration && !motionDetected) {
        Serial.println("\n*** No motion detected, returning to idle... ***");
        disableSIM800L();
        currentState = IDLE_STATE;
        sim800lInitialized = false;
      }

      if (activeTime % 30000 < 1000) {
        unsigned long remaining = (activeWindowDuration - (millis() - activeWindowStart)) / 1000;
        Serial.print("Active window: ");
        Serial.print(remaining);
        Serial.println("s remaining");
      }
      
      delay(100);
      break;
  }
}

bool checkMotion() {
  sensors_event_t event;
  accel.getEvent(&event);
  
  float accelX = event.acceleration.x;
  float accelY = event.acceleration.y;
  float accelZ = event.acceleration.z;

  if (isFirstAccelReading) {
    prevAccelX = accelX;
    prevAccelY = accelY;
    prevAccelZ = accelZ;
    isFirstAccelReading = false;
    return false;
  }

  float deltaX = abs(accelX - prevAccelX);
  float deltaY = abs(accelY - prevAccelY);
  float deltaZ = abs(accelZ - prevAccelZ);
  
  float totalMotion = deltaX + deltaY + deltaZ;

  prevAccelX = accelX;
  prevAccelY = accelY;
  prevAccelZ = accelZ;

  float threshold = (currentState == IDLE_STATE) ? motionThresholdStart : motionThresholdEnd;
  
  return (totalMotion > threshold);
}

void enableSIM800L() {
  digitalWrite(MOSFET_PIN, LOW);
  Serial.println("MOSFET ON - SIM800L powered");
}

void disableSIM800L() {
  digitalWrite(MOSFET_PIN, HIGH);
  Serial.println("MOSFET OFF - SIM800L unpowered");
}

void initModem() {
  modem.restart();
  
  Serial.print("Connecting to network...");
  if (!modem.waitForNetwork(30000)) {
    Serial.println(" FAIL");
    return;
  }
  Serial.println(" OK");

  Serial.print("Connecting to GPRS (");
  Serial.print(apn);
  Serial.print(")...");
  if (!modem.gprsConnect(apn, gprsUser, gprsPass)) {
    Serial.println(" FAIL");
    return;
  }
  Serial.println(" OK");
  sim800lInitialized = true;
}

void sendToServer() {
  if (!sim800lInitialized) {
    Serial.println("SIM800L not initialized, skipping...");
    return;
  }

  Serial.println("Connecting to server...");
  
  if (!client.connect(server, port)) {
    Serial.println("Connection failed");
    return;
  }

  float batteryVoltage = readBatteryVoltage();

  StaticJsonDocument<256> doc;
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
  
  Serial.print("Data sent! Battery: ");
  Serial.print(batteryVoltage);
  Serial.println("V");
  
  client.stop();
}

float readBatteryVoltage() {
  int adcValue = analogRead(BATTERY_PIN);
  float voltage = (adcValue / 4095.0) * 3.3 * 2.0;
  return voltage;
}
