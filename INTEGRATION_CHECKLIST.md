# Integration Checklist & Deployment

## ✅ Development Setup Checklist

### Backend Setup
- [ ] MySQL Database created (`smartwaste`)
- [ ] Python 3.8+ installed
- [ ] `pip install -r requirements.txt` completed
- [ ] `.env` configured dengan MySQL credentials
- [ ] `ALLOWED_ORIGINS` includes frontend URLs
- [ ] Database migrations run: `alembic upgrade head`
- [ ] Backend running: `python -m uvicorn app.main:app --reload --port 8000`
- [ ] API Docs accessible: http://localhost:8000/docs

### Frontend Setup
- [ ] Node.js 16+ installed
- [ ] `npm install` completed di folder `web/`
- [ ] `.env.local` created dengan `VITE_API_BASE_URL=http://localhost:8000`
- [ ] Frontend running: `npm run dev`
- [ ] Frontend accessible: http://localhost:3000
- [ ] No CORS errors di browser console

### Admin Setup
- [ ] `npm install` completed di folder `web/admin/`
- [ ] Admin running: `npm run dev`
- [ ] Admin accessible: http://localhost:3101
- [ ] Proxy to backend working

## 🔌 API Integration Checklist

### Frontend
- [ ] `src/services/api.js` - API Client configured
- [ ] `src/services/integration.js` - Integration Manager setup
- [ ] `src/services/stateSync.js` - State transformations ready
- [ ] `src/hooks/useApi.js` - React hooks available
- [ ] `main.js` updated untuk use API (in progress/TODO)

### Admin
- [ ] `admin/src/services/adminApi.js` - Admin API service configured
- [ ] Admin modules updated untuk use API

### Backend
- [ ] CORS middleware configured di `main.py`
- [ ] All routers included dan registered
- [ ] Database models created
- [ ] Request/Response schemas validated
- [ ] Services implemented dengan business logic

## 🧪 Testing Checklist

### Manual Testing
- [ ] Login dengan RFID berfungsi
- [ ] User profile loading dari backend
- [ ] Submit waste deposit working
- [ ] Points dan balance updated
- [ ] Rewards dapat di-redeem
- [ ] Leaderboard loaded
- [ ] History tersimpan

### API Testing
- [ ] `POST /api/v1/auth/login` - tested
- [ ] `GET /api/v1/users/rfid/{rfid_uid}` - tested
- [ ] `POST /api/v1/trash/detect` - tested
- [ ] `GET /api/v1/rewards` - tested
- [ ] `POST /api/v1/rewards/redeem` - tested
- [ ] Error handling tested
- [ ] Response formats validated

### Frontend Testing
- [ ] No console errors
- [ ] No CORS warnings
- [ ] Network requests logged correctly
- [ ] State updates properly
- [ ] UI re-renders on data change
- [ ] Loading states working
- [ ] Error messages displayed

## 📊 Data Validation Checklist

### User Data
- [ ] Name validation
- [ ] Email validation
- [ ] RFID UID not empty
- [ ] Profile picture loads
- [ ] Tier system calculated correctly

### Waste Data
- [ ] Category must be valid
- [ ] Weight > 0
- [ ] Confidence score 0-1
- [ ] Points calculation correct
- [ ] Impact calculation correct

### Reward Data
- [ ] Reward exists
- [ ] User has enough points
- [ ] Quantity valid
- [ ] Redemption tracked

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All environment files configured
- [ ] Sensitive data (passwords) not in code
- [ ] `.gitignore` includes `.env` files
- [ ] Database migrations tested on production DB
- [ ] All tests passing
- [ ] Performance tested (no N+1 queries, etc.)

### Backend Deployment
- [ ] Production DB configured
- [ ] `ALLOWED_ORIGINS` updated untuk production URLs
- [ ] Logging configured untuk production
- [ ] Error handling appropriate
- [ ] API documentation generated
- [ ] Health check endpoint available
- [ ] Database backup strategy set

### Frontend Deployment
- [ ] Production build: `npm run build`
- [ ] `VITE_API_BASE_URL` points to production backend
- [ ] Dist folder ready untuk serve
- [ ] Environment variables configured
- [ ] Performance optimized (lazy loading, etc.)
- [ ] Analytics configured (optional)

