# Smart Waste Management - Frontend & Backend Integration

## 📊 Project Overview

Smart Waste Management adalah aplikasi full-stack untuk mengelola waste collection dan reward system dengan integrasi:
- **RFID** untuk user identification
- **AI** untuk waste detection dan classification
- **Real-time** rewards dan leaderboard
- **Admin Dashboard** untuk monitoring dan management

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌────────────────┐
│                 │         │                  │         │                │
│  Frontend React │◄────────┤  Backend FastAPI │◄────────┤  MySQL Database│
│  (Port 3000)    │         │  (Port 8000)     │         │                │
│                 │         │                  │         │                │
└─────────────────┘         └──────────────────┘         └────────────────┘
       │                            ▲
       │                            │
       └────────────────────────────┘
          API Calls (HTTP/JSON)

┌─────────────────┐
│                 │
│  Admin Dashboard│
│  (Port 3101)    │
│                 │
└────────┬────────┘
         │
         └────────►[Shared Backend API]
```

## 📁 File Structure

### Frontend Integration Files

```
web/src/
├── services/
│   ├── api.js                 # API Client - HTTP wrapper untuk semua requests
│   ├── integration.js         # Integration Manager - Session & user management
│   └── stateSync.js           # State Sync - Transform backend data ke frontend state
│
├── hooks/
│   └── useApi.js              # React Hooks - useAuth(), useUser(), useTrash(), useRewards()
│
└── main.js                    # Main app (perlu diupdate untuk menggunakan API)

web/
├── .env.local                 # Frontend environment config
├── vite.config.ts             # Build config dengan proxy ke backend
└── INTEGRATION_GUIDE.md       # Detailed integration documentation

web/admin/
├── src/
│   └── services/
│       └── adminApi.js        # Admin-specific API service
└── vite.config.js             # Admin build config dengan proxy
```

### Backend Structure (Existing)

```
web/Backend/
├── app/
│   ├── main.py               # FastAPI app dengan CORS configured
│   ├── routers/
│   │   ├── auth.py          # Authentication endpoints
│   │   ├── users.py         # User management endpoints
│   │   ├── trash.py         # Waste detection endpoints
│   │   ├── reward.py        # Reward management endpoints
│   │   ├── admin.py         # Admin endpoints
│   │   └── dashboard.py     # Dashboard endpoints
│   │
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response models
│   └── services/            # Business logic
│
├── .env                     # Backend environment config
└── requirements.txt         # Python dependencies
```

## 🚀 Quick Start

### 1. Setup Backend
```bash
cd web/Backend
pip install -r requirements.txt
# Configure .env dengan MySQL credentials
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Setup Frontend
```bash
cd web
npm install
# .env.local sudah ada
npm run dev  # runs on http://localhost:3000
```

### 3. Setup Admin (Optional)
```bash
cd web/admin
npm install
npm run dev  # runs on http://localhost:3101
```

### Atau Gunakan Startup Script
**Windows:**
```bash
cd c:\Project\cubinta
start-dev.bat
```

**PowerShell:**
```powershell
cd C:\Project\cubinta
powershell -ExecutionPolicy Bypass -File start-dev.ps1
```

## 🔌 Integration Points

### 1. API Client (`src/services/api.js`)
```javascript
import { apiClient } from './services/api.js';

// Login
const user = await apiClient.loginWithRFID('rfid_123');

// Submit waste
const trash = await apiClient.createTrashDetection('rfid_123', 'Plastik', 2.5);

// Get leaderboard
const leaderboard = await apiClient.getLeaderboard(20);
```

### 2. Integration Manager (`src/services/integration.js`)
```javascript
import { integrationManager } from './services/integration.js';

// Initialize session
await integrationManager.initializeUserSession('rfid_123');

// Submit waste with state update
await integrationManager.submitWasteDeposit('rfid_123', 'Plastik', 2.5);

// Check login status
if (integrationManager.isLoggedIn()) {
  // User is logged in
}
```

### 3. State Sync (`src/services/stateSync.js`)
```javascript
import { syncUserDataFromBackend, submitWasteAndUpdateState } from './services/stateSync.js';

// Sync all user data at startup
const syncedData = await syncUserDataFromBackend('rfid_123');

// Returns: { profile, stats, history, rewards, user }
state = { ...state, ...syncedData };

// Submit waste and get formatted transaction
const transaction = await submitWasteAndUpdateState('rfid_123', 'Plastik', 2.5);
```

### 4. React Hooks (`src/hooks/useApi.js`)
```javascript
import { useUser, useTrash, useRewards } from './hooks/useApi.js';

// In React component
const { getUserByRFID, loading, error } = useUser();
const { createDetection, getSummary } = useTrash();
const { getAllRewards, redeemReward } = useRewards();

// Usage
const user = await getUserByRFID('rfid_123');
const rewards = await getAllRewards();
```

## 📡 API Endpoints Summary

