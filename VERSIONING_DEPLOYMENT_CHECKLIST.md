# File Versioning System - Deployment Checklist

## Pre-Deployment Checklist

### ✅ Code Review
- [ ] All backend files created and reviewed
  - [ ] `app/db/tables/dms/versioning.py`
  - [ ] `app/db/repositories/dms/versioning_repository.py`
  - [ ] `app/api/routes/dms/versioning.py`
  - [ ] `app/schemas/dms/schemas.py` (updated)
  - [ ] `app/db/tables/dms/files.py` (updated)
- [ ] All frontend files created and reviewed
  - [ ] `frontend/src/components/FileVersions.jsx`
  - [ ] `frontend/src/components/FileLock.jsx`
  - [ ] `frontend/src/components/FileReminders.jsx`
  - [ ] `frontend/src/pages/FileDetailDMS.jsx`
  - [ ] `frontend/src/pages/MyReminders.jsx`
- [ ] Migration file created
  - [ ] `migrations/versions/add_versioning_tables.py`
- [ ] Router updated
  - [ ] `app/api/router.py` includes versioning router
- [ ] Models imported
  - [ ] `app/main.py` imports versioning models

### ✅ Database Preparation
- [ ] Backup current database
  ```bash
  pg_dump -U postgres docflow > backup_before_versioning_$(date +%Y%m%d).sql
  ```
- [ ] Verify database connection
  ```bash
  psql -U postgres -d docflow -c "SELECT version();"
  ```
- [ ] Check current migration status
  ```bash
  cd docflow && alembic current
  ```

### ✅ Environment Setup
- [ ] Backend environment variables set
  - [ ] `DATABASE_URL`
  - [ ] `S3_BUCKET_NAME` or `MINIO_BUCKET_NAME`
  - [ ] `JWT_SECRET_KEY`
- [ ] Frontend environment variables set
  - [ ] `REACT_APP_API_URL`
- [ ] Storage service configured (S3/MinIO)
  - [ ] Bucket exists
  - [ ] Credentials valid
  - [ ] Write permissions granted

## Deployment Steps

### Step 1: Backend Deployment

#### 1.1 Stop Backend Service
```bash
# If using systemd
sudo systemctl stop docflow-api

# If using Docker
docker-compose stop api

# If running manually
# Press Ctrl+C to stop
```

#### 1.2 Pull Latest Code
```bash
cd docflow
git pull origin main
```

#### 1.3 Install Dependencies (if needed)
```bash
pip install -r requirements/base.txt
```

#### 1.4 Run Database Migration
```bash
# Option 1: Using alembic directly
alembic upgrade head

# Option 2: Using helper script
./scripts/apply_versioning_migration.sh
```

#### 1.5 Verify Migration
```bash
# Check tables created
psql -U postgres -d docflow -c "\dt file_*"

# Expected output:
# - file_versions
# - file_locks
# - file_reminders
# - files_new (should have new columns)

# Verify columns added to files_new
psql -U postgres -d docflow -c "\d files_new"
# Should show: document_id, tags, notes, current_version_id
```

