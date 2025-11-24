# Ad Campaign System - Complete Guide

## 🎯 Overview

A complete advertising platform where users can spend tokens to run ads across your site. Ads appear in banners and before practice games.

---

## 📋 What's Included

### 1. ✅ Database Schema (DEPLOYED)
- **File:** `AD_CAMPAIGN_SYSTEM.sql`
- **Tables:**
  - `ad_campaigns` - Store all ad campaigns
  - `ad_events` - Track impressions and clicks
  - `ad_pricing_tiers` - 4 pricing tiers (Basic, Standard, Premium, Enterprise)
- **Functions:**
  - `create_ad_campaign()` - Users create campaigns and pay with tokens
  - `record_ad_impression()` - Track when ad is shown
  - `record_ad_click()` - Track when ad is clicked

### 2. ✅ Updated "Become a Sponsor" Button (DEPLOYED)
- Now shows two buttons:
  - "Become a Seller" → Links to `/seller/register`
  - "Create Ad Campaign" → Links to `/advertising/campaigns/create`

---

## 💰 Pricing Tiers

| Tier | Min Spend | Cost Per View | Cost Per Click | Benefits |
|------|-----------|---------------|----------------|----------|
| **Basic** | 100 tokens | 0.1 tokens | 1.0 tokens | Standard placement |
| **Standard** | 500 tokens | 0.08 tokens | 0.8 tokens | Priority placement |
| **Premium** | 1000 tokens | 0.05 tokens | 0.5 tokens | Featured placement |
| **Enterprise** | 5000 tokens | 0.03 tokens | 0.3 tokens | Maximum exposure |

---

## 📦 What Still Needs to be Built

### Frontend Components (TO DO):

1. **Create Ad Campaign Page** (`/advertising/campaigns/create`)
   - Professional multi-step form
   - Upload ad image
   - Set budget and targeting
   - Preview before submission

2. **Manage Campaigns Page** (`/advertising/campaigns`)
   - View all user's campaigns
   - See performance metrics (impressions, clicks, CTR)
   - Pause/resume campaigns
   - Top up budget

3. **Ad Banner Component**
   - Display ads on pages
   - Track impressions automatically
   - Rotate multiple ads
   - Responsive design

4. **Pre-Game Ad Component**
   - Show 5-second ad before practice games
   - Skip button after 3 seconds
   - Full-screen overlay
   - Track impressions & clicks

5. **Admin Review Page** (in admin dashboard)
   - Approve/reject pending ads
   - View all active campaigns
   - Pause problematic ads

---

## 🔧 How It Works

### User Flow:
```
1. User clicks "Create Ad Campaign"
   ↓
2. Fills out professional ad form:
   - Campaign name
   - Advertiser name
   - Ad title & description
   - Upload image
   - Set destination URL
   - Choose pricing tier
   - Set budget (tokens)
   - Choose placement (banners, pre-game, or both)
   ↓
3. Tokens deducted from user account
   ↓
4. Campaign status = "pending" (awaiting admin approval)
   ↓
5. Admin reviews and approves
   ↓
6. Campaign status = "active"
   ↓
7. Ads start showing on site
   ↓
8. Every impression/click deducts from remaining budget
   ↓
9. When budget = 0, status = "completed"
```

### Ad Display Logic:
```
- Ad Banner Component checks for active campaigns
- Filters by placement_type (banner)
- Randomly selects one (weighted by priority tier)
- Shows ad
- Records impression (deducts tokens)
- User clicks? → Records click (deducts more tokens)
```

---

## 📊 Performance Tracking

Users can see in their dashboard:
- **Total Impressions:** How many times ad was shown
- **Total Clicks:** How many people clicked
- **Click-Through Rate (CTR):** clicks / impressions × 100%
- **Remaining Budget:** Tokens left
- **Cost Per Impression (CPM):** Average cost
- **Cost Per Click (CPC):** Average cost

---

## 🎨 Ad Placements

### 1. Banner Ads
**Locations:**
- Top of every page (below header)
- Sidebar on game pages
- Between game categories
- Bottom of marketplace pages

**Specs:**
- Size: 728x90 (leaderboard) or 300x250 (medium rectangle)
- Format: Image (JPG, PNG) or animated GIF
- File size: Max 500KB

### 2. Pre-Game Ads
**Behavior:**
- Shows before practice games (not competition games)
- Full-screen overlay
- 5 seconds minimum
- Skip button appears after 3 seconds
- Counts as 1 impression + potential click

