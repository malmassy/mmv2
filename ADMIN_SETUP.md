# Admin System Setup

The admin system has been successfully implemented! Here's how to use it.

## What's Been Added

1. ✅ `isAdmin` field added to User model
2. ✅ Admin middleware for route protection
3. ✅ Admin API endpoints
4. ✅ Admin dashboard page (`/admin`)
5. ✅ Admin service functions
6. ✅ Helper script to set admin users

## Setting Up Your First Admin

### Option 1: Using the Script (Recommended)

1. Install tsx if not already installed:
   ```bash
   npm install -D tsx
   ```

2. Set a user as admin:
   ```bash
   npm run admin:set your-email@example.com
   ```

   Or if the user doesn't exist yet, the script will create them:
   ```bash
   npm run admin:set new-admin@example.com
   ```

### Option 2: Using Prisma Studio

1. Open Prisma Studio:
   ```bash
   npm run db:studio
   ```

2. Navigate to the `users` table
3. Find or create your user
4. Set `is_admin` to `true`

### Option 3: Direct Database Query

```bash
sqlite3 prisma/dev.db "UPDATE users SET is_admin = 1 WHERE email = 'your-email@example.com';"
```

## Accessing the Admin Dashboard

1. Navigate to `/admin` in your browser
2. When prompted, enter your admin email
3. The dashboard will load with:
   - User statistics
   - Test statistics
   - Question difficulty analysis
   - Recent test results

## Admin API Endpoints

All admin endpoints require the `x-user-email` header with an admin email.

### GET `/api/admin`
Get dashboard statistics.

**Headers:**
```
x-user-email: admin@example.com
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "users": { "total": 10, "admins": 1, "regular": 9 },
    "tests": { "total": 50, "totalQuestions": 250, ... },
    "questionStats": [...],
    "recentTests": [...]
  }
}
```

### GET `/api/admin/tests`
Get all test results (optionally filtered by user).

**Query Parameters:**
- `userId` (optional) - Filter by user ID
- `limit` (optional) - Limit results
- `offset` (optional) - Pagination offset

### DELETE `/api/admin/tests?id=<test-id>`
Delete a test result.

### GET `/api/admin/users`
Get all users with test result counts.

### PATCH `/api/admin/users`
Update user admin status.

**Body:**
```json
{
  "userId": "user-id",
  "isAdmin": true
}
```

## Security Notes

⚠️ **Current Implementation:** The admin system uses a simple email-based header check. This is fine for development but should be upgraded for production:

1. **For Production:** Implement proper authentication (NextAuth.js, Auth0, etc.)
2. **Session Management:** Use secure sessions instead of headers
3. **Rate Limiting:** Add rate limiting to admin endpoints
4. **Audit Logging:** Log all admin actions

## Admin Features Available

- ✅ View all test results
- ✅ View all users
- ✅ System-wide analytics
- ✅ Question difficulty statistics
- ✅ Delete test results
- ✅ Manage user admin status
- ✅ View recent test activity

## Next Steps

1. Set yourself as admin using one of the methods above
2. Visit `/admin` to see the dashboard
3. Consider adding:
   - Export functionality (CSV/JSON)
   - User activity logs
   - Bulk operations
   - Advanced filtering/search
