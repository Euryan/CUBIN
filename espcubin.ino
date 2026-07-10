#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

// =====================================================
// WIFI DAN SERVER
// =====================================================

const char* WIFI_SSID = "Loq";
const char* WIFI_PASSWORD = "12345678";

const char* API_BASE_URL = "http://192.168.137.1:3010";

const String CHECK_USER_ENDPOINT =
  String(API_BASE_URL) + "/api/rfid/check-user";

const String ACTIVE_SESSION_ENDPOINT =
  String(API_BASE_URL) +
  "/api/session/active?hardware_id=CUBIN-UNIT-01";

const String CLOSE_SESSION_ENDPOINT =
  String(API_BASE_URL) + "/api/session/close";

// =====================================================
// RFID
// =====================================================

#define RFID_SS_PIN  D4
#define RFID_RST_PIN D3

MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);

// =====================================================
// LCD
// =====================================================

LiquidCrystal_I2C lcd(0x27, 20, 4);

// =====================================================
// SESSION
// =====================================================

String currentSessionId = "";
String currentUserName = "";

long currentPoints = 0;
long currentBalance = 0;

bool userSessionActive = false;

unsigned long sessionExpiresAtLocal = 0;
unsigned long lastSessionPoll = 0;

const unsigned long SESSION_POLL_INTERVAL = 2000;
const unsigned long RFID_COOLDOWN = 3000;

String lastUID = "";
unsigned long lastScanAt = 0;

// =====================================================
// SETUP
// =====================================================

void setup() {
  Serial.begin(115200);
  delay(500);

  Wire.begin(D2, D1);

  lcd.init();
  lcd.backlight();

  showBootScreen();

  SPI.begin();

  pinMode(RFID_SS_PIN, OUTPUT);
  digitalWrite(RFID_SS_PIN, HIGH);

  rfid.PCD_Init();
  rfid.PCD_AntennaOn();

  delay(300);

  checkRFID();
  connectWiFi();

  showStandbyScreen();
}

// =====================================================
// LOOP
// =====================================================

void loop() {
  maintainWiFi();
  handleRFID();

  if (userSessionActive) {
    pollActiveSession();
    checkLocalSessionTimeout();
  }

  yield();
}

// =====================================================
// RFID
// =====================================================

void checkRFID() {
  byte version =
    rfid.PCD_ReadRegister(MFRC522::VersionReg);

  Serial.print("RFID Firmware: 0x");
  Serial.println(version, HEX);

  if (version == 0x00 || version == 0xFF) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("RFID ERROR");
    lcd.setCursor(0, 1);
    lcd.print("Cek modul");

    while (true) {
      delay(1000);
      yield();
    }
  }

  Serial.println("RFID terdeteksi");
}

void handleRFID() {
  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }

  if (!rfid.PICC_ReadCardSerial()) {
    return;
  }

  String uid = readUID();

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  if (
    uid == lastUID &&
    millis() - lastScanAt < RFID_COOLDOWN
  ) {
    return;
  }

  lastUID = uid;
  lastScanAt = millis();

  Serial.print("UID: ");
  Serial.println(uid);

  checkUser(uid);
}

String readUID() {
  String uid = "";

  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      uid += "0";
    }

    uid += String(rfid.uid.uidByte[i], HEX);
  }

  uid.toUpperCase();

  return uid;
}

// =====================================================
// WIFI
// =====================================================

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Menghubungkan WiFi");

  Serial.print("Menghubungkan WiFi");

  unsigned long startedAt = millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - startedAt < 15000
  ) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi terhubung");
    Serial.println(WiFi.localIP());

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Terhubung");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());

    delay(1200);
  } else {
    showMessage(
      "WiFi Gagal",
      "Cek hotspot",
      "",
      2000
    );
  }
}

