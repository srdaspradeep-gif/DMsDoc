# File Versioning, Locking & Reminders - Quick Start Guide

## Prerequisites

1. Backend running on `http://localhost:8000`
2. Database migrations applied
3. Valid authentication token
4. Account ID

## Setup

### 1. Run Database Migration

```bash
cd docflow
alembic upgrade head
```

This creates the following tables:
- `file_versions` - Stores file version history
- `file_locks` - Manages file locking
- `file_reminders` - Stores file reminders

### 2. Verify Tables Created

```bash
# Connect to PostgreSQL
psql -U postgres -d docflow

# List tables
\dt

# Check file_versions table
\d file_versions

# Check file_locks table
\d file_locks

# Check file_reminders table
\d file_reminders
```

## Testing the API

### Setup Environment Variables

```bash
export TOKEN="your_jwt_token_here"
export ACCOUNT_ID="your_account_id_here"
export FILE_ID="your_file_id_here"
```

### 1. File Versioning

#### Upload New Version

```bash
curl -X POST "http://localhost:8000/dms/files-dms/${FILE_ID}/versions?comment=Updated%20content" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Account-Id: ${ACCOUNT_ID}" \
  -F "file=@test_document.pdf"
```

Expected Response:
```json
{
  "id": "01JDXXXXXXXXXXXXXXXX",
  "file_id": "01JDXXXXXXXXXXXXXXXX",
  "version_number": 2,
  "storage_path": "files/account_id/folder_id/versions/file_id/test_document.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 12345,
  "file_hash": "sha256_hash_here",
  "comment": "Updated content",
  "created_by": "01JDXXXXXXXXXXXXXXXX",
  "created_at": "2025-11-25T10:00:00Z"
}
```

#### List File Versions

```bash
curl "http://localhost:8000/dms/files-dms/${FILE_ID}/versions" \
  -H "Authorization: Bearer ${TOKEN}"
```

Expected Response:
```json
[
  {
    "id": "01JDXXXXXXXXXXXXXXXX",
    "file_id": "01JDXXXXXXXXXXXXXXXX",
    "version_number": 2,
    "storage_path": "...",
    "mime_type": "application/pdf",
    "size_bytes": 12345,
    "file_hash": "...",
    "comment": "Updated content",
    "created_by": "01JDXXXXXXXXXXXXXXXX",
    "created_at": "2025-11-25T10:00:00Z"
  },
  {
    "id": "01JDXXXXXXXXXXXXXXXX",
    "file_id": "01JDXXXXXXXXXXXXXXXX",
    "version_number": 1,
    "storage_path": "...",
    "mime_type": "application/pdf",
    "size_bytes": 10000,
    "file_hash": "...",
    "comment": null,
    "created_by": "01JDXXXXXXXXXXXXXXXX",
    "created_at": "2025-11-24T10:00:00Z"
  }
]
```

#### Download Specific Version

```bash
export VERSION_ID="version_id_here"

curl "http://localhost:8000/dms/files-dms/${FILE_ID}/versions/${VERSION_ID}/download" \
  -H "Authorization: Bearer ${TOKEN}" \
  --output "downloaded_version.pdf"
```

#### Restore Version

```bash
curl -X POST "http://localhost:8000/dms/files-dms/${FILE_ID}/versions/${VERSION_ID}/restore" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Account-Id: ${ACCOUNT_ID}"
```

Expected Response:
```json
{
  "id": "01JDXXXXXXXXXXXXXXXX",
  "file_id": "01JDXXXXXXXXXXXXXXXX",
  "version_number": 1,
  "storage_path": "...",
  "mime_type": "application/pdf",
  "size_bytes": 10000,
  "file_hash": "...",
  "comment": null,
  "created_by": "01JDXXXXXXXXXXXXXXXX",
  "created_at": "2025-11-24T10:00:00Z"
}
```

### 2. File Locking

#### Lock File

```bash
# Lock for 6 hours (default)
curl -X POST "http://localhost:8000/dms/files-dms/${FILE_ID}/lock?duration_hours=6" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Account-Id: ${ACCOUNT_ID}"
```

Expected Response:
```json
{
  "id": "01JDXXXXXXXXXXXXXXXX",
  "file_id": "01JDXXXXXXXXXXXXXXXX",
  "locked_by": "01JDXXXXXXXXXXXXXXXX",
  "locked_until": "2025-11-25T16:00:00Z",
  "created_at": "2025-11-25T10:00:00Z"
}
```

#### Get Lock Status

