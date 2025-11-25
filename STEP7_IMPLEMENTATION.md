# Step 7 Implementation: Sharing, Retention, Inbox, Audit, and Profile

## Overview
This document describes the implementation of Step 7 features including sharing, retention policies, recycle bin, inbox (email-import), access overview, audit logging, and profile settings.

## Database Models

### 1. Sharing (`shares` table)
- **Purpose**: Share files, folders, sections, or accounts with users, groups, or public links
- **Fields**:
  - `resource_type`: file, folder, section, account
  - `resource_id`: ID of the resource being shared
  - `target_type`: user, group, public_link
  - `target_id`: ID of user/group (null for public links)
  - `access_level`: preview, view, edit
  - `expires_at`: Optional expiration date
  - `public_token`: Unique token for public links

### 2. Retention Policies (`retention_policies` table)
- **Purpose**: Automatically move or delete files after a specified period
- **Fields**:
  - `folder_id`: Folder to apply policy to
  - `apply_to_subfolders`: Whether to apply recursively
  - `retention_days`: Days before action
  - `mode`: move_to_recycle or delete

### 3. Inbox (`inbox_entries` and `inbox_attachments` tables)
- **Purpose**: Email-import equivalent for receiving documents
- **Features**:
  - Each account has unique `inbox_address`
  - Inbox entries store email metadata
  - Attachments can be moved to folders as files

### 4. Audit Logs (`audit_logs` table)
- **Purpose**: Comprehensive audit trail for compliance
- **Fields**:
  - `action`: Action performed (e.g., "file.upload", "share.create")
  - `resource_type` and `resource_id`: What was affected
  - `user_id` or `api_key_id`: Who performed the action
  - `metadata`: Additional context (JSON)
  - `ip_address` and `user_agent`: Request details

### 5. Profile Settings
- **User table additions**:
  - `language`: ISO 639-1 language code
  - `timezone`: IANA timezone
  - `default_account_id`: Default account for user
- **Account-User table additions**:
  - `notification_preferences`: JSON for notification settings

## API Endpoints

### Sharing (`/dms/shares`)
- `POST /dms/shares` - Create share
- `GET /dms/shares` - List shares (with filters)
- `GET /dms/shares/my-shares` - List shares accessible by current user
- `GET /dms/shares/{share_id}` - Get share details
- `PUT /dms/shares/{share_id}` - Update share
- `DELETE /dms/shares/{share_id}` - Delete share
- `GET /dms/shares/public/{token}` - Access public share (no auth)

### Retention (`/dms/retention`)
- `POST /dms/retention` - Create retention policy
- `GET /dms/retention` - List policies
- `GET /dms/retention/{policy_id}` - Get policy
- `PUT /dms/retention/{policy_id}` - Update policy
- `DELETE /dms/retention/{policy_id}` - Delete policy
- `POST /dms/retention/apply/{account_id}` - Apply all policies (admin)

### Inbox (`/dms/inbox`)
- `GET /dms/inbox/address/{account_id}` - Get/generate inbox address
- `POST /dms/inbox` - Receive email (no auth, for external systems)
- `GET /dms/inbox` - List inbox entries
- `GET /dms/inbox/{entry_id}` - Get entry details
- `POST /dms/inbox/{entry_id}/move` - Move attachments to folder
- `DELETE /dms/inbox/{entry_id}` - Delete entry

### Recycle Bin (`/dms/recycle-bin`)
- `GET /dms/recycle-bin/files` - List deleted files (admin)
- `GET /dms/recycle-bin/folders` - List deleted folders (admin)
- `POST /dms/recycle-bin/restore` - Restore items
- `DELETE /dms/recycle-bin/permanent` - Permanently delete items
- `DELETE /dms/recycle-bin/empty/{account_id}` - Empty recycle bin

### Audit (`/dms/audit`)
- `POST /dms/audit/query` - Query logs with filters
- `GET /dms/audit/resource/{type}/{id}` - Get resource history
- `GET /dms/audit/user/{user_id}` - Get user activity
- `GET /dms/audit/stats/{action}` - Get action statistics

### Access Overview (`/dms/access-overview`)
- `GET /dms/access-overview/user/{user_id}` - Resources user can access
- `GET /dms/access-overview/resource/{type}/{id}` - Who can access resource

