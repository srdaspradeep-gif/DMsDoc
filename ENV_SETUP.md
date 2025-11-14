# 🔧 Environment Configuration Guide

This guide shows how to configure environment variables for both **local** and **server** deployments.

## 📁 Environment Files Structure

```
docflow/
├── .env                    # Docker Compose variables (create from .env.example)
└── app/
    └── .env                # Backend API variables (create from app/.env.example)
```

## 🏠 Local Development Setup

### 1. Create Root `.env` File

Create `.env` in the project root:

```env
# Port Configuration
API_PORT=8000
FRONTEND_PORT=3000
POSTGRES_PORT=5433

# Database Configuration (for Docker)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=NewStrongPassword_2025!
POSTGRES_DB=docflow

# Frontend Configuration
# Use /api for Docker (proxy) or http://localhost:8000 for direct connection
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://api:8000
VITE_SERVER_HOST=0.0.0.0
VITE_SERVER_PORT=3000
```

### 2. Create Backend `app/.env` File

Create `app/.env`:

```env
# Application Settings
TITLE=DocFlow API
DESCRIPTION=Document Management System API
DEBUG=False
HOST_URL=http://localhost:8000

# Database Configuration
# For Docker: use service name 'postgres'
DATABASE_HOSTNAME=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=NewStrongPassword_2025!
POSTGRES_DB=docflow

# MinIO / S3 Configuration
# For Docker: use service name 'minio' with port 9000
S3_ENDPOINT_URL=http://minio:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_REGION=us-east-1
S3_BUCKET=docflow
S3_TEST_BUCKET=docflow-test

# JWT Authentication
# Generate secrets: python -c "import secrets; print(secrets.token_urlsafe(32))"
ALGORITHM=HS256
JWT_SECRET_KEY=your-jwt-secret-key-change-this
JWT_REFRESH_SECRET_KEY=your-jwt-refresh-secret-key-change-this
ACCESS_TOKEN_EXPIRE_MIN=30
REFRESH_TOKEN_EXPIRE_MIN=10080

# Email Service (Optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL=your-email@gmail.com
APP_PASSWORD=your-app-password
```

## 🌐 Server Deployment Setup

### 1. Create Root `.env` File

```env
# Port Configuration
API_PORT=8000
FRONTEND_PORT=3000
POSTGRES_PORT=5433

# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-very-secure-password
POSTGRES_DB=docflow

# Frontend Configuration
# Option 1: If using proxy (recommended for same server)
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://api:8000

# Option 2: If frontend needs direct API connection
# VITE_API_URL=http://your-server-ip:8000
# VITE_API_PROXY_TARGET=http://api:8000

VITE_SERVER_HOST=0.0.0.0
VITE_SERVER_PORT=3000
```

### 2. Create Backend `app/.env` File

```env
# Application Settings
TITLE=DocFlow API
DESCRIPTION=Document Management System API
DEBUG=False
# Use your server IP or domain
HOST_URL=http://your-server-ip:8000
# Or with domain:
# HOST_URL=https://your-domain.com

# Database Configuration
DATABASE_HOSTNAME=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-very-secure-password
POSTGRES_DB=docflow

# MinIO / S3 Configuration
S3_ENDPOINT_URL=http://minio:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=change-this-secure-password
AWS_REGION=us-east-1
S3_BUCKET=docflow
S3_TEST_BUCKET=docflow-test

# JWT Authentication (Generate secure secrets!)
ALGORITHM=HS256
JWT_SECRET_KEY=generate-secure-secret-here
JWT_REFRESH_SECRET_KEY=generate-secure-secret-here
ACCESS_TOKEN_EXPIRE_MIN=30
REFRESH_TOKEN_EXPIRE_MIN=10080

# Email Service (Optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL=your-email@gmail.com
APP_PASSWORD=your-app-password
```

## 🔑 Key Configuration Variables

### `HOST_URL` (Backend)
- **Local:** `http://localhost:8000`
- **Server:** `http://your-server-ip:8000` or `https://your-domain.com`
- Used for generating share links and API documentation

### `VITE_API_URL` (Frontend)
- **Docker (proxy):** `/api` (uses Vite proxy)
- **Direct connection:** `http://localhost:8000` or `http://your-server-ip:8000`
- Frontend will use this to connect to the API

### `DATABASE_HOSTNAME` (Backend)
- **Docker:** `postgres` (service name)
- **External DB:** `localhost` or server IP

### `S3_ENDPOINT_URL` (Backend)
- **Docker:** `http://minio:9000` (service name)
- **External MinIO:** `http://your-minio-server:9000`

## 🔄 Quick Switch Guide

### Switch to Server Mode:

1. Update `app/.env`:
   ```env
   HOST_URL=http://your-server-ip:8000
   ```

2. Update root `.env` (if needed):
   ```env
   VITE_API_URL=http://your-server-ip:8000
   ```

3. Restart:
   ```bash
   docker compose restart
   ```

### Switch to Local Mode:

1. Update `app/.env`:
   ```env
   HOST_URL=http://localhost:8000
   ```

2. Update root `.env`:
   ```env
   VITE_API_URL=/api
   ```

3. Restart:
   ```bash
   docker compose restart
   ```

## 🔒 Security Checklist

- [ ] Change all default passwords
- [ ] Generate secure JWT secrets
- [ ] Use strong PostgreSQL password
- [ ] Change MinIO credentials
- [ ] Never commit `.env` files
- [ ] Use HTTPS in production
- [ ] Restrict firewall ports

## 📝 Notes

- All `.env` files are in `.gitignore` - they won't be committed
- Copy the examples above to create your `.env` files
- Restart Docker containers after changing environment variables
- Use `docker compose logs` to debug configuration issues

