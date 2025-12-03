# Settings & Audit Logs Module - Implementation & Fix

## Issues Fixed

### 1. Audit Logs Not Working
**Problem:** 
- Frontend was calling wrong API endpoint `/dms/audit/query` instead of `/v2/dms/audit/query`
- No data was showing up in the audit logs page

**Solution:**
- Updated `AuditLog.jsx` to use correct API endpoint `/v2/dms/audit/query`
- Added error handling to show detailed error messages
- Backend audit API was already properly implemented and working

### 2. Settings Page Missing
**Problem:** 
- Settings page showed only "Coming soon..." placeholder
- No functionality for:
  - Email configuration (SMTP settings)
  - Logo CRUD operations
  - Favicon CRUD operations
  - Application title and name management

**Solution:**
- Created comprehensive Settings page with three tabs:
  1. **General Settings**: App name, title, primary color
  2. **Branding**: Logo and favicon upload/management
  3. **Email Configuration**: Full SMTP settings with test email functionality

## New Features Implemented

### Settings Module

#### Backend Components
1. **API Routes** (`app/api/routes/dms/settings.py`)
   - `GET /v2/dms/settings` - Get current settings
   - `PUT /v2/dms/settings` - Update settings
   - `POST /v2/dms/settings/upload` - Upload logo/favicon
   - `POST /v2/dms/settings/test-email` - Send test email

2. **Database Table** (`app/db/tables/dms/settings.py`)
   - `app_settings` table with fields:
     - General: app_name, app_title, logo_url, favicon_url, primary_color
     - Email: smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, smtp_use_tls

3. **Repository** (`app/db/repositories/dms/settings_repository.py`)
   - Auto-creates default settings if not exists
   - Update settings with validation

4. **Schemas** (`app/schemas/dms/settings_schemas.py`)
   - SettingsOut, SettingsUpdate, TestEmailRequest

5. **Migration** (`migrations/versions/add_settings_table.py`)
   - Creates app_settings table with all required fields

#### Frontend Components
1. **Settings Page** (`frontend/src/pages/Settings.jsx`)
   - **General Tab**:
     - Application Name input
     - Application Title input
     - Primary Color picker
   
   - **Branding Tab**:
     - Logo upload with preview
     - Favicon upload with preview
     - Delete uploaded assets
     - File type validation
   
   - **Email Tab**:
     - SMTP Host and Port
     - SMTP Username and Password
     - From Email and From Name
     - TLS/STARTTLS toggle
     - Test Email button

### Features

#### General Settings
- Configure application name (appears in sidebar)
- Set application title/tagline
- Choose primary theme color with color picker

#### Branding
- Upload custom logo (recommended 200x200px)
- Upload custom favicon (recommended 32x32px or 64x64px)
- Preview uploaded images
- Remove/replace existing assets
- Supports PNG, SVG, ICO formats

#### Email Configuration
- Full SMTP configuration for email notifications
- Support for TLS/STARTTLS
- Test email functionality to verify configuration
- Secure password storage (should be encrypted in production)
- Used for:
  - Approval notifications
  - Reminder emails
  - Sharing notifications
  - System alerts

### Audit Logs

#### Fixed Issues
- Corrected API endpoint from `/dms/audit/query` to `/v2/dms/audit/query`
- Added better error handling and user feedback
- Maintained all existing filtering capabilities:
  - Date range filtering
  - User ID filtering
  - Action type filtering
  - Resource type filtering

#### Features
- View all system actions and changes
- Filter by date range, user, action, resource type
- View detailed metadata for each log entry
- Color-coded actions (create=green, delete=red, update=blue)
- Pagination support

## Integration Status

### ✅ Completed
- Settings API routes registered in router
- Settings database table created
- Settings frontend page with full CRUD
- Audit logs API endpoint fixed
- Both modules accessible from navigation
- RBAC permissions integrated (admin_users permission required)

### Database Schema

#### app_settings Table
```sql
CREATE TABLE app_settings (
    id VARCHAR(26) PRIMARY KEY,
    account_id VARCHAR(26) UNIQUE REFERENCES accounts(id),
    app_name VARCHAR(100) DEFAULT 'DocFlow',
    app_title VARCHAR(200),
    logo_url VARCHAR(500),
    favicon_url VARCHAR(500),
    primary_color VARCHAR(20) DEFAULT '#2563eb',
    smtp_host VARCHAR(200),
    smtp_port INTEGER DEFAULT 587,
    smtp_user VARCHAR(200),
    smtp_password TEXT,
    smtp_from_email VARCHAR(200),
    smtp_from_name VARCHAR(100),
    smtp_use_tls BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Access

- **Settings**: Navigate to Administration > Settings
- **Audit Logs**: Navigate to Administration > Audit Log

## Security Notes

1. **SMTP Password**: Currently stored as plain text. Should be encrypted using a secrets manager in production.
2. **File Uploads**: Stored in `uploads/branding/` directory. Ensure proper permissions and validation.
3. **Permissions**: Both modules require `admin_users` permission for read/write access.

## Next Steps (Optional Enhancements)

### Settings
1. Add email template customization
2. Add notification preferences per user
3. Add backup/restore settings
4. Add multi-language support configuration
5. Add custom CSS/theme editor
6. Encrypt SMTP password in database

### Audit Logs
1. Add export to CSV/Excel functionality
2. Add real-time log streaming
3. Add log retention policies
4. Add advanced search with regex
5. Add log aggregation and statistics dashboard
6. Add alerting for specific actions

## Testing

Both modules are now fully functional and can be tested:

1. **Settings**:
   - Navigate to `/settings`
   - Update app name and see it reflect in sidebar
   - Upload logo and favicon
   - Configure SMTP and send test email

2. **Audit Logs**:
   - Navigate to `/audit-log`
   - Use filters to search logs
   - View detailed metadata for actions
   - Verify all system actions are being logged
