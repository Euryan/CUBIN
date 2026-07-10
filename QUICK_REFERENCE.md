# Integration - Quick Reference Card

## 🚀 Quick Start (60 seconds)

```bash
# 1. Terminal 1 - Backend
cd web/Backend
python -m uvicorn app.main:app --reload --port 8000

# 2. Terminal 2 - Frontend
cd web
npm run dev

# 3. Open Browser
Frontend:  http://localhost:3000
Backend:   http://localhost:8000/docs
Admin:     http://localhost:3101
```

**Or use startup script:**
```bash
# Windows
start-dev.bat

# PowerShell
powershell -ExecutionPolicy Bypass -File start-dev.ps1
```

---

## 🔌 Import & Use (Copy-Paste Ready)

### Option 1: Simple API Client
```javascript
import { apiClient } from './services/api.js';

// Login
const user = await apiClient.loginWithRFID('rfid_123');

// Submit waste
const trash = await apiClient.createTrashDetection('rfid_123', 'Plastik', 2.5, 0.95);

// Get rewards
const rewards = await apiClient.getAllRewards();

// Redeem reward
const result = await apiClient.redeemReward('rfid_123', reward_id, 1);
```

### Option 2: Integration Manager (Better for Session)
```javascript
import { integrationManager } from './services/integration.js';

// Initialize user session
const user = await integrationManager.initializeUserSession('rfid_123');

// Submit waste with auto state update
const deposit = await integrationManager.submitWasteDeposit('rfid_123', 'Plastik', 2.5, 'Location');

// Redeem reward
const result = await integrationManager.redeemReward('rfid_123', reward_id, 1);

// Check if logged in
if (integrationManager.isLoggedIn()) {
  // Current user: integrationManager.currentUser
}

// Logout
integrationManager.clearSession();
```

### Option 3: State Sync (Best for Complex State)
```javascript
import { syncUserDataFromBackend, submitWasteAndUpdateState } from './services/stateSync.js';

// Sync all data at startup
const data = await syncUserDataFromBackend('rfid_123');
// Returns: { profile, stats, history, rewards, user }

// Submit and get formatted data
const transaction = await submitWasteAndUpdateState('rfid_123', 'Plastik', 2.5, 'Location');
```

### Option 4: React Hooks
```javascript
import { useUser, useTrash, useRewards } from './hooks/useApi.js';

function MyComponent() {
  const { getUserByRFID, loading: userLoading, error: userError } = useUser();
  const { createDetection, loading: trashLoading } = useTrash();
  const { redeemReward } = useRewards();

  // Usage
  const handleSubmit = async () => {
    try {
      await createDetection('rfid_123', 'Plastik', 2.5, 0.95);
    } catch (error) {
      console.error(error.message);
    }
  };

  return <>...</>;
}
```

---

## 🎯 Common Patterns

### Authenticate & Fetch User
```javascript
import { integrationManager } from './services/integration.js';

async function loginUser(rfidUid) {
  try {
    const user = await integrationManager.initializeUserSession(rfidUid);
    console.log('Logged in:', user);
    return user;
  } catch (error) {
    console.error('Login failed:', error.message);
  }
}
```

### Submit Waste & Update UI
```javascript
import { submitWasteAndUpdateState } from './services/stateSync.js';

async function depositWaste(rfidUid, category, weight) {
  try {
    const transaction = await submitWasteAndUpdateState(rfidUid, category, weight);
    
    // Update UI
    state.history.unshift(transaction);
    state.stats.totalPoints += transaction.points;
    state.stats.totalBalance += transaction.earnedAmount;
    
    // Re-render
    renderAll();
    
    // Show success
    showSuccessTicket(transaction);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}
```

### Get Leaderboard
```javascript
import { apiClient } from './services/api.js';

async function loadLeaderboard() {
  try {
    const leaderboard = await apiClient.getLeaderboard(20);
    renderLeaderboard(leaderboard);
  } catch (error) {
    console.error('Failed to load leaderboard:', error.message);
  }
}
```

