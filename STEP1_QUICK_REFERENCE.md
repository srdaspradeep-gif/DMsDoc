# Step 1 Quick Reference

## 🎯 What is Step 1?

Step 1 is the **base architecture** for DocFlow:
- Backend: FastAPI + PostgreSQL + JWT authentication
- Frontend: React + Responsive layout + Mobile components
- Infrastructure: Docker Compose setup
- Tests: Backend (8 tests) + Frontend (6 tests)

---

## ⚡ Quick Commands

### Start Everything
```bash
# From docflow directory
docker compose up --build

# Or in detached mode
docker compose up -d --build
```

**Services Started:**
- PostgreSQL: `localhost:5433`
- MinIO: `localhost:9000` (API), `localhost:9001` (Console)
- Backend API: `localhost:8000`
- Frontend: `localhost:3000`

### Stop Everything
```bash
docker compose down

# Stop and remove volumes (full reset)
docker compose down -v
```

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f postgres
```

### Check Service Health
```bash
docker compose ps
```

---

## 🧪 Test Commands

### Backend Tests
```bash
# Install test dependencies (if not in Docker)
pip install -r requirements/test.txt

# Run all tests
pytest tests/ -v

# Run auth tests only
pytest tests/test_auth.py -v

# Run with coverage
pytest tests/ -v --cov=app
```

**Expected:** 8 tests passing

### Frontend Tests
```bash
cd frontend

# Install dependencies
npm install

# Run tests
npm test

# Run in watch mode
npm test -- --watch
```

**Expected:** 6 tests passing

---

## 🔍 Verify Step 1 Features

### Backend Verification

#### 1. Check API Health
```bash
curl http://localhost:8000/health
```
**Expected:** `{"status":"healthy"}`

#### 2. Check API Docs
Open: http://localhost:8000/docs

#### 3. Test Registration
```bash
curl -X POST http://localhost:8000/v2/u/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123"
  }'
```
**Expected:** User object returned (no password field)

#### 4. Test Login
```bash
curl -X POST http://localhost:8000/v2/u/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=testpass123"
```
**Expected:** `{"access_token":"...","token_type":"bearer"}`

#### 5. Test Protected Endpoint
```bash
# Get token from login response, then:
curl http://localhost:8000/v2/u/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
**Expected:** User object with username, email, id

### Frontend Verification

#### 1. Open Frontend
Open: http://localhost:3000

#### 2. Check Login Page
- Navigate to: http://localhost:3000/login
- **Expected:** Login form with email/password fields

#### 3. Check Register Page
- Navigate to: http://localhost:3000/register
- **Expected:** Registration form

#### 4. Test Registration Flow
1. Go to register page
2. Fill form: username, email, password
3. Click "Sign Up"
4. **Expected:** Success message, redirect to login

#### 5. Test Login Flow
1. Go to login page
2. Enter credentials
3. Click "Sign In"
4. **Expected:** Redirect to dashboard

#### 6. Check Protected Route
1. Open incognito window
2. Try to access: http://localhost:3000/
3. **Expected:** Redirect to /login

#### 7. Check Mobile Layout
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select mobile device
4. **Expected:**
   - Bottom navigation visible (4 tabs)
   - FAB visible (bottom right)
   - Responsive layout

---

## 📋 Manual QA Checklist

### Setup
- [ ] Docker Compose running
- [ ] All services healthy
- [ ] Frontend accessible at localhost:3000
- [ ] Backend accessible at localhost:8000

### Backend
- [ ] `/health` endpoint returns healthy
- [ ] `/docs` shows Swagger UI
- [ ] Can register new user
- [ ] Can login with username
- [ ] Can login with email
- [ ] Wrong password fails
- [ ] `/me` requires token
- [ ] `/me` returns user data with valid token

### Frontend
- [ ] Login page renders
- [ ] Register page renders
- [ ] Dashboard requires authentication
- [ ] Can register new user
- [ ] Can login successfully
- [ ] Token stored in localStorage
- [ ] Auto-redirect on 401
- [ ] Can logout

