# 🗄️ Tax System SQL Deployment Guide

Deploy these SQL files in order to set up the complete tax system.

---

## 📋 SQL Files to Deploy (In Order)

### 1. Main Tax System Schema
**File**: `src/lib/supabase/tax-system-schema.sql`

**What it creates**:
- `tax_profiles` table (W-9 information)
- `earnings_ledger` table (all earnings)
- `payout_requests` table (withdrawals)
- `tax_year_summaries` table (annual totals)
- Helper functions for recording earnings
- RLS policies for security

**Deploy**:
```bash
# Open this file in Supabase SQL Editor and run it:
# /Users/ryanjoshuafermoselle/CryptoMarket AutoBroker/src/lib/supabase/tax-system-schema.sql
```

---

### 2. Backup & Admin Functions
**File**: `src/lib/supabase/tax-system-backup.sql`

**What it creates**:
- Backup views for all tax data
- `admin_get_all_w9s()` - View all W-9s
- `admin_get_user_complete_tax_record()` - Get user tax history
- `get_tax_year_backup_data()` - Export year data
- `verify_tax_backup_integrity()` - Data integrity checks
- `get_tax_backup_statistics()` - System stats

**Deploy**:
```bash
# Open this file in Supabase SQL Editor and run it:
# /Users/ryanjoshuafermoselle/CryptoMarket AutoBroker/src/lib/supabase/tax-system-backup.sql
```

---

### 3. Internal Messaging System 📨
**File**: `src/lib/supabase/tax-system-messaging.sql`

**What it creates**:
- `user_notifications` table (internal messages)
- `send_1099_notification()` - Send 1099 to user account
- `send_w9_confirmation()` - Send W-9 confirmation
- `send_tax_threshold_notification()` - Notify at $600 threshold
- `get_user_tax_notifications()` - Get user's tax messages
- Auto-triggers for W-9 submission and threshold crossing

**Deploy**:
```bash
# Open this file in Supabase SQL Editor and run it:
# /Users/ryanjoshuafermoselle/CryptoMarket AutoBroker/src/lib/supabase/tax-system-messaging.sql
```

**⚠️ IMPORTANT**: This replaces email delivery with internal messaging!

---

## 🚀 Deployment Steps

### Step 1: Deploy Main Schema

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy contents of: `src/lib/supabase/tax-system-schema.sql`
5. Paste into SQL Editor
6. Click **Run**
7. Verify no errors

**Expected Output**:
```
Success: 4 tables created
Success: 5 enums created
Success: 6 functions created
Success: RLS policies enabled
```

---

### Step 2: Deploy Backup Functions

1. Still in **SQL Editor**
2. Click **New Query**
3. Copy contents of: `src/lib/supabase/tax-system-backup.sql`
4. Paste into SQL Editor
5. Click **Run**
6. Verify no errors

**Expected Output**:
```
Success: 4 views created
Success: 6 admin functions created
```

---

### Step 3: Deploy Messaging System 📨

1. Still in **SQL Editor**
2. Click **New Query**
3. Copy contents of: `src/lib/supabase/tax-system-messaging.sql`
4. Paste into SQL Editor
5. Click **Run**
6. Verify no errors

**Expected Output**:
```
Success: user_notifications table created
Success: 5 messaging functions created
Success: 2 triggers created
Success: RLS policies enabled
```

---

### Step 3: Create Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Click **Create Bucket**
3. Name: `tax-documents`
4. Make it **Private** (not public)
5. Click **Create**

---

### Step 4: Verify Deployment

Run this verification query in SQL Editor:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'tax_profiles', 
    'earnings_ledger', 
    'payout_requests', 
    'tax_year_summaries'
  );

-- Should return 4 rows

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%tax%' 
  OR routine_name LIKE '%1099%'
  OR routine_name LIKE '%earning%';

-- Should return 10+ rows

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'tax_profiles', 
    'earnings_ledger', 
    'payout_requests', 
    'tax_year_summaries'
  );

-- All should show rowsecurity = true
```

---

## 📍 File Locations

All files are in your project:

```
CryptoMarket AutoBroker/
├── src/
│   └── lib/
│       └── supabase/
│           ├── tax-system-schema.sql          ← Deploy FIRST
│           ├── tax-system-backup.sql          ← Deploy SECOND
│           └── tax-system-messaging.sql       ← Deploy THIRD
```

**Absolute Paths**:
```
1. /Users/ryanjoshuafermoselle/CryptoMarket AutoBroker/src/lib/supabase/tax-system-schema.sql

2. /Users/ryanjoshuafermoselle/CryptoMarket AutoBroker/src/lib/supabase/tax-system-backup.sql