void maintainWiFi() {
  static unsigned long lastReconnect = 0;

  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  if (millis() - lastReconnect < 10000) {
    return;
  }

  lastReconnect = millis();

  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// =====================================================
// CHECK USER
// =====================================================

void checkUser(const String& uid) {
  if (WiFi.status() != WL_CONNECTED) {
    showMessage(
      "WiFi Terputus",
      "Tidak bisa cek",
      "kartu",
      2500
    );

    showStandbyScreen();
    return;
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Mengecek User...");
  lcd.setCursor(0, 1);
  lcd.print(uid);

  WiFiClient client;
  HTTPClient http;

  if (!http.begin(client, CHECK_USER_ENDPOINT)) {
    showMessage(
      "HTTP Error",
      "Gagal koneksi",
      "",
      2500
    );

    showStandbyScreen();
    return;
  }

  http.setTimeout(7000);
  http.addHeader("Content-Type", "application/json");

  JsonDocument requestDoc;

  requestDoc["uid"] = uid;
  requestDoc["device"] = "CUBIN-RFID-ESP8266-01";

  String requestBody;
  serializeJson(requestDoc, requestBody);

  int statusCode = http.POST(requestBody);
  String response = http.getString();

  http.end();

  Serial.print("HTTP status: ");
  Serial.println(statusCode);

  Serial.println(response);

  if (statusCode < 200 || statusCode >= 300) {
    showMessage(
      "Kartu Belum",
      "Terdaftar",
      "Hubungi admin",
      3000
    );

    showStandbyScreen();
    return;
  }

  JsonDocument responseDoc;

  DeserializationError error =
    deserializeJson(responseDoc, response);

  if (error) {
    showMessage(
      "JSON Error",
      error.c_str(),
      "",
      2500
    );

    showStandbyScreen();
    return;
  }

  bool registered =
    responseDoc["registered"] | false;

  if (!registered) {
    showMessage(
      "Kartu Belum",
      "Terdaftar",
      "Hubungi admin",
      3000
    );

    showStandbyScreen();
    return;
  }

  currentSessionId =
    responseDoc["session"]["sessionId"]
      .as<String>();

  currentUserName =
    responseDoc["user"]["name"]
      .as<String>();

  currentPoints =
    responseDoc["user"]["points"] | 0;

  currentBalance =
    responseDoc["user"]["balance"] | 0;

  long expiresInSeconds =
    responseDoc["session"]["expiresInSeconds"] | 60;

  sessionExpiresAtLocal =
    millis() + (expiresInSeconds * 1000UL);

  userSessionActive = true;
  lastSessionPoll = 0;

  showUserWaitingScreen();
}

// =====================================================
// POLLING SESSION
// =====================================================

void pollActiveSession() {
  if (
    millis() - lastSessionPoll <
    SESSION_POLL_INTERVAL
  ) {
    return;
  }

  lastSessionPoll = millis();

  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  WiFiClient client;
  HTTPClient http;

  if (!http.begin(client, ACTIVE_SESSION_ENDPOINT)) {
    return;
  }

  http.setTimeout(4000);

  int statusCode = http.GET();
  String response = http.getString();

  http.end();

  if (statusCode == 404) {
    endLocalSession(
      "Sesi Berakhir",
      "Scan ulang kartu"
    );
    return;
  }

  if (statusCode < 200 || statusCode >= 300) {
    return;
  }

  JsonDocument doc;

  DeserializationError error =
    deserializeJson(doc, response);

  if (error) {
    return;
  }

  bool active = doc["active"] | false;

  if (!active) {
    endLocalSession(
      "Sesi Berakhir",
      "Scan ulang kartu"
    );
    return;
  }

  String status =
    doc["session"]["status"] | "waiting_trash";

  long newPoints =
    doc["user"]["points"] | currentPoints;

  long newBalance =
    doc["user"]["balance"] | currentBalance;

  bool pointsChanged =
    newPoints != currentPoints ||
    newBalance != currentBalance;

  currentPoints = newPoints;
  currentBalance = newBalance;

  if (status == "completed" || pointsChanged) {
    showTransactionSuccess();

    delay(4000);

    closeSession();
    return;
  }

  showUserWaitingScreen();
}

void checkLocalSessionTimeout() {
  if (!userSessionActive) {
    return;
  }

  if (
    (long)(millis() - sessionExpiresAtLocal) >= 0
  ) {
    endLocalSession(
      "Waktu Habis",
      "Scan ulang kartu"
    );
  }
}

void closeSession() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;

    if (http.begin(client, CLOSE_SESSION_ENDPOINT)) {
      http.addHeader(
        "Content-Type",
        "application/json"
      );

      String body =
        "{\"hardware_id\":\"CUBIN-UNIT-01\"}";

      http.POST(body);
      http.end();
    }
  }

  clearSession();
  showStandbyScreen();
}

void endLocalSession(
  const String& line1,
  const String& line2
) {
  showMessage(
    line1,
    line2,
    "",
    2500
  );

  clearSession();
  showStandbyScreen();
}

void clearSession() {
  currentSessionId = "";
  currentUserName = "";

  currentPoints = 0;
  currentBalance = 0;

  userSessionActive = false;
  sessionExpiresAtLocal = 0;
}

// =====================================================
// LCD
// =====================================================

void showBootScreen() {
  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("CUBIN SMART WASTE");

  lcd.setCursor(0, 1);
  lcd.print("RFID + AI Session");

  lcd.setCursor(0, 2);
  lcd.print("Memulai...");
}

void showStandbyScreen() {
  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("CUBIN Siap");

  lcd.setCursor(0, 1);
  lcd.print("Tempel kartu RFID");

  lcd.setCursor(0, 2);

  if (WiFi.status() == WL_CONNECTED) {
    lcd.print("WiFi: Terhubung");
  } else {
    lcd.print("WiFi: Terputus");
  }

  lcd.setCursor(0, 3);
  lcd.print("Menunggu pengguna");
}

void showUserWaitingScreen() {
  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("Halo,");
  printLimited(currentUserName, 14);

  lcd.setCursor(0, 1);
  lcd.print("Poin: ");
  lcd.print(currentPoints);

  lcd.setCursor(0, 2);
  lcd.print("Masukkan sampah");

  lcd.setCursor(0, 3);
  lcd.print("AI menunggu...");
}

void showTransactionSuccess() {
  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("Setoran Berhasil!");

  lcd.setCursor(0, 1);
  lcd.print(currentUserName.substring(0, 20));

  lcd.setCursor(0, 2);
  lcd.print("Poin Baru: ");
  lcd.print(currentPoints);

  lcd.setCursor(0, 3);
  lcd.print("Saldo: Rp");
  lcd.print(currentBalance);
}

void showMessage(
  const String& line1,
  const String& line2,
  const String& line3,
  unsigned long duration
) {
  lcd.clear();

  lcd.setCursor(0, 0);
  printLimited(line1, 20);

  lcd.setCursor(0, 1);
  printLimited(line2, 20);

  lcd.setCursor(0, 2);
  printLimited(line3, 20);

  delay(duration);
}

void printLimited(
  const String& text,
  byte maxLength
) {
  if (text.length() <= maxLength) {
    lcd.print(text);
  } else {
    lcd.print(text.substring(0, maxLength));
  }
}