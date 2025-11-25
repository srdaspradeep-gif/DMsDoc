# Step 7: Sharing, Retention, Inbox, Audit & Profile - Complete Implementation

## 🎯 Overview

Step 7 adds the final layer of enterprise DMS features including sharing, retention policies, inbox (email-import), comprehensive audit logging, recycle bin, access overview, and user profile settings. This completes the full-featured Document Management System.

## 📋 What's Included

### 1. Sharing System
Share files, folders, sections, or entire accounts with:
- **Users**: Direct user access
- **Groups**: Share with entire groups
- **Public Links**: Generate secure public URLs

**Access Levels**:
- **Preview**: View preview only (no download/print/copy)
- **View**: Download and print (no metadata changes)
- **Edit**: Full edit access (respects file locks)

**Features**:
- Optional expiration dates
- Cryptographically secure public tokens
- Integration with RBAC (additive permissions)
- Audit trail for all share operations

### 2. Retention Policies
Automate document lifecycle management:
- Configure retention period per folder
- Apply to subfolders recursively
- Two modes:
  - **Move to Recycle**: Soft delete (recoverable)
  - **Delete**: Permanent deletion
- Scheduled job support for automatic application

### 3. Inbox (Email-Import)
Receive documents via email:
- Unique inbox address per account
- Email metadata capture (from, subject, body)
- Attachment storage and management
- Move attachments to folders as files
- Processing status tracking

### 4. Audit Logging
Comprehensive audit trail:
- Log all significant actions
- Capture user/API key, IP, user agent
- Flexible metadata (JSON)
- Query with filters (date, user, action, resource)
- Indexed for performance

### 5. Recycle Bin
Manage deleted items (admin only):
- List deleted files and folders
- Restore items
- Permanently delete items
- Empty entire recycle bin
- Soft delete mechanism

### 6. Access Overview
Compliance and security:
- View all resources a user can access
- View all users/groups that can access a resource
- Shows access source (role, group, share)
- Includes expiration information

### 7. Profile Settings
User preferences:
- Language selection (i18n ready)
- Timezone configuration
- Default account selection
- Notification preferences per account

## 🚀 Quick Start

### 1. Run Migration
```bash
cd docflow
alembic upgrade head
```

### 2. Verify Setup
```bash
# Check tables created
psql -d your_database -c "\dt *step7*"

# Verify modules exist
python -m app.scripts.seed_modules
```

### 3. Test API
```bash
bash scripts/test_step7_api.sh
```

### 4. Access Frontend
Navigate to:
- `/inbox` - Inbox page
- `/recycle-bin` - Recycle bin (admin)
- `/audit-log` - Audit log viewer (admin)
- `/profile` - Profile settings

## 📚 Documentation

- **[STEP7_IMPLEMENTATION.md](STEP7_IMPLEMENTATION.md)** - Detailed technical implementation
- **[STEP7_QUICKSTART.md](STEP7_QUICKSTART.md)** - API examples and workflows
- **[STEP7_SUMMARY.md](STEP7_SUMMARY.md)** - Complete feature summary

## 🔧 Configuration

### Environment Variables
No new environment variables required. Uses existing:
- `DATABASE_URL` - Database connection
- `STORAGE_*` - Storage service configuration

### RBAC Modules
Ensure these modules exist and have permissions assigned:
- `sharing` - Share management
- `retention` - Retention policies
- `inbox` - Inbox access
- `audit` - Audit log viewing
- `admin_users` - Recycle bin and access overview

### Scheduled Jobs
Set up cron jobs for:

