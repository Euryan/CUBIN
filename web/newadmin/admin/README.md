<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Frontend Admin

Folder ini adalah dashboard admin baru untuk Bank Sampah (frontend utama), terhubung ke backend FastAPI pada `web/Backend`.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies dengan `npm install`
2. Jalankan development server dengan `npm run dev`
3. Pastikan backend aktif di `http://localhost:8000`

Admin frontend default berjalan di `http://localhost:3101`.

## Current Scope

- dashboard KPI bank sampah
- CRUD jenis sampah dan harga per kg
- riwayat pembuangan
- data nasabah (RFID, poin, saldo reward, setoran)
- pengaturan identitas admin

## Important Note

Autentikasi admin sekarang memakai endpoint backend `POST /api/v1/admin/auth/login`.
Kredensial default mengikuti konfigurasi backend (`ADMIN_EMAIL` dan `ADMIN_PASSWORD`).