### Authentication
- `POST /api/v1/auth/login` - Login dengan RFID

### Users
- `GET /api/v1/users` - Get semua users
- `GET /api/v1/users/rfid/{rfid_uid}` - Get user by RFID
- `GET /api/v1/users/leaderboard` - Get leaderboard
- `GET /api/v1/users/{user_id}/history` - Get user history

### Waste Detection
- `POST /api/v1/trash/detect` - Submit waste detection
- `GET /api/v1/trash/history` - Get trash history
- `GET /api/v1/trash/summary` - Get statistics
- `GET /api/v1/trash/latest` - Get latest detection

### Rewards
- `GET /api/v1/rewards` - Get semua rewards
- `POST /api/v1/rewards/redeem` - Redeem reward
- `GET /api/v1/rewards/history/{rfid_uid}` - Get redemption history

**Full Documentation**: http://localhost:8000/docs (ketika backend running)

## 🔄 Data Flow Example

### User Submits Waste

```
1. User fills form dengan:
   - Waste category (Plastik, Kaleng, etc.)
   - Weight (kg)
   - Location

2. Frontend memanggil:
   const transaction = await submitWasteAndUpdateState(
     rfidUid,
     'Plastik',
     2.5,
     'Location'
   )

3. stateSync.js mentransform request:
   - Panggil integrationManager.submitWasteDeposit()

4. integrationManager memanggil:
   - apiClient.createTrashDetection()

5. apiClient melakukan:
   - HTTP POST ke /api/v1/trash/detect
   - Send JSON: { rfid_uid, category, weight, confidence_ai }

6. Backend memproses:
   - Validasi user dan category
   - Hitung points dan earning
   - Simpan ke database
   - Return response dengan updated stats

7. Frontend menerima response:
   - Transform ke transaction format
   - Update local state
   - Show success ticket
   - Re-render UI
```

## 🔐 Error Handling

Semua API calls di-wrap dengan error handling. Contoh:

```javascript
try {
  const user = await apiClient.getUserByRFID('rfid_123');
} catch (error) {
  console.error('API Error:', error.message);
  // Error message dari backend akan di-display
}
```

Error messages dari Backend (field `detail`) akan otomatis di-throw dan bisa di-handle.

## 🧪 Testing

### 1. Test Backend API di Browser
Buka: `http://localhost:8000/docs`
Interactive API documentation dengan Swagger UI

### 2. Test di Console
```javascript
// Dari browser console di Frontend
import { apiClient } from './src/services/api.js';
apiClient.loginWithRFID('test_rfid')
  .then(user => console.log('Success:', user))
  .catch(err => console.error('Error:', err.message))
```

### 3. Test dengan curl
```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"rfid_uid": "test_rfid"}'

# Get leaderboard
curl http://localhost:8000/api/v1/users/leaderboard
```

## 🎯 Next Steps untuk Update Main.js

Update `web/src/main.js` untuk menggunakan API:

1. Import integration services:
```javascript
import { syncUserDataFromBackend, submitWasteAndUpdateState } from './services/stateSync.js';
import { integrationManager } from './services/integration.js';
```

2. Pada DOMContentLoaded, sync data dari backend:
```javascript
const syncedData = await syncUserDataFromBackend(rfidUid);
state = { ...state, ...syncedData };
```

3. Pada form submission, gunakan API:
```javascript
const transaction = await submitWasteAndUpdateState(rfidUid, category, weight, location);
```

4. Lakukan hal serupa untuk reward redemption, dll.

Lihat `INTEGRATION_GUIDE.md` untuk contoh lengkap.

## 📚 Documentation Files

- **[INTEGRATION_GUIDE.md](./web/INTEGRATION_GUIDE.md)** - Detailed integration guide dengan contoh kode
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Installation dan setup instructions
- **[FastAPI Docs](http://localhost:8000/docs)** - Interactive API documentation

## 🐛 Troubleshooting

### CORS Error
Pastikan `ALLOWED_ORIGINS` di Backend `.env` includes frontend URL

### Port Conflict
```bash
# Find process using port
netstat -ano | findstr :8000

# Kill process
taskkill /PID <PID> /F
```

### Database Connection Error
1. Pastikan MySQL running
2. Verify credentials di Backend `.env`
3. Check database exists: `SHOW DATABASES;`

### Frontend tidak connect ke Backend
1. Verify `VITE_API_BASE_URL` di Frontend `.env.local`
2. Check Backend is running: `curl http://localhost:8000/docs`
3. Check browser console untuk network errors

## 📞 Support

Lihat documentation files di atas atau check error messages di console.

## 📝 Notes

- CORS sudah di-configure di Backend untuk allow cross-origin requests
- Frontend menggunakan Vite proxy sebagai fallback untuk development
- Session disimpan di localStorage untuk persistence
- Semua API calls di-timeout dalam 30 detik (configurable)

---

**Integration Status**: ✅ Complete
**Last Updated**: May 2024
**Version**: 1.0.0
