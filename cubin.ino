#include <Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

Servo servoX;
Servo servoZ;
LiquidCrystal_I2C lcd(0x27, 20, 4); // alamat I2C biasanya 0x27 atau 0x3F

int pinX = 7;   // pin servo X
int pinZ = 6;   // pin servo Z
int stayPos = 90;

unsigned long startTime = 0;
bool running = false;
int command = 0;

void setup() {
  Serial.begin(115200);
  servoX.attach(pinX);
  servoZ.attach(pinZ);
  servoX.write(stayPos);
  servoZ.write(stayPos);

  lcd.init();       // inisialisasi LCD
  lcd.backlight();  // nyalakan lampu LCD
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("Sistem Siap...");
}

void loop() {
  if (Serial.available() > 0 && !running) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    command = cmd.toInt();
    if (command >= 1 && command <= 4) {
      startTime = millis();
      running = true;

      // tampilkan pesan di LCD
      lcd.clear();
      lcd.setCursor(0,0);
      lcd.print("==================");
      lcd.setCursor(0,1);
      lcd.print("SAMPAH TERDETEKSI");
      lcd.setCursor(0,2);
      lcd.print("KATEGORI ");
      lcd.print(command);
      lcd.setCursor(0,3);
      lcd.print("==================");

      if (command == 1 || command == 3) {
        servoZ.write(145);
        Serial.println("Servo Z ke 145");
      } else if (command == 2 || command == 4) {
        servoZ.write(45);
        Serial.println("Servo Z ke 45");
      }
    }
  }

  if (running) {
    unsigned long elapsed = millis() - startTime;

    if (elapsed >= 1000 && elapsed < 3000) {
      if (command == 1 || command == 2) {
        servoX.write(35);
        Serial.println("Servo X ke 35");
      } else if (command == 3 || command == 4) {
        servoX.write(155);
        Serial.println("Servo X ke 155");
      }
    }

    if (elapsed >= 3000 && elapsed < 4000) {
      servoX.write(stayPos);
      Serial.println("Servo X kembali ke 90");
    }

    if (elapsed >= 4000) {
      servoZ.write(stayPos);
      Serial.println("Servo Z kembali ke 90");
      running = false;
    }
  }
}
