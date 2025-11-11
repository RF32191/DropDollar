# 🔧 Fix 401 Error - Quick Guide

## Problem
Getting `401 Unauthorized` error when trying to start games:
```
Failed to load resource: the server responded with a status of 401 ()
❌ [CompetitionGameFlow] Failed to create game session
```

## Root Cause
Two issues:
1. **Missing RLS policies** on `game_sessions` table
2. **Missing auth header** in API request

## ✅ Solution

### Step 1: Run SQL Fix in Supabase
```bash
# Copy and run this file in Supabase SQL Editor:
FIX_GAME_SESSIONS_RLS.sql
```

This will:
- Create `game_sessions` table (if it doesn't exist)
- Add proper RLS policies
- Allow API routes to create sessions

### Step 2: Deploy Updated Code
The following files have been fixed:
- ✅ `src/app/api/game-session/create/route.ts` - Now reads JWT from headers
- ✅ `src/components/games/CompetitionGameFlow.tsx` - Now sends JWT token

**Deploy to Vercel:**
```bash
git add .
git commit -m "Fix 401 error - Add auth headers and RLS policies"
git push origin main
```

## What Changed

### API Route (`route.ts`)
**Before:**
```typescript
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const { data: { user } } = await supabase.auth.getUser(); // ❌ Doesn't work
```

**After:**
```typescript
const token = request.headers.get('authorization')?.replace('Bearer ', '');
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: { headers: { Authorization: `Bearer ${token}` } }
});
const { data: { user } } = await supabase.auth.getUser(); // ✅ Works!
```

### Client Component (`CompetitionGameFlow.tsx`)
**Before:**
```typescript
const response = await fetch('/api/game-session/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }, // ❌ No auth token
  body: JSON.stringify({ ... })
});
```

**After:**
```typescript
const { data: { session } } = await supabase.auth.getSession();
const response = await fetch('/api/game-session/create', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}` // ✅ Auth token!
  },
  body: JSON.stringify({ ... })
});
```

## Testing

After deploying:
1. Open `/hot-sell` or any game page
2. Try to join a game
3. Should see: `✅ [CompetitionGameFlow] Game session created`
4. Game should start without 401 error

## If Still Getting 401

Check:
1. **Are you logged in?** - Session must be active
2. **Did SQL script run?** - Check `game_sessions` policies exist
3. **Is code deployed?** - Verify Vercel deployment succeeded

Run this query in Supabase to verify policies:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'game_sessions';
```

Should see:
- `game_sessions_service_role_all`
- `game_sessions_user_read_own`
- `game_sessions_user_insert_own`
- `game_sessions_user_update_own`

## Summary

✅ **SQL Fix:** `FIX_GAME_SESSIONS_RLS.sql`  
✅ **Code Fix:** Auto-committed (JWT header added)  
✅ **Deploy:** `git push` to apply changes  

**The 401 error will be fixed after these steps!** 🚀