### Admin Deployment
- [ ] Production build: `npm run build`
- [ ] Pointing to correct backend
- [ ] Access control configured

## 📈 Monitoring Checklist

### Backend Monitoring
- [ ] Request/Response logging enabled
- [ ] Error tracking (e.g., Sentry)
- [ ] Database performance monitored
- [ ] API response times tracked
- [ ] Uptime monitoring configured

### Frontend Monitoring
- [ ] Error tracking enabled
- [ ] Performance monitoring (e.g., Lighthouse)
- [ ] User behavior tracking (optional)
- [ ] Network requests logged

### Database Monitoring
- [ ] Backup scheduled daily
- [ ] Query performance monitored
- [ ] Disk space monitored
- [ ] Slow query log analyzed

## 🔐 Security Checklist

### Backend
- [ ] CORS properly configured (not "*" in production)
- [ ] HTTPS enforced in production
- [ ] Input validation implemented
- [ ] SQL injection prevention
- [ ] Rate limiting implemented
- [ ] Authentication tokens secure
- [ ] Password hashing secure

### Frontend
- [ ] Sensitive data not in localStorage (only session tokens)
- [ ] XSS prevention
- [ ] CSRF tokens used (if applicable)
- [ ] Secure headers set

## 📋 Documentation Checklist

- [ ] `README_INTEGRATION.md` - Read and understood
- [ ] `INTEGRATION_GUIDE.md` - Available for developers
- [ ] `SETUP_GUIDE.md` - Available for setup
- [ ] API documentation available at `/docs`
- [ ] Code commented where needed
- [ ] README updated in project root

## 🆘 Issue Resolution Checklist

If issues arise:
- [ ] Check error messages di console
- [ ] Verify `.env` configuration
- [ ] Verify port availability
- [ ] Check database connection
- [ ] Check network in browser DevTools
- [ ] Clear browser cache
- [ ] Restart services
- [ ] Check logs di Backend output
- [ ] Review integration guides

## 🎯 TODO - After Integration Complete

### Phase 1 - Core Integration
- [ ] Update `main.js` untuk use API endpoints
- [ ] Add login screen dengan RFID input
- [ ] Test semua user workflows

### Phase 2 - Admin Features
- [ ] Update admin dashboard untuk use API
- [ ] Add reward management UI
- [ ] Add user management UI
- [ ] Add reports generation

### Phase 3 - Advanced Features
- [ ] Real-time notifications (WebSocket)
- [ ] File upload untuk profile pictures
- [ ] Data export (CSV/PDF)
- [ ] Advanced filtering dan search

### Phase 4 - Optimization
- [ ] Caching strategy
- [ ] Offline mode dengan IndexedDB
- [ ] Performance optimization
- [ ] Mobile responsiveness tuning

### Phase 5 - Production Ready
- [ ] Security audit
- [ ] Load testing
- [ ] Documentation finalization
- [ ] Deployment scripts

## 📞 Quick Reference

### Start Services
```bash
# Windows
start-dev.bat

# PowerShell
powershell -ExecutionPolicy Bypass -File start-dev.ps1

# Manual
# Terminal 1: cd web/Backend && python -m uvicorn app.main:app --reload --port 8000
# Terminal 2: cd web && npm run dev
# Terminal 3: cd web/admin && npm run dev
```

### Check Services Status
```bash
# Backend API Docs
http://localhost:8000/docs

# Frontend
http://localhost:3000

# Admin
http://localhost:3101
```

### Database Commands
```bash
# Connect
mysql -u root -p smartwaste

# Show tables
SHOW TABLES;

# Check user data
SELECT * FROM user;
```

### Common Commands
```bash
# Frontend
npm install     # Install dependencies
npm run dev     # Start development server
npm run build   # Build for production

# Backend
pip install -r requirements.txt  # Install dependencies
python -m uvicorn app.main:app --reload  # Start server
alembic upgrade head  # Run migrations
```

---

**Last Updated**: May 2024
**Status**: Ready for Development
