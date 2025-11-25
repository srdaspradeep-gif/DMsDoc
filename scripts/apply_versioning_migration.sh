#!/bin/bash

# File Versioning Migration Script
# This script applies the versioning tables migration

set -e

echo "=========================================="
echo "File Versioning Migration"
echo "=========================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "alembic.ini" ]; then
    echo "❌ Error: alembic.ini not found. Please run this script from the docflow directory."
    exit 1
fi

echo "📋 Checking current migration status..."
alembic current

echo ""
echo "📦 Available migrations:"
alembic history

echo ""
echo "🚀 Applying versioning migration..."
alembic upgrade head

echo ""
echo "✅ Migration completed successfully!"
echo ""

echo "📊 Verifying tables created..."
psql -U postgres -d docflow -c "\dt file_*"

echo ""
echo "=========================================="
echo "Migration Summary"
echo "=========================================="
echo "✅ file_versions table created"
echo "✅ file_locks table created"
echo "✅ file_reminders table created"
echo "✅ files_new table updated with:"
echo "   - document_id column"
echo "   - tags column"
echo "   - notes column"
echo "   - current_version_id column"
echo ""
echo "🎉 File versioning system is ready to use!"
echo ""
echo "Next steps:"
echo "1. Test API endpoints (see VERSIONING_QUICKSTART.md)"
echo "2. Test frontend components"
echo "3. Verify RBAC permissions"
echo ""