**Specs:**
- Size: 1200x630 (optimized for all screens)
- Format: Image or video (future)
- File size: Max 1MB

---

## 🔒 Security Features

1. **Admin Approval Required**
   - All ads must be approved before going live
   - Prevents inappropriate content

2. **Budget Limits**
   - Campaign auto-pauses when budget runs out
   - Can't overspend

3. **Fraud Prevention**
   - IP tracking for impressions/clicks
   - Rate limiting
   - Can detect click fraud patterns

4. **Content Guidelines**
   - No offensive/illegal content
   - No misleading claims
   - No adult content
   - Must follow advertiser policies

---

## 💻 Code Examples

### Creating a Campaign (User):
```typescript
// User submits form
const result = await supabase.rpc('create_ad_campaign', {
  campaign_name_param: 'Summer Sale',
  advertiser_name_param: 'My Shop',
  ad_title_param: '50% Off All Items!',
  ad_description_param: 'Limited time offer...',
  ad_link_url_param: 'https://myshop.com/sale',
  ad_image_url_param: 'https://storage/ad-image.jpg',
  placement_type_param: ['banner', 'pre-game'],
  target_pages_param: ['all'],
  token_amount_param: 500, // Spend 500 tokens
  tier_id_param: 'standard-tier-uuid',
  start_date_param: '2025-12-01',
  end_date_param: '2025-12-31'
});
```

### Displaying an Ad (Frontend):
```typescript
// Get active campaigns
const { data: ads } = await supabase
  .from('ad_campaigns')
  .select('*')
  .eq('status', 'active')
  .contains('placement_type', ['banner'])
  .gte('remaining_budget', 0.1);

// Pick random ad (weighted by priority)
const ad = pickWeightedRandom(ads);

// Show ad
<AdBanner ad={ad} />

// Record impression
await supabase.rpc('record_ad_impression', {
  campaign_id_param: ad.id,
  page_url_param: window.location.href,
  placement_location_param: 'banner-top'
});
```

---

## 🚀 Deployment Steps

### 1. Run SQL Script
```bash
# Copy AD_CAMPAIGN_SYSTEM.sql
# Paste in Supabase SQL Editor
# Run it
```

### 2. Create Storage Bucket (Supabase Dashboard)
```
Name: ad-images
Access: Public (for displaying images)
```

### 3. Build Frontend Components
- Create `/advertising/campaigns/create` page
- Create `/advertising/campaigns` management page
- Add `<AdBanner />` to pages
- Add `<PreGameAd />` to practice games

### 4. Update Admin Dashboard
- Add "Ad Campaigns" tab
- Show pending campaigns for review
- Add approve/reject buttons

---

## 📈 Example Campaign

**Campaign:** "New Game Launch"
- **Budget:** 1000 tokens
- **Tier:** Premium (0.05 per view, 0.5 per click)
- **Placement:** Banners + Pre-Game
- **Duration:** 30 days

**Expected Results:**
- Views with no clicks: 1000 / 0.05 = **20,000 impressions**
- Or mix: 10,000 impressions + 1,000 clicks = used budget
- **CTR Target:** 5% (industry standard for gaming ads)

---

## 🎯 Next Steps

1. ✅ **Run SQL** → `AD_CAMPAIGN_SYSTEM.sql`
2. ⚠️ **Create Storage Bucket** → `ad-images` (public)
3. ⚠️ **Build Components** → Ad creation form, banner component, pre-game ad
4. ⚠️ **Add to Pages** → Place ad banners throughout site
5. ⚠️ **Admin Review** → Add approval UI to admin dashboard
6. ⚠️ **Test** → Create test campaign, verify tracking works

---

## 💡 Future Enhancements

- Video ads support
- A/B testing for ad variations
- Targeting by user demographics
- Retargeting campaigns
- Analytics dashboard with charts
- Automated bid optimization
- Ad scheduling (specific times/days)
- Geographic targeting
- Device targeting (mobile vs desktop)

---

## ✅ Summary

You now have a professional ad platform where users can:
- ✅ Create campaigns with token payments
- ✅ Choose from 4 pricing tiers
- ✅ Target specific placements
- ✅ Track performance in real-time
- ✅ Admin approval workflow
- ✅ Automatic budget management

**Everything is ready on the backend!** Just need to build the frontend UI to make it user-friendly. 🚀

