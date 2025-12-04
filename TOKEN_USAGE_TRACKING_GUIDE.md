# 💎 Token Usage Tracking - Complete Guide

## ✅ **What Was Fixed**

### **1. SQL Column Name Error** ❌ → ✅
**Error:** `column "impressions_count" does not exist`

**Fixed:**
- Updated `DIAGNOSE_MISSING_CAMPAIGN.sql` to use correct columns: `total_impressions`, `total_clicks`
- Updated `UPDATE_DYNAMIC_AD_PRICING.sql` to use correct column names throughout
- Created `ADD_IMPRESSION_CLICK_COLUMNS.sql` to ensure columns exist

### **2. Token Usage Visibility** 💰
**Request:** Show tokens spent/remaining to admin AND users

**Fixed:**
- ✅ **Admin Dashboard**: Enhanced with progress bars showing token usage
- ✅ **User Dashboard**: Created new `/my-campaigns` page for sellers to track their campaigns
- ✅ **Real-Time Tracking**: Token spending updates automatically with each impression/click

---

## 🚀 **Setup (Run These SQL Files)**

### **Step 1: Fix Column Names**
```sql
-- Run in Supabase SQL Editor:
ADD_IMPRESSION_CLICK_COLUMNS.sql
```

This will:
- Add `total_impressions` column (if missing)
- Add `total_clicks` column (if missing)
- Add `click_through_rate` column (auto-calculated)
- Create trigger to auto-update CTR

### **Step 2: Update Tracking Functions**
```sql
-- Already updated in:
UPDATE_DYNAMIC_AD_PRICING.sql
```

Re-run this file to ensure impression/click logging uses correct columns.

### **Step 3: Verify & Diagnose**
```sql
-- Run to check and auto-approve campaigns:
DIAGNOSE_MISSING_CAMPAIGN.sql
```

Now shows:
- ✅ Impressions
- ✅ Clicks
- ✅ Tokens spent
- ✅ Tokens remaining

---

## 👥 **For Users (Sellers)**

### **Access Your Campaign Dashboard:**
1. Go to: **`/my-campaigns`**
2. Or click: **Dashboard → "My Campaigns"**
3. Or from: **`/advertising/register`** → "View My Campaigns" card

### **What You'll See:**

#### **📊 Summary Stats (Top of Page):**
- **Total Campaigns** - How many ads you've created
- **Token Budget** - Total allocated + remaining
- **Total Views** - All impressions across campaigns
- **Total Clicks** - All clicks across campaigns

#### **💎 Per-Campaign Token Usage:**
Each campaign card shows:

```
┌─────────────────────────────────────┐
│ Token Budget                        │
│ 45.50 / 500 tokens                  │
│ ████░░░░░░░░░░░░░ 9.1% used        │
│ 💎 454.50 tokens left               │
└─────────────────────────────────────┘
```

**Progress Bar Colors:**
- 🟢 **Green** (0-69%) - Healthy budget
- 🟡 **Yellow** (70-89%) - Getting low
- 🔴 **Red** (90-100%) - Almost depleted

#### **📈 Performance Stats:**
- **Views** - Total impressions
- **Clicks** - Total clicks
- **CTR** - Click-through rate percentage

---

## 👨‍💼 **For Admins**

### **Access Admin Panel:**
1. Go to: **`/admin/dashboard`**
2. Click: **"Ad Campaigns" tab**

### **Enhanced Token Tracking:**

Each campaign now shows:

```
┌─────────────────────────────────────┐
│ 💎 Token Usage                      │
│ 125.75 / 500                        │
│ ██████████░░░░░░ 25.2% used        │
│ 374.25 left                         │
└─────────────────────────────────────┘
```

**Admin can see at a glance:**
- Which campaigns are running low on budget
- Total tokens spent across all campaigns
- Budget usage percentage for each campaign
- Remaining tokens for automatic pause detection

---

## 🎯 **Token Usage Flow**

### **How Tokens Are Spent:**

1. **Impression (View):**
   - Base cost: 0.001 tokens per impression
   - **Dynamic discount applied:**
     - 1 ad alone = 0.001 tokens (full price)
     - 2 ads sharing = 0.0005 tokens (50% off)
     - 3+ ads sharing = 0.00033 tokens (66% off)