3. /Users/ryanjoshuafermoselle/CryptoMarket AutoBroker/src/lib/supabase/tax-system-messaging.sql
```

---

## ✅ Post-Deployment Checklist

After deploying all 3 SQL files:

- [ ] Tables created: `tax_profiles`, `earnings_ledger`, `payout_requests`, `tax_year_summaries`, `user_notifications`
- [ ] Backup views created: `tax_profiles_backup`, `earnings_ledger_backup`, etc.
- [ ] Helper functions work: Test `record_earning()` function
- [ ] Admin functions work: Test `admin_get_all_w9s()`
- [ ] Messaging functions work: Test `send_1099_notification()`
- [ ] RLS policies enabled: Check with query above
- [ ] Storage bucket created: `tax-documents`
- [ ] Triggers active: W-9 confirmation, threshold notifications
- [ ] No SQL errors in deployment

---

## 🧪 Test Deployment

After deploying, test with these queries:

### Test 1: Check Tables
```sql
SELECT COUNT(*) FROM tax_profiles;
SELECT COUNT(*) FROM earnings_ledger;
SELECT COUNT(*) FROM payout_requests;
SELECT COUNT(*) FROM tax_year_summaries;
```

### Test 2: Test Helper Function
```sql
-- Record a test earning
SELECT record_earning(
  p_user_id := auth.uid(),
  p_amount_cents := 1000,
  p_source_type := 'game_win'::earnings_source_type,
  p_description := 'Test earning'
);

-- Check it was created
SELECT * FROM earnings_ledger WHERE description = 'Test earning';
```

### Test 3: Test Admin Function
```sql
-- Get all W-9s (admin only)
SELECT * FROM admin_get_all_w9s(50, 0, NULL);
```

### Test 4: Test Backup Statistics
```sql
SELECT * FROM get_tax_backup_statistics();
```

---

## 🆘 Troubleshooting

### Error: "relation already exists"
**Solution**: Table already created. Safe to skip or drop and recreate:
```sql
DROP TABLE IF EXISTS tax_profiles CASCADE;
-- Then run schema again
```

### Error: "function already exists"
**Solution**: Function already created. Safe to skip or recreate:
```sql
DROP FUNCTION IF EXISTS record_earning CASCADE;
-- Then run schema again
```

### Error: "permission denied"
**Solution**: Make sure you're using the Supabase service role (automatic in SQL Editor)

### Error: "type does not exist"
**Solution**: Enums must be created first. Run the schema file from the top.

---

## 🔄 Re-Deployment

If you need to redeploy (e.g., after updates):

### Option 1: Drop and Recreate
```sql
-- Drop all tax tables (CAREFUL - deletes data!)
DROP TABLE IF EXISTS tax_year_summaries CASCADE;
DROP TABLE IF EXISTS payout_requests CASCADE;
DROP TABLE IF EXISTS earnings_ledger CASCADE;
DROP TABLE IF EXISTS tax_profiles CASCADE;

-- Drop enums
DROP TYPE IF EXISTS tax_classification CASCADE;
DROP TYPE IF EXISTS payout_status CASCADE;
DROP TYPE IF EXISTS form_1099_delivery_status CASCADE;
DROP TYPE IF EXISTS earnings_source_type CASCADE;

-- Then run tax-system-schema.sql again
```

### Option 2: Alter Tables (Preserves Data)
Only run the new ALTER statements or CREATE statements for new features.

---

## 📊 What Gets Created

### Tables (4)
1. `tax_profiles` - W-9 forms
2. `earnings_ledger` - All earnings
3. `payout_requests` - Withdrawals
4. `tax_year_summaries` - Annual totals

### Enums (5)
1. `tax_classification` - Tax entity types
2. `payout_status` - Payout statuses
3. `form_1099_delivery_status` - 1099 delivery tracking
4. `earnings_source_type` - Earning types

### Functions (10+)
1. `record_earning()` - Record earnings
2. `recalculate_tax_year_summary()` - Update totals
3. `is_user_tax_verified()` - Check W-9 status
4. `get_users_needing_1099()` - Get 1099 list
5. `admin_get_all_w9s()` - View all W-9s
6. `admin_get_user_complete_tax_record()` - User history
7. `get_tax_year_backup_data()` - Backup data
8. `verify_tax_backup_integrity()` - Verify data
9. `get_tax_backup_statistics()` - System stats
10. More...

### Views (4)
1. `tax_profiles_backup`
2. `earnings_ledger_backup`
3. `tax_year_summaries_backup`
4. `payout_requests_backup`

### RLS Policies (8+)
- Users can view own tax data
- Users can create own W-9
- Users can request payouts
- All admin operations require service role

---

## 🎉 You're Done!

Once both SQL files are deployed, your tax system is ready!

**Next Steps**:
1. Navigate to `/admin/tax`
2. Test the admin W-9 flow
3. Generate a test 1099
4. Verify everything works

**Need Help?**
- See `TAX_SYSTEM_SETUP_GUIDE.md` for complete setup
- See `ADMIN_TAX_DASHBOARD_QUICKSTART.md` for dashboard guide