#### 1.6 Start Backend Service
```bash
# If using systemd
sudo systemctl start docflow-api
sudo systemctl status docflow-api

# If using Docker
docker-compose up -d api

# If running manually
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### 1.7 Verify Backend Running
```bash
curl http://localhost:8000/docs
# Should show Swagger UI with new versioning endpoints
```

### Step 2: Frontend Deployment

#### 2.1 Build Frontend
```bash
cd frontend
npm install
npm run build
```

#### 2.2 Deploy Build
```bash
# If using nginx
sudo cp -r build/* /var/www/docflow/

# If using Docker
docker-compose build frontend
docker-compose up -d frontend
```

#### 2.3 Verify Frontend
```bash
# Check if frontend is accessible
curl http://localhost:3000
```

### Step 3: Verification

#### 3.1 API Health Check
```bash
# Check API is responding
curl http://localhost:8000/health

# Check versioning endpoints exist
curl http://localhost:8000/docs | grep -i version
```

#### 3.2 Run API Tests
```bash
# Set environment variables
export TOKEN="your_jwt_token"
export ACCOUNT_ID="your_account_id"
export FILE_ID="your_file_id"

# Run test suite
./scripts/test_versioning_api.sh
```

#### 3.3 Manual Frontend Testing
- [ ] Navigate to file detail page
- [ ] Test Versions tab
  - [ ] Upload new version
  - [ ] List versions
  - [ ] Download version
  - [ ] Restore version
- [ ] Test Lock tab
  - [ ] Lock file
  - [ ] Check lock status
  - [ ] Unlock file
- [ ] Test Reminders tab
  - [ ] Create reminder
  - [ ] List reminders
  - [ ] Update reminder
  - [ ] Delete reminder
- [ ] Test My Reminders page
  - [ ] View all reminders
  - [ ] View due reminders
  - [ ] Dismiss reminder

#### 3.4 Mobile Testing
- [ ] Open in mobile browser or DevTools mobile view
- [ ] Test responsive design
- [ ] Test bottom navigation
- [ ] Test all features on mobile

### Step 4: RBAC Verification

#### 4.1 Check Permissions
```bash
# Verify files module exists
curl http://localhost:8000/rbac/modules \
  -H "Authorization: Bearer ${TOKEN}"

# Should show "files" module with read, update, admin permissions
```

#### 4.2 Test Permission Enforcement
```bash
# Test with user without permissions (should fail)
curl -X POST http://localhost:8000/dms/files-dms/${FILE_ID}/versions \
  -H "Authorization: Bearer ${TOKEN_NO_PERMISSION}" \
  -F "file=@test.pdf"

# Expected: 403 Forbidden
```

### Step 5: Performance Testing

#### 5.1 Upload Multiple Versions
```bash
# Upload 10 versions
for i in {1..10}; do
  curl -X POST "http://localhost:8000/dms/files-dms/${FILE_ID}/versions?comment=Version%20${i}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "X-Account-Id: ${ACCOUNT_ID}" \
    -F "file=@test.pdf"
  sleep 1
done
```

#### 5.2 Check Query Performance
```bash
# List versions (should be fast)
time curl "http://localhost:8000/dms/files-dms/${FILE_ID}/versions?limit=100" \
  -H "Authorization: Bearer ${TOKEN}"

# Should complete in < 1 second
```

#### 5.3 Check Database Indexes
```bash
psql -U postgres -d docflow -c "
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('file_versions', 'file_locks', 'file_reminders')
ORDER BY tablename, indexname;
"

# Should show indexes on:
# - file_versions: (file_id, version_number)
# - file_locks: (locked_until)
# - file_reminders: (target_user_id, status, remind_at)
```

## Post-Deployment Checklist

### ✅ Monitoring Setup
- [ ] Set up log monitoring for versioning endpoints
- [ ] Set up alerts for failed version uploads
- [ ] Monitor lock expiration cleanup
- [ ] Monitor reminder due checks

### ✅ Documentation
- [ ] Update user documentation
- [ ] Update API documentation
- [ ] Update admin guide
- [ ] Create training materials

### ✅ User Communication
- [ ] Announce new features to users
- [ ] Provide quick start guide
- [ ] Schedule training session
- [ ] Set up support channel

### ✅ Backup Strategy
- [ ] Verify version files are backed up
- [ ] Test restore procedure
- [ ] Document backup locations
- [ ] Set up automated backups

## Rollback Plan

### If Issues Occur

#### 1. Rollback Database
```bash
# Restore from backup
psql -U postgres -d docflow < backup_before_versioning_YYYYMMDD.sql

# Or downgrade migration
cd docflow
alembic downgrade -1
```

#### 2. Rollback Code
```bash
# Revert to previous version
git revert HEAD
git push origin main

# Or checkout previous commit
git checkout <previous_commit_hash>
```

#### 3. Restart Services
```bash
# Restart backend
sudo systemctl restart docflow-api

# Restart frontend
sudo systemctl restart docflow-frontend
```

## Troubleshooting

### Common Issues

#### Issue: Migration Fails
**Symptoms**: Alembic upgrade fails with error

**Solution**:
```bash
# Check current state
alembic current

# Check migration history
alembic history

# Try manual migration
psql -U postgres -d docflow < migrations/versions/add_versioning_tables.py
```

#### Issue: API Returns 500 Error
**Symptoms**: Versioning endpoints return 500

**Solution**:
```bash
# Check logs
tail -f logs/docflow.log

# Check database connection
psql -U postgres -d docflow -c "SELECT 1;"

# Verify tables exist
psql -U postgres -d docflow -c "\dt file_*"
```

#### Issue: Frontend Not Loading
**Symptoms**: Components not rendering

**Solution**:
```bash
# Check browser console for errors
# Rebuild frontend
cd frontend
npm run build

# Clear browser cache
# Hard refresh (Ctrl+Shift+R)
```

#### Issue: Lock Not Working
**Symptoms**: Can upload version when file is locked

**Solution**:
```bash
# Check lock status
curl "http://localhost:8000/dms/files-dms/${FILE_ID}/lock" \
  -H "Authorization: Bearer ${TOKEN}"

# Verify lock enforcement in code
# Check versioning.py upload_new_version function
```

## Success Criteria

### ✅ Deployment Successful If:
- [ ] All migrations applied successfully
- [ ] All API endpoints responding
- [ ] Frontend loads without errors
- [ ] Can upload new version
- [ ] Can lock/unlock file
- [ ] Can create reminder
- [ ] RBAC permissions enforced
- [ ] Mobile view works
- [ ] No errors in logs
- [ ] Performance acceptable (< 1s response time)

## Maintenance Tasks

### Daily
- [ ] Check error logs
- [ ] Monitor API response times
- [ ] Check storage usage

### Weekly
- [ ] Review lock expiration cleanup
- [ ] Check reminder due processing
- [ ] Review version storage usage

### Monthly
- [ ] Analyze version storage growth
- [ ] Review and archive old versions
- [ ] Update documentation
- [ ] Review user feedback

## Support Contacts

- **Backend Issues**: [Backend Team]
- **Frontend Issues**: [Frontend Team]
- **Database Issues**: [DBA Team]
- **Infrastructure Issues**: [DevOps Team]

## Additional Resources

- **Implementation Guide**: VERSIONING_IMPLEMENTATION.md
- **Quick Start Guide**: VERSIONING_QUICKSTART.md
- **API Documentation**: http://localhost:8000/docs
- **User Guide**: [Link to user documentation]

---

**Deployment Date**: _________________

**Deployed By**: _________________

**Sign-off**: _________________