2. **Click:**
   - Base cost: 5 tokens per click
   - **Dynamic discount applied:**
     - 1 ad alone = 5 tokens (full price)
     - 2 ads sharing = 2.5 tokens (50% off)
     - 3+ ads sharing = 1.67 tokens (66% off)

3. **Auto-Update:**
   - Every impression/click updates `tokens_spent`
   - Progress bar updates in real-time
   - Campaign auto-pauses when budget depleted

---

## 📊 **Example Token Usage**

### **Scenario 1: Solo Ad (No Competition)**
- **Budget:** 500 tokens
- **Activity:** 
  - 100,000 impressions = 100 tokens
  - 50 clicks = 250 tokens
- **Total Spent:** 350 tokens
- **Remaining:** 150 tokens (30% left)
- **Progress:** 🟡 Yellow warning (70% used)

### **Scenario 2: Shared Banner (2 Ads)**
- **Budget:** 500 tokens
- **Activity (same as above):**
  - 100,000 impressions = 50 tokens (50% off!)
  - 50 clicks = 125 tokens (50% off!)
- **Total Spent:** 175 tokens
- **Remaining:** 325 tokens (65% left)
- **Progress:** 🟢 Green healthy (35% used)

### **Scenario 3: Shared Banner (3+ Ads)**
- **Budget:** 500 tokens
- **Activity (same as above):**
  - 100,000 impressions = 33 tokens (66% off!)
  - 50 clicks = 83.5 tokens (66% off!)
- **Total Spent:** 116.5 tokens
- **Remaining:** 383.5 tokens (77% left)
- **Progress:** 🟢 Green healthy (23% used)

**Savings:** Up to **66% off** when sharing with other ads!

---

## 🔍 **Troubleshooting**

### **"Column does not exist" Error**
**Fix:** Run `ADD_IMPRESSION_CLICK_COLUMNS.sql`

This creates the missing columns with defaults.

### **"No campaigns showing"**
**Fix:** Run `DIAGNOSE_MISSING_CAMPAIGN.sql`

This auto-approves pending campaigns.

### **"Token counts not updating"**
**Fix:** 
1. Run `ADD_IMPRESSION_CLICK_COLUMNS.sql`
2. Re-run `UPDATE_DYNAMIC_AD_PRICING.sql`
3. Refresh admin/user dashboard

### **"CTR shows 0.00%"**
**Normal if:** No impressions yet (campaign just started)

**Fix if stuck:** Run `ADD_IMPRESSION_CLICK_COLUMNS.sql` which includes CTR auto-calculation trigger

---

## 🎉 **Summary**

### **What You Get:**

✅ **Real-time token tracking** for users and admin
✅ **Visual progress bars** with color warnings
✅ **Detailed stats** per campaign
✅ **Dynamic pricing** automatically applied
✅ **Auto-calculated CTR** via database trigger
✅ **Aggregate stats** across all campaigns
✅ **Budget warnings** when tokens running low

### **Where to View:**

| Role | Page | What You See |
|------|------|--------------|
| **Seller** | `/my-campaigns` | Your campaigns, token usage, performance |
| **Admin** | `/admin/dashboard` → "Ad Campaigns" | All campaigns, token usage, approval controls |
| **Both** | Campaign cards | Progress bars, remaining tokens, CTR |

---

## 📁 **Files Updated**

**SQL Scripts:**
- ✅ `ADD_IMPRESSION_CLICK_COLUMNS.sql` - Adds tracking columns
- ✅ `DIAGNOSE_MISSING_CAMPAIGN.sql` - Fixed column names
- ✅ `UPDATE_DYNAMIC_AD_PRICING.sql` - Uses correct columns

**Frontend:**
- ✅ `src/app/my-campaigns/page.tsx` - **NEW** User dashboard
- ✅ `src/components/admin/AdCampaignManagement.tsx` - Enhanced admin view
- ✅ `src/app/dashboard/page.tsx` - Link to "My Campaigns"
- ✅ `src/app/advertising/register/page.tsx` - Link to campaign dashboard

---

All committed to GitHub! ✨

**Quick Links:**
- 👤 Users: Visit `/my-campaigns`
- 👨‍💼 Admins: Visit `/admin/dashboard` → "Ad Campaigns" tab
- 🔧 Issues: Run `DIAGNOSE_MISSING_CAMPAIGN.sql`

