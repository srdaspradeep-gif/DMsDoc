# File Versioning, Locking & Reminders Implementation

## Overview

This document describes the implementation of file versioning, check-in/check-out locking, and reminder features for the DocFlow DMS system.

## Database Schema

### 1. File Versions (`file_versions`)

Stores historical versions of files. Each upload creates a new version.

**Columns:**
- `id` (String(26), PK): ULID identifier
- `file_id` (String(26), FK → files_new.id): Parent file reference
- `version_number` (Integer): Sequential version number (1, 2, 3, ...)
- `storage_path` (String(1000)): S3/MinIO path for this version
- `mime_type` (String(200)): File MIME type
- `size_bytes` (BigInteger): File size in bytes
- `file_hash` (String(64)): SHA-256 hash for integrity
- `comment` (Text, nullable): Version comment/description
- `created_by` (String(26), FK → users.id): User who created this version
- `created_at` (DateTime): Creation timestamp

**Indexes:**
- `idx_file_versions_file` on (`file_id`, `version_number`)

### 2. File Locks (`file_locks`)

Manages file check-in/check-out locking. Only one active lock per file at a time.

**Columns:**
- `id` (String(26), PK): ULID identifier
- `file_id` (String(26), FK → files_new.id, UNIQUE): File being locked
- `locked_by` (String(26), FK → users.id): User who locked the file
- `locked_until` (DateTime): Auto-unlock time
- `created_at` (DateTime): Lock creation timestamp

**Indexes:**
- `idx_file_locks_until` on (`locked_until`)

**Constraints:**
- UNIQUE constraint on `file_id` ensures only one lock per file

### 3. File Reminders (`file_reminders`)

Reminders for files. Users can set reminders for themselves or others.

**Columns:**
- `id` (String(26), PK): ULID identifier
- `file_id` (String(26), FK → files_new.id): File reference
- `created_by` (String(26), FK → users.id): User who created the reminder
- `target_user_id` (String(26), FK → users.id): User to be reminded
- `remind_at` (DateTime): When to trigger the reminder
- `message` (Text): Reminder message
- `status` (Enum): pending | sent | dismissed
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last update timestamp

**Indexes:**
- `idx_file_reminders_due` on (`target_user_id`, `status`, `remind_at`)

### 4. Files Table Updates (`files_new`)

Added columns to support versioning:
- `document_id` (String(50)): Unique identifier for linking (unique per account)
- `tags` (ARRAY(String)): Simple tags array
- `notes` (Text): Free-form notes with support for links
- `current_version_id` (String(26), nullable): Points to current active version

**Constraints:**
- `uq_file_account_document_id`: UNIQUE constraint on (`account_id`, `document_id`)

## API Endpoints

### File Versions

#### 1. Upload New Version
```
POST /dms/files-dms/{file_id}/versions
```
- **Permission**: `files:update`
- **Body**: Multipart form with file upload
- **Query Params**: `comment` (optional)
- **Headers**: `X-Account-Id`
- **Response**: `FileVersionOut`
- **Behavior**:
  - Checks if file is locked by another user
  - Uploads file to S3 with versioned path
  - Creates new version record with auto-incremented version number
  - Updates file's `current_version_id` to point to new version

#### 2. List File Versions
```
GET /dms/files-dms/{file_id}/versions
```
- **Permission**: `files:read`
- **Query Params**: `skip`, `limit`
- **Response**: `List[FileVersionOut]`
- **Behavior**: Returns all versions ordered by version number (descending)

#### 3. Get Version Details
```
GET /dms/files-dms/{file_id}/versions/{version_id}
```
- **Permission**: `files:read`
- **Response**: `FileVersionOut`

#### 4. Download Specific Version
```
GET /dms/files-dms/{file_id}/versions/{version_id}/download
```
- **Permission**: `files:read`
- **Response**: File content with appropriate headers
- **Behavior**: Downloads the specific version from S3

#### 5. Restore Version
```
POST /dms/files-dms/{file_id}/versions/{version_id}/restore
```
- **Permission**: `files:update`
- **Response**: `FileVersionOut`
- **Behavior**:
  - Checks if file is locked by another user
  - Updates file's `current_version_id` to selected version
  - Updates file metadata (storage_path, mime_type, size, hash)

### File Locks

