# Smart Waste Management API

Backend FastAPI untuk Smart Waste Management berbasis AI dan IoT dengan fitur RFID user, point reward, dan history sampah.

## Fitur utama

- Login pengguna menggunakan RFID UID
- Sistem user dengan poin dan saldo reward
- Log deteksi sampah berdasarkan kategori AI
- Sistem reward dan redeem
- Admin CRUD kategori, harga, reward
- Dashboard summary dan statistik
- Endpoint AI integration untuk hasil deteksi otomatis
- CORS support dan Swagger dokumentasi

## Struktur proyek

```
app/
  main.py
  config.py
  database.py
  models/
  schemas/
  routers/
  services/
  utils/
  middleware/
  ai/
.env
requirements.txt
README.md
```

## Menjalankan aplikasi

1. Buat virtual environment dan instal dependency

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2. Jalankan server

```
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3. Buka dokumentasi Swagger di `http://localhost:8000/docs`
