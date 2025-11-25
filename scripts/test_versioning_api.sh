#!/bin/bash

# File Versioning API Test Script
# This script tests all versioning, locking, and reminder endpoints

set -e

echo "=========================================="
echo "File Versioning API Test Suite"
echo "=========================================="
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:8000}"
TOKEN="${TOKEN:-}"
ACCOUNT_ID="${ACCOUNT_ID:-}"
FILE_ID="${FILE_ID:-}"

# Check required environment variables
if [ -z "$TOKEN" ]; then
    echo "❌ Error: TOKEN environment variable not set"
    echo "   Export your JWT token: export TOKEN='your_token_here'"
    exit 1
fi

if [ -z "$ACCOUNT_ID" ]; then
    echo "❌ Error: ACCOUNT_ID environment variable not set"
    echo "   Export your account ID: export ACCOUNT_ID='your_account_id_here'"
    exit 1
fi

if [ -z "$FILE_ID" ]; then
    echo "❌ Error: FILE_ID environment variable not set"
    echo "   Export a file ID: export FILE_ID='your_file_id_here'"
    exit 1
fi

echo "Configuration:"
echo "  API URL: $API_URL"
echo "  Account ID: $ACCOUNT_ID"
echo "  File ID: $FILE_ID"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run test
run_test() {
    local test_name="$1"
    local command="$2"
    
    echo "🧪 Testing: $test_name"
    
    if eval "$command"; then
        echo "✅ PASSED: $test_name"
        ((TESTS_PASSED++))
    else
        echo "❌ FAILED: $test_name"
        ((TESTS_FAILED++))
    fi
    echo ""
}

# Create test file
echo "Creating test file..."
echo "Test content for versioning" > /tmp/test_version.txt

echo "=========================================="
echo "1. File Versioning Tests"
echo "=========================================="
echo ""

# Test 1: List versions
run_test "List file versions" \
    "curl -s -f '$API_URL/dms/files-dms/$FILE_ID/versions' \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'X-Account-Id: $ACCOUNT_ID' > /dev/null"

# Test 2: Upload new version
run_test "Upload new version" \
    "curl -s -f -X POST '$API_URL/dms/files-dms/$FILE_ID/versions?comment=Test%20version' \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'X-Account-Id: $ACCOUNT_ID' \
    -F 'file=@/tmp/test_version.txt' > /tmp/version_response.json"

# Extract version ID from response
if [ -f /tmp/version_response.json ]; then
    VERSION_ID=$(cat /tmp/version_response.json | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "Created version ID: $VERSION_ID"
fi

# Test 3: Get version details
if [ ! -z "$VERSION_ID" ]; then
    run_test "Get version details" \
        "curl -s -f '$API_URL/dms/files-dms/$FILE_ID/versions/$VERSION_ID' \
        -H 'Authorization: Bearer $TOKEN' \
        -H 'X-Account-Id: $ACCOUNT_ID' > /dev/null"
    
    # Test 4: Download version
    run_test "Download version" \
        "curl -s -f '$API_URL/dms/files-dms/$FILE_ID/versions/$VERSION_ID/download' \
        -H 'Authorization: Bearer $TOKEN' \
        -H 'X-Account-Id: $ACCOUNT_ID' \
        -o /tmp/downloaded_version.txt"
fi

echo "=========================================="
echo "2. File Locking Tests"
echo "=========================================="
echo ""

# Test 5: Get lock status (should be unlocked)
run_test "Get lock status (unlocked)" \
    "curl -s -f '$API_URL/dms/files-dms/$FILE_ID/lock' \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'X-Account-Id: $ACCOUNT_ID' | grep -q '\"is_locked\":false'"

# Test 6: Lock file
run_test "Lock file" \
    "curl -s -f -X POST '$API_URL/dms/files-dms/$FILE_ID/lock?duration_hours=1' \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'X-Account-Id: $ACCOUNT_ID' > /dev/null"

# Test 7: Get lock status (should be locked)
run_test "Get lock status (locked)" \
    "curl -s -f '$API_URL/dms/files-dms/$FILE_ID/lock' \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'X-Account-Id: $ACCOUNT_ID' | grep -q '\"is_locked\":true'"

# Test 8: Unlock file
run_test "Unlock file" \
    "curl -s -f -X DELETE '$API_URL/dms/files-dms/$FILE_ID/lock' \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'X-Account-Id: $ACCOUNT_ID'"

# Test 9: Verify unlocked
run_test "Verify file unlocked" \
    "curl -s -f '$API_URL/dms/files-dms/$FILE_ID/lock' \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'X-Account-Id: $ACCOUNT_ID' | grep -q '\"is_locked\":false'"

echo "=========================================="
echo "3. File Reminders Tests"
echo "=========================================="
echo ""

# Get current user ID for reminder target
USER_ID=$(curl -s "$API_URL/u/me" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Current user ID: $USER_ID"

# Test 10: Create reminder
REMIND_AT=$(date -u -d "+1 day" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v+1d +"%Y-%m-%dT%H:%M:%SZ")
run_test "Create reminder" \
    "curl -s -f -X POST '$API_URL/dms/files-dms/$FILE_ID/reminders' \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'X-Account-Id: $ACCOUNT_ID' \
    -H 'Content-Type: application/json' \
    -d '{\"target_user_id\":\"$USER_ID\",\"remind_at\":\"$REMIND_AT\",\"message\":\"Test reminder\"}' \
    > /tmp/reminder_response.json"

# Extract reminder ID
if [ -f /tmp/reminder_response.json ]; then
    REMINDER_ID=$(cat /tmp/reminder_response.json | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "Created reminder ID: $REMINDER_ID"
fi

# Test 11: List file reminders
run_test "List file reminders" \
    "curl -s -f '$API_URL/dms/files-dms/$FILE_ID/reminders' \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'X-Account-Id: $ACCOUNT_ID' > /dev/null"

# Test 12: Get my reminders
run_test "Get my reminders (all)" \
    "curl -s -f '$API_URL/dms/files-dms/reminders/me?due=all' \
    -H 'Authorization: Bearer $TOKEN' > /dev/null"

# Test 13: Get due reminders
run_test "Get due reminders" \
    "curl -s -f '$API_URL/dms/files-dms/reminders/me?due=now' \
    -H 'Authorization: Bearer $TOKEN' > /dev/null"

# Test 14: Update reminder
if [ ! -z "$REMINDER_ID" ]; then
    run_test "Update reminder (dismiss)" \
        "curl -s -f -X PATCH '$API_URL/dms/files-dms/reminders/$REMINDER_ID' \
        -H 'Authorization: Bearer $TOKEN' \
        -H 'X-Account-Id: $ACCOUNT_ID' \
        -H 'Content-Type: application/json' \
        -d '{\"status\":\"dismissed\"}' > /dev/null"
    
    # Test 15: Delete reminder
    run_test "Delete reminder" \
        "curl -s -f -X DELETE '$API_URL/dms/files-dms/reminders/$REMINDER_ID' \
        -H 'Authorization: Bearer $TOKEN' \
        -H 'X-Account-Id: $ACCOUNT_ID'"
fi

# Cleanup
rm -f /tmp/test_version.txt /tmp/version_response.json /tmp/reminder_response.json /tmp/downloaded_version.txt

echo "=========================================="
echo "Test Results"
echo "=========================================="
echo "✅ Tests Passed: $TESTS_PASSED"
echo "❌ Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo "🎉 All tests passed!"
    exit 0
else
    echo "⚠️  Some tests failed. Please check the output above."
    exit 1
fi