```bash
curl "http://localhost:8000/dms/files-dms/${FILE_ID}/lock" \
  -H "Authorization: Bearer ${TOKEN}"
```

Expected Response (Locked):
```json
{
  "is_locked": true,
  "locked_by": "01JDXXXXXXXXXXXXXXXX",
  "locked_by_username": "john_doe",
  "locked_until": "2025-11-25T16:00:00Z",
  "can_unlock": true
}
```

Expected Response (Unlocked):
```json
{
  "is_locked": false,
  "locked_by": null,
  "locked_by_username": null,
  "locked_until": null,
  "can_unlock": false
}
```

#### Unlock File

```bash
curl -X DELETE "http://localhost:8000/dms/files-dms/${FILE_ID}/lock" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Account-Id: ${ACCOUNT_ID}"
```

Expected Response: `204 No Content`

#### Test Lock Enforcement

Try to upload a new version while file is locked by another user:

```bash
# Lock file as User A
curl -X POST "http://localhost:8000/dms/files-dms/${FILE_ID}/lock" \
  -H "Authorization: Bearer ${TOKEN_USER_A}" \
  -H "X-Account-Id: ${ACCOUNT_ID}"

# Try to upload version as User B (should fail)
curl -X POST "http://localhost:8000/dms/files-dms/${FILE_ID}/versions" \
  -H "Authorization: Bearer ${TOKEN_USER_B}" \
  -H "X-Account-Id: ${ACCOUNT_ID}" \
  -F "file=@test.pdf"
```

Expected Error:
```json
{
  "detail": "File is locked by another user until 2025-11-25T16:00:00Z"
}
```

### 3. File Reminders

#### Create Reminder

```bash
export TARGET_USER_ID="target_user_id_here"

curl -X POST "http://localhost:8000/dms/files-dms/${FILE_ID}/reminders" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "target_user_id": "'${TARGET_USER_ID}'",
    "remind_at": "2025-12-01T10:00:00Z",
    "message": "Please review this document before the meeting"
  }'
```

Expected Response:
```json
{
  "id": "01JDXXXXXXXXXXXXXXXX",
  "file_id": "01JDXXXXXXXXXXXXXXXX",
  "created_by": "01JDXXXXXXXXXXXXXXXX",
  "target_user_id": "01JDXXXXXXXXXXXXXXXX",
  "remind_at": "2025-12-01T10:00:00Z",
  "message": "Please review this document before the meeting",
  "status": "pending",
  "created_at": "2025-11-25T10:00:00Z",
  "updated_at": "2025-11-25T10:00:00Z"
}
```

#### List File Reminders

```bash
curl "http://localhost:8000/dms/files-dms/${FILE_ID}/reminders" \
  -H "Authorization: Bearer ${TOKEN}"
```

Expected Response:
```json
[
  {
    "id": "01JDXXXXXXXXXXXXXXXX",
    "file_id": "01JDXXXXXXXXXXXXXXXX",
    "created_by": "01JDXXXXXXXXXXXXXXXX",
    "target_user_id": "01JDXXXXXXXXXXXXXXXX",
    "remind_at": "2025-12-01T10:00:00Z",
    "message": "Please review this document before the meeting",
    "status": "pending",
    "created_at": "2025-11-25T10:00:00Z",
    "updated_at": "2025-11-25T10:00:00Z"
  }
]
```

#### Get My Reminders (All)

```bash
curl "http://localhost:8000/dms/files-dms/reminders/me?due=all" \
  -H "Authorization: Bearer ${TOKEN}"
```

#### Get My Due Reminders

```bash
curl "http://localhost:8000/dms/files-dms/reminders/me?due=now" \
  -H "Authorization: Bearer ${TOKEN}"
```

Expected Response:
```json
[
  {
    "id": "01JDXXXXXXXXXXXXXXXX",
    "file_id": "01JDXXXXXXXXXXXXXXXX",
    "created_by": "01JDXXXXXXXXXXXXXXXX",
    "target_user_id": "01JDXXXXXXXXXXXXXXXX",
    "remind_at": "2025-11-25T09:00:00Z",
    "message": "Please review this document before the meeting",
    "status": "pending",
    "created_at": "2025-11-24T10:00:00Z",
    "updated_at": "2025-11-24T10:00:00Z",
    "file_name": "Important Document.pdf",
    "document_id": "DOC-2025-001",
    "creator_username": "john_doe",
    "target_username": "jane_smith"
  }
]
```

#### Update Reminder (Dismiss)

```bash
export REMINDER_ID="reminder_id_here"

curl -X PATCH "http://localhost:8000/dms/files-dms/reminders/${REMINDER_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "dismissed"
  }'
```

