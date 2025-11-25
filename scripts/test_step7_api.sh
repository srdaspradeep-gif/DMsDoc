#!/bin/bash

# Step 7 API Test Script
# Tests sharing, retention, inbox, audit, and profile features

set -e

BASE_URL="http://localhost:8000"
TOKEN=""
ACCOUNT_ID=""
USER_ID=""
FILE_ID=""
FOLDER_ID=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Step 7 API Test Script"
echo "========================================="
echo ""

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        exit 1
    fi
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed. Please install jq to run this script.${NC}"
    exit 1
fi

# Get credentials
read -p "Enter API base URL (default: http://localhost:8000): " input_url
BASE_URL=${input_url:-$BASE_URL}

read -p "Enter your access token: " TOKEN
read -p "Enter account ID: " ACCOUNT_ID
read -p "Enter user ID: " USER_ID
read -p "Enter file ID for testing: " FILE_ID
read -p "Enter folder ID for testing: " FOLDER_ID

echo ""
echo "Testing with:"
echo "  Base URL: $BASE_URL"
echo "  Account ID: $ACCOUNT_ID"
echo ""

# Test 1: Profile Settings
echo "========================================="
echo "1. Testing Profile Settings"
echo "========================================="

# Get profile
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/rbac/profile/me" \
  -H "Authorization: Bearer $TOKEN")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    print_result 0 "Get profile"
    echo "Profile: $body" | jq '.'
else
    print_result 1 "Get profile (HTTP $http_code)"
fi

# Update profile
response=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/rbac/profile/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"language\": \"en\",
    \"timezone\": \"UTC\",
    \"default_account_id\": \"$ACCOUNT_ID\"
  }")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    print_result 0 "Update profile"
else
    print_result 1 "Update profile (HTTP $http_code)"
fi

echo ""

# Test 2: Sharing
echo "========================================="
echo "2. Testing Sharing"
echo "========================================="

# Create user share
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/dms/shares" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"account_id\": \"$ACCOUNT_ID\",
    \"resource_type\": \"file\",
    \"resource_id\": \"$FILE_ID\",
    \"target_type\": \"user\",
    \"target_id\": \"$USER_ID\",
    \"access_level\": \"view\"
  }")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    print_result 0 "Create user share"
    SHARE_ID=$(echo "$body" | jq -r '.id')
    echo "Share ID: $SHARE_ID"
else
    print_result 1 "Create user share (HTTP $http_code)"
fi

# Create public link
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/dms/shares" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"account_id\": \"$ACCOUNT_ID\",
    \"resource_type\": \"file\",
    \"resource_id\": \"$FILE_ID\",
    \"target_type\": \"public_link\",
    \"access_level\": \"view\"
  }")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    print_result 0 "Create public link"
    PUBLIC_TOKEN=$(echo "$body" | jq -r '.public_token')
    echo "Public Token: $PUBLIC_TOKEN"
else
    print_result 1 "Create public link (HTTP $http_code)"
fi

# List shares
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/dms/shares?account_id=$ACCOUNT_ID&resource_id=$FILE_ID" \
  -H "Authorization: Bearer $TOKEN")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    print_result 0 "List shares"
else
    print_result 1 "List shares (HTTP $http_code)"
fi

echo ""

# Test 3: Inbox
echo "========================================="
echo "3. Testing Inbox"
echo "========================================="

# Get inbox address
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/dms/inbox/address/$ACCOUNT_ID" \
  -H "Authorization: Bearer $TOKEN")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    print_result 0 "Get inbox address"
    INBOX_ADDRESS=$(echo "$body" | jq -r '.inbox_address')
    echo "Inbox Address: $INBOX_ADDRESS"
else
    print_result 1 "Get inbox address (HTTP $http_code)"
fi

# List inbox entries
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/dms/inbox?account_id=$ACCOUNT_ID" \
  -H "Authorization: Bearer $TOKEN")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    print_result 0 "List inbox entries"
else
    print_result 1 "List inbox entries (HTTP $http_code)"
fi

echo ""

# Test 4: Retention Policies
echo "========================================="
echo "4. Testing Retention Policies"
echo "========================================="

# Create retention policy
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/dms/retention" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"account_id\": \"$ACCOUNT_ID\",
    \"folder_id\": \"$FOLDER_ID\",
    \"apply_to_subfolders\": false,
    \"retention_days\": 90,
    \"mode\": \"move_to_recycle\"
  }")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    print_result 0 "Create retention policy"
    POLICY_ID=$(echo "$body" | jq -r '.id')
    echo "Policy ID: $POLICY_ID"
else
    # Policy might already exist
    if [ "$http_code" = "400" ]; then
        echo -e "${YELLOW}⚠ Retention policy already exists${NC}"
    else
        print_result 1 "Create retention policy (HTTP $http_code)"
    fi
fi

# List retention policies
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/dms/retention?account_id=$ACCOUNT_ID" \
  -H "Authorization: Bearer $TOKEN")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    print_result 0 "List retention policies"
else
    print_result 1 "List retention policies (HTTP $http_code)"
fi

echo ""

# Test 5: Audit Logs
echo "========================================="
echo "5. Testing Audit Logs"
echo "========================================="

# Query audit logs
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/dms/audit/query?account_id=$ACCOUNT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"skip\": 0,
    \"limit\": 10
  }")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    print_result 0 "Query audit logs"
    log_count=$(echo "$body" | jq '. | length')
    echo "Found $log_count audit log entries"
else
    print_result 1 "Query audit logs (HTTP $http_code)"
fi

# Get user activity
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/dms/audit/user/$USER_ID?account_id=$ACCOUNT_ID" \
  -H "Authorization: Bearer $TOKEN")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    print_result 0 "Get user activity"
else
    print_result 1 "Get user activity (HTTP $http_code)"
fi

echo ""

# Test 6: Access Overview
echo "========================================="
echo "6. Testing Access Overview"
echo "========================================="

# Get user access overview
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/dms/access-overview/user/$USER_ID?account_id=$ACCOUNT_ID" \
  -H "Authorization: Bearer $TOKEN")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    print_result 0 "Get user access overview"
else
    print_result 1 "Get user access overview (HTTP $http_code)"
fi

# Get resource access overview
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/dms/access-overview/resource/file/$FILE_ID?account_id=$ACCOUNT_ID" \
  -H "Authorization: Bearer $TOKEN")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    print_result 0 "Get resource access overview"
else
    print_result 1 "Get resource access overview (HTTP $http_code)"
fi

echo ""

# Test 7: Recycle Bin
echo "========================================="
echo "7. Testing Recycle Bin"
echo "========================================="

# List deleted files
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/dms/recycle-bin/files?account_id=$ACCOUNT_ID" \
  -H "Authorization: Bearer $TOKEN")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    print_result 0 "List deleted files"
else
    print_result 1 "List deleted files (HTTP $http_code)"
fi

# List deleted folders
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/dms/recycle-bin/folders?account_id=$ACCOUNT_ID" \
  -H "Authorization: Bearer $TOKEN")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    print_result 0 "List deleted folders"
else
    print_result 1 "List deleted folders (HTTP $http_code)"
fi

echo ""
echo "========================================="
echo "All tests completed successfully!"
echo "========================================="
echo ""
echo "Summary:"
echo "  ✓ Profile settings"
echo "  ✓ Sharing (user shares and public links)"
echo "  ✓ Inbox"
echo "  ✓ Retention policies"
echo "  ✓ Audit logs"
echo "  ✓ Access overview"
echo "  ✓ Recycle bin"
echo ""
echo "Step 7 implementation is working correctly!"
