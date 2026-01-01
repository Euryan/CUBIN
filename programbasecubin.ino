#include <ESP32Servo.h>

Servo servoX;
Servo servoZ;

int pinX = 18;   // pin servo X
int pinZ = 19;   // pin servo Z
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
}

void loop() {
  if (Serial.available() > 0 && !running) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    command = cmd.toInt();
    if (command >= 1 && command <= 4) {
      startTime = millis();
      running = true;

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

    // Setelah 1 detik, gerakkan servo X
    if (elapsed >= 1000 && elapsed < 3000) {
      if (command == 1 || command == 2) {
        servoX.write(1);
        Serial.println("Servo X ke 1");
      } else if (command == 3 || command == 4) {
        servoX.write(180);
        Serial.println("Servo X ke 180");
      }
    }

    // Setelah 3 detik, servo X kembali ke posisi idle
    if (elapsed >= 3000 && elapsed < 4000) {
      servoX.write(stayPos);
      Serial.println("Servo X kembali ke 90");
    }

    // Setelah 4 detik, servo Z kembali ke posisi idle
    if (elapsed >= 4000) {
      servoZ.write(stayPos);
      Serial.println("Servo Z kembali ke 90");
      running = false; // reset
    }
  }
}
