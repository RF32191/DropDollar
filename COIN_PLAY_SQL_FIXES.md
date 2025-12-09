# Coin Play Session & Score Fix - SQL Scripts

## 🔗 Quick Links to SQL Scripts

### Primary Fix Scripts:

1. **`FIX_COIN_PLAY_SCORE_SESSION.sql`** - Main fix for score submission session errors
   - Fixes `update_coin_play_score` function
   - Allows score submission even if session completed during gameplay
   - Better error handling and error codes
   - **RUN THIS FIRST for score submission issues**

2. **`FIX_COIN_PLAY_SESSION_ERROR.sql`** - General session and permission fixes
   - Creates `get_coin_play_participants` function
   - Grants proper permissions to all RPC functions
   - Updates RLS policies
   - **RUN THIS for general session/permission issues**

## 📋 How to Use

### Step 1: Run the Score Session Fix
```sql
-- Copy and paste FIX_COIN_PLAY_SCORE_SESSION.sql into Supabase SQL Editor
-- This fixes score submission errors
```

### Step 2: Run the General Session Fix (if needed)
```sql
-- Copy and paste FIX_COIN_PLAY_SESSION_ERROR.sql into Supabase SQL Editor
-- This ensures all functions have proper permissions
```

### Step 3: Verify
After running the scripts, check the output for:
- ✅ Function created/updated messages
- ✅ Permissions granted messages
- ✅ Verification results

## 🎯 What These Scripts Fix

### Score Submission Issues:
- ✅ Session expiration during gameplay no longer blocks score submission
- ✅ Retry logic handles temporary session failures
- ✅ Better error messages for debugging
- ✅ Grace period for score submission even after session ends

### Permission Issues:
- ✅ All RPC functions have proper EXECUTE permissions
- ✅ Authenticated users can join and submit scores
- ✅ Anonymous users can view sessions and scoreboards
- ✅ RLS policies allow proper access

## 📁 File Locations

All SQL scripts are in the project root:
- `FIX_COIN_PLAY_SCORE_SESSION.sql`
- `FIX_COIN_PLAY_SESSION_ERROR.sql`
- `CREATE_COIN_PLAY_SYSTEM.sql` (if you need to recreate the system)

## 🔍 GitHub Repository

Find these files in the GitHub repository:
```
https://github.com/RF32191/DropDollar/tree/main
```

Direct links:
- [FIX_COIN_PLAY_SCORE_SESSION.sql](https://github.com/RF32191/DropDollar/blob/main/FIX_COIN_PLAY_SCORE_SESSION.sql)
- [FIX_COIN_PLAY_SESSION_ERROR.sql](https://github.com/RF32191/DropDollar/blob/main/FIX_COIN_PLAY_SESSION_ERROR.sql)

## 🚀 Code Changes

The frontend code has been updated with:
- Proactive session refresh before starting games
- Retry logic for score submission (up to 3 attempts)
- Better error handling and user feedback
- Session validation improvements

**Code pushed to:**
- ✅ GitHub: `main` branch
- ✅ Vercel: Auto-deployed from GitHub

## 📝 Notes

- Run `FIX_COIN_PLAY_SCORE_SESSION.sql` first if you're experiencing score submission errors
- Run `FIX_COIN_PLAY_SESSION_ERROR.sql` if you're experiencing permission or general session errors
- Both scripts are idempotent (safe to run multiple times)
- Hard refresh your browser after running the SQL scripts (Cmd+Shift+R / Ctrl+Shift+R)

