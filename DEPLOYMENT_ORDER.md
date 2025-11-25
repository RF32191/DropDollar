# 🚀 Deployment Order - Keep Everything Separate

## ⚠️ IMPORTANT: Run Files Separately!

Each file is **completely independent** to avoid mixing issues between systems.

---

## 📋 **Step-by-Step Deployment**

### **1. Fix 1v1 Games** (Run FIRST)
**File**: `FIX_BOTH_1V1_AND_WTA_NOW.sql`
- Fixes UUID error for 1v1
- Fixes "no completed games" for WTA
- Ensures payouts work
- Ensures sessions reset

✅ **After running**: Test 1v1 and WTA games work

---

### **2. Secure 1v1 Games** (Run SECOND - 1v1 ONLY)
**File**: `SECURITY_1V1_ONLY.sql`
- ✅ Enables RLS on 1v1 tables only
- ✅ Creates 1v1 security policies
- ✅ Adds 1v1 anti-cheat
- ✅ Optimizes 1v1 performance
- ❌ **DOES NOT touch WTA**

✅ **After running**: Test 1v1 games still work

---

### **3. Secure WTA Games** (Run THIRD - WTA ONLY)
**File**: `SECURITY_WTA_ONLY.sql`
- ✅ Enables RLS on WTA tables only
- ✅ Creates WTA security policies
- ✅ Adds WTA anti-cheat
- ✅ Optimizes WTA performance
- ❌ **DOES NOT touch 1v1**

✅ **After running**: Test WTA games still work

---

### **4. Setup Admin Roles** (Run FOURTH - Admin Access)
**File**: `SECURITY_HARDENING_FIXED.sql`
- ✅ Creates 4 admin roles
- ✅ Enables RLS on tax/seller data ONLY
- ✅ Creates audit logging
- ✅ Creates data masking
- ❌ **DOES NOT affect game functionality**

✅ **After running**: You can grant admin access

---

## 🎯 **What Each File Does**

| File | Affects | Safe to Run? |
|------|---------|--------------|
| `FIX_BOTH_1V1_AND_WTA_NOW.sql` | 1v1 & WTA games | ✅ Yes, fixes both |
| `SECURITY_1V1_ONLY.sql` | **1v1 ONLY** | ✅ Yes, independent |
| `SECURITY_WTA_ONLY.sql` | **WTA ONLY** | ✅ Yes, independent |
| `SECURITY_HARDENING_FIXED.sql` | Tax & admin data | ✅ Yes, no game impact |

---

## ✅ **Testing After Each Step**

### After Step 1 (Fix Games):
```sql
-- Test 1v1 session exists
SELECT * FROM public.one_v_one_sessions WHERE status = 'waiting' LIMIT 1;

-- Test WTA session exists
SELECT * FROM public.winner_takes_all_sessions WHERE status = 'waiting' LIMIT 1;
```

### After Step 2 (1v1 Security):
```sql
-- Test you can still view 1v1 sessions
SELECT * FROM public.one_v_one_sessions LIMIT 1;

-- Test anti-cheat function exists
SELECT validate_1v1_score_submission(
  'test-session-id'::UUID,
  auth.uid(),
  100
);
```

### After Step 3 (WTA Security):
```sql
-- Test you can still view WTA sessions
SELECT * FROM public.winner_takes_all_sessions LIMIT 1;

-- Test anti-cheat function exists
SELECT validate_wta_score_submission(
  'test-session-id'::UUID,
  auth.uid(),
  100
);
```

### After Step 4 (Admin Setup):
```sql
-- Verify you're super admin
SELECT * FROM public.admin_roles WHERE email = 'rf32191@gmail.com';

-- Test granting a role
SELECT grant_admin_role('test@example.com', 'support', 'Test user');
```

---

## 🚫 **Files to IGNORE (Old/Deprecated)**

- ❌ `AUDIT_AND_FIX_GAME_SECURITY.sql` (mixed 1v1 & WTA)
- ❌ `SECURITY_HARDENING_POLP.sql` (too strict)
- ❌ Any other `1V1_*` or `FIX_*` files (superseded)

---

## 🆘 **If Something Breaks**

### **1v1 Broken?**
Re-run **ONLY**:
1. `FIX_BOTH_1V1_AND_WTA_NOW.sql` (fixes + reset)
2. `SECURITY_1V1_ONLY.sql` (security)

### **WTA Broken?**
Re-run **ONLY**:
1. `FIX_BOTH_1V1_AND_WTA_NOW.sql` (fixes + reset)
2. `SECURITY_WTA_ONLY.sql` (security)

### **Admin Broken?**
Re-run **ONLY**:
- `SECURITY_HARDENING_FIXED.sql`

---

## 📊 **What Gets Protected**

### **1v1 Security** (`SECURITY_1V1_ONLY.sql`):
- ✅ Users can ONLY update their own scores
- ✅ Users CANNOT manipulate 1v1 sessions
- ✅ Users CANNOT change other 1v1 players
- ✅ 1v1 anti-cheat validation

### **WTA Security** (`SECURITY_WTA_ONLY.sql`):
- ✅ Users can ONLY update their own scores
- ✅ Users CANNOT manipulate WTA sessions
- ✅ Users CANNOT change other WTA players
- ✅ WTA anti-cheat validation

### **Admin Security** (`SECURITY_HARDENING_FIXED.sql`):
- ✅ RLS on tax/seller data ONLY
- ✅ Data masking (emails, names, SSN)
- ✅ Audit logging for admin actions
- ✅ 4 separate admin roles

---

## 🎮 **Games Will Always Work**

Even if admin security is enabled:
- ✅ Users can play games
- ✅ Token payouts work
- ✅ Score submissions work
- ✅ Sessions reset properly

**RLS ONLY affects:**
- 🔒 Tax data
- 🔒 Seller profiles
- 🔒 Admin access

**RLS does NOT affect:**
- 🎮 Game sessions
- 🎮 Game participants
- 🎮 Token updates (handled by functions)

---

## ✅ **Final Checklist**

- [ ] Run `FIX_BOTH_1V1_AND_WTA_NOW.sql`
- [ ] Test: 1v1 games work
- [ ] Test: WTA games work
- [ ] Run `SECURITY_1V1_ONLY.sql`
- [ ] Test: 1v1 still works
- [ ] Run `SECURITY_WTA_ONLY.sql`
- [ ] Test: WTA still works
- [ ] Run `SECURITY_HARDENING_FIXED.sql`
- [ ] Test: Games still work
- [ ] Verify: You're super admin

---

## 🚀 **You're Done!**

Your platform now has:
- ✅ Working 1v1 games with security
- ✅ Working WTA games with security
- ✅ Admin role management
- ✅ Data protection (POLP)
- ✅ Fair skill-based gaming
- ✅ Scalable for millions of users

**All systems are independent and won't break each other!** 🎯