#### 1. Lock File
```
POST /dms/files-dms/{file_id}/lock
```
- **Permission**: `files:update`
- **Query Params**: `duration_hours` (default: 6, max: 72)
- **Headers**: `X-Account-Id`
- **Response**: `FileLockOut`
- **Behavior**:
  - Verifies file exists
  - Checks if already locked (returns 400 if locked)
  - Creates lock with expiration time
  - Default duration: 6 hours

#### 2. Unlock File
```
DELETE /dms/files-dms/{file_id}/lock
```
- **Permission**: `files:update`
- **Response**: 204 No Content
- **Behavior**:
  - Only lock owner or admin can unlock
  - Returns 403 if user doesn't have permission
  - Returns 404 if no lock exists

#### 3. Get Lock Status
```
GET /dms/files-dms/{file_id}/lock
```
- **Permission**: `files:read`
- **Response**: `FileLockStatus`
- **Behavior**: Returns lock status with user details and unlock permission

### File Reminders

#### 1. Create Reminder
```
POST /dms/files-dms/{file_id}/reminders
```
- **Permission**: `files:read`
- **Body**: `FileReminderCreate`
  ```json
  {
    "target_user_id": "user_ulid",
    "remind_at": "2025-12-01T10:00:00Z",
    "message": "Review this document"
  }
  ```
- **Response**: `FileReminderOut`

#### 2. List File Reminders
```
GET /dms/files-dms/{file_id}/reminders
```
- **Permission**: `files:read`
- **Query Params**: `skip`, `limit`
- **Response**: `List[FileReminderOut]`

#### 3. Get My Reminders
```
GET /dms/files-dms/reminders/me
```
- **Permission**: `files:read`
- **Query Params**: 
  - `due`: "now" (only due reminders) or "all" (all reminders)
  - `skip`, `limit`
- **Response**: `List[FileReminderDetail]`
- **Behavior**: Returns reminders with file and user details

#### 4. Update Reminder
```
PATCH /dms/files-dms/reminders/{reminder_id}
```
- **Permission**: `files:read`
- **Body**: `FileReminderUpdate`
  ```json
  {
    "remind_at": "2025-12-02T10:00:00Z",
    "message": "Updated message",
    "status": "dismissed"
  }
  ```
- **Response**: `FileReminderOut`

#### 5. Delete Reminder
```
DELETE /dms/files-dms/reminders/{reminder_id}
```
- **Permission**: `files:read`
- **Response**: 204 No Content

## Lock Enforcement

When a file is locked by another user, the following operations are blocked:

1. **Upload New Version**: Returns 403 with lock details
2. **Restore Version**: Returns 403 with lock details
3. **Update File Metadata**: Should be blocked (implement in files_dms.py)
4. **Move/Rename File**: Should be blocked (implement in files_dms.py)

Lock owner can perform all operations normally.

## Pydantic Schemas

### FileVersionOut
```python
class FileVersionOut(BaseModel):
    id: str
    file_id: str
    version_number: int
    storage_path: str
    mime_type: Optional[str]
    size_bytes: int
    file_hash: Optional[str]
    comment: Optional[str]
    created_by: str
    created_at: datetime
```

### FileLockOut
```python
class FileLockOut(BaseModel):
    id: str
    file_id: str
    locked_by: str
    locked_until: datetime
    created_at: datetime
```

### FileLockStatus
```python
class FileLockStatus(BaseModel):
    is_locked: bool
    locked_by: Optional[str] = None
    locked_by_username: Optional[str] = None
    locked_until: Optional[datetime] = None
    can_unlock: bool = False
```

### FileReminderOut
```python
class FileReminderOut(BaseModel):
    id: str
    file_id: str
    created_by: str
    target_user_id: str
    remind_at: datetime
    message: str
    status: str  # pending, sent, dismissed
    created_at: datetime
    updated_at: datetime
```

### FileReminderDetail
```python
class FileReminderDetail(FileReminderOut):
    file_name: str
    document_id: str
    creator_username: str
    target_username: str
```

## Repository Methods

### VersioningRepository

**File Versions:**
- `create_version()`: Create new version with auto-incremented version number
- `get_version()`: Get version by ID
- `list_versions()`: List all versions for a file
- `restore_version()`: Make a specific version current

**File Locks:**
- `create_lock()`: Lock file with duration
- `get_active_lock()`: Get active lock (not expired)
- `unlock_file()`: Remove lock (owner or admin only)
- `check_file_locked()`: Check if file is locked by another user
- `cleanup_expired_locks()`: Remove expired locks (periodic task)

