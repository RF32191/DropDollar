# 📢 Complete Ad System Setup Guide

## ✅ What's Been Built

Your DropDollar platform now has a **complete advertising system** with:

- 🎨 **Ad Banner Component** - Shows on all major pages
- 💰 **Token-Based Payments** - Etsy-style pricing (1 token per 1,000 impressions, 5 tokens per click)
- 📊 **Admin Dashboard Tab** - Approve, monitor, and manage campaigns
- 🚀 **Seller Registration Page** - Create campaigns at `/advertising/register`
- 📈 **Real-Time Analytics** - Track impressions, clicks, CTR, budget usage
- 🔒 **Row Level Security** - Sellers manage their own, admins see everything
- 🤖 **Automated Billing** - Auto-charges tokens for impressions and clicks

---

## 📋 Step-by-Step Setup (Run in Supabase SQL Editor)

### **Step 1: Create Ad System Tables & Functions**
Run: `COMPLETE_AD_SYSTEM_SETUP.sql`

What it does:
- Creates 4 tables: `ad_campaigns`, `ad_images`, `ad_impressions`, `ad_campaign_transactions`
- Sets up RLS policies
- Creates functions: `create_ad_campaign`, `get_active_ads_for_page`, `log_ad_impression`, `log_ad_click`

### **Step 2: Fix Token Handling**
Run: `FIX_AD_TOKEN_USERS_TABLE.sql`

What it does:
- Updates `create_ad_campaign` function to use `users.purchased_tokens` and `users.won_tokens`
- Handles token deduction correctly (deducts from purchased first, then won)

### **Step 3: Update Ad Priority & Logging**
Run: `UPDATE_AD_PRIORITY_SYSTEM.sql`
Run: `UPDATE_AD_LOGGING_FUNCTIONS.sql`

What it does:
- Prioritizes paid seller ads over free platform ads
- Makes platform ads free (no token charges)
- Only charges tokens for paid seller ads

### **Step 4: Create Platform Default Ads** ⭐ **IMPORTANT**
Run: `CREATE_PLATFORM_DEFAULT_ADS.sql`

What it does:
- Creates 4 permanent DropDollar promotional ads:
  - 💰 Win Real Money Playing Skill-Based Games
  - 🔥 $50K Prize Pools in Hot Sell Tournaments
  - 🎁 Win Real Products - iPads, Gaming Gear & More
  - 🏪 Sell Your Products to Thousands of Active Gamers
- These show until sellers pay for their own ads
- **FREE** - No token charges, unlimited impressions
- Runs forever (10 year expiration)

### **Step 5: Add Test Tokens**
Run: `GIVE_5000_TOKENS_TO_RYAN.sql`

What it does:
- Adds 5,000 tokens to `ryanrfermoselle@yahoo.com` for testing

### **Step 6 (Optional): Create Seller Demo Ads**
Run: `CREATE_DEMO_ADS.sql`

What it does:
- Creates 3 pre-approved demo ad campaigns from fake sellers
- These will show immediately on all pages for testing
- Uses paid ad format (charges tokens)

---

## 🎯 How to Use the System

### **For Sellers (Creating Ads):**

1. **Visit `/advertising/register`**
2. **Fill out campaign form:**
   - Campaign name, headline (60 chars), description (150 chars)
   - Upload image (optional, max 5MB)
   - Choose target pages (games, tournaments, dashboard, etc.)
   - Set token budget (minimum 50 tokens)
3. **Submit** - Tokens deducted from your balance
4. **Wait for approval** - Campaign is in "pending" status

### **For Admins (Managing Ads):**

1. **Go to `/admin/dashboard`**
2. **Click "Ad Campaigns" tab**
3. **See ALL campaigns** (Platform + Paid) with:
   - 🆓 **Platform Ad Badge** - Identifies free DropDollar ads
   - 💰 **Budget Usage** - Tokens spent vs budget
   - 📊 **Real-Time Stats:**
     - Total impressions (views)
     - Total clicks
     - Click-through rate (CTR %)
     - Budget percentage used
   - 📍 **Target Pages** - Where ads are showing
   - 👤 **Seller Info** - Username and contact
4. **Take action:**
   - ✅ **Approve & Activate** - Makes ad go live
   - ❌ **Reject** - Reject with reason
   - ⏸️ **Pause** - Stop showing temporarily
   - ▶️ **Resume** - Restart paused ad
   - 🗑️ **Delete** - Remove & auto-refund unspent tokens
5. **Filter campaigns:**
   - All / Pending / Active / Paused / Completed
6. **View aggregate stats:**
   - Total campaigns (platform + paid)
   - Pending approvals
   - Active campaigns
   - Total tokens spent (paid ads only)

### **For Users (Viewing Ads):**

