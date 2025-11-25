# File Versioning, Locking & Reminders System

A comprehensive file versioning, check-in/check-out locking, and reminder system for the DocFlow DMS.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Frontend Components](#frontend-components)
- [Testing](#testing)
- [Documentation](#documentation)

## 🎯 Overview

This system provides enterprise-grade file management capabilities:

- **Versioning**: Track complete file history with version numbers, comments, and metadata
- **Locking**: Prevent concurrent edits with check-in/check-out mechanism
- **Reminders**: Set reminders for yourself or team members on specific files

All features are fully integrated with the existing RBAC system and support both desktop and mobile interfaces.

## ✨ Features

### File Versioning
- ✅ Automatic version numbering (1, 2, 3, ...)
- ✅ Version comments for change tracking
- ✅ Download any historical version
- ✅ Restore old versions as current
- ✅ Version metadata (size, hash, mime type, creator, date)
- ✅ SHA-256 hash for file integrity

### File Locking
- ✅ Check-in/check-out mechanism
- ✅ Configurable lock duration (1-72 hours)
- ✅ Automatic lock expiration
- ✅ Lock enforcement on uploads and edits
- ✅ Admin override capability
- ✅ Lock status with user details

### File Reminders
- ✅ Set reminders for any user
- ✅ Custom messages (up to 500 characters)
- ✅ Date/time scheduling
- ✅ Status tracking (pending, sent, dismissed)
- ✅ Due reminders dashboard
- ✅ Email notifications (ready for integration)

## 🚀 Quick Start

### 1. Apply Database Migration

```bash
cd docflow
alembic upgrade head
```

Or use the helper script:

```bash
./scripts/apply_versioning_migration.sh
```

### 2. Verify Installation

```bash
# Check tables created
psql -U postgres -d docflow -c "\dt file_*"

# Should show:
# - file_versions
# - file_locks
# - file_reminders
```

### 3. Test API

```bash
# Set environment variables
export TOKEN="your_jwt_token"
export ACCOUNT_ID="your_account_id"
export FILE_ID="your_file_id"

# Run test suite
./scripts/test_versioning_api.sh
```

### 4. Access Frontend

Navigate to: `http://localhost:3000/files/{file_id}`

## 🏗️ Architecture

### Database Schema

```
file_versions
├── id (PK)
├── file_id (FK → files_new.id)
├── version_number (auto-increment)
├── storage_path
├── mime_type
├── size_bytes
├── file_hash (SHA-256)
├── comment
├── created_by (FK → users.id)
└── created_at

file_locks
├── id (PK)
├── file_id (FK → files_new.id, UNIQUE)
├── locked_by (FK → users.id)
├── locked_until
└── created_at

file_reminders
├── id (PK)
├── file_id (FK → files_new.id)
├── created_by (FK → users.id)
├── target_user_id (FK → users.id)
├── remind_at
├── message
├── status (pending|sent|dismissed)
├── created_at
└── updated_at

files_new (updated)
├── ... (existing columns)
├── document_id (unique per account)
├── tags (array)
├── notes (text)
└── current_version_id (FK → file_versions.id)
```

### API Endpoints

**File Versions** (5 endpoints)
- `POST /dms/files-dms/{file_id}/versions` - Upload new version
- `GET /dms/files-dms/{file_id}/versions` - List versions
- `GET /dms/files-dms/{file_id}/versions/{version_id}` - Get version
- `GET /dms/files-dms/{file_id}/versions/{version_id}/download` - Download
- `POST /dms/files-dms/{file_id}/versions/{version_id}/restore` - Restore

**File Locks** (3 endpoints)
- `POST /dms/files-dms/{file_id}/lock` - Lock file
- `DELETE /dms/files-dms/{file_id}/lock` - Unlock file
- `GET /dms/files-dms/{file_id}/lock` - Get lock status

**File Reminders** (5 endpoints)
- `POST /dms/files-dms/{file_id}/reminders` - Create reminder
- `GET /dms/files-dms/{file_id}/reminders` - List file reminders
- `GET /dms/files-dms/reminders/me` - Get my reminders
- `PATCH /dms/files-dms/reminders/{reminder_id}` - Update reminder
- `DELETE /dms/files-dms/reminders/{reminder_id}` - Delete reminder

### RBAC Permissions

- `files:read` - View files, versions, locks, reminders
- `files:update` - Upload versions, lock/unlock files, restore versions
- `files:admin` - Unlock any file (admin override)

## 📚 API Reference

### Upload New Version

```bash
POST /dms/files-dms/{file_id}/versions?comment=Updated%20content
Content-Type: multipart/form-data
Authorization: Bearer {token}
X-Account-Id: {account_id}

Body: file (multipart)
```

Response:
```json
{
  "id": "01JDXXXXXXXXXXXXXXXX",
  "file_id": "01JDXXXXXXXXXXXXXXXX",
  "version_number": 2,
  "storage_path": "files/account/folder/versions/file/name.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 12345,
  "file_hash": "sha256_hash",
  "comment": "Updated content",
  "created_by": "01JDXXXXXXXXXXXXXXXX",
  "created_at": "2025-11-25T10:00:00Z"
}
```

### Lock File

```bash
POST /dms/files-dms/{file_id}/lock?duration_hours=6
Authorization: Bearer {token}
X-Account-Id: {account_id}
```

Response:
```json
{
  "id": "01JDXXXXXXXXXXXXXXXX",
  "file_id": "01JDXXXXXXXXXXXXXXXX",
  "locked_by": "01JDXXXXXXXXXXXXXXXX",
  "locked_until": "2025-11-25T16:00:00Z",
  "created_at": "2025-11-25T10:00:00Z"
}
```

### Create Reminder

```bash
POST /dms/files-dms/{file_id}/reminders
Content-Type: application/json
Authorization: Bearer {token}
X-Account-Id: {account_id}

{
  "target_user_id": "01JDXXXXXXXXXXXXXXXX",
  "remind_at": "2025-12-01T10:00:00Z",
  "message": "Please review this document"
}
```

Response:
```json
{
  "id": "01JDXXXXXXXXXXXXXXXX",
  "file_id": "01JDXXXXXXXXXXXXXXXX",
  "created_by": "01JDXXXXXXXXXXXXXXXX",
  "target_user_id": "01JDXXXXXXXXXXXXXXXX",
  "remind_at": "2025-12-01T10:00:00Z",
  "message": "Please review this document",
  "status": "pending",
  "created_at": "2025-11-25T10:00:00Z",
  "updated_at": "2025-11-25T10:00:00Z"
}
```

## 🎨 Frontend Components

### FileVersions Component

```jsx
import FileVersions from '../components/FileVersions';

<FileVersions fileId={fileId} accountId={accountId} />
```

Features:
- Upload new version with comment
- List version history
- Download specific version
- Restore old version

### FileLock Component

```jsx
import FileLock from '../components/FileLock';

<FileLock fileId={fileId} accountId={accountId} />
```

Features:
- Lock/unlock file
- Show lock status
- Duration selector
- Lock enforcement info

### FileReminders Component

```jsx
import FileReminders from '../components/FileReminders';

<FileReminders fileId={fileId} accountId={accountId} />
```

Features:
- Create reminder
- List reminders
- Update status
- Delete reminder

### FileDetailDMS Page

Complete file detail page with tabs:
- Details
- Versions
- Lock
- Reminders

### MyReminders Page

User reminders dashboard:
- All reminders view
- Due reminders view
- Dismiss actions
- File links

## 🧪 Testing

### Automated API Tests

```bash
# Set environment variables
export TOKEN="your_jwt_token"
export ACCOUNT_ID="your_account_id"
export FILE_ID="your_file_id"

# Run test suite
./scripts/test_versioning_api.sh
```

### Manual Testing

See `VERSIONING_QUICKSTART.md` for detailed testing procedures.

### Frontend Testing

1. Navigate to file detail page
2. Test each tab (Details, Versions, Lock, Reminders)
3. Test mobile responsive design
4. Verify error handling

## 📖 Documentation

- **VERSIONING_IMPLEMENTATION.md** - Complete technical documentation
- **VERSIONING_QUICKSTART.md** - Quick start and testing guide
- **VERSIONING_SUMMARY.md** - Implementation summary
- **VERSIONING_README.md** - This file

## 🔧 Configuration

### Lock Duration

Default: 6 hours
Range: 1-72 hours

Configure in API call:
```bash
POST /dms/files-dms/{file_id}/lock?duration_hours=24
```

### Reminder Message Length

Maximum: 500 characters

### Storage Paths

Versions are stored at:
```
files/{account_id}/{folder_id}/versions/{file_id}/{filename}
```

## 🐛 Troubleshooting

### Migration Fails

```bash
# Check if tables exist
psql -U postgres -d docflow -c "\dt file_*"

# Drop tables if needed
psql -U postgres -d docflow -c "DROP TABLE IF EXISTS file_reminders, file_locks, file_versions CASCADE;"

# Rerun migration
alembic upgrade head
```

### Lock Not Working

```bash
# Check lock status
curl "http://localhost:8000/dms/files-dms/${FILE_ID}/lock" \
  -H "Authorization: Bearer ${TOKEN}"

# Unlock if needed
curl -X DELETE "http://localhost:8000/dms/files-dms/${FILE_ID}/lock" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Reminders Not Showing

```bash
# Get all reminders (not just due)
curl "http://localhost:8000/dms/files-dms/reminders/me?due=all" \
  -H "Authorization: Bearer ${TOKEN}"
```

## 🚀 Future Enhancements

- [ ] Email notifications for due reminders
- [ ] Version comparison/diff
- [ ] Auto-lock on edit
- [ ] Lock extension
- [ ] Bulk operations
- [ ] Audit trail
- [ ] Recurring reminders
- [ ] Advanced search in versions

## 📝 License

Part of the DocFlow DMS system.

## 🤝 Contributing

See main project CONTRIBUTING.md

## 📧 Support

For issues or questions, please refer to the main project documentation.
