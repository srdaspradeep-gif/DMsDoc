# Step 2 Frontend - Quick QA Guide

## 🚀 Quick Start

```bash
# Start backend
docker compose up

# Start frontend (in new terminal)
cd frontend
npm run dev
```

**Access:** http://localhost:3000

---

## 📍 New Pages

| Page | URL | Purpose |
|------|-----|---------|
| Roles Management | `/admin/roles` | Manage roles and permissions |
| Groups Management | `/admin/groups` | Manage groups and members |
| My Access | `/my-access` | View your permissions (mobile-friendly) |

---

## ✅ Quick Test Scenarios

### 1. Roles Management (2 minutes)

**URL:** http://localhost:3000/admin/roles

1. ✅ Page loads and shows roles list
2. ✅ Click "New Role" → Enter "Test Role" → Save
3. ✅ Click shield icon → Toggle some permissions → Auto-saves
4. ✅ Click edit icon → Change name → Save
5. ✅ Click delete icon → Confirm → Role deleted
6. ✅ Type in search box → List filters

**Expected:** All operations work, toasts show success/error

---

### 2. Groups Management (2 minutes)

**URL:** http://localhost:3000/admin/groups

1. ✅ Page loads and shows groups list
2. ✅ Click "New Group" → Enter "Test Group" → Save
3. ✅ Click users icon → See members modal
4. ✅ Click "+" on available user → User added to group
5. ✅ Click "-" on member → User removed from group
6. ✅ Click edit icon → Change name → Save
7. ✅ Click delete icon → Confirm → Group deleted

**Expected:** All operations work, members update in real-time

---

### 3. My Access (1 minute)

**URL:** http://localhost:3000/my-access

1. ✅ Page loads and shows user info
2. ✅ See username and email
3. ✅ See assigned roles (if any)
4. ✅ See group memberships (if any)
5. ✅ See permissions list (if any)
6. ✅ Super admin badge shows (if first user)

**Expected:** All user RBAC info displayed correctly

---

### 4. Mobile View (1 minute)

1. ✅ Open DevTools (F12)
2. ✅ Toggle device toolbar (Ctrl+Shift+M)
3. ✅ Select iPhone or Android device
4. ✅ Navigate to `/my-access`
5. ✅ All sections readable, no horizontal scroll
6. ✅ Navigate to `/admin/roles`
7. ✅ Table scrollable, modals work

**Expected:** Responsive design works on mobile

---

## 🐛 Common Issues

### Issue: "Failed to load data"
**Solution:** 
- Check backend is running
- Check modules are seeded: `docker compose exec api python app/scripts/seed_modules.py`
- Check user has permissions

### Issue: "Permission denied" (403)
**Solution:**
- User needs admin permissions
- First user is super admin automatically
- Assign roles/groups to user

### Issue: Permissions matrix empty
**Solution:**
- Modules not seeded
- Run: `docker compose exec api python app/scripts/seed_modules.py`

### Issue: Can't add user to group
**Solution:**
- User might already be in group
- Refresh the members modal
- Check backend logs for errors

---

## 🎯 Success Criteria

**All checks should pass:**

- [ ] Roles page loads without errors
- [ ] Can create, edit, delete roles
- [ ] Permissions matrix works (toggle checkboxes)
- [ ] Groups page loads without errors
- [ ] Can create, edit, delete groups
- [ ] Can add/remove users from groups
- [ ] My Access page shows user info
- [ ] My Access shows roles and permissions
- [ ] All pages work on mobile
- [ ] Search functionality works
- [ ] Toast notifications appear
- [ ] No console errors

---

## 📊 Test Results Template

```
Date: ___________
Tester: ___________

Roles Management:
[ ] List loads
[ ] Create role
[ ] Edit permissions
[ ] Edit role
[ ] Delete role
[ ] Search works

Groups Management:
[ ] List loads
[ ] Create group
[ ] Add member
[ ] Remove member
[ ] Edit group
[ ] Delete group

My Access:
[ ] Page loads
[ ] User info shows
[ ] Roles show
[ ] Groups show
[ ] Permissions show

Mobile:
[ ] My Access responsive
[ ] Admin pages scrollable

Overall: PASS / FAIL
Notes: ___________
```

---

## 🚀 Ready to Test!

**Total Time:** ~6 minutes for full QA

**Quick Test:** Just test one scenario from each page (~3 minutes)

**Full Test:** Complete all scenarios + mobile (~10 minutes)
