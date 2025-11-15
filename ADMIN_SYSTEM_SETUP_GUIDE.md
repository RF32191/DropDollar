# 🛡️ **ADMIN APPROVAL SYSTEM - COMPLETE GUIDE**

## 🎯 **Overview:**

Complete admin system for:
- ✅ Approving/rejecting seller applications  
- ✅ Reviewing suspicious game audits
- ✅ Managing user bans
- ✅ Notifications for admin actions

**Master Admin:** `rf32191@gmail.com`

---

## 📋 **SQL FILES TO RUN (IN ORDER):**

### **1️⃣ Run These First (If Not Done Yet):**
```sql
MARKETPLACE_COMPLETE_SETUP_FIXED.sql  ← Marketplace system
SELLER_REGISTRATION_SETUP.sql         ← Seller accounts
```

### **2️⃣ Then Run This:**
```sql
ADMIN_APPROVAL_SYSTEM.sql  ← Admin approval system (NEW!)
```

---

## 🔑 **MASTER ADMIN SETUP:**

### **Step 1: Create Account**
1. Go to your app
2. Sign up with: **`rf32191@gmail.com`**
3. Complete registration

### **Step 2: Run SQL to Make Admin**

The SQL file automatically tries to set you as admin. If your account already exists, you'll see:
```
✅ Master admin created successfully for rf32191@gmail.com
```

If account doesn't exist yet, you'll see:
```
⚠️ User rf32191@gmail.com not found. Please create an account first.
```

Then run manually:
```sql
SELECT create_master_admin('rf32191@gmail.com');
```

---

## 🎭 **ADMIN ROLES & PERMISSIONS:**

### **master_admin** (rf32191@gmail.com):
- ✅ Approve/reject sellers
- ✅ Review game audit logs  
- ✅ Ban users
- ✅ Manage other admins
- ✅ Full system access

### **admin**:
- ✅ Approve/reject sellers
- ✅ Review game audits
- ✅ Ban users
- ❌ Cannot manage other admins

### **moderator**:
- ✅ Review game audits
- ❌ Cannot approve sellers
- ❌ Cannot ban users
- ❌ Cannot manage admins

---

## 📊 **ADMIN DASHBOARD:**

### **Access:**
```
URL: /admin/dashboard
```

### **Features:**

**1. Pending Sellers Tab:**
- See all seller applications
- View applicant details
  - Username, email
  - Business name
  - Contact info
  - Application date
- Approve with one click
- Reject with reason
- Auto-notification on decision

**2. Audit Logs Tab:**
- See suspicious game activity
- Filter by suspicion level:
  - 🔴 Critical
  - 🟠 High
  - 🟡 Medium
- View flags:
  - Perfect score
  - Impossible timing
  - Multiple perfect games
  - Score spike
- Review and ban users

---

## 🔄 **SELLER APPROVAL WORKFLOW:**

### **User Side:**

**Step 1: User Registers**
```
Dashboard → Seller Status → Register as Seller
Fill out:
- Contact Email (required)
- Business Name (optional)
- Contact Phone (optional)
→ Click "Complete Registration"
```

**Step 2: Pending Status**
```
✅ Registration submitted!
⏳ Status: PENDING
📧 "Awaiting admin approval"
❌ Cannot create listings yet
```

**Step 3: Approved**
```
✅ Status: APPROVED
🎉 Can now create listings
📝 /sell page unlocked
```

---

### **Admin Side:**

**Step 1: Admin Gets Notification**
```
New seller registration notification
Appears in /admin/dashboard
```

**Step 2: Admin Reviews**
```
View applicant details:
- Username
- Email
- Business info
- Contact info
- Application date
```

**Step 3: Admin Decides**
```
Option A: APPROVE
  → Status: approved
  → User can create listings
  → Notification resolved

Option B: REJECT
  → Enter reason (optional)
  → Status: suspended
  → User cannot create listings
  → Notification resolved
```

---

## 🎮 **GAME AUDIT REVIEW:**

### **What Gets Flagged:**

**Critical (🔴):**
- Multiple perfect scores in row
- Impossible reaction times
- Pattern of suspicious activity

**High (🟠):**
- Perfect score achieved
- Very high accuracy + speed
- Score spike

**Medium (🟡):**
- Unusual gameplay pattern
- Slightly suspicious metrics

### **Admin Review Process:**

1. Go to `/admin/dashboard`
2. Click "Audit Logs" tab
3. See flagged games sorted by severity
4. Review details:
   - Username
   - Game type
   - Score & accuracy
   - Flags triggered
   - Date/time
5. Take action:
   - Mark as reviewed
   - Ban user (if cheating)
   - Clear (if legitimate)

---

## 🗄️ **DATABASE SCHEMA:**

### **Tables:**

**admin_profiles:**
```sql
- id (UUID)
- user_id (UUID → users)
- email (TEXT)
- role (master_admin | admin | moderator)
- can_approve_sellers (BOOLEAN)
- can_review_audits (BOOLEAN)
- can_ban_users (BOOLEAN)
- can_manage_admins (BOOLEAN)
- is_active (BOOLEAN)
- created_at, updated_at
```

