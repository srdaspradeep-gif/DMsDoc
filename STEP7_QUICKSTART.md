# Step 7 Quick Start Guide

## Setup

### 1. Run Database Migration
```bash
cd docflow
alembic upgrade head
```

This will create the new tables:
- `shares` - Sharing management
- `retention_policies` - Retention policies
- `inbox_entries` and `inbox_attachments` - Inbox functionality
- `audit_logs` - Audit trail
- Updates to `users`, `accounts`, and `account_users` tables

### 2. Seed Modules (if needed)
The required modules should already exist from previous steps:
- `sharing`
- `retention`
- `inbox`
- `audit`
- `admin_users`

If not, run:
```bash
python -m app.scripts.seed_modules
```

### 3. Assign Permissions
Use the admin UI or API to assign permissions to roles:
- Grant `sharing` permissions to users who can create shares
- Grant `retention` permissions to admins who manage policies
- Grant `inbox` permissions to users who need inbox access
- Grant `audit` permissions to admins who need to view logs
- Grant `admin_users` permissions for recycle bin access

## Testing Features

### 1. Sharing

**Create a share:**
```bash
curl -X POST http://localhost:8000/dms/shares \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "ACCOUNT_ID",
    "resource_type": "file",
    "resource_id": "FILE_ID",
    "target_type": "user",
    "target_id": "USER_ID",
    "access_level": "view"
  }'
```

**Create a public link:**
```bash
curl -X POST http://localhost:8000/dms/shares \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "ACCOUNT_ID",
    "resource_type": "file",
    "resource_id": "FILE_ID",
    "target_type": "public_link",
    "access_level": "view",
    "expires_at": "2024-12-31T23:59:59Z"
  }'
```

**List my shares:**
```bash
curl http://localhost:8000/dms/shares/my-shares?account_id=ACCOUNT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Retention Policies

**Create a retention policy:**
```bash
curl -X POST http://localhost:8000/dms/retention \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "ACCOUNT_ID",
    "folder_id": "FOLDER_ID",
    "apply_to_subfolders": true,
    "retention_days": 90,
    "mode": "move_to_recycle"
  }'
```

**Apply retention policies:**
```bash
curl -X POST http://localhost:8000/dms/retention/apply/ACCOUNT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Inbox

**Get inbox address:**
```bash
curl http://localhost:8000/dms/inbox/address/ACCOUNT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Simulate receiving an email:**
```bash
curl -X POST "http://localhost:8000/dms/inbox?inbox_address=INBOX_ADDRESS" \
  -H "Content-Type: application/json" \
  -d '{
    "from_email": "sender@example.com",
    "subject": "Test Document",
    "body": "This is a test email with attachments",
    "attachments": [
      {
        "filename": "document.pdf",
        "content_base64": "BASE64_ENCODED_CONTENT",
        "mime_type": "application/pdf"
      }
    ]
  }'
```

**List inbox entries:**
```bash
curl "http://localhost:8000/dms/inbox?account_id=ACCOUNT_ID&is_processed=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Move attachments to folder:**
```bash
curl -X POST http://localhost:8000/dms/inbox/ENTRY_ID/move \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "folder_id": "FOLDER_ID"
  }'
```

### 4. Recycle Bin

**List deleted files:**
```bash
curl "http://localhost:8000/dms/recycle-bin/files?account_id=ACCOUNT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Restore files:**
```bash
curl -X POST "http://localhost:8000/dms/recycle-bin/restore?account_id=ACCOUNT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "item_ids": ["FILE_ID_1", "FILE_ID_2"],
    "item_type": "file"
  }'
```

**Permanently delete:**
```bash
curl -X DELETE "http://localhost:8000/dms/recycle-bin/permanent?account_id=ACCOUNT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "item_ids": ["FILE_ID"],
    "item_type": "file"
  }'
```

### 5. Audit Logs

**Query audit logs:**
```bash
curl -X POST "http://localhost:8000/dms/audit/query?account_id=ACCOUNT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-01-01T00:00:00Z",
    "action": "file.upload",
    "skip": 0,
    "limit": 50
  }'