Ads automatically appear on these pages:
- `/games` - Practice gaming arena
- `/tournaments` - Tournament hub
- `/hot-sell` - Hot Sell competitions
- `/tournaments/1v1` - 1v1 battles
- `/winner-takes-all` - WTA tournaments
- `/dashboard` - User dashboard

**Ads rotate every 10 seconds** if multiple exist!

---

## 💡 How the Banner Works

### **Smart Ad Priority System:**

#### **1️⃣ Paid Seller Ads (If Available)**
When sellers pay for ads, they show first:
```
┌──────────────────────────────────────────┐
│ ✨ SPONSORED                             │
│ [Image] 50% OFF Gaming Headsets!         │
│         Premium gear at unbeatable prices│
│         [Shop Now →] by GamingStoreX     │
│         💰 [PAID AD] Charges seller      │
│         ● ○ ○ (rotation indicators)      │
└──────────────────────────────────────────┘
```

#### **2️⃣ Platform Default Ads (Fallback)**
When NO paid ads exist, shows DropDollar's own ads:
```
┌──────────────────────────────────────────┐
│ ✨ SPONSORED                             │
│ 💰 Win Real Money Playing Skill-Based!  │
│ Join tournaments, compete fairly, cash   │
│ out instantly. No gambling—pure skill!   │
│ [Start Playing →] by DropDollar          │
│ 🆓 [PLATFORM AD] Free                    │
└──────────────────────────────────────────┘
```

### **🎯 Priority Logic:**
1. **Paid Seller Ads** → Show ONLY these when they exist
2. **Platform Ads** → Show when NO paid ads for that page
3. **Never show both** → Sellers get full visibility!

### **💸 Charging Logic:**
- **Platform Ads (DropDollar):** FREE, no token charges
- **Paid Seller Ads:** Charge per impression & click
  - 1 token per 1,000 impressions
  - 5 tokens per click

---

## 📊 Pricing Model (Etsy-Style)

- **1 token** per 1,000 impressions (views)
- **5 tokens** per click
- Minimum budget: **50 tokens**
- Campaigns run until budget depleted or end date reached

### Example Campaign Budget:
```
500 tokens budget =
  - ~500,000 impressions OR
  - ~100 clicks OR
  - Mix of both
```

---

## 🔧 Troubleshooting

### **"No banners showing on any page"**
✅ **Fixed!** Banner now always shows:
- Default CTA when no ads
- Loading state while fetching
- Real ads when available

### **"Campaign created but not showing"**
👉 Campaign needs admin approval first:
1. Go to `/admin/dashboard`
2. Click "Ad Campaigns" tab
3. Find your campaign (status: "pending")
4. Click "Approve & Activate"
5. Refresh any page → ad appears!

### **"Insufficient tokens error"**
👉 Add tokens to your account:
- Run `GIVE_5000_TOKENS_TO_RYAN.sql` for testing
- Or visit `/buy-tokens` to purchase

### **"Could not determine token balance"**
👉 Run `FIX_AD_TOKEN_USERS_TABLE.sql`
- This fixes the function to read from `users` table (where wallet data lives)

---

## 🎉 Features Included

✅ Ad rotation (10-second intervals)
✅ Impression tracking
✅ Click tracking with token charges
✅ Budget management
✅ CTR analytics
✅ Admin approval workflow
✅ Auto-pause when budget depleted
✅ Auto-refund on deletion
✅ Dismissible banners
✅ Mobile responsive
✅ Multiple ad formats (top, sidebar, bottom)
✅ Target page selection
✅ Image upload support
✅ Real-time stats updates

---

## 📁 Key Files

**SQL Scripts:**
- `COMPLETE_AD_SYSTEM_SETUP.sql` - Main setup
- `FIX_AD_TOKEN_USERS_TABLE.sql` - Token handling fix
- `GIVE_5000_TOKENS_TO_RYAN.sql` - Add test tokens
- `CREATE_DEMO_ADS.sql` - Create demo ads (optional)

**Components:**
- `src/components/ads/AdBanner.tsx` - Banner display component
- `src/components/ads/CreateAdCampaign.tsx` - Campaign creation form
- `src/components/admin/AdCampaignManagement.tsx` - Admin controls
- `src/app/advertising/register/page.tsx` - Registration page

**Pages with Banners:**
- All major game/tournament pages
- Dashboard
- Advertising pages

---

## 🚀 Quick Test Flow

1. **Run SQL files** (Steps 1-3 above)
2. **Log in** as ryanrfermoselle@yahoo.com
3. **Visit `/advertising/register`** → See 5000 tokens in wallet
4. **Create test campaign** → Budget 100 tokens
5. **Go to `/admin/dashboard`** → Click "Ad Campaigns"
6. **Click "Approve & Activate"** on your campaign
7. **Visit `/games`** → See your ad in banner! 🎉
8. **Monitor stats** in admin panel

---

All code committed to GitHub! ✨

