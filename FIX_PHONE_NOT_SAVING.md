# 🚨 URGENT: Fix Phone Numbers Not Saving

## Problem
Phone numbers are showing as NULL in the database, allowing duplicate registrations.

---

## ✅ Solution (3 Steps)

### Step 1: Run SQL Fix in Supabase

1. Go to: **https://supabase.com/dashboard** → Your Project → **SQL Editor**
2. Click **"New Query"**
3. Copy **entire contents** of `URGENT_FIX_PHONE_STORAGE.sql`
4. Paste and click **"Run"**
5. Should see: `✅ SUCCESS! Phone column is working correctly`

---

### Step 2: Check Vercel Environment Variables

**This is CRITICAL!** Your API needs the service role key to write phone numbers.

1. Go to: **https://vercel.com/dashboard**
2. Click your **Drop Dollar** project
3. Go to **Settings** → **Environment Variables**
4. **Check if this exists:**
   ```
   SUPABASE_SERVICE_ROLE_KEY
   ```

5. **If missing, add it:**
   - Go to Supabase Dashboard → Project Settings → API
   - Copy **"service_role"** secret key (starts with `eyJ...`)
   - Add to Vercel:
     - Name: `SUPABASE_SERVICE_ROLE_KEY`
     - Value: `eyJhbGc...` (your service role key)
     - Select: Production, Preview, Development
   - Click **"Save"**

**⚠️ IMPORTANT:** If you only have `NEXT_PUBLIC_SUPABASE_ANON_KEY`, that's NOT enough! You MUST add the service role key.

---

### Step 3: Redeploy and Test

1. **Redeploy:**
   - Vercel Dashboard → Deployments
   - Click "..." on latest deployment
   - Click "Redeploy"
   - **OR** just push any change to GitHub

2. **Test Registration:**
   - Go to: https://www.drop-dollar.com/auth/register
   - Use a NEW phone number
   - Complete registration

3. **Verify in Database:**
   - Supabase → Table Editor → users table
   - Find your new user
   - Phone column should show: `+15551234567` (NOT null!)

---

## 🔍 Why This Was Happening

### Problem 1: Missing Service Role Key
```javascript
// In register/route.ts
const supabaseServiceKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY ||  // ← This was probably undefined
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // ← So it used this (no write permission!)
```

**Anon key = Limited permissions** (can't bypass RLS)  
**Service role key = Full permissions** (can insert phone numbers)

### Problem 2: RLS Policies
If using anon key, Row Level Security blocks phone inserts for new users.

---

## 🧪 How to Verify It's Fixed

### Test 1: New Phone Number
1. Register with phone: `+15551111111`
2. Check database: Phone should be saved ✅
3. Try to register again with same phone
4. Should get error: **"This phone number is already registered"** ✅

### Test 2: Duplicate Check Working
1. Use the same phone from Test 1
2. Click "Send Verification Code"
3. Should see error BEFORE code is sent ✅
4. No SMS received ✅

---

## 📊 Check Current Status

Run this in Supabase SQL Editor:

```sql
-- See last 5 users and their phone numbers
SELECT 
  username,
  email,
  phone,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;
```

**Before fix:** Phone = `null`  
**After fix:** Phone = `+15551234567` ✅

---

## 🔐 Finding Your Service Role Key

1. Go to: **https://supabase.com/dashboard**
2. Select your project
3. Click **Settings** (gear icon) → **API**
4. Scroll to **"Project API keys"**
5. Find **"service_role"** section
6. Click **"Reveal"** (eye icon)
7. Copy the key (starts with `eyJ`)
8. **⚠️ Keep this secret!** Never commit to GitHub!

---

## ✅ Summary Checklist

- [ ] Ran `URGENT_FIX_PHONE_STORAGE.sql` in Supabase
- [ ] Added `SUPABASE_SERVICE_ROLE_KEY` to Vercel environment variables
- [ ] Redeployed application
- [ ] Tested registration with new phone
- [ ] Verified phone saved in database (not null)
- [ ] Tested duplicate phone block working

---

## 🆘 If Still Not Working

Check Vercel logs after registration:
1. Vercel Dashboard → Functions
2. Look for: `📝 Inserting user profile with phone: +15551234567`
3. Look for: `✅ Profile created successfully`
4. If you see errors, send them to me!

Also run this in Supabase to check permissions:

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Try manual insert
INSERT INTO users (id, username, email, phone, tokens)
VALUES (
  gen_random_uuid(),
  'manual_test',
  'manual@test.com',
  '+15559999999',
  1
);

-- Check if it worked
SELECT * FROM users WHERE username = 'manual_test';
```

---

**The most common issue is missing the `SUPABASE_SERVICE_ROLE_KEY` in Vercel!** Check that first! 🔑

