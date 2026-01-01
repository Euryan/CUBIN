#include <ESP32Servo.h>

Servo servoX;
Servo servoZ;

int pinX = 18;   // pin servo X
int pinZ = 19;   // pin servo Z
int stayPos = 90;

void setup() {
  Serial.begin(115200);
  servoX.attach(pinX);
  servoZ.attach(pinZ);
  servoX.write(stayPos);
  servoZ.write(stayPos);
}

void loop() {
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n'); 
    cmd.trim();

    if (cmd.startsWith("-")) {
      int val = cmd.substring(1).toInt(); 
      if (val >= 1 && val <= 180) {
        servoX.write(val);
        Serial.print("Servo X ke: ");
        Serial.println(val);
        delay(2000);
        servoX.write(stayPos);
        Serial.println("Servo X kembali ke 90");
      }
    } else if (cmd.startsWith("+")) {
      int val = cmd.substring(1).toInt();
      if (val >= 1 && val <= 180) {
        servoZ.write(val);
        Serial.print("Servo Z ke: ");
        Serial.println(val);
        delay(2000);
        servoZ.write(stayPos);
        Serial.println("Servo Z kembali ke 90");
      }
    }
  }
}

