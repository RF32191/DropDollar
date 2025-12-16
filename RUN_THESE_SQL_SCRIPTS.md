# 📋 SQL Scripts You Need to Run

## ⚠️ IMPORTANT: Run These in Supabase SQL Editor

Your phone verification system needs database tables and functions. Run these scripts in order:

---

## 🔧 Step 1: Set Up Phone Verification System

**File:** `CREATE_PHONE_VERIFICATION_SYSTEM.sql`

**What it does:**
- ✅ Creates `phone_verification_codes` table (stores verification codes)
- ✅ Creates database functions:
  - `generate_phone_verification_code()` - Generates 6-digit codes
  - `verify_phone_code()` - Verifies codes
  - `is_phone_verified()` - Checks if phone is verified
  - `cleanup_expired_verification_codes()` - Cleanup old codes
- ✅ Sets up indexes and RLS policies

**How to run:**
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/editor
2. Click "SQL Editor" in sidebar
3. Click "New Query"
4. Copy entire contents of `CREATE_PHONE_VERIFICATION_SYSTEM.sql`
5. Paste into editor
6. Click "Run" (or press Ctrl+Enter)

---

## 🔐 Step 2: Set Up Phone Number Security

**File:** `FIX_SIGNUP_PHONE_EMAIL_DUPLICATES.sql`

**What it does:**
- ✅ Ensures phone column exists in `users` table
- ✅ Creates unique index on phone numbers (prevents duplicates)
- ✅ Creates `phone_number_backup` table (audit trail)
- ✅ Creates database functions:
  - `normalize_phone_number()` - Normalizes phone for comparison
  - `is_phone_available()` - Checks if phone is available (not taken)
- ✅ Prevents duplicate phone numbers and emails

**How to run:**
1. Same SQL Editor as above
2. Create another "New Query"
3. Copy entire contents of `FIX_SIGNUP_PHONE_EMAIL_DUPLICATES.sql`
4. Paste and click "Run"

---

## ✅ After Running Both Scripts

You should see success messages like:
```
✅ Created phone_verification_codes table with RLS
✅ Created generate_phone_verification_code() function
✅ Created verify_phone_code() function
✅ Created is_phone_verified() function
✅ Added phone column to public.users table (or already exists)
✅ Created unique index on phone numbers
✅ Created is_phone_available() function
✅ Created normalize_phone_number() function
```

---

## 🧪 Test That It's Working

After running the scripts, try registering at:
https://www.drop-dollar.com/auth/register

1. **Test duplicate phone:**
   - Use a phone number you already registered
   - Should see: "This phone number is already registered"
   - No SMS sent ✅

2. **Test new phone:**
   - Use a new phone number
   - Should receive SMS verification code ✅
   - Can complete registration ✅

---

## 🔍 Verify Database Setup

In Supabase SQL Editor, run this to check:

```sql
-- Check if phone_verification_codes table exists
SELECT * FROM phone_verification_codes LIMIT 1;

-- Check if functions exist
SELECT proname FROM pg_proc WHERE proname LIKE '%phone%';

-- Check if phone column exists in users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'phone';

-- Check unique index on phone
SELECT indexname FROM pg_indexes 
WHERE tablename = 'users' AND indexname LIKE '%phone%';
```

If all queries work without errors, you're set up! ✅

---

## 🆘 If You Get Errors

### "relation already exists"
- ✅ This is fine! It means the table already exists
- The scripts use `CREATE TABLE IF NOT EXISTS` so they're safe to re-run

### "function already exists"
- ✅ This is fine! The scripts use `CREATE OR REPLACE FUNCTION`
- They will update the function to the latest version

### "permission denied"
- ❌ Make sure you're logged into Supabase as the project owner
- ❌ Use the SQL Editor in the Supabase Dashboard, not the CLI

---

## 📝 Summary

**Run these 2 SQL files in order:**
1. `CREATE_PHONE_VERIFICATION_SYSTEM.sql` 
2. `FIX_SIGNUP_PHONE_EMAIL_DUPLICATES.sql`

**Then your registration will:**
- ✅ Check for duplicate phone numbers
- ✅ Send SMS verification codes
- ✅ Store verified phones in database
- ✅ Prevent duplicate registrations
- ✅ One phone = one account enforced!

