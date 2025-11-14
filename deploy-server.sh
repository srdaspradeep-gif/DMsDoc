#!/bin/bash

# ============================================
# DocFlow Server Deployment Script
# ============================================
# This script automates the deployment process on your Contabo server

set -e  # Exit on error

echo "🚀 Starting DocFlow Server Deployment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  Not running as root. Some commands may require sudo.${NC}"
fi

# Step 1: Update system
echo -e "${GREEN}📦 Step 1: Updating system packages...${NC}"
apt update && apt upgrade -y

# Step 2: Install required packages
echo -e "${GREEN}📦 Step 2: Installing required packages...${NC}"
apt install -y curl git python3 python3-pip

# Step 3: Install Docker
echo -e "${GREEN}🐳 Step 3: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✅ Docker installed successfully${NC}"
else
    echo -e "${YELLOW}ℹ️  Docker is already installed${NC}"
fi

# Step 4: Install Docker Compose
echo -e "${GREEN}🐳 Step 4: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed successfully${NC}"
else
    echo -e "${YELLOW}ℹ️  Docker Compose is already installed${NC}"
fi

# Step 5: Configure firewall
echo -e "${GREEN}🔥 Step 5: Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 8000/tcp  # API
    ufw allow 3000/tcp  # Frontend
    ufw allow 9001/tcp  # MinIO Console (optional)
    echo -e "${GREEN}✅ Firewall rules added${NC}"
else
    echo -e "${YELLOW}⚠️  UFW not found. Please configure firewall manually.${NC}"
fi

# Step 6: Clone or update repository
echo -e "${GREEN}📥 Step 6: Setting up repository...${NC}"
if [ -d "docflow" ]; then
    echo -e "${YELLOW}ℹ️  Repository exists, updating...${NC}"
    cd docflow
    git pull origin master
else
    echo -e "${GREEN}📥 Cloning repository...${NC}"
    git clone https://github.com/sapradeep123/DocMS.git docflow
    cd docflow
fi

# Step 7: Get server IP
echo -e "${GREEN}🌐 Step 7: Detecting server IP...${NC}"
SERVER_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || hostname -I | awk '{print $1}')
echo -e "${GREEN}✅ Server IP detected: ${SERVER_IP}${NC}"

# Step 8: Create environment files
echo -e "${GREEN}⚙️  Step 8: Creating environment files...${NC}"

# Create root .env if it doesn't exist
if [ ! -f ".env" ]; then
    cat > .env << EOF
# Port Configuration
API_PORT=8000
FRONTEND_PORT=3000
POSTGRES_PORT=5433

# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
POSTGRES_DB=docflow

# Frontend Configuration
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://api:8000
VITE_SERVER_HOST=0.0.0.0
VITE_SERVER_PORT=3000
EOF
    echo -e "${GREEN}✅ Created root .env file${NC}"
    echo -e "${YELLOW}⚠️  Please review and update .env file with your preferences${NC}"
else
    echo -e "${YELLOW}ℹ️  Root .env file already exists${NC}"
fi

# Create app/.env if it doesn't exist
if [ ! -f "app/.env" ]; then
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
POSTGRES_PASSWORD=$(grep POSTGRES_PASSWORD .env | cut -d'=' -f2)
POSTGRES_DB=docflow

# MinIO / S3 Configuration
S3_ENDPOINT_URL=http://minio:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
AWS_REGION=us-east-1
S3_BUCKET=docflow
S3_TEST_BUCKET=docflow-test

# JWT Authentication
# Generate secrets: python3 -c "import secrets; print(secrets.token_urlsafe(32))"
ALGORITHM=HS256
JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
JWT_REFRESH_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
ACCESS_TOKEN_EXPIRE_MIN=30
REFRESH_TOKEN_EXPIRE_MIN=10080

# Email Service (Optional - Update with your email settings)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL=your-email@gmail.com
APP_PASSWORD=your-app-password
EOF
    echo -e "${GREEN}✅ Created app/.env file${NC}"
    echo -e "${YELLOW}⚠️  Please review and update app/.env file, especially:${NC}"
    echo -e "${YELLOW}   - HOST_URL (currently set to http://${SERVER_IP}:8000)${NC}"
    echo -e "${YELLOW}   - Email settings (if needed)${NC}"
else
    echo -e "${YELLOW}ℹ️  app/.env file already exists${NC}"
    echo -e "${YELLOW}⚠️  Please ensure HOST_URL is set to: http://${SERVER_IP}:8000${NC}"
fi

# Step 9: Build and start services
echo -e "${GREEN}🏗️  Step 9: Building and starting services...${NC}"
echo -e "${YELLOW}⏳ This may take several minutes...${NC}"
docker-compose down -v 2>/dev/null || true
docker-compose build --no-cache
docker-compose up -d

# Step 10: Wait for services to be healthy
echo -e "${GREEN}⏳ Step 10: Waiting for services to start...${NC}"
sleep 10

# Check service status
echo -e "${GREEN}📊 Checking service status...${NC}"
docker-compose ps

# Step 11: Verify deployment
echo -e "${GREEN}✅ Step 11: Verifying deployment...${NC}"
sleep 5

if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is running!${NC}"
else
    echo -e "${RED}❌ API health check failed. Check logs: docker-compose logs api${NC}"
fi

# Final instructions
echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo -e "${GREEN}📋 Access Information:${NC}"
echo -e "   Frontend:  http://${SERVER_IP}:3000"
echo -e "   Backend:   http://${SERVER_IP}:8000"
echo -e "   API Docs:  http://${SERVER_IP}:8000/docs"
echo -e "   MinIO:     http://${SERVER_IP}:9001"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "   1. Review environment files:"
echo -e "      - .env (root directory)"
echo -e "      - app/.env"
echo -e "   2. Update HOST_URL in app/.env if using a domain name"
echo -e "   3. Change default passwords in .env files"
echo -e "   4. View logs: docker-compose logs -f"
echo -e "   5. Register your first user at: http://${SERVER_IP}:3000/register"
echo ""
echo -e "${GREEN}🔧 Useful Commands:${NC}"
echo -e "   View logs:        docker-compose logs -f"
echo -e "   Stop services:    docker-compose down"
echo -e "   Restart:          docker-compose restart"
echo -e "   Check status:     docker-compose ps"
echo ""

