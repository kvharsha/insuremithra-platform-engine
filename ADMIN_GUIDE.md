# Admin Features Guide - Story 04

## Overview
Story 04 implements comprehensive Role-Based Access Control (RBAC) with admin management features. This guide explains how to use and test the admin functionality.

## Creating an Admin User

### Method 1: Direct Database Creation
```javascript
// Using MongoDB shell
use insuremithra
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

### Method 2: Registration + Role Update
1. Register a new user normally through `/register`
2. Use an existing admin account to promote them via the Admin Dashboard
3. Or update the database directly as shown in Method 1

## Admin Dashboard Features

### Accessing the Admin Dashboard
- **URL**: `http://localhost:5004/admin`
- **Requirement**: Must be logged in with an admin account
- **Navigation**: Click "Admin Panel" in the user menu (visible only to admins)

### Dashboard Components

#### 1. Statistics Cards
- **Total Users**: Count of all registered users
- **Admin Users**: Number of admin accounts
- **Verified Users**: Email-verified user count
- **New Registrations**: Users registered in the last 7 days
- **Recent Logins**: Users logged in within 24 hours

#### 2. User Management Table
View and manage all users with the following capabilities:

**Columns:**
- Name (First + Last)
- Email address
- Role (User/Admin badge)
- Status (Active/Inactive)
- Email Verified (✓/✗)
- Last Login date
- Actions

**Actions Available:**
- 👁️ **View**: See detailed user information
- ✏️ **Edit Role**: Change user role (user ↔ admin)
- 🚫 **Toggle Status**: Activate or deactivate account

**Restrictions:**
- Admins cannot change their own role
- Admins cannot deactivate their own account

#### 3. Activity Monitor Tab
- Placeholder for future activity tracking features
- Will display user behavior analytics and audit logs

## API Endpoints for Admins

### Get All Users
```bash
GET /api/profile/admin/users
Authorization: Bearer <admin-token>

Query Parameters:
- page: Page number (default: 1)
- limit: Results per page (default: 10)
- role: Filter by role ('user' or 'admin')
- search: Search by name or email
```

**Response:**
```json
{
  "users": [
    {
      "id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "isEmailVerified": true,
      "lastLogin": "2025-11-01T10:00:00Z",
      "createdAt": "2025-10-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "pages": 5,
    "limit": 10
  }
}
```

### Get User Details
```bash
GET /api/profile/admin/users/:userId
Authorization: Bearer <admin-token>
```

### Update User Role
```bash
PUT /api/profile/admin/users/:userId/role
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "role": "admin"  # or "user"
}
```

### Toggle User Status
```bash
PUT /api/profile/admin/users/:userId/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "isActive": false  # true to activate, false to deactivate
}
```

### Get System Statistics
```bash
GET /api/profile/admin/stats
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "statistics": {
    "users": {
      "total": 100,
      "active": 95,
      "inactive": 5,
      "admins": 3,
      "regularUsers": 97,
      "verified": 80,
      "unverified": 20
    },
    "activity": {
      "recentRegistrations": {
        "count": 10,
        "period": "7 days"
      },
      "recentLogins": {
        "count": 45,
        "period": "24 hours"
      }
    }
  }
}
```

## Testing Admin Features

### 1. Manual Testing via UI
1. Create or designate an admin user (see above)
2. Login with admin credentials at `http://localhost:5004/login`
3. Navigate to Dashboard - you should see an "Admin" badge
4. Click profile menu → "Admin Panel"
5. Test each admin feature:
   - View statistics
   - Browse user list
   - View user details
   - Change a user's role
   - Deactivate/activate a user

### 2. Automated Testing
Run the RBAC test suite:
```bash
cd 04_role_access_control
npm test tests/rbac.test.js
```

Tests cover:
- Admin access to protected endpoints
- Regular user denied access
- Role change functionality
- Status toggle functionality
- Self-protection (cannot modify own role/status)
- Statistics retrieval

### 3. API Testing with cURL

**Login as Admin:**
```bash
curl -X POST http://localhost:5004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"AdminPassword123!"}'
```

**Get All Users:**
```bash
curl http://localhost:5004/api/profile/admin/users \
  -H "Authorization: Bearer <YOUR_ADMIN_TOKEN>"
```

**Get System Stats:**
```bash
curl http://localhost:5004/api/profile/admin/stats \
  -H "Authorization: Bearer <YOUR_ADMIN_TOKEN>"
```

**Change User Role:**
```bash
curl -X PUT http://localhost:5004/api/profile/admin/users/<USER_ID>/role \
  -H "Authorization: Bearer <YOUR_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
```

## Security Considerations

### Protected Routes
All admin endpoints use the `requireAdmin` middleware:
```javascript
router.get('/admin/users', requireAdmin, getAllUsers);
```

### Self-Protection
- Admins cannot change their own role
- Admins cannot deactivate their own account
- These protections prevent accidental lockout

### Audit Logging
All administrative actions are logged:
- Role changes
- Status changes
- User views
- Statistics access

Logs include:
- Admin user who performed the action
- Target user affected
- Timestamp
- IP address

### Permission Checks
```javascript
// Middleware hierarchy
authenticate()      // Check JWT token
  → requireAdmin    // Check role === 'admin'
    → controller    // Execute admin action
```

## Differences from Story 03

Story 04 adds:
1. ✅ Admin Dashboard UI (`/admin` route)
2. ✅ User management endpoints
3. ✅ Role change functionality
4. ✅ Account status toggling
5. ✅ System statistics API
6. ✅ Enhanced activity logging
7. ✅ Admin badge in regular dashboard
8. ✅ Self-protection mechanisms
9. ✅ Comprehensive RBAC tests

Story 03 had:
- Basic `requireAdmin` middleware (unused)
- Placeholder activity log endpoint
- No admin UI or user management

## Common Issues & Solutions

### Issue: Can't access admin dashboard
**Solution:** Ensure your user has role='admin' in the database

### Issue: "Insufficient permissions" error
**Solution:** Login with an admin account, not a regular user

### Issue: Can't change own role
**Solution:** This is intentional! Use another admin account or update directly in DB

### Issue: Frontend shows 404 for /admin
**Solution:** Ensure you're running Story 04, not Story 03

## Next Steps

After Story 04, the application has:
- ✅ User authentication (Story 01)
- ✅ Password reset (Story 02)
- ✅ Profile management (Story 03)
- ✅ Role-based access control (Story 04)

Future enhancements could include:
- More granular permissions
- Role-based UI components
- Activity timeline visualization
- Bulk user operations
- User import/export
- Advanced filtering and search

---

**For support:** Contact the development team or refer to the main README.md