### Redeem Reward
```javascript
import { integrationManager } from './services/integration.js';

async function redeemReward(rewardId, quantity = 1) {
  try {
    const result = await integrationManager.redeemReward(
      integrationManager.currentUser.rfid_uid,
      rewardId,
      quantity
    );
    
    // Update points
    state.stats.totalPoints = result.remaining_points;
    
    alert('Reward redeemed successfully!');
    renderAll();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}
```

---

## 📝 Environment Variables

### Frontend (`.env.local`)
```
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000
```

### Backend (`.env`)
```
MYSQL_USER=root
MYSQL_PASSWORD=secret
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DB=smartwaste
ALLOWED_ORIGINS=["http://localhost:3000", "http://localhost:3101"]
LOG_LEVEL=INFO
```

---

## 🔗 API Endpoints Cheat Sheet

```
Authentication
  POST   /api/v1/auth/login

Users
  GET    /api/v1/users
  GET    /api/v1/users/rfid/{rfid_uid}
  GET    /api/v1/users/leaderboard
  GET    /api/v1/users/{user_id}/history

Waste Detection
  POST   /api/v1/trash/detect
  GET    /api/v1/trash/history
  GET    /api/v1/trash/summary
  GET    /api/v1/trash/latest

Rewards
  GET    /api/v1/rewards
  POST   /api/v1/rewards/redeem
  GET    /api/v1/rewards/history/{rfid_uid}
```

---

## 🐛 Debugging Tips

### Check API Status
```javascript
// Di browser console
fetch('http://localhost:8000/docs').then(r => console.log(r.status))
// Should return 200
```

### Test Login
```javascript
import { apiClient } from './src/services/api.js';
apiClient.loginWithRFID('test_rfid')
  .then(user => console.log('✓ Login OK:', user))
  .catch(err => console.error('✗ Error:', err.message));
```

### Check Network
```javascript
// Open browser DevTools → Network tab
// Submit form dan monitor requests
// Look untuk /api/ requests dan verify 200 status
```

### Check Session
```javascript
import { integrationManager } from './src/services/integration.js';
console.log(integrationManager.currentUser);
console.log(localStorage.getItem('currentUser'));
```

### Clear Session
```javascript
localStorage.clear();
location.reload();
```

---

## 🚨 Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to fetch` | Backend not running | Start backend: `python -m uvicorn app.main:app --reload --port 8000` |
| `CORS error` | ALLOWED_ORIGINS not set | Add frontend URL to Backend `.env` |
| `404 Not Found` | Wrong endpoint | Check endpoint di `/docs` |
| `Database connection error` | MySQL not running | Start MySQL or check credentials |
| `Port already in use` | Service already running | Kill process or use different port |
| `Module not found` | Missing dependency | Run `npm install` atau `pip install -r requirements.txt` |

---

## 📞 Support

1. **Read**: Check `INTEGRATION_GUIDE.md`
2. **Search**: Check `SETUP_GUIDE.md`
3. **Test**: Use http://localhost:8000/docs
4. **Check**: Review browser console errors
5. **Verify**: Check `.env` configuration

---

## ✅ Verify Setup

```bash
# 1. Check Backend
curl http://localhost:8000/docs

# 2. Check Frontend
curl http://localhost:3000

# 3. Check Database
mysql -u root -p smartwaste -e "SELECT COUNT(*) FROM user;"

# 4. Check API
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"rfid_uid": "test"}'
```

---

## 🎯 Next Steps

1. ✅ Start all services
2. ✅ Test API endpoints di `/docs`
3. ⏳ Update `main.js` dengan API integration
4. ⏳ Add login screen
5. ⏳ Test workflows
6. ⏳ Deploy

---

**Quick Reference v1.0 • May 2024**
