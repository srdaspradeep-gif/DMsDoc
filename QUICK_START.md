# DocFlow Quick Start Guide

Get DocFlow up and running in 5 minutes!

## ⚡ Fastest Setup (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/sapradeep123/DocMS.git
cd DocMS

# 2. Create environment file
cp app/.env.example app/.env

# 3. Start everything
docker compose up -d --build

# 4. Wait for services to be healthy (about 30-60 seconds)
docker compose ps

# 5. Initialize database and create admin user
python scripts/init_db.py

# 6. Open in browser
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs

# 7. Login with:
#    Email: admin@docflow.com
#    Password: admin123
```

## 🔑 Default Login Credentials

After running the setup, use these credentials:
- **Email**: `admin@docflow.com`
- **Password**: `admin123`

## 🎯 First Steps

### 1. Create Your First User

**Option A: Via Frontend**
- Go to http://localhost:3000/register
- Fill in email, username, and password
- Click "Sign Up"

**Option B: Via API**
```bash
curl -X POST http://localhost:8000/v2/u/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "username": "yourusername",
    "password": "yourpassword"
  }'
```

**Option C: Use Seed Script**
```bash
docker compose exec api python scripts/seed_data.py
# Then login with: admin@docflow.com / admin123
```

### 2. Login

- Go to http://localhost:3000/login
- Enter your credentials
- You'll be redirected to the dashboard

### 3. Upload Your First Document

1. Click "Upload" button
2. Drag & drop files or click to browse
3. Add tags (optional)
4. Click "Upload"
5. Your document appears in the grid!

## 📱 Key Features to Try

### Document Management
- ✅ **Upload** - Drag & drop multiple files
- ✅ **View** - Click any document to see details
- ✅ **Download** - Click download button
- ✅ **Delete** - Move to trash (can restore later)

### Organization
- ✅ **Tags** - Add tags to organize documents
- ✅ **Filter** - Filter by tags, date, type
- ✅ **Search** - Use search bar at top
- ✅ **Sort** - Sort by date, name, size

### Collaboration
- ✅ **Comments** - Add comments to documents
- ✅ **Share** - Share documents with links
- ✅ **Custom Metadata** - Add custom fields

## 🎨 UI Features

- **Collapsible Sidebar** - Click collapse button (desktop)
- **Mobile Menu** - Hamburger icon (mobile)
- **Grid/List View** - Toggle between views
- **Responsive** - Works on all screen sizes

## 🔧 Common Tasks

### View API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Access Database
```bash
docker compose exec postgres psql -U postgres -d docflow
```

### View Logs
```bash
# All services
docker compose logs -f

# Just API
docker compose logs -f api

# Just frontend
docker compose logs -f frontend
```

### Stop Services
```bash
docker compose down
```

### Restart Services
```bash
docker compose restart
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change ports in docker-compose.yml
# Or stop the service using the port
```

### Can't Login
- Check backend is running: http://localhost:8000/health
- Verify credentials
- Check browser console for errors

### Frontend Not Loading
- Check frontend is running: http://localhost:3000
- Verify API proxy in vite.config.js
- Check browser console

## 📚 Next Steps

- Read [SETUP.md](SETUP.md) for detailed setup
- Check [TEST_USERS.md](TEST_USERS.md) for test accounts
- Review [FRONTEND_QUICKSTART.md](FRONTEND_QUICKSTART.md) for frontend details
- Explore API at http://localhost:8000/docs

## 🎉 You're All Set!

Start managing your documents with DocFlow!

For help, check:
- [SETUP.md](SETUP.md) - Detailed setup guide
- [QUICK_FIX.md](QUICK_FIX.md) - Common issues
- GitHub Issues - Report bugs or request features

---

**Happy Document Managing! 📄✨**

