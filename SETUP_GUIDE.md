# Setup Panduan - Integrasi Frontend & Backend

## 📋 Prerequisites

- **Node.js** >= 16 (untuk Frontend)
- **Python** >= 3.8 (untuk Backend)
- **pip** (Python package manager)
- **npm** atau **yarn** (Node package manager)
- **MySQL** 5.7+ atau **MariaDB** (untuk database)

## 🔧 Instalasi Backend

### 1. Setup Database
```bash
# Buat database MySQL
mysql -u root -p
CREATE DATABASE smartwaste;
EXIT;
```

### 2. Install Backend Dependencies
```bash
cd web/Backend
pip install -r requirements.txt
```

### 3. Konfigurasi Environment
Edit file `web/Backend/.env`:
```
APP_NAME=Smart Waste Management API
MYSQL_USER=root
MYSQL_PASSWORD=password          # Sesuaikan dengan password MySQL Anda
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DB=smartwaste
ALLOWED_ORIGINS=["http://localhost:3000", "http://localhost:3101"]
LOG_LEVEL=INFO
```

### 4. Initialize Database (Migration)
```bash
# Dari directory web/Backend
alembic upgrade head
```

### 5. Start Backend Server
```bash
python -m uvicorn app.main:app --reload --port 8000
```

Backend akan berjalan di `http://localhost:8000`
API Documentation tersedia di `http://localhost:8000/docs`

## 🎨 Instalasi Frontend

### 1. Install Frontend Dependencies
```bash
cd web
npm install
```

### 2. Konfigurasi Environment
Edit atau buat file `web/.env.local`:
```
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000
```

### 3. Start Frontend Server
```bash
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`

## 🔐 Instalasi Admin Dashboard

### 1. Install Admin Dependencies
```bash
cd web/admin
npm install
```

### 2. Konfigurasi Environment (jika diperlukan)
Admin sudah dikonfigurasi dengan proxy ke `http://localhost:8000`

### 3. Start Admin Server
```bash
npm run dev
```

Admin dashboard akan berjalan di `http://localhost:3101`

## 🚀 Quick Start - Start All Services

### Opsi 1: Menggunakan Script (Windows)
```bash
cd c:\Project\cubinta
start-dev.bat
```

### Opsi 2: Menggunakan PowerShell
```powershell
cd C:\Project\cubinta
powershell -ExecutionPolicy Bypass -File start-dev.ps1
```

### Opsi 3: Manual (Buka 3 Terminal Terpisah)

**Terminal 1 - Backend:**
```bash
cd web/Backend
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd web
npm run dev
```

**Terminal 3 - Admin:**
```bash
cd web/admin
npm run dev
```

## 📡 Verifikasi Koneksi

### 1. Check Backend API
```bash
curl http://localhost:8000/docs
```

### 2. Check Frontend
Buka di browser: `http://localhost:3000`

### 3. Check Admin
Buka di browser: `http://localhost:3101`

## 🧪 Test API Endpoints

### 1. Test Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"rfid_uid": "test_rfid_123"}'
```

### 2. Menggunakan Postman
1. Import collection dari Backend API Docs (`http://localhost:8000/docs`)
2. Set environment variable `BASE_URL=http://localhost:8000`
3. Jalankan requests

## 🔍 Troubleshooting

### Port Sudah Terpakai
```bash
# Windows - Find process using port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac - Find process using port 8000
lsof -i :8000
kill -9 <PID>
```

### Database Connection Error
```
SQLALCHEMY_ERROR: (pymysql.err.OperationalError) (2003, "Can't connect to MySQL server")
```

**Solusi:**
1. Pastikan MySQL sudah running: `mysql -u root -p` 
2. Verifikasi credentials di `.env` file
3. Check database sudah dibuat: `SHOW DATABASES;`

### CORS Error
Jika frontend tidak bisa connect ke backend:
1. Verifikasi `ALLOWED_ORIGINS` di Backend `.env`
2. Verifikasi `VITE_API_BASE_URL` di Frontend `.env.local`
3. Check proxy configuration di `vite.config.ts`

### Frontend tidak load
```bash
# Clear node_modules dan reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 📚 File Struktur Integrasi

```
web/
├── src/
│   ├── services/
│   │   ├── api.js              # API Client
│   │   ├── integration.js      # Integration Manager
│   │   └── stateSync.js        # State Transformation
│   ├── hooks/
│   │   └── useApi.js           # React Hooks
│   └── main.js                 # Main app (perlu update)
│
├── admin/
│   └── src/
│       ├── modules/            # Admin modules
│       └── script.js           # Main admin script
│
├── Backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app
│   │   ├── routers/           # API endpoints
│   │   ├── models/            # Database models
│   │   ├── schemas/           # Request/Response schemas
│   │   └── services/          # Business logic
│   ├── .env                   # Environment config
│   └── requirements.txt       # Python dependencies
│
├── .env.local                 # Frontend env config
├── vite.config.ts            # Frontend build config
├── package.json              # Frontend dependencies
└── INTEGRATION_GUIDE.md       # Integration documentation
```

## 🔐 Production Deployment

### Backend Deployment (Example: Heroku)
```bash
cd web/Backend
heroku create your-app-name
heroku config:set MYSQL_HOST=your-db-host
git push heroku main
```

### Frontend Deployment (Example: Vercel)
```bash
cd web
vercel
```

### Admin Deployment (Example: Netlify)
```bash
cd web/admin
npm run build
netlify deploy --prod --dir=dist
```

## 📖 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Vite Documentation](https://vitejs.dev/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [React Documentation](https://react.dev/)

## 💡 Tips

1. **Development**: Gunakan `--reload` flag di uvicorn untuk auto-reload saat ada changes
2. **Debugging**: Gunakan Chrome DevTools untuk frontend, dan `print()` atau debugger untuk backend
3. **API Testing**: Gunakan Postman atau Insomnia untuk test API endpoints
4. **Database**: Gunakan MySQL Workbench atau phpMyAdmin untuk manage database

## 📞 Support

Jika ada masalah:
1. Check documentation di `INTEGRATION_GUIDE.md`
2. Check error messages di console/logs
3. Verifikasi konfigurasi `.env` files
4. Pastikan semua dependencies sudah terinstall

---

**Last Updated**: May 2024
**Version**: 1.0.0
