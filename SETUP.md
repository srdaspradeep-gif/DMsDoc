# DocFlow - Document Management System Setup Guide

## Prerequisites

- Docker and Docker Compose installed
- Git installed
- Ports available: 8200 (API), 3200 (Frontend), 5600 (PostgreSQL), 9000-9001 (MinIO)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/srdaspradeep-gif/DMsDoc.git
cd DMsDoc/DocMS
```

### 2. Configure Environment

The `.env` file is already configured with default values. You can modify it if needed:

```bash
# Port Configuration
API_PORT=8200
FRONTEND_PORT=3200
POSTGRES_PORT=5600

# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=DocFlow_Secure_Pass_2025!
POSTGRES_DB=docflow

# MinIO Configuration
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin123456
```

### 3. Start the Application

```bash
docker compose up -d --build
```

This will start:
- **API Server**: http://localhost:8200
- **Frontend**: http://localhost:3200
- **PostgreSQL**: localhost:5600
- **MinIO**: http://localhost:9000 (Console: http://localhost:9001)

### 4. Access the Application

1. Open your browser and go to: **http://localhost:3200**
2. Register a new account (first user becomes super admin)
3. Login with your credentials

## Initial Setup

### Create Your First Section and Folder

1. **Go to Sections** (from sidebar)
2. Click **"New Section"** - Create a section (e.g., "General Documents")
3. Click **"+ Folder"** inside the section - Create a folder (e.g., "2024 Files")
4. **Go to Documents** (from sidebar)
5. Select the folder from dropdown
6. Click **"Upload"** to add files

## Application Structure

### Hierarchy

```
Account
  └── Section (e.g., "HR Documents", "Finance")
      └── Folder (e.g., "2024", "Contracts")
          └── Files (actual documents)
```

### Key Features

- **Sections**: Top-level organization (HR, Finance, Legal, etc.)
- **Folders**: Sub-organization within sections
- **Documents**: File storage with metadata, tags, and versioning
- **User Management**: Role-based access control
- **Metadata Fields**: Custom fields for documents
- **Tags**: Organize and search documents

## Stopping the Application

```bash
docker compose down
```

To stop and remove all data:

```bash
docker compose down -v
```

## Troubleshooting

### Port Already in Use

If ports are already in use, modify the `.env` file:

```bash
API_PORT=8201
FRONTEND_PORT=3201
POSTGRES_PORT=5601
```

Then restart:

```bash
docker compose down
docker compose up -d --build
```

### Database Issues

Reset the database:

```bash
docker compose down -v
docker compose up -d --build
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f frontend
```

## Development

### Backend (FastAPI)

```bash
cd DocMS
docker compose up -d postgres minio
# Then run API locally for development
```

### Frontend (React + Vite)

```bash
cd DocMS/frontend
npm install
npm run dev
```

## Production Deployment

For production deployment, use:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## Support

For issues or questions, please create an issue in the GitHub repository.

## Architecture

- **Backend**: FastAPI (Python)
- **Frontend**: React + Vite
- **Database**: PostgreSQL
- **Storage**: MinIO (S3-compatible)
- **Authentication**: JWT tokens
- **Authorization**: Role-based access control (RBAC)