**admin_notifications:**
```sql
- id (UUID)
- admin_id (UUID → admin_profiles)
- type (seller_pending | audit_alert | suspicious_activity)
- title (TEXT)
- message (TEXT)
- severity (info | warning | critical)
- related_user_id (UUID → users)
- related_seller_id (UUID → seller_profiles)
- related_audit_id (UUID → game_audit_logs)
- is_read (BOOLEAN)
- is_resolved (BOOLEAN)
- resolved_by (UUID → admin_profiles)
- resolved_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
```

---

## 🔌 **RPC FUNCTIONS:**

### **Admin Management:**
```sql
create_master_admin(email)
  → Creates master admin account

check_admin_status()
  → Returns admin role & permissions
```

### **Seller Approval:**
```sql
get_pending_sellers()
  → Returns all pending applications

approve_seller(seller_id, notes)
  → Approves seller, sends notification

reject_seller(seller_id, reason)
  → Rejects seller, logs reason
```

### **Audit Review:**
```sql
get_unreviewed_audit_logs()
  → Returns suspicious game activity
```

---

## 🧪 **TESTING CHECKLIST:**

### **Setup:**
- [ ] Run all SQL files in order
- [ ] Create account with rf32191@gmail.com
- [ ] Verify master admin created
- [ ] Access /admin/dashboard

### **Seller Approval Flow:**
- [ ] Create test user account
- [ ] Register as seller (Dashboard)
- [ ] See "Pending" status
- [ ] Check /admin/dashboard shows application
- [ ] Approve seller
- [ ] User sees "Approved" status
- [ ] User can access /sell page

### **Rejection Flow:**
- [ ] Create another test user
- [ ] Register as seller
- [ ] Reject application (enter reason)
- [ ] User sees "Suspended" status
- [ ] User cannot create listings

### **Audit Review:**
- [ ] Play game and trigger perfect score
- [ ] Check game_audit_logs table
- [ ] Admin sees suspicious activity
- [ ] Review and mark as reviewed

---

## 🎨 **UI/UX:**

### **Seller Dashboard:**
```
┌─────────────────────────────────────┐
│ SELLER STATUS                       │
│                                     │
│ ⏳ Seller application pending       │
│ Your application is awaiting admin  │
│ approval. You will be notified once │
│ your application is reviewed.       │
└─────────────────────────────────────┘
```

### **Admin Dashboard:**
```
┌─────────────────────────────────────┐
│ 🛡️ ADMIN DASHBOARD                  │
│ Role: master_admin                  │
│ rf32191@gmail.com                   │
│                                     │
│ [2] Pending Sellers                 │
│ [5] Audit Alerts                    │
└─────────────────────────────────────┘

Tabs:
├─ Pending Sellers (2)
├─ Audit Logs (5)
└─ Notifications (7)
```

---

## ⚠️ **TROUBLESHOOTING:**

### **"Not an admin" Error:**
**Fix:**
```sql
-- Check if admin exists
SELECT * FROM admin_profiles WHERE email = 'rf32191@gmail.com';

-- If not found, create:
SELECT create_master_admin('rf32191@gmail.com');
```

### **Seller Still Shows Pending:**
**Fix:**
1. Go to /admin/dashboard
2. Find seller in list
3. Click "Approve"
4. User refreshes dashboard
5. Should see "Approved" status

### **Notifications Not Appearing:**
**Fix:**
```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_seller_registration';

-- Check notifications table
SELECT * FROM admin_notifications WHERE type = 'seller_pending';
```

### **Cannot Access /admin/dashboard:**
**Fix:**
1. Ensure you're logged in as rf32191@gmail.com
2. Check admin_profiles table
3. Verify RLS policies allow access

---

## 🔐 **SECURITY:**

### **Row Level Security (RLS):**
- ✅ Admins can only see their own profile
- ✅ Admins can only see their notifications
- ✅ Only authenticated users can call admin functions
- ✅ Functions check permissions before executing

### **Permission Checks:**
- Every admin function verifies:
  - User is authenticated
  - User is an admin
  - User has specific permission
  - User is active

---

## 📈 **ADMIN STATS:**

Track admin activity:
- Sellers approved/rejected
- Audits reviewed
- Users banned
- Notifications resolved

Future enhancements:
- Admin activity logs
- Performance metrics
- Fraud detection stats

---

## 🚀 **DEPLOYMENT:**

### **Code:**
- ✅ Pushed to GitHub
- ✅ Vercel auto-deploy

### **Database:**
1. Open Supabase SQL Editor
2. Run `ADMIN_APPROVAL_SYSTEM.sql`
3. Create account with rf32191@gmail.com
4. Visit `/admin/dashboard`
5. Test approval workflow

---

## 📞 **ADMIN ACCESS:**

**URL:** `https://your-domain.com/admin/dashboard`

**Login:** `rf32191@gmail.com`

**Permissions:**
- Approve sellers ✅
- Review audits ✅
- Ban users ✅
- Manage admins ✅

---

**Your admin system is ready! 🎉**

