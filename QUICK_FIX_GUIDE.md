# Quick Fix Guide - "Session is not active" Error

## ⚡ What Was Fixed

Your application was calling Supabase RPC functions **before authentication was ready**, causing "Session is not active" errors.

## ✅ Solution Applied

Created a **Session Guard** system that:
1. ✅ Validates session before EVERY RPC call
2. ✅ Waits for authentication to complete
3. ✅ Automatically refreshes expired tokens
4. ✅ Provides clear error messages to users

## 📝 Files Changed

### New File Created:
- `src/lib/supabase/sessionGuard.ts` - Centralized session validation

### Pages Updated:
- `src/app/hot-sell/page.tsx`
- `src/app/winner-takes-all/page.tsx`
- `src/app/tournaments/1v1/page.tsx`

## 🔍 Key Changes

### Before (❌ Broken):
```typescript
// Direct RPC call without session check
const { data, error } = await supabase.rpc('get_sessions');
```

### After (✅ Fixed):
```typescript
// Guarded RPC call with session validation
const { data, error, isSessionValid } = await executeRpcWithSession('get_sessions');

if (!isSessionValid) {
  // Session expired - show user-friendly error
  setMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
  return;
}
```

## 🚀 Testing Your Fix

1. **Login to your app**
2. **Navigate to Hot Sell, Winner Takes All, or 1v1 pages**
3. **Verify data loads without errors**
4. **Check browser console for these logs:**
   - `✅ [SessionGuard] Session is valid`
   - `✅ [SessionGuard] RPC [name] successful`

## 🐛 If You Still See Errors

### Check These:

1. **Environment Variables Set?**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

2. **RPC Functions Exist in Supabase?**
   - `get_all_hot_sell_sessions`
   - `get_all_winner_takes_all_sessions`
   - `get_all_1v1_sessions`
   - `hs_join_v2`, `wta_join_v2`, `join_1v1_session`
   - `update_hot_sell_score`, `update_winner_takes_all_score`, `update_1v1_score`
   - `process_hot_sell_payout_complete`, `process_payout_by_config`, `process_1v1_payout`

3. **RLS Policies Allow Access?**
   - Check Supabase dashboard → Authentication → Policies
   - Ensure authenticated users can call these RPCs

4. **User Actually Logged In?**
   - Check if `AuthContext` shows `isAuthenticated: true`
   - Try logging out and logging back in

## 💡 How It Works

```
User logs in
    ↓
AuthContext sets isAuthenticated = true
    ↓
Page detects auth change via useEffect
    ↓
ensureAuthReady() validates session exists
    ↓
executeRpcWithSession() makes safe RPC call
    ↓
Data loads successfully ✅
```

## 📊 Console Logging

Watch for these in browser console:

### Success Indicators:
- `✅ [Hot Sell] Authenticated, loading data...`
- `✅ [SessionGuard] Session is valid`
- `✅ [SessionGuard] RPC get_all_hot_sell_sessions successful`

### Auth Not Ready (Normal):
- `⏳ [Hot Sell] Waiting for authentication...`

### Session Issues (Fix Required):
- `❌ [SessionGuard] Session is not active` → User needs to log in
- `❌ [SessionGuard] Failed to refresh session` → Token invalid, re-login needed

## 🔧 Adding Session Guards to Other Pages

If you need to protect other pages:

```typescript
// 1. Import the guards
import { executeRpcWithSession, ensureAuthReady } from '@/lib/supabase/sessionGuard';

// 2. Check auth before loading data
const loadData = useCallback(async () => {
  const authCheck = await ensureAuthReady(isAuthenticated, false);
  if (!authCheck.ready) {
    setIsLoading(false);
    return;
  }
  
  const { data, error, isSessionValid } = await executeRpcWithSession('your_rpc');
  if (!isSessionValid) {
    setMessage({ type: 'error', text: 'Session expired' });
    return;
  }
  
  // Use data...
}, [isAuthenticated]);

// 3. Wait for auth in useEffect
useEffect(() => {
  if (!isAuthenticated) {
    setIsLoading(false);
    return;
  }
  loadData();
}, [isAuthenticated, loadData]);
```

## 📞 Need Help?

1. Check `SESSION_AUTH_FIX_COMPLETE.md` for full details
2. Review browser console logs for specific errors
3. Test with a fresh login session
4. Verify Supabase configuration in dashboard

---

**Status**: ✅ Fix applied to all game pages
**Next Steps**: Test in production with real users