### Responsive Layout
- [ ] Desktop: Top navbar visible
- [ ] Desktop: Sidebar visible
- [ ] Desktop: Bottom nav hidden
- [ ] Desktop: FAB hidden
- [ ] Mobile: Bottom nav visible (4 tabs)
- [ ] Mobile: FAB visible
- [ ] Mobile: Sidebar hidden
- [ ] Mobile: Touch-friendly UI

### Mobile Components
- [ ] Bottom nav has 4 tabs (Dashboard, Files, Tasks, Profile)
- [ ] Active tab highlighted
- [ ] FAB expands on click
- [ ] FAB shows "Upload Document" option
- [ ] FAB shows "New Folder" option
- [ ] FAB backdrop closes menu
- [ ] FAB animations smooth

### Tests
- [ ] Backend: 8 tests passing
- [ ] Frontend: 6 tests passing

---

## 🔧 Common Issues & Solutions

### Issue: Services won't start
```bash
# Solution: Full reset
docker compose down -v
docker compose up --build
```

### Issue: Port already in use
```bash
# Solution: Change ports in .env or docker-compose.yml
# Or stop conflicting services
```

### Issue: Database connection error
```bash
# Solution: Wait for postgres to be healthy
docker compose logs postgres

# Or restart postgres
docker compose restart postgres
```

### Issue: Frontend can't connect to backend
```bash
# Solution: Check backend is running
curl http://localhost:8000/health

# Check proxy configuration in vite.config.js
```

### Issue: Tests failing
```bash
# Backend: Create test database
docker compose exec postgres psql -U postgres -c "CREATE DATABASE test_docflow;"

# Frontend: Reinstall dependencies
cd frontend
rm -rf node_modules
npm install
```

### Issue: Can't login
```bash
# Solution: Create test user
docker compose exec api python scripts/create_test_user.py

# Default credentials:
# Email: admin@docflow.com
# Password: admin123
```

---

## 📊 Expected Test Results

### Backend Tests (pytest)
```
tests/test_auth.py::test_register_user PASSED
tests/test_auth.py::test_register_duplicate_user PASSED
tests/test_auth.py::test_login_user PASSED
tests/test_auth.py::test_login_with_email PASSED
tests/test_auth.py::test_login_wrong_password PASSED
tests/test_auth.py::test_get_current_user PASSED
tests/test_auth.py::test_get_current_user_unauthorized PASSED
tests/test_auth.py::test_get_current_user_invalid_token PASSED

======================== 8 passed ========================
```

### Frontend Tests (jest)
```
PASS  src/__tests__/Login.test.jsx
  ✓ renders login form
  ✓ allows user to type in email and password fields
  ✓ has a link to register page

PASS  src/__tests__/Dashboard.test.jsx
  ✓ renders loading state initially
  ✓ renders dashboard with stats when data is loaded
  ✓ shows empty state when no documents exist

Test Suites: 2 passed, 2 total
Tests:       6 passed, 6 total
```

---

## 🎯 Step 1 Completion Criteria

### ✅ All Criteria Met

- [x] **Backend API** - FastAPI running with JWT auth
- [x] **User Model** - All required fields present
- [x] **Auth Endpoints** - Register, login, me working
- [x] **Password Security** - Bcrypt hashing
- [x] **Frontend SPA** - React app with routing
- [x] **Auth Pages** - Login and register functional
- [x] **Protected Routes** - Dashboard requires auth
- [x] **Token Management** - JWT stored and auto-injected
- [x] **Responsive Layout** - Desktop and mobile views
- [x] **Mobile Components** - Bottom nav + FAB
- [x] **Backend Tests** - 8 tests passing
- [x] **Frontend Tests** - 6 tests passing
- [x] **Docker Setup** - All services containerized
- [x] **Documentation** - Complete and accurate

---

## 📚 Related Documentation

- **Full Validation:** `STEP1_VALIDATION.md`
- **Quick Start:** `VALIDATION_QUICKSTART.md`
- **Architecture:** `BASE_ARCHITECTURE_COMPLETE.md`
- **Main README:** `README.md`

---

## ✨ Summary

**Step 1 is COMPLETE and VERIFIED**

All base architecture components are implemented and working:
- ✅ Backend with authentication
- ✅ Frontend with responsive layout
- ✅ Mobile components
- ✅ Comprehensive tests
- ✅ Docker containerization

**Ready to proceed with feature development!**