```

**Get resource history:**
```bash
curl "http://localhost:8000/dms/audit/resource/file/FILE_ID?account_id=ACCOUNT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get user activity:**
```bash
curl "http://localhost:8000/dms/audit/user/USER_ID?account_id=ACCOUNT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Access Overview

**Get user access:**
```bash
curl "http://localhost:8000/dms/access-overview/user/USER_ID?account_id=ACCOUNT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get resource access:**
```bash
curl "http://localhost:8000/dms/access-overview/resource/file/FILE_ID?account_id=ACCOUNT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 7. Profile Settings

**Get profile:**
```bash
curl http://localhost:8000/rbac/profile/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Update profile:**
```bash
curl -X PUT http://localhost:8000/rbac/profile/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "es",
    "timezone": "America/New_York",
    "default_account_id": "ACCOUNT_ID"
  }'
```

**Update notification preferences:**
```bash
curl -X PUT http://localhost:8000/rbac/profile/notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "ACCOUNT_ID",
    "preferences": {
      "email_on_share": true,
      "email_on_approval": true,
      "email_on_reminder": false
    }
  }'
```

## Frontend Usage

### Desktop

1. **Share Dialog**: Click share button on any file/folder to open share dialog
2. **Inbox**: Navigate to Inbox page to view and process incoming emails
3. **Recycle Bin**: Admin menu → Recycle Bin to manage deleted items
4. **Audit Log**: Admin menu → Audit Log to view system activity
5. **Profile**: User menu → Profile to update settings

### Mobile

1. **Share Indicators**: Shared items show share icon
2. **Inbox**: Bottom nav → Inbox
3. **Recycle Bin**: Admin section (simplified view)
4. **Profile**: Bottom nav → Profile

## Common Workflows

### Workflow 1: Share a File with Expiration
1. Open file details
2. Click "Share" button
3. Select user/group
4. Set access level (view/edit)
5. Set expiration date
6. Click "Create Share"

### Workflow 2: Create Public Link
1. Open file details
2. Click "Share" button
3. Select "Public Link" as target type
4. Set access level
5. Set expiration (optional)
6. Copy generated link

### Workflow 3: Process Inbox Entry
1. Navigate to Inbox
2. View unprocessed entries
3. Select entry
4. Choose target folder
5. Click "Move" to import attachments

### Workflow 4: Set Up Retention Policy
1. Navigate to folder settings
2. Click "Retention Policy"
3. Set retention days
4. Choose mode (move to recycle or delete)
5. Enable "Apply to subfolders" if needed
6. Save policy

### Workflow 5: Restore Deleted File
1. Navigate to Recycle Bin (admin only)
2. Switch to "Files" tab
3. Select files to restore
4. Click "Restore Selected"

### Workflow 6: View Audit Trail
1. Navigate to Audit Log
2. Set filters (date range, action, user)
3. Click "Search"
4. View detailed logs with metadata

## Scheduled Jobs

Consider setting up cron jobs for:

1. **Apply Retention Policies** (daily):
```bash
0 2 * * * curl -X POST http://localhost:8000/dms/retention/apply/ACCOUNT_ID -H "Authorization: Bearer ADMIN_TOKEN"
```

2. **Clean Up Processed Inbox Entries** (weekly):
```bash
# Custom script to delete processed entries older than 30 days
```

3. **Archive Old Audit Logs** (monthly):
```bash
# Custom script to archive logs older than 1 year
```

## Troubleshooting

### Issue: Shares not working
- Check RBAC permissions for `sharing` module
- Verify account_id matches
- Check share expiration date

### Issue: Inbox not receiving
- Verify inbox_address is correct
- Check account exists
- Ensure storage service is configured

### Issue: Retention policy not applying
- Run apply endpoint manually
- Check policy configuration
- Verify folder_id is correct

### Issue: Audit logs not appearing
- Ensure audit logging is called in routes
- Check database connection
- Verify account_id

## Next Steps

1. Integrate audit logging into all existing routes
2. Add email notifications for shares
3. Implement advanced retention rules
4. Add audit log export functionality
5. Create access overview visualizations
6. Add share analytics and reporting
