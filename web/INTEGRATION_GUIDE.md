# Frontend-Backend Integration Guide

## Struktur Integrasi

Integrasi Frontend dan Backend terdiri dari beberapa komponen utama:

### 1. API Client (`src/services/api.js`)
- Menangani semua HTTP requests ke Backend
- Wrapper untuk fetch dengan error handling
- Menyediakan methods untuk setiap endpoint Backend

### 2. Custom Hooks (`src/hooks/useApi.js`)
- React hooks untuk API calls
- Menangani loading, error, dan data states
- Hooks terpisah untuk setiap domain: `useAuth()`, `useUser()`, `useTrash()`, `useRewards()`

### 3. Integration Manager (`src/services/integration.js`)
- Layer abstraksi antara Frontend dan API Client
- Session management dan user state
- LocalStorage persistence

### 4. State Sync (`src/services/stateSync.js`)
- Transform data dari Backend format ke Frontend state format
- Utilities untuk sync data
- Helper functions untuk submit actions

### 5. Environment Configuration (`.env.local`)
```
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000
```

## Backend Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login dengan RFID UID
  - Request: `{ rfid_uid: string }`
  - Response: User object

### Users
- `GET /api/v1/users` - Get semua users
- `GET /api/v1/users/rfid/{rfid_uid}` - Get user by RFID
- `GET /api/v1/users/leaderboard` - Get leaderboard
- `GET /api/v1/users/{user_id}/history` - Get user history

### Trash Detection
- `POST /api/v1/trash/detect` - Submit waste deposit
  - Request: `{ rfid_uid, category, weight, confidence_ai }`
  - Response: Trash detection object
- `GET /api/v1/trash/history` - Get semua trash history
- `GET /api/v1/trash/summary` - Get statistics
- `GET /api/v1/trash/latest` - Get latest detection

### Rewards
- `GET /api/v1/rewards` - Get semua rewards
- `POST /api/v1/rewards/redeem` - Redeem reward
  - Request: `{ rfid_uid, reward_id, quantity }`
  - Response: Redemption object
- `GET /api/v1/rewards/history/{rfid_uid}` - Get redemption history

## Cara Menggunakan

### 1. Direct API Client Usage (Vanilla JavaScript)
```javascript
import { apiClient } from './services/api.js';

// Login user
const user = await apiClient.loginWithRFID('rfid_123');

// Submit waste
const trash = await apiClient.createTrashDetection(
  'rfid_123',
  'Plastik',
  2.5,
  0.95
);

// Get leaderboard
const leaderboard = await apiClient.getLeaderboard(20);
```

### 2. Using Integration Manager
```javascript
import { integrationManager } from './services/integration.js';

// Initialize session
const user = await integrationManager.initializeUserSession('rfid_123');

// Fetch user profile
const profile = await integrationManager.fetchUserProfile('rfid_123');

// Submit waste deposit
const deposit = await integrationManager.submitWasteDeposit(
  'rfid_123',
  'Plastik',
  2.5,
  'Location'
);
```

### 3. Using State Sync (Recommended for State Management)
```javascript
import { syncUserDataFromBackend, submitWasteAndUpdateState } from './services/stateSync.js';

// Sync all user data at startup
const syncedData = await syncUserDataFromBackend('rfid_123');
// Returns: { profile, stats, history, rewards, user }

// Update state when user submits waste
const transaction = await submitWasteAndUpdateState('rfid_123', 'Plastik', 2.5);

// Redeem reward
const redemption = await redeemRewardAndUpdateState('rfid_123', reward_id, quantity);
```

## Integration dengan Main.js (Contoh Update)

```javascript
import './index.css';
import { syncUserDataFromBackend, submitWasteAndUpdateState, redeemRewardAndUpdateState } from './services/stateSync.js';
import { integrationManager } from './services/integration.js';

// State akan di-hydrate dari Backend
let state = {
  profile: {},
  stats: {},
  history: [],
  rewards: [],
  activeTab: 'home',
  // ... etc
};

// Pada startup, restore session dan sync data
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Coba restore session dari localStorage
    const stored = integrationManager.restoreSessionFromStorage();
    
    if (stored) {
      // Sync data dari backend
      const syncedData = await syncUserDataFromBackend(stored.rfid_uid);
      state = { ...state, ...syncedData };
    }
    
    initEventListeners();
    renderAll();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Show login screen
  }
});

// Update deposit form submission
const formDeposit = document.getElementById('deposit-form');
if (formDeposit) {
  formDeposit.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const category = state.depositTypeSelected;
    const weight = parseFloat(document.getElementById('deposit-weight-input').value);
    const location = document.getElementById('deposit-location-input').value;
    
    try {
      // Submit ke Backend
      const transaction = await submitWasteAndUpdateState(
        state.profile.rfidUid,
        category,
        weight,
        location
      );
      
      // Update state
      state.history.unshift(transaction);
      state.stats.totalPoints += transaction.points;
      state.stats.totalBalance += transaction.earnedAmount;
      state.stats.totalWeight += transaction.weight;
      
      // Show success
      closeDepositModal();
      showSuccessTicket(transaction);
      renderAll();
    } catch (error) {
      alert('Gagal submit waste: ' + error.message);
    }
  });
}

// Similar updates untuk reward redemption dan other actions
```

## Error Handling

Setiap API call akan throw error jika gagal. Handle dengan try-catch:

```javascript
try {
  const user = await apiClient.getUserByRFID('rfid_123');
} catch (error) {
  console.error('Error:', error.message);
  // Show user-friendly error message
}
```

## CORS Configuration

Backend sudah dikonfigurasi dengan CORS di `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # ["*"] by default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Untuk production, update `ALLOWED_ORIGINS` di `.env`:
```
ALLOWED_ORIGINS=["https://yourdomain.com", "http://localhost:3000"]
```

## Running Development

### Backend
```bash
cd web/Backend
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd web
npm install
npm run dev  # starts on port 3000
```

Pastikan `.env.local` di frontend sudah benar:
```
VITE_API_BASE_URL=http://localhost:8000
```

## Testing API Integration

### 1. Test di Browser Console
```javascript
import { apiClient } from './services/api.js';

// Test login
apiClient.loginWithRFID('test_rfid')
  .then(user => console.log('Login success:', user))
  .catch(err => console.error('Login failed:', err));
```

### 2. Test dengan Postman
- Base URL: `http://localhost:8000`
- Endpoints sesuai dengan yang didefinisikan di Backend

## Notes Penting

1. **Session Management**: User session disimpan di localStorage, sehingga bisa di-restore ketika halaman di-reload
2. **RFID UID**: Simpan RFID UID di localStorage untuk referensi di setiap API call
3. **Error Messages**: Backend mengirim error messages di field `detail`, pastikan ditampilkan ke user
4. **Timeout**: Default API timeout adalah 30 detik (configurable via `.env.local`)
5. **Offline Mode**: Untuk future development, bisa implementasikan caching dengan IndexedDB

## Next Steps

1. Update `main.js` untuk menggunakan API integration
2. Implementasikan login screen
3. Add loading spinners dan error notifications
4. Implementasikan auto-refresh untuk leaderboard dan rewards
5. Add data validation sebelum submit ke Backend