### Profile (`/rbac/profile`)
- `GET /rbac/profile/me` - Get current user profile
- `PUT /rbac/profile/me` - Update profile settings
- `GET /rbac/profile/notifications/{account_id}` - Get notification preferences
- `PUT /rbac/profile/notifications` - Update notification preferences

## RBAC Modules

The following modules control access to Step 7 features:
- `sharing` - Share management
- `retention` - Retention policy management
- `inbox` - Inbox access
- `audit` - Audit log viewing
- `admin_users` - Required for recycle bin and access overview

## Access Levels

### Sharing Access Levels
1. **Preview**: View preview only, no download/print/copy
2. **View**: Can download/print, no metadata changes
3. **Edit**: Can change metadata and upload new versions (respects file locks)

### Integration with RBAC
- Shares grant **additional** rights on top of RBAC
- Shares never reduce existing permissions
- Check both RBAC permissions and shares when authorizing access

## Audit Logging

### Key Actions to Log
- File operations: upload, download, preview, delete, restore
- Metadata changes: update, tag addition/removal
- Versioning: version create, version restore
- Locking: lock acquire, lock release
- Approvals: workflow start, approval/rejection
- Sharing: share create, update, delete
- Inbox: email receive, attachment move
- Retention: policy create/update, policy application
- Access: login, logout, permission changes

### Audit Log Usage
```python
from app.db.repositories.dms.audit_repository import AuditRepository

audit_repo = AuditRepository(db)
await audit_repo.log_action(
    account_id=account_id,
    user_id=current_user.id,
    action="file.upload",
    resource_type="file",
    resource_id=file.id,
    metadata={"filename": file.name, "size": file.size_bytes},
    ip_address=request.client.host,
    user_agent=request.headers.get("user-agent")
)
```

## Migration

Run the migration to create new tables:
```bash
cd docflow
alembic upgrade head
```

The migration will:
1. Add `inbox_address` to accounts table
2. Add `language`, `timezone`, `default_account_id` to users table
3. Add `notification_preferences` to account_users table
4. Create `shares` table
5. Create `retention_policies` table
6. Create `inbox_entries` and `inbox_attachments` tables
7. Create `audit_logs` table

## Frontend Integration

### Desktop Features
1. **Share Dialog**: Modal for creating/managing shares
2. **Retention Settings**: Folder settings panel
3. **Recycle Bin**: Admin page for deleted items
4. **Inbox**: Dedicated inbox view with email list
5. **Access Overview**: Show who has access to resources
6. **Audit Log Viewer**: Filterable log viewer
7. **Profile Settings**: User preferences page

### Mobile Features
1. **Share Indicators**: Icons showing shared resources
2. **Simple Recycle Bin**: List with restore action
3. **Inbox List**: Simple list with move action
4. **Profile Page**: Basic settings (language, timezone, account)

## Testing

### Test Scenarios
1. Create share with different access levels
2. Access resource via public link
3. Create and apply retention policy
4. Receive email in inbox and move to folder
5. Soft delete file and restore from recycle bin
6. Query audit logs with various filters
7. Update profile settings
8. View access overview for user and resource

## Security Considerations

1. **Public Links**: 
   - Use cryptographically secure tokens
   - Respect expiration dates
   - Log all public link access

2. **Audit Logs**:
   - Immutable (no updates/deletes)
   - Capture IP and user agent
   - Index for performance

3. **Recycle Bin**:
   - Admin-only access
   - Permanent deletion is irreversible
   - Log all restore/delete operations

4. **Inbox**:
   - Validate inbox address before accepting
   - Scan attachments for malware (future enhancement)
   - Rate limit email reception

## Performance Optimization

1. **Audit Logs**: Partition by date for large datasets
2. **Shares**: Index on resource and target for fast lookups
3. **Retention**: Run as scheduled job, not on-demand
4. **Inbox**: Clean up processed entries periodically

## Future Enhancements

1. Share notifications (email when shared)
2. Advanced retention rules (based on metadata)
3. Inbox email parsing (extract metadata from email)
4. Audit log export (CSV, JSON)
5. Access overview visualization (graph)
6. Share analytics (view counts, download stats)
