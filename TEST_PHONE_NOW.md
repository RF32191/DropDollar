# 🧪 TEST PHONE NUMBER SYSTEM NOW

## Step 1: Run Debug Query in Supabase

Copy and paste this into **Supabase SQL Editor**:

```sql
-- Check if table exists and what's in it
SELECT 
  'Table exists' as status,
  COUNT(*) as total_phones,
  string_agg(DISTINCT substring(phone_number, 1, 3), ', ') as phone_prefixes
FROM public.user_phones;

-- Show all phone numbers
SELECT 
  id,
  user_id,
  phone_number,
  length(phone_number) as length,
  verified,
  created_at
FROM public.user_phones
ORDER BY created_at DESC;
```

**Expected Results:**
- If table exists: Shows count and all phones
- If table missing: Error "relation user_phones does not exist"

---

## Step 2: Test Registration with Browser Console Open

1. **Open browser** (Chrome/Firefox)
2. **Press F12** (open Developer Console)
3. **Go to Console tab**
4. **Go to:** https://www.drop-dollar.com/auth/register
5. **Fill form and watch console**

### What to Look For:

#### When You Enter Phone:
```
🔍 [CHECK-PHONE] Incoming phone: 5551234567
🔍 [CHECK-PHONE] Formatted phone: +15551234567
📞 [CHECK-PHONE] Query result: { exists: false, foundRecords: 0 }
📊 [CHECK-PHONE] Sample of phones in DB: [...]
```

#### When You Submit Registration:
```
📱 [REGISTER] Inserting phone into user_phones table
📱 [REGISTER] Phone number: +15551234567
📱 [REGISTER] Phone length: 12
📱 [REGISTER] Phone prefix: +15
📱 [REGISTER] User ID: abc-123-def
✅ [REGISTER] Phone number saved to user_phones table!
✅ [REGISTER] Saved phone number: +15551234567
```

#### When You Try Same Phone Again:
```
🔍 [CHECK-PHONE] Incoming phone: 5551234567
🔍 [CHECK-PHONE] Formatted phone: +15551234567
📞 [CHECK-PHONE] Query result: { exists: true, foundRecords: 1 }
🚫 Error: This phone number is already registered
```

---

## Step 3: Check Vercel Logs

1. **Go to:** https://vercel.com/dashboard
2. **Click your project:** drop-dollar
3. **Click "Logs" tab**
4. **Filter by:** Function = /api/auth/register
5. **Look for:**
   - `📱 [REGISTER]` messages
   - `✅ [REGISTER] Phone number saved`
   - Any `❌` error messages

---

## 🐛 Debugging Scenarios

### Scenario A: Table Doesn't Exist
**Symptoms:**
- Error in console: "relation user_phones does not exist"
- SQL query fails

**Fix:**
```bash
Run: SETUP_PHONE_TABLE_NOW.sql in Supabase
```

---

### Scenario B: Phone Not Being Saved
**Symptoms:**
- Console shows: `✅ [REGISTER] Phone number saved`
- BUT SQL query shows: `COUNT(*) = 0` (no phones)

**Possible Causes:**
1. **RLS Policy blocking insert**
   ```sql
   -- Run this to check:
   SELECT * FROM pg_policies WHERE tablename = 'user_phones';
   ```

2. **Service role key not set**
   - Check Vercel env vars
   - Make sure `SUPABASE_SERVICE_ROLE_KEY` is set

---

### Scenario C: Phone Saved But Not Found
**Symptoms:**
- SQL shows phone exists: `+15551234567`
- Check-phone says: `exists: false`

**Possible Cause: Format Mismatch**

Run this test query:
```sql
-- What format is saved?
SELECT 
  phone_number,
  phone_number = '+15551234567' as exact_match,
  phone_number LIKE '+1%' as has_plus_one,
  length(phone_number) as length
FROM public.user_phones;
```

**Expected:**
- `exact_match`: true
- `has_plus_one`: true
- `length`: 12

---

### Scenario D: Multiple Formats in Database
**Symptoms:**
- Some phones: `+15551234567`
- Some phones: `15551234567` (no +)
- Some phones: `5551234567` (no +1)

**Fix:**
```sql
-- Standardize all phones to +1 format
UPDATE public.user_phones
SET phone_number = '+1' || REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g')
WHERE phone_number NOT LIKE '+1%'
  AND LENGTH(REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g')) = 10;

-- For phones that already have 1 prefix
UPDATE public.user_phones  
SET phone_number = '+' || REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g')
WHERE phone_number NOT LIKE '+%'
  AND LENGTH(REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g')) = 11
  AND phone_number LIKE '1%';
```

---

## 📊 Expected End State

After everything works:

### SQL Query Result:
```
| phone_number   | length | verified | created_at           |
|----------------|--------|----------|----------------------|
| +15551234567   | 12     | true     | 2025-12-16 10:30:00  |
| +15559876543   | 12     | true     | 2025-12-16 10:31:00  |
```

### Browser Console (Duplicate Test):
```
🔍 [CHECK-PHONE] Formatted phone: +15551234567
📞 [CHECK-PHONE] Query result: { exists: true, foundRecords: 1 }
❌ This phone number is already registered.
```

### No SMS Sent:
- Twilio dashboard shows: 0 messages to duplicate phone

---

## ✅ Success Checklist

- [ ] SQL query shows `user_phones` table exists
- [ ] SQL query shows phones with `+1` prefix and length 12
- [ ] Browser console shows `📱 [REGISTER]` logs
- [ ] Browser console shows `✅ [REGISTER] Phone number saved`
- [ ] SQL query shows phone appears after registration
- [ ] Duplicate phone attempt shows error immediately on blur
- [ ] No SMS sent to duplicate phone
- [ ] Vercel logs show successful phone save

---

**Run the debug query and test registration - then share what you see!** 🔍