**Apply Retention Policies (Daily at 2 AM)**:
```bash
0 2 * * * curl -X POST http://localhost:8000/dms/retention/apply/ACCOUNT_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Clean Up Old Inbox Entries (Weekly)**:
```bash
# Custom script to delete processed entries older than 30 days
```

**Archive Old Audit Logs (Monthly)**:
```bash
# Custom script to archive logs older than 1 year
```

## 📊 Database Schema

### New Tables
```sql
-- Sharing
CREATE TABLE shares (
    id VARCHAR(26) PRIMARY KEY,
    account_id VARCHAR(26) REFERENCES accounts(id),
    resource_type ENUM('FILE', 'FOLDER', 'SECTION', 'ACCOUNT'),
    resource_id VARCHAR(26),
    target_type ENUM('USER', 'GROUP', 'PUBLIC_LINK'),
    target_id VARCHAR(26),
    access_level ENUM('PREVIEW', 'VIEW', 'EDIT'),
    expires_at TIMESTAMP WITH TIME ZONE,
    public_token VARCHAR(64) UNIQUE,
    created_by VARCHAR(26) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Retention Policies
CREATE TABLE retention_policies (
    id VARCHAR(26) PRIMARY KEY,
    account_id VARCHAR(26) REFERENCES accounts(id),
    folder_id VARCHAR(26) REFERENCES folders_new(id),
    apply_to_subfolders BOOLEAN DEFAULT FALSE,
    retention_days INTEGER NOT NULL,
    mode ENUM('MOVE_TO_RECYCLE', 'DELETE'),
    created_by VARCHAR(26) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inbox
CREATE TABLE inbox_entries (
    id VARCHAR(26) PRIMARY KEY,
    account_id VARCHAR(26) REFERENCES accounts(id),
    from_email VARCHAR(500),
    subject VARCHAR(1000),
    body_preview TEXT,
    folder_id VARCHAR(26) REFERENCES folders_new(id),
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by VARCHAR(26) REFERENCES users(id)
);

CREATE TABLE inbox_attachments (
    id VARCHAR(26) PRIMARY KEY,
    inbox_entry_id VARCHAR(26) REFERENCES inbox_entries(id),
    filename VARCHAR(500),
    mime_type VARCHAR(200),
    size_bytes VARCHAR(20),
    storage_path VARCHAR(1000),
    file_id VARCHAR(26) REFERENCES files_new(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id VARCHAR(26) PRIMARY KEY,
    account_id VARCHAR(26) REFERENCES accounts(id),
    user_id VARCHAR(26) REFERENCES users(id),
    api_key_id VARCHAR(26) REFERENCES api_keys(id),
    action VARCHAR(100),
    resource_type VARCHAR(50),
    resource_id VARCHAR(26),
    metadata JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Modified Tables
```sql
-- Accounts: Add inbox address
ALTER TABLE accounts ADD COLUMN inbox_address VARCHAR(200) UNIQUE;

-- Users: Add profile settings
ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN default_account_id VARCHAR(26) REFERENCES accounts(id);

-- Account Users: Add notification preferences
ALTER TABLE account_users ADD COLUMN notification_preferences TEXT;
```

## 🔌 API Endpoints

### Sharing
```
POST   /dms/shares                      Create share
GET    /dms/shares                      List shares
GET    /dms/shares/my-shares            List user's shares
GET    /dms/shares/{id}                 Get share
PUT    /dms/shares/{id}                 Update share
DELETE /dms/shares/{id}                 Delete share
GET    /dms/shares/public/{token}       Access public share
```

### Retention
```
POST   /dms/retention                   Create policy
GET    /dms/retention                   List policies
GET    /dms/retention/{id}              Get policy
PUT    /dms/retention/{id}              Update policy
DELETE /dms/retention/{id}              Delete policy
POST   /dms/retention/apply/{account}   Apply policies
```

### Inbox
```
GET    /dms/inbox/address/{account}     Get inbox address
POST   /dms/inbox                       Receive email
GET    /dms/inbox                       List entries
GET    /dms/inbox/{id}                  Get entry
POST   /dms/inbox/{id}/move             Move to folder
DELETE /dms/inbox/{id}                  Delete entry
```

### Recycle Bin
```
GET    /dms/recycle-bin/files           List deleted files
GET    /dms/recycle-bin/folders         List deleted folders
POST   /dms/recycle-bin/restore         Restore items
DELETE /dms/recycle-bin/permanent       Permanently delete
DELETE /dms/recycle-bin/empty/{account} Empty bin
```

### Audit
```
POST   /dms/audit/query                 Query logs
GET    /dms/audit/resource/{type}/{id}  Resource history
GET    /dms/audit/user/{id}             User activity
GET    /dms/audit/stats/{action}        Action statistics
```

### Access Overview
```
GET    /dms/access-overview/user/{id}           User access
GET    /dms/access-overview/resource/{type}/{id} Resource access
```

### Profile
```
GET    /rbac/profile/me                         Get profile
PUT    /rbac/profile/me                         Update profile
GET    /rbac/profile/notifications/{account}    Get preferences
PUT    /rbac/profile/notifications              Update preferences
```

## 💻 Frontend Components

### Desktop
- **ShareDialog.jsx** - Share management modal
- **Inbox.jsx** - Inbox page with email list
- **RecycleBin.jsx** - Recycle bin management
- **AuditLog.jsx** - Audit log viewer with filters
- **Profile.jsx** - User profile settings

### Mobile
- Responsive design for all components
- Touch-friendly buttons and interactions
- Simplified views for mobile screens
- Bottom navigation integration

## 🧪 Testing

### Automated Tests
```bash
# Run full test suite
bash scripts/test_step7_api.sh

# Tests include:
# - Profile settings (get, update)
# - Sharing (user shares, public links)
# - Inbox (address, entries)
# - Retention (policies)
# - Audit logs (query, activity)
# - Access overview
# - Recycle bin
```

### Manual Testing
See [STEP7_QUICKSTART.md](STEP7_QUICKSTART.md) for detailed curl examples.

## 🔒 Security

### Public Links
- Cryptographically secure tokens (32 bytes)
- Optional expiration dates
- Access level restrictions
- Audit trail for all access

### Audit Logs
- Immutable (no updates/deletes)
- Capture IP and user agent
- Comprehensive indexing
- Query restrictions via RBAC

### Recycle Bin
- Admin-only access
- Permanent deletion confirmation
- Audit trail for all operations

### Inbox
- Validate inbox address
- Rate limiting (future)
- Malware scanning (future)

## 📈 Performance

### Optimizations
- **Audit Logs**: Indexed on account, action, date
- **Shares**: Indexed on resource and target
- **Inbox**: Indexed on account and status
- **Retention**: Batch processing

### Monitoring
- Track audit log growth
- Monitor share access patterns
- Alert on retention policy failures
- Track inbox processing times

## 🔄 Integration

### With Existing Features
- **RBAC**: All endpoints use permission checks
- **DMS**: Shares integrate with file access
- **Versioning**: Audit logs track versions
- **Approvals**: Audit logs track approvals
- **Storage**: Inbox uses storage service

### Adding Audit Logging
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

## 🎨 UI/UX

### Desktop Features
- Modal dialogs for sharing
- Filterable tables for audit logs
- Drag-and-drop for inbox
- Bulk operations for recycle bin
- Form validation for profile

### Mobile Features
- Bottom sheet for sharing
- Swipe actions for inbox
- Pull-to-refresh for lists
- Touch-friendly buttons
- Responsive layouts

## 📝 Common Workflows

### Share a File
1. Open file details
2. Click "Share" button
3. Select user/group or create public link
4. Set access level and expiration
5. Click "Create Share"

### Process Inbox Entry
1. Navigate to Inbox
2. View unprocessed entries
3. Select entry and target folder
4. Click "Move" to import attachments

### Restore Deleted File
1. Navigate to Recycle Bin (admin)
2. Find deleted file
3. Click "Restore"
4. File returns to original location

### View Audit Trail
1. Navigate to Audit Log
2. Set filters (date, user, action)
3. Click "Search"
4. View detailed logs

## 🚨 Troubleshooting

### Shares Not Working
- Check RBAC permissions for `sharing` module
- Verify account_id matches
- Check share expiration date
- Ensure target user/group exists

### Inbox Not Receiving
- Verify inbox_address is correct
- Check account exists and is active
- Ensure storage service is configured
- Check API endpoint accessibility

### Retention Policy Not Applying
- Run apply endpoint manually
- Check policy configuration
- Verify folder_id is correct
- Check for errors in logs

### Audit Logs Not Appearing
- Ensure audit logging is called in routes
- Check database connection
- Verify account_id is correct
- Check for database errors

## 🎯 Success Criteria

- ✅ All 34 API endpoints working
- ✅ Database migration successful
- ✅ RBAC integration complete
- ✅ Frontend components functional
- ✅ Test script passing
- ✅ Documentation complete
- ✅ Mobile responsive
- ✅ Security measures in place

## 🔮 Future Enhancements

### Phase 1 (Short-term)
- Email notifications for shares
- Advanced retention rules
- Inbox email parsing
- Audit log export

### Phase 2 (Medium-term)
- Share analytics
- Access request workflow
- Malware scanning for inbox
- Real-time audit streaming

### Phase 3 (Long-term)
- AI-powered access recommendations
- Predictive retention policies
- Advanced audit anomaly detection
- Visual access graphs

## 📞 Support

For issues or questions:
1. Check documentation files
2. Review test script output
3. Check application logs
4. Verify RBAC permissions
5. Test with curl examples

## 🎉 Conclusion

Step 7 completes the enterprise DMS implementation with:
- ✅ 34 new API endpoints
- ✅ 5 new database tables
- ✅ 6 frontend components
- ✅ Comprehensive audit logging
- ✅ Full RBAC integration
- ✅ Mobile-responsive design

The system is now production-ready with enterprise-grade features for sharing, retention, compliance, and user management.

**Next Steps**: Deploy to production, configure scheduled jobs, train users, and monitor system performance.