**File Reminders:**
- `create_reminder()`: Create new reminder
- `get_reminder()`: Get reminder by ID
- `list_reminders()`: List reminders with filters
- `get_due_reminders()`: Get pending reminders that are due
- `update_reminder()`: Update reminder
- `delete_reminder()`: Delete reminder
- `mark_reminder_sent()`: Mark reminder as sent

## Migration

Run the migration to create tables:

```bash
cd docflow
alembic upgrade head
```

This will:
1. Add `document_id`, `tags`, `notes`, `current_version_id` to `files_new`
2. Create `file_versions` table
3. Create `file_locks` table
4. Create `file_reminders` table
5. Create necessary indexes and constraints

## RBAC Integration

All endpoints use the existing RBAC system with the "files" module:
- `files:read` - View files, versions, locks, reminders
- `files:update` - Upload versions, lock/unlock files, restore versions
- `files:admin` - Unlock any file (even if locked by another user)

## Frontend Integration (Next Steps)

### Desktop UI

**File Detail Page:**
1. **Versions Tab**:
   - List all versions with version number, date, user, comment
   - Actions: Download, Restore (with confirmation)
   - Upload new version button with comment field

2. **Lock Section**:
   - Show lock status badge (locked/unlocked)
   - If locked: Show who locked it and until when
   - Lock/Unlock button (disabled if locked by another user)
   - Duration selector when locking (1-72 hours)

3. **Reminders Tab**:
   - List reminders for this file
   - Add reminder form: Select user, date/time picker, message
   - Edit/Delete actions

**My Reminders Page** (Profile/Dashboard):
- List of due reminders with file links
- Dismiss action
- Filter by status (pending/sent/dismissed)

### Mobile UI

**File View:**
- Version list (simplified)
- Download current version button
- Lock status indicator
- Lock/Unlock toggle (if owner)

**Reminders:**
- Separate "My Reminders" section in Profile tab
- Simple list with file name, message, due date
- Tap to view file
- Swipe to dismiss

## Testing

### Manual Testing

1. **Versioning**:
   - Upload file
   - Upload new version with comment
   - List versions
   - Download specific version
   - Restore old version
   - Verify current version updated

2. **Locking**:
   - Lock file as User A
   - Try to upload version as User B (should fail)
   - Try to unlock as User B (should fail)
   - Unlock as User A (should succeed)
   - Try to unlock as Admin (should succeed)

3. **Reminders**:
   - Create reminder for another user
   - List file reminders
   - Get my reminders (due=now)
   - Update reminder status
   - Delete reminder

### API Testing with curl

```bash
# Upload new version
curl -X POST "http://localhost:8000/dms/files-dms/{file_id}/versions?comment=Updated%20content" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Account-Id: $ACCOUNT_ID" \
  -F "file=@document.pdf"

# List versions
curl "http://localhost:8000/dms/files-dms/{file_id}/versions" \
  -H "Authorization: Bearer $TOKEN"

# Lock file
curl -X POST "http://localhost:8000/dms/files-dms/{file_id}/lock?duration_hours=6" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Account-Id: $ACCOUNT_ID"

# Get lock status
curl "http://localhost:8000/dms/files-dms/{file_id}/lock" \
  -H "Authorization: Bearer $TOKEN"

# Create reminder
curl -X POST "http://localhost:8000/dms/files-dms/{file_id}/reminders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_user_id": "user_ulid",
    "remind_at": "2025-12-01T10:00:00Z",
    "message": "Please review this document"
  }'

# Get my due reminders
curl "http://localhost:8000/dms/files-dms/reminders/me?due=now" \
  -H "Authorization: Bearer $TOKEN"
```

## Future Enhancements

1. **Notification System**: Send actual notifications when reminders are due
2. **Version Comparison**: Show diff between versions
3. **Auto-lock**: Automatically lock file when user starts editing
4. **Lock Extension**: Allow extending lock duration
5. **Reminder Recurrence**: Support recurring reminders
6. **Version Comments**: Allow adding comments to existing versions
7. **Bulk Operations**: Lock/unlock multiple files at once
8. **Audit Trail**: Track all version/lock/reminder operations

## Notes

- All operations are account-scoped via RBAC
- Expired locks are automatically ignored (can be cleaned up periodically)
- Version numbers are auto-incremented per file
- Storage paths include version information for organization
- File hash (SHA-256) is stored for integrity verification
- Lock duration is configurable (1-72 hours)
- Reminders support three statuses: pending, sent, dismissed
