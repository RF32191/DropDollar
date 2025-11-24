# Admin Authentication Setup

## Overview

The tax admin system now supports **email-based authentication** for the admin user **rf32191@gmail.com**.

## How It Works

### 1. Admin Email Authentication

The admin system checks two authentication methods:

1. **API Key** (for programmatic access):
   - Pass `x-api-key` header with `ADMIN_API_KEY` from environment
   
2. **User Login** (for dashboard access):
   - Log in to the platform with **rf32191@gmail.com**
   - The admin dashboard will automatically use your session token
   - All admin API calls will include your authentication token

### 2. Admin Email List

Admin emails are defined in `src/lib/auth/adminAuth.ts`:

```typescript
const ADMIN_EMAILS = [
  'rf32191@gmail.com',
  // Add more admin emails here
];
```

To add more admins, simply add their email to this list.

### 3. Protected Admin Endpoints

All admin endpoints now check for admin access:

- `/api/tax/admin/w9s` - View all W-9 forms
- `/api/tax/admin/generate-1099s` - Generate 1099s for a tax year
- `/api/tax/admin/email-1099s` - Send 1099 notifications to users
- `/api/tax/admin/export-1099s` - Export 1099 data for e-filing
- `/api/tax/admin/backup` - Download tax data backups
- `/api/tax/admin/documents/[userId]` - View user tax documents
- `/api/tax/admin/test-1099` - Test 1099 generation

### 4. Frontend Dashboard

The admin dashboard at `/admin/tax` automatically:

1. Retrieves your session token when you load the page
2. Includes the token in all API requests
3. Shows an error if you're not logged in with an admin email

## Usage Instructions

### For rf32191@gmail.com:

1. **Log in** to the platform using your account (rf32191@gmail.com)
2. Navigate to `/admin/tax` in your browser
3. You now have full access to:
   - Fill out a W-9 for testing
   - Generate test 1099s with custom withdrawal amounts
   - View all user W-9 forms (search, filter, paginate)
   - View all 1099s by tax year
   - Generate 1099s for all users
   - Send 1099 notifications to all users
   - Download complete tax data backups

### For Other Admins:

1. Add their email to `ADMIN_EMAILS` in `src/lib/auth/adminAuth.ts`
2. Redeploy the application
3. They can now log in and access admin features

## Security Notes

- ✅ Admin access is checked on **every API call**
- ✅ Session tokens are validated against Supabase
- ✅ Only emails in `ADMIN_EMAILS` are granted access
- ✅ RLS policies protect user data (admins use service role key)
- ✅ All admin actions are logged in the application

## Environment Variables

Make sure you have these set:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: For programmatic/API access
ADMIN_API_KEY=your_admin_api_key
```

## Troubleshooting

### "Unauthorized - Admin access required"

**Solution**: Make sure you're logged in with rf32191@gmail.com

### "Please log in with rf32191@gmail.com"

**Solution**: You're not logged in. Go to the login page and sign in.

### Admin page shows no data

**Solution**: 
1. Check browser console for errors
2. Verify you're logged in with the correct email
3. Ensure SQL migrations have been run in Supabase

### API returns 401

**Solution**:
1. Check that your session is valid (try logging out and back in)
2. Verify your email is in the `ADMIN_EMAILS` list
3. Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly

## Adding More Admins

Edit `src/lib/auth/adminAuth.ts`:

```typescript
const ADMIN_EMAILS = [
  'rf32191@gmail.com',
  'newadmin@example.com',  // Add here
  'anotheradmin@example.com',  // Add here
];
```

Then redeploy your application.

---

**Last Updated**: November 2025
**Maintainer**: rf32191@gmail.com

