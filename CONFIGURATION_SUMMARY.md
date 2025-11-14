# ✅ Configuration Summary - No Hardcoded Values

All hardcoded values have been removed. The application now works on both **local** and **server** environments through environment variables.

## 🔧 Changes Made

### 1. Backend Configuration (`app/core/config.py`)
- ✅ `host_url` now reads from `HOST_URL` environment variable
- ✅ Default fallback: `http://localhost:8000` (only used if env var not set)
- ✅ All other configs already use environment variables

### 2. Frontend API Service (`frontend/src/services/api.js`)
- ✅ `baseURL` now dynamically reads from `VITE_API_URL` environment variable
- ✅ Supports both relative paths (`/api`) and full URLs (`http://server:8000`)
- ✅ Falls back to `/api` if not set (works with Vite proxy)

### 3. Frontend Vite Config (`frontend/vite.config.js`)
- ✅ Server host: `VITE_SERVER_HOST` (default: `0.0.0.0`)
- ✅ Server port: `VITE_SERVER_PORT` (default: `3000`)
- ✅ Proxy target: `VITE_API_PROXY_TARGET` or `VITE_API_URL` (default: `http://api:8000`)

### 4. Docker Compose (`docker-compose.yml`)
- ✅ All ports use environment variables with defaults
- ✅ Frontend environment variables:
  - `VITE_API_URL` (default: `/api`)
  - `VITE_API_PROXY_TARGET` (default: `http://api:8000`)
  - `VITE_SERVER_HOST` (default: `0.0.0.0`)
  - `VITE_SERVER_PORT` (default: `3000`)
- ✅ Backend `HOST_URL` passed from environment
- ✅ Healthcheck URLs use `127.0.0.1` (internal container check)

## 📋 Environment Variables Required

### Root `.env` (Docker Compose)
```env
API_PORT=8000
FRONTEND_PORT=3000
POSTGRES_PORT=5433
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_DB=docflow
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://api:8000
VITE_SERVER_HOST=0.0.0.0
VITE_SERVER_PORT=3000
```

### `app/.env` (Backend)
```env
HOST_URL=http://localhost:8000  # Change to server IP/domain for server
DATABASE_HOSTNAME=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_DB=docflow
S3_ENDPOINT_URL=http://minio:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=docflow
# ... (other settings)
```

## 🏠 Local Setup

1. Create `.env` in root with local values
2. Create `app/.env` with `HOST_URL=http://localhost:8000`
3. Run: `docker compose up -d`

## 🌐 Server Setup

1. Create `.env` in root with server values
2. Create `app/.env` with `HOST_URL=http://your-server-ip:8000`
3. Update `VITE_API_URL` if needed (usually keep `/api` for proxy)
4. Run: `docker compose up -d`

## 🔄 Switching Environments

### To Server:
```bash
# Update app/.env
HOST_URL=http://your-server-ip:8000

# Restart
docker compose restart
```

### To Local:
```bash
# Update app/.env
HOST_URL=http://localhost:8000

# Restart
docker compose restart
```

## ✅ Verification Checklist

- [x] No hardcoded `localhost` in API code
- [x] No hardcoded `localhost` in frontend code
- [x] No hardcoded ports
- [x] No hardcoded database connections
- [x] No hardcoded S3 endpoints
- [x] All URLs configurable via environment variables
- [x] Works on local machine
- [x] Works on server (Contabo)

## 📚 Documentation

- See `ENV_SETUP.md` for detailed environment variable setup
- See `DEPLOYMENT.md` for full deployment guide