#### Delete Reminder

```bash
curl -X DELETE "http://localhost:8000/dms/files-dms/reminders/${REMINDER_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

Expected Response: `204 No Content`

## Frontend Testing

### 1. Access File Detail Page

Navigate to: `http://localhost:3000/files/${FILE_ID}`

The page should show:
- File information
- Tabs for: Details, Versions, Lock, Reminders

### 2. Test Versioning Tab

1. Click "Versions" tab
2. Upload a new version with a comment
3. View version history
4. Download a specific version
5. Restore an old version

### 3. Test Lock Tab

1. Click "Lock" tab
2. Select lock duration (1-72 hours)
3. Click "Lock File"
4. Verify lock status shows
5. Try to upload version (should work as owner)
6. Click "Unlock File"

### 4. Test Reminders Tab

1. Click "Reminders" tab
2. Click "Add Reminder"
3. Select target user
4. Set date/time
5. Enter message
6. Click "Create Reminder"
7. View reminder in list
8. Dismiss or delete reminder

### 5. Test My Reminders Page

Navigate to: `http://localhost:3000/my-reminders`

The page should show:
- All reminders tab
- Due Now tab (with count badge)
- Reminder cards with file links
- Dismiss and view actions

## Mobile Testing

### Test on Mobile Device or Browser DevTools

1. Open browser DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select mobile device (e.g., iPhone 12)

### Mobile Features to Test

1. **Bottom Navigation**: Should show at bottom of screen
2. **File Detail Page**: Tabs should be scrollable horizontally
3. **Versions**: Simplified list view
4. **Lock**: Toggle switch for lock/unlock
5. **Reminders**: Card-based layout
6. **My Reminders**: Grid layout with cards

## Common Issues & Solutions

### Issue: Migration Fails

**Solution**: Check if tables already exist
```bash
psql -U postgres -d docflow -c "\dt"
```

If tables exist, drop them first:
```bash
psql -U postgres -d docflow -c "DROP TABLE IF EXISTS file_reminders, file_locks, file_versions CASCADE;"
```

### Issue: 403 Forbidden on Lock/Unlock

**Solution**: Verify RBAC permissions
```bash
# Check user has files:update permission
curl "http://localhost:8000/rbac/users/me/permissions" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Issue: Cannot Upload Version (File Locked)

**Solution**: Check lock status and unlock if needed
```bash
# Get lock status
curl "http://localhost:8000/dms/files-dms/${FILE_ID}/lock" \
  -H "Authorization: Bearer ${TOKEN}"

# Unlock if you're the owner
curl -X DELETE "http://localhost:8000/dms/files-dms/${FILE_ID}/lock" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Issue: Reminders Not Showing

**Solution**: Check reminder filters and dates
```bash
# Get all reminders (not just due)
curl "http://localhost:8000/dms/files-dms/reminders/me?due=all" \
  -H "Authorization: Bearer ${TOKEN}"
```

## Performance Testing

### Test with Multiple Versions

```bash
# Upload 10 versions
for i in {1..10}; do
  curl -X POST "http://localhost:8000/dms/files-dms/${FILE_ID}/versions?comment=Version%20${i}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "X-Account-Id: ${ACCOUNT_ID}" \
    -F "file=@test.pdf"
  sleep 1
done

# List all versions
curl "http://localhost:8000/dms/files-dms/${FILE_ID}/versions?limit=100" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Test Lock Expiration

```bash
# Lock for 1 minute
curl -X POST "http://localhost:8000/dms/files-dms/${FILE_ID}/lock?duration_hours=0.0167" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Account-Id: ${ACCOUNT_ID}"

# Wait 2 minutes
sleep 120

# Check lock status (should be unlocked)
curl "http://localhost:8000/dms/files-dms/${FILE_ID}/lock" \
  -H "Authorization: Bearer ${TOKEN}"
```

## Next Steps

1. **Implement Notification System**: Send actual notifications when reminders are due
2. **Add Version Comparison**: Show diff between versions
3. **Implement Auto-lock**: Lock file when user starts editing
4. **Add Bulk Operations**: Lock/unlock multiple files
5. **Create Audit Trail**: Track all version/lock/reminder operations

## Documentation

- Full Implementation: See `VERSIONING_IMPLEMENTATION.md`
- API Reference: See `VERSIONING_IMPLEMENTATION.md` (API Endpoints section)
- Database Schema: See `VERSIONING_IMPLEMENTATION.md` (Database Schema section)
