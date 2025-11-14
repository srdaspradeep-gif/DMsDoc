# DocFlow - Complete Document Management System

<div align="center">
    <h1>📄 DocFlow</h1>
    <p>A modern, full-stack Document Management System with React frontend and FastAPI backend</p>
</div>

![Python](https://img.shields.io/badge/python-3.11+-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Postgres](https://img.shields.io/badge/postgres-15-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

## 🚀 Quick Start

### Prerequisites

- **Docker** and **Docker Compose** (recommended)
- OR **Python 3.11+**, **Node.js 18+**, and **PostgreSQL 15+**

### Option 1: Docker Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/sapradeep123/DocMS.git
cd DocMS

# Copy environment file
cp app/.env.example app/.env

# Edit app/.env with your configuration (see Configuration section)

# Start all services
docker compose up --build

# Wait for all services to be healthy, then create a test user
python scripts/create_test_user.py

# The application will be available at:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs

# Default login credentials (after running create_test_user.py):
# Email/Username: admin@docflow.com or admin
# Password: admin123
```

### Option 2: Manual Setup

See [SETUP.md](SETUP.md) for detailed manual setup instructions.

## 📋 Features

### ✅ Implemented Features

- ✅ **Document Upload and Download** - Drag & drop, bulk upload
- ✅ **Organization and Searching** - Advanced filters, tags, categories
- ✅ **Versioning** - Track document versions
- ✅ **Sharing** - Share documents with expiration and visit limits
- ✅ **Authentication and Authorization** - JWT-based auth
- ✅ **Access Control List** - Fine-grained permissions
- ✅ **Deletion and Archiving** - Soft delete with trash recovery
- ✅ **Document Preview** - Preview PDFs, images, and more
- ✅ **Send file via Email** - Email documents directly
- ✅ **MinIO Support** - On-premise object storage
- ✅ **Comments** - Add comments to documents
- ✅ **Tags** - Organize with tags
- ✅ **Custom Metadata** - Add custom fields to documents
- ✅ **Bulk File Importer** - Import multiple files at once
- ✅ **Modern UI** - Paperless-ngx inspired interface
- ✅ **Mobile Responsive** - Works on all devices
- ✅ **Collapsible Sidebar** - Space-efficient navigation

## 🏗️ Project Structure

```
DocMS/
├── app/                    # Backend FastAPI application
│   ├── api/               # API routes and dependencies
│   ├── core/              # Core configuration
│   ├── db/                # Database models and repositories
│   ├── schemas/           # Pydantic schemas
│   └── main.py            # FastAPI application entry point
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── services/      # API services
│   └── package.json       # Frontend dependencies
├── scripts/               # Utility scripts
│   ├── seed_data.py       # Seed sample data
│   └── create_test_user.py # Create test user
├── docker-compose.yml     # Docker services configuration
└── README.md             # This file
```

## ⚙️ Configuration

### Environment Variables

Create `app/.env` file (copy from `app/.env.example`):

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@postgres:5432/docflow
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=docflow

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# MinIO/S3
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=docflow
MINIO_USE_SSL=false

# API
API_PREFIX=/v2
API_HOST=0.0.0.0
API_PORT=8000

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
```

## 🧪 Testing

### Create Test Data

```bash
# Using Docker
docker compose exec api python scripts/seed_data.py

# Or manually
cd scripts
pip install -r requirements.txt
python seed_data.py
```

### Test Users

After seeding, you can login with:

- **Admin User:**
  - Email: `admin@docflow.com`
  - Username: `admin`
  - Password: `admin123`

- **Other test users:** See [TEST_USERS.md](TEST_USERS.md)

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## 🛠️ Development

### Backend Development

```bash
# Install dependencies
pip install -r requirements/api.txt

# Run migrations
alembic upgrade head

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 🐳 Docker Commands

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f api
docker compose logs -f frontend

# Stop services
docker compose down

# Rebuild after changes
docker compose up --build

# Access database
docker compose exec postgres psql -U postgres -d docflow
```

## 📱 Frontend Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Sidebar** - Collapsible navigation
- **Document Grid/List View** - Toggle between views
- **Advanced Filtering** - Filter by tags, date, type
- **Real-time Updates** - Instant feedback on actions
- **Drag & Drop Upload** - Easy file uploads
- **Document Preview** - View documents without downloading

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation with Pydantic
- SQL injection protection with SQLAlchemy

## 📝 License

[![Licence](https://img.shields.io/github/license/Ileriayo/markdown-badges?style=for-the-badge)](./LICENSE)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check [SETUP.md](SETUP.md) for setup help
- See [FRONTEND_QUICKSTART.md](FRONTEND_QUICKSTART.md) for frontend setup

## 🎯 Roadmap

- [ ] 2-factor authentication
- [ ] Video preview support
- [ ] Storage quota per user
- [ ] Email import from unread emails
- [ ] Advanced analytics dashboard

---

**Made with ❤️ by the DocFlow Team**
