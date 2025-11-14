# 🏪 Seller Registration System - Complete Guide

## 📋 Overview

Seller registration is now integrated into the **User Dashboard**, not the `/sell` page. This creates a cleaner, more logical user flow.

---

## 🗄️ **SQL FILES TO RUN (IN ORDER):**

### **1️⃣ MARKETPLACE_COMPLETE_SETUP.sql**
**What it does:**
- Creates `marketplace_listings` table
- Creates `marketplace_sessions` table
- Creates `marketplace_participants` table
- Sets up RPC functions (create/join/score/payout/reset)
- Implements 2-hour timer trigger
- Adds RLS policies

**Run this first!**

---

### **2️⃣ SELLER_REGISTRATION_SETUP.sql**
**What it does:**
- Creates `seller_profiles` table
- Creates `register_as_seller()` function
- Creates `check_seller_status()` function
- Updates `create_marketplace_listing()` to require seller status
- Adds RLS policies for seller profiles

**Run this second!**

---

## 🎯 **USER FLOW:**

### **Step 1: User Signs Up**
```
User creates account → Has basic user profile
```

### **Step 2: Go to Dashboard**
```
Navigate to /dashboard → See "Seller Status" section
```

### **Step 3: Register as Seller**
```
Dashboard → Seller Status → "Register as Seller" button
Fill in:
  - Business Name (optional)
  - Contact Email (required)
  - Contact Phone (optional)
→ Click "Complete Registration"
→ Auto-approved ✅
```

### **Step 4: Create Listings**
```
Dashboard → "Manage Listings" button appears
Click it → Redirects to /sell
Now you can create marketplace listings!
```

---

## 🔒 **PERMISSIONS & RESTRICTIONS:**

### **Non-Sellers:**
- ❌ Cannot access `/sell` page (shows registration instructions)
- ❌ Cannot create marketplace listings
- ✅ Can browse and play in marketplace competitions

### **Registered Sellers:**
- ✅ Full access to `/sell` page
- ✅ Can create unlimited listings
- ✅ Can manage their listings
- ✅ Winners contact them for shipping

---

## 📂 **FILES MODIFIED:**

### **1. src/app/dashboard/page.tsx**
**Added:**
- Seller status check on load
- Seller registration form
- Seller info display
- "Manage Listings" button for registered sellers

**Features:**
- Auto-checks seller status when user logs in
- Shows registration form in a collapsible section
- Displays seller info (business name, contact email)
- Links to `/sell` when registered

---

### **2. src/app/sell/page.tsx**
**Removed:**
- Seller registration form (moved to dashboard)

**Changed:**
- Now shows "Registration Required" message for non-sellers
- Directs users to Dashboard for registration
- Only displays Create/Manage tabs for registered sellers

**Simplified:**
- No more registration logic on this page
- Focus purely on listing management

---

## 🧪 **TESTING CHECKLIST:**

### **Part 1: SQL Setup**
- [ ] Run `MARKETPLACE_COMPLETE_SETUP.sql` in Supabase SQL Editor
- [ ] Verify success message appears
- [ ] Run `SELLER_REGISTRATION_SETUP.sql` in Supabase SQL Editor
- [ ] Verify success message appears

### **Part 2: User Flow**
- [ ] Create a new user account (or use existing)
- [ ] Navigate to `/dashboard`
- [ ] See "Seller Status" section
- [ ] Click "Register as Seller"
- [ ] Fill in contact email
- [ ] Click "Complete Registration"
- [ ] See success message
- [ ] See "✅ You're a registered seller!" status
- [ ] See "Manage Listings" button appear

### **Part 3: Seller Features**
- [ ] Click "Manage Listings" → Redirects to `/sell`
- [ ] See "Create Listing" and "My Listings" tabs
- [ ] Create a test listing (e.g., PS5)
- [ ] Fill in all fields
- [ ] Submit listing
- [ ] See success message
- [ ] Listing appears in "My Listings" tab

### **Part 4: Non-Seller Restrictions**
- [ ] Log out
- [ ] Create a new user (don't register as seller)
- [ ] Try to visit `/sell` directly
- [ ] See "Registration Required" message
- [ ] See instructions to go to Dashboard
- [ ] Cannot see Create/Manage tabs

---

## 🎨 **UI/UX IMPROVEMENTS:**

### **Dashboard:**
```
┌─────────────────────────────────────────┐
│  SELLER STATUS                          │
│                                         │
│  Want to sell products?                 │
│  [Register as Seller]                   │
└─────────────────────────────────────────┘
```

**After Registration:**
```
┌─────────────────────────────────────────┐
│  SELLER STATUS          [Manage Listings→]│
│                                         │
│  ✅ You're a registered seller!         │
│  Contact: your@email.com                │
└─────────────────────────────────────────┘
```

### **/sell Page (for non-sellers):**
```
┌─────────────────────────────────────────┐
│  ❌ Seller Registration Required        │
│                                         │
│  How to become a seller:                │
│  1️⃣ Go to your Dashboard               │
│  2️⃣ Find "Seller Status"               │
│  3️⃣ Click "Register as Seller"         │
│  4️⃣ Fill in contact info               │
│  5️⃣ Start creating listings!           │
│                                         │
│  [🚀 Go to Dashboard to Register]       │
└─────────────────────────────────────────┘
```

---

## ⚙️ **TECHNICAL DETAILS:**

### **Database Schema:**
```sql
-- seller_profiles table
CREATE TABLE seller_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  business_name TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  verified BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **RPC Functions:**
- `register_as_seller(business_name, contact_email, contact_phone)`
- `check_seller_status()` → Returns seller info
- `create_marketplace_listing()` → Now checks seller status

### **Frontend Logic:**
- Dashboard checks seller status on mount
- `/sell` redirects non-sellers to dashboard
- Seller contact auto-fills in listing form

---

## 🐛 **TROUBLESHOOTING:**

### **"Seller registration failed"**
- Check that both SQL files were run successfully
- Verify user is logged in
- Check browser console for errors
- Try refreshing the page

### **"Cannot access /sell page"**
- Ensure you registered as seller in Dashboard
- Clear browser cache and cookies
- Try logging out and back in

### **"Listing creation fails"**
- Verify seller registration completed
- Check that contact email is filled in
- Ensure all required fields are completed
- Check browser console for errors

---

## 📝 **NOTES:**

1. **Auto-Approval:** Sellers are auto-approved by default. Add manual approval later if needed.
2. **Contact Info:** Winners will see the seller's contact email to arrange shipping.
3. **Multiple Listings:** Sellers can create unlimited listings.
4. **Location Tracking:** All marketplace pages have consistent location verification.
5. **Timer Logic:** 2-hour timer starts when prize pool meets base price.

---

## ✅ **SUCCESS CRITERIA:**

You've successfully set up the seller system when:
- [x] Both SQL files run without errors
- [x] Dashboard shows "Seller Status" section
- [x] Registration form works and shows success
- [x] "Manage Listings" button appears after registration
- [x] `/sell` page is accessible to registered sellers
- [x] Non-sellers see registration instructions on `/sell`
- [x] Listings can be created successfully
- [x] Contact info is captured correctly

---

## 🚀 **NEXT STEPS:**

After setup is complete:
1. Create your first listing (test with PS5 example)
2. Test the marketplace competition flow
3. Verify winner selection works
4. Test contact seller functionality
5. Monitor for any issues

---

**Need Help?**
- Check browser console for errors
- Verify SQL execution logs in Supabase
- Test with different user accounts
- Check network tab for failed API calls

