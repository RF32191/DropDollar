# 🔍 TEST IF FUNCTION WORKS

## Step 1: Run Diagnostic (30 seconds)

Copy and paste `DIAGNOSE_PHONE_ISSUE.sql` into Supabase SQL Editor.

**Before running, REPLACE `+15551234567` with YOUR actual phone number in these lines:**
- Line 28: `public.check_phone_exists('+15551234567')`
- Line 33-35: All three format tests
- Line 51: `WHERE phone_number = '+15551234567'`

Then **click Run** and share what you see.

---

## Step 2: If Function Doesn't Work

Run `QUICK_FIX_PHONE_FUNCTION.sql` in Supabase SQL Editor.

This creates a SUPER flexible function that checks:
- ✅ `+15551234567`
- ✅ `15551234567`
- ✅ `5551234567`
- ✅ Any format mismatch

**It will find the phone NO MATTER the format!**

---

## Step 3: Check Browser Console

After running SQL, wait 2 minutes, then:

1. Open browser console (F12)
2. Go to registration
3. Enter your phone number
4. Tab out

**Look for:**
```
🔍 [CHECK-PHONE] Using database function to check...
✅ [CHECK-PHONE] Database function result: true
```

**Or:**
```
⚠️ [CHECK-PHONE] Database function failed
⚠️ [CHECK-PHONE] Function error: [error message]
```

---

## Quick Questions to Answer:

1. **Does Step 2 of DIAGNOSE script show any phones?**
   - YES → What format? (with +? without +?)
   - NO → That's the problem!

2. **Does Step 1 show the function exists?**
   - YES → Function exists
   - NO → Run QUICK_FIX script

3. **Does Step 3 return TRUE for your phone?**
   - YES → Function works!
   - NO → Format mismatch (run QUICK_FIX)

4. **Does Step 6 find phones?**
   - YES → Query works
   - NO → RLS blocking or format issue

---

## If Still Not Working

Check **Vercel logs** (vercel.com → your project → Logs):

Look for:
```
🔍 [CHECK-PHONE] Using database function to check...
✅ [CHECK-PHONE] Database function result: true/false
```

Or:
```
❌ [CHECK-PHONE] Function error: ...
```

This will tell us EXACTLY what's happening!

---

**Run DIAGNOSE_PHONE_ISSUE.sql first and tell me what you see!** 🔍

