from keras.models import load_model
import cv2
import numpy as np
import serial

# === 1. Load model & labels ===
model = load_model("C:\Project\cubinta\keras_model.h5", compile=False)
class_names = open("C:\Project\cubinta\labels.txt", "r").readlines()


# === 2. Setup kamera ===
camera = cv2.VideoCapture(2)

# === 3. Setup serial ke ESP32 ===
# Ganti 'COM5' dengan port ESP32 kamu (cek di Arduino IDE / Device Manager)
ser = serial.Serial('COM7', 115200, timeout=1)

np.set_printoptions(suppress=True)

while True:
    # Ambil gambar dari webcam
    ret, image = camera.read()
    if not ret:
        continue

    # Resize ke ukuran input model
    image_resized = cv2.resize(image, (224, 224), interpolation=cv2.INTER_AREA)

    # Tampilkan di window
    cv2.imshow("Webcam Image", image_resized)

    # Preprocess untuk model
    image_array = np.asarray(image_resized, dtype=np.float32).reshape(1, 224, 224, 3)
    image_array = (image_array / 127.5) - 1

    # Prediksi
    prediction = model.predict(image_array)
    index = np.argmax(prediction)
    class_name = class_names[index].strip()
    confidence_score = prediction[0][index]

    # Print ke console
    print("Class:", class_name, "Confidence:", confidence_score)

    # === 4. Kirim hasil ke ESP32 ===
    # index mulai dari 0 → kalau mau hasil 1–4, tambahkan +1
    command = str(index + 1)
    ser.write((command + "\n").encode())

    # Keyboard ESC untuk keluar
    keyboard_input = cv2.waitKey(1)
    if keyboard_input == 27:
        break

camera.release()
cv2.destroyAllWindows()
ser.close()