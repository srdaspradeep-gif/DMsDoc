# 🚀 Deployment Guide - Local & Server

This guide explains how to deploy DocFlow on both **local** and **server** (e.g., Contabo) environments without hardcoded values.

## 📋 Prerequisites

- Docker and Docker Compose installed
- Git installed
- (For server) SSH access to your server

## 🔧 Configuration Overview

All configuration is done through **environment variables**. No hardcoded values!

### Environment Files

1. **Root `.env`** - Docker Compose configuration (ports, frontend settings)
2. **`app/.env`** - Backend API configuration (database, S3, JWT, etc.)

## 🏠 Local Deployment

### Step 1: Clone Repository

```bash
git clone https://github.com/sapradeep123/DocMS.git
cd docflow
```

### Step 2: Configure Environment Variables

#### Create Root `.env` (for Docker Compose)

```bash
cp .env.example .env
```

Edit `.env`:
```env
API_PORT=8000
FRONTEND_PORT=3000
POSTGRES_PORT=5433
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=docflow
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://api:8000
```

#### Create Backend `.env`

```bash
cp app/.env.example app/.env
```

Edit `app/.env`:
```env
HOST_URL=http://localhost:8000
DATABASE_HOSTNAME=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=docflow
S3_ENDPOINT_URL=http://minio:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=docflow
# ... (other settings)
```

### Step 3: Start Services

```bash
docker compose up -d
```

### Step 4: Access Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **MinIO Console:** http://localhost:9001

## 🌐 Server Deployment (Contabo)

### Step 1: Connect to Server

```bash
ssh user@your-server-ip
```

### Step 2: Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 3: Clone Repository

```bash
git clone https://github.com/sapradeep123/DocMS.git
cd docflow
```

### Step 4: Configure for Server

#### Create Root `.env`

```bash
cp .env.example .env
nano .env
```

Edit `.env`:
```env
API_PORT=8000
FRONTEND_PORT=3000
POSTGRES_PORT=5433
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-very-secure-password
POSTGRES_DB=docflow

# For server: Use your server IP or domain
# Option 1: If frontend and API are on same server
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://api:8000

# Option 2: If frontend needs to call API directly
# VITE_API_URL=http://your-server-ip:8000
# VITE_API_PROXY_TARGET=http://api:8000
```

#### Create Backend `.env`

```bash
cp app/.env.example app/.env
nano app/.env
```

Edit `app/.env`:
```env
# Use your server IP or domain
HOST_URL=http://your-server-ip:8000
# Or with domain:
# HOST_URL=https://your-domain.com

DATABASE_HOSTNAME=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-very-secure-password
POSTGRES_DB=docflow

# MinIO endpoint (internal Docker network)
S3_ENDPOINT_URL=http://minio:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=change-this-secure-password
S3_BUCKET=docflow

# Generate secure JWT secrets
JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
JWT_REFRESH_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
# ... (other settings)
```

### Step 5: Configure Firewall

```bash
# Allow ports
sudo ufw allow 8000/tcp  # API
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 9001/tcp  # MinIO Console (optional)
sudo ufw enable
```

### Step 6: Start Services

```bash
docker compose up -d
```

### Step 7: Verify Deployment

```bash
# Check logs
docker compose logs -f

# Check services
docker compose ps

# Test API
curl http://localhost:8000/health
```

### Step 8: Access Application

- **Frontend:** http://your-server-ip:3000
- **Backend API:** http://your-server-ip:8000
- **API Docs:** http://your-server-ip:8000/docs

## 🔄 Switching Between Local and Server

### To Switch to Server Mode:

1. Update `app/.env`:
   ```env
   HOST_URL=http://your-server-ip:8000
   ```

2. Update root `.env` (if needed):
   ```env
   VITE_API_URL=http://your-server-ip:8000
   ```

3. Restart services:
   ```bash
   docker compose restart
   ```

### To Switch to Local Mode:

1. Update `app/.env`:
   ```env
   HOST_URL=http://localhost:8000
   ```

2. Update root `.env`:
   ```env
   VITE_API_URL=/api
   ```

3. Restart services:
   ```bash
   docker compose restart
   ```

## 🔒 Security Best Practices

### For Production Server:

1. **Change Default Passwords:**
   - PostgreSQL password
   - MinIO credentials
   - JWT secrets

2. **Use HTTPS:**
   - Set up Nginx reverse proxy with SSL
   - Update `HOST_URL` to use `https://`

3. **Restrict Ports:**
   - Only expose necessary ports
   - Use firewall rules

4. **Environment Variables:**
   - Never commit `.env` files
   - Use secure secret management

## 🐛 Troubleshooting

### API Not Accessible

- Check `HOST_URL` in `app/.env`
- Verify firewall rules
- Check Docker logs: `docker compose logs api`

### Frontend Can't Connect to API

- Check `VITE_API_URL` in root `.env`
- Verify API is running: `curl http://localhost:8000/health`
- Check browser console for errors

### Database Connection Issues

- Verify `DATABASE_HOSTNAME` (use `postgres` for Docker)
- Check PostgreSQL credentials
- Verify network: `docker network ls`

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

