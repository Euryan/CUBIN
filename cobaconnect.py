import os
import cv2
import numpy as np
import serial
import time
import requests
import threading
import keras
from keras.models import load_model
from keras.layers import DepthwiseConv2D

# =========================
# FIX KERAS 3 COMPATIBILITY
# =========================
# Teachable Machine models often include 'groups': 1 in DepthwiseConv2D 
# which causes an error in newer Keras versions.
class FixedDepthwiseConv2D(DepthwiseConv2D):
    def __init__(self, **kwargs):
        if 'groups' in kwargs:
            del kwargs['groups']
        super().__init__(**kwargs)

# =========================
# KONFIGURASI
# =========================
ARDUINO_PORT = 'COM10'
ARDUINO_BAUD = 115200

API_BASE_URL = os.getenv('CUBIN_API_BASE_URL', 'http://localhost:8000')
API_ENDPOINT = f'{API_BASE_URL}/api/v1/trash/detect-hardware'

# Kategori model AI ke nama kategori di backend
CATEGORY_MAP = {
    0: None,
    1: 'Plastik',
    2: 'Kaleng',
    3: 'Kertas',
    4: 'Kaca',
}

# Bobot estimasi per kategori (kg) - bisa disesuaikan
# Ini adalah estimasi default; kalau ada sensor berat bisa diganti
DEFAULT_WEIGHT_PER_CLASS = {
    1: 0.3,   # Plastik
    2: 0.2,   # Kaleng
    3: 0.1,   # Kertas
    4: 0.4,   # Kaca
}

# RFID user yang sedang aktif di depan mesin (opsional)
# Set ke None untuk mode anonim (hardware_system)
ACTIVE_RFID_UID = None  # Contoh: "rfid_user123"

HARDWARE_ID = "CUBIN-UNIT-01"
HARDWARE_LOCATION = "Smart Bin Unit 01 (Lab)"

CONFIDENCE_THRESHOLD = 85.0  # Minimum confidence untuk dikirim
COOLDOWN_SECONDS = 5          # Jeda antar deteksi berulang

# =========================
# INISIALISASI
# =========================
np.set_printoptions(suppress=True)

# Arduino Serial
try:
    arduino = serial.Serial(ARDUINO_PORT, ARDUINO_BAUD)
    time.sleep(2)
    print(f"[OK] Arduino terhubung di {ARDUINO_PORT}")
except Exception as e:
    print(f"[WARNING] Arduino tidak terhubung: {e}")
    arduino = None

# Model AI
try:
    model = load_model(
        r"C:\Project\cubinta\keras_model.h5",
        compile=False,
        custom_objects={'DepthwiseConv2D': FixedDepthwiseConv2D}
    )
    class_names = open(r"C:\Project\cubinta\labels.txt", "r").readlines()
    print("[OK] Model AI berhasil dimuat")
except Exception as e:
    print(f"[ERROR] Gagal memuat model AI: {e}")
    exit(1)

# Camera
camera = cv2.VideoCapture(2)
print("[OK] Kamera diinisialisasi")

# =========================
# FUNGSI KIRIM KE API
# =========================
def send_to_api(class_index: int, confidence: float, weight: float):
    """Kirim data deteksi ke backend API (non-blocking via thread)."""
    def _send():
        try:
            category_name = CATEGORY_MAP.get(class_index, 'Unknown')
            payload = {
                "class_index": class_index,
                "category": category_name,
                "confidence_ai": round(confidence, 2),
                "weight": weight,
                "rfid_uid": ACTIVE_RFID_UID,
                "location": HARDWARE_LOCATION,
                "hardware_id": HARDWARE_ID,
            }
            resp = requests.post(API_ENDPOINT, json=payload, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                print(f"[API OK] {data.get('message', 'Tersimpan')} | Points: {data.get('points_earned', 0)}")
            else:
                print(f"[API ERROR] Status {resp.status_code}: {resp.text[:200]}")
        except requests.exceptions.ConnectionError:
            print(f"[API WARNING] Backend tidak dapat dijangkau. Data tidak tersimpan.")
        except Exception as ex:
            print(f"[API ERROR] {ex}")

    thread = threading.Thread(target=_send, daemon=True)
    thread.start()

# =========================
# LOOP DETEKSI UTAMA
# =========================
last_sent_class = 0

print("\n=== CUBIN AI Vision System AKTIF ===")
print(f"Threshold confidence: {CONFIDENCE_THRESHOLD}%")
print(f"API target: {API_ENDPOINT}")
print("Tekan ESC untuk keluar\n")

while True:
    ret, image = camera.read()

    if not ret:
        continue

    # Resize untuk model
    image_resized = cv2.resize(image, (224, 224), interpolation=cv2.INTER_AREA)

    # Display dengan overlay info
    display_image = image_resized.copy()

    # Prepare & predict
    input_image = np.asarray(image_resized, dtype=np.float32).reshape(1, 224, 224, 3)
    input_image = (input_image / 127.5) - 1
    prediction = model.predict(input_image, verbose=0)

    index = np.argmax(prediction)
    confidence_score = prediction[0][index]
    confidence_percent = confidence_score * 100

    # Tampilkan info di frame
    label_text = f"Class: {index} | Conf: {confidence_percent:.1f}%"
    cv2.putText(display_image, label_text, (5, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
    cv2.imshow("CUBIN AI Vision", display_image)

    print(f"Class: {index} | Confidence: {confidence_percent:.2f}%")

    # ========================
    # FILTER & KIRIM
    # ========================
    if confidence_percent > CONFIDENCE_THRESHOLD and index != 0:
        if index != last_sent_class:
            category_name = CATEGORY_MAP.get(index, 'Unknown')
            weight = DEFAULT_WEIGHT_PER_CLASS.get(index, 0.2)

            # Kirim ke Arduino
            if arduino:
                arduino.write(f"{index}\n".encode())
                print(f"[ARDUINO] Kirim command: {index}")

            # Kirim ke Backend API / Web Admin
            send_to_api(index, confidence_percent, weight)

            print(f"[DETEKSI] {category_name} (Class {index}) | {confidence_percent:.2f}% | {weight} kg")
            last_sent_class = index
            time.sleep(COOLDOWN_SECONDS)
    else:
        last_sent_class = 0

    # ESC untuk keluar
    key = cv2.waitKey(1)
    if key == 27:
        break

print("\n[EXIT] Menutup sistem...")
camera.release()
cv2.destroyAllWindows()
if arduino:
    arduino.close()