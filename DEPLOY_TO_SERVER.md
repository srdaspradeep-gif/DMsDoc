# 🚀 Deploy DocFlow to Contabo Server - Step by Step Guide

This guide will help you deploy your DocFlow application to your Contabo server.

## 📋 Prerequisites

- Contabo server with SSH access
- Server IP address
- Root or sudo access
- Basic knowledge of Linux commands

## 🔗 Step 1: Connect to Your Server

### Option A: Using SSH (Linux/Mac/Windows with WSL)

```bash
ssh root@your-server-ip
```

### Option B: Using PuTTY (Windows)

1. Download PuTTY from https://www.putty.org/
2. Enter your server IP
3. Port: 22
4. Click "Open"
5. Enter username: `root`
6. Enter password (from Contabo email)

## 📥 Step 2: Run the Deployment Script

### Quick Deploy (Automated)

```bash
# Download and run the deployment script
curl -fsSL https://raw.githubusercontent.com/sapradeep123/DocMS/master/deploy-server.sh -o deploy-server.sh
chmod +x deploy-server.sh
./deploy-server.sh
```

### Manual Deploy (Step by Step)

If you prefer to do it manually, follow these steps:

#### 2.1: Update System

```bash
apt update && apt upgrade -y
```

#### 2.2: Install Required Packages

```bash
apt install -y curl git python3 python3-pip
```

#### 2.3: Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh
```

#### 2.4: Install Docker Compose

```bash
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

#### 2.5: Configure Firewall

```bash
ufw allow 8000/tcp  # API
ufw allow 3000/tcp  # Frontend
ufw allow 9001/tcp  # MinIO Console
ufw enable
```

#### 2.6: Clone Repository

```bash
git clone https://github.com/sapradeep123/DocMS.git docflow
cd docflow
```

#### 2.7: Get Your Server IP

```bash
SERVER_IP=$(curl -s ifconfig.me)
echo "Your server IP is: $SERVER_IP"
```

#### 2.8: Create Environment Files

**Create root `.env` file:**

```bash
cat > .env << 'EOF'
# Port Configuration
API_PORT=8000
FRONTEND_PORT=3000
POSTGRES_PORT=5433

# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YourSecurePassword123!
POSTGRES_DB=docflow

# Frontend Configuration
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://api:8000
VITE_SERVER_HOST=0.0.0.0
VITE_SERVER_PORT=3000
EOF
```

**Create `app/.env` file:**

```bash
# Get server IP
SERVER_IP=$(curl -s ifconfig.me)

cat > app/.env << EOF
# Application Settings
TITLE=DocFlow API
DESCRIPTION=Document Management System API
DEBUG=False
HOST_URL=http://${SERVER_IP}:8000

# Database Configuration
DATABASE_HOSTNAME=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YourSecurePassword123!
POSTGRES_DB=docflow

# MinIO / S3 Configuration
S3_ENDPOINT_URL=http://minio:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=YourSecureMinIOPassword123!
AWS_REGION=us-east-1
S3_BUCKET=docflow
S3_TEST_BUCKET=docflow-test

# JWT Authentication
ALGORITHM=HS256
JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
JWT_REFRESH_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
ACCESS_TOKEN_EXPIRE_MIN=30
REFRESH_TOKEN_EXPIRE_MIN=10080

# Email Service (Optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL=your-email@gmail.com
APP_PASSWORD=your-app-password
EOF
```

**⚠️ Important:** Replace `YourSecurePassword123!` with a strong password!

#### 2.9: Build and Start Services

```bash
docker-compose build --no-cache
docker-compose up -d
```

#### 2.10: Check Service Status

```bash
docker-compose ps
docker-compose logs -f
```

## ✅ Step 3: Verify Deployment

### Check if services are running:

```bash
# Check API health
curl http://localhost:8000/health

# Check service status
docker-compose ps
```

### Access your application:

- **Frontend:** http://your-server-ip:3000
- **Backend API:** http://your-server-ip:8000
- **API Documentation:** http://your-server-ip:8000/docs
- **MinIO Console:** http://your-server-ip:9001

## 🔧 Step 4: Configure Domain (Optional)

If you have a domain name:

1. Point your domain to your server IP
2. Update `app/.env`:
   ```env
   HOST_URL=https://your-domain.com
   ```
3. Update root `.env` (if needed):
   ```env
   VITE_API_URL=https://your-domain.com
   ```
4. Restart services:
   ```bash
   docker-compose restart
   ```

## 🔒 Step 5: Security Hardening

### Change Default Passwords

1. Edit `.env` and `app/.env`
2. Change:
   - `POSTGRES_PASSWORD`
   - `AWS_SECRET_ACCESS_KEY` (MinIO password)
   - JWT secrets (already generated)

### Set Up SSL/HTTPS (Recommended)

Use Nginx reverse proxy with Let's Encrypt:

```bash
# Install Nginx
apt install -y nginx certbot python3-certbot-nginx

# Configure Nginx (create config file)
# Then get SSL certificate
certbot --nginx -d your-domain.com
```

## 📊 Step 6: Monitor Your Application

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f frontend
```

### Check Resource Usage

```bash
docker stats
```

## 🔄 Step 7: Update Application

When you push new code to GitHub:

```bash
cd docflow
git pull origin master
docker-compose build --no-cache
docker-compose up -d
```

## 🐛 Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Check if ports are in use
netstat -tulpn | grep -E '3000|8000|5433'

# Restart services
docker-compose restart
```

### Can't access from browser

1. Check firewall:
   ```bash
   ufw status
   ufw allow 3000/tcp
   ufw allow 8000/tcp
   ```

2. Check if services are running:
   ```bash
   docker-compose ps
   ```

3. Check server IP:
   ```bash
   curl ifconfig.me
   ```

### Database connection errors

1. Check PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check credentials in `app/.env`

3. Restart database:
   ```bash
   docker-compose restart postgres
   ```

## 📝 Useful Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Rebuild after code changes
docker-compose build --no-cache
docker-compose up -d

# Access database
docker-compose exec postgres psql -U postgres -d docflow

# Access API container
docker-compose exec api bash
```

## 🎉 Success!

Your DocFlow application should now be running on your Contabo server!

**Access it at:**
- Frontend: http://your-server-ip:3000
- API: http://your-server-ip:8000
- Docs: http://your-server-ip:8000/docs

**Next Steps:**
1. Register your first user
2. Start uploading documents
3. Configure email settings (optional)
4. Set up domain and SSL (optional)

## 📞 Need Help?

- Check logs: `docker-compose logs -f`
- Review environment files: `.env` and `app/.env`
- Check service status: `docker-compose ps`
- Review documentation: `DEPLOYMENT.md` and `ENV_SETUP.md`

