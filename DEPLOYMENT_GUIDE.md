# DocFlow Deployment Guide for Contabo Server

## Quick Deployment Steps

### 1. SSH into your Contabo server
```bash
ssh user@your-contabo-ip
```

### 2. Clone or pull the latest code
```bash
# If first time:
git clone https://github.com/sapradeep123/DocMS.git docflow
cd docflow

# If updating existing:
cd docflow
git pull origin master
```

### 3. Create environment file
```bash
cp app/.env.template app/.env
# Edit with your production values:
nano app/.env
```

Required environment variables in `app/.env`:
```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YourSecurePassword123!
POSTGRES_DB=docflow
DATABASE_HOSTNAME=postgres
POSTGRES_PORT=5432

# JWT Secrets (generate secure random strings)
JWT_SECRET_KEY=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET_KEY=your-refresh-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MIN=30
REFRESH_TOKEN_EXPIRE_MIN=10080

# MinIO/S3 Storage
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT_URL=http://minio:9000
S3_BUCKET=docflow

# App Config
HOST_URL=http://your-domain.com:8000
DEBUG=False
```

### 4. Start the application
```bash
# Production mode
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Or development mode
docker compose up -d --build
```

### 5. Verify deployment
```bash
# Check all services are running
docker compose ps

# Check API health
curl http://localhost:8000/health

# Check logs if issues
docker compose logs api
docker compose logs frontend
```

## Running Tests on Server

### Backend Tests
```bash
docker compose exec api python -m pytest tests/ -v
```

### Frontend Tests
```bash
docker compose exec frontend npm test
```

## Database Migrations

If you need to run migrations:
```bash
docker compose exec api alembic upgrade head
```

## Useful Commands

```bash
# View logs
docker compose logs -f api
docker compose logs -f frontend

# Restart services
docker compose restart api
docker compose restart frontend

# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v

# Rebuild specific service
docker compose up -d --build api
docker compose up -d --build frontend
```

## Ports

- API: 8000
- Frontend: 3000
- PostgreSQL: 5433 (external) / 5432 (internal)
- MinIO API: 9000
- MinIO Console: 9001

## Troubleshooting

### API not starting
```bash
docker compose logs api
# Check database connection
docker compose exec api python -c "from app.db.models import engine; print('DB OK')"
```

### Frontend not loading
```bash
docker compose logs frontend
# Rebuild frontend
docker compose up -d --build frontend
```

### Database issues
```bash
# Connect to database
docker compose exec postgres psql -U postgres -d docflow

# Check tables
\dt
```

## Security Notes for Production

1. Change all default passwords
2. Use strong JWT secrets (32+ characters)
3. Enable HTTPS with nginx reverse proxy
4. Restrict database port access
5. Set DEBUG=False in production
