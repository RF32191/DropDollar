# RP Shop System Guide

## Overview
The RP (Reward Points) Shop system allows admins to create listings that users can purchase using their Reward Points. Users earn RP by completing daily/weekly challenges and can spend them in the shop.

## Database Setup

1. **Run the SQL schema**:
   ```sql
   -- Execute CREATE_RP_SHOP_SYSTEM.sql in your Supabase SQL editor
   ```

   This creates:
   - `rp_shop_listings` - Admin-managed shop items
   - `rp_shop_purchases` - Purchase history
   - Functions for purchasing and querying items

## Features

### For Admins

**Access**: `/admin/rp-shop`

**Capabilities**:
- Create new RP shop listings
- Edit existing listings
- Activate/deactivate listings
- Set stock quantities and purchase limits
- Manage item types (cosmetic, boost, badge, token_bonus, special, other)
- Set RP costs and item values

**Item Types**:
- `cosmetic` - Visual items (badges, themes, etc.)
- `boost` - Game boosts (score multipliers, etc.)
- `badge` - Achievement badges
- `token_bonus` - Automatically adds tokens to user balance
- `special` - Special items
- `other` - Miscellaneous items

### For Users

**RP Shop**: `/rp-shop`
- Browse available items
- See RP cost and availability
- Purchase items with Reward Points
- View purchase limits and stock

**Rewards Page**: `/rewards`
- View RP wallet balance
- See transaction history
- Link to RP shop
- View level and rank progress

**Dashboard**: `/dashboard`
- RP wallet card showing current balance
- Quick link to rewards page

## How It Works

1. **Earning RP**: Users earn Reward Points by:
   - Completing daily challenges
   - Completing weekly challenges
   - Leveling up
   - Admin adjustments

2. **Purchasing Items**:
   - User clicks "Purchase" on an item
   - System checks:
     - Sufficient RP balance
     - Stock availability
     - Purchase limit per user
   - RP is deducted from user's balance
   - Transaction is recorded
   - Item benefits are applied (e.g., tokens added for token_bonus items)

3. **Purchase Limits**:
   - Each listing can have a `purchase_limit_per_user`
   - Users can only purchase the same item a limited number of times
   - Stock quantity limits total purchases across all users

## Database Functions

### `purchase_rp_shop_item(user_id, listing_id)`
- Handles the purchase transaction
- Validates RP balance, stock, and limits
- Deducts RP and records transaction
- Applies item benefits (e.g., adds tokens for token_bonus)

### `get_rp_shop_listings(user_id)`
- Returns available listings with:
  - Purchase availability status
  - User's purchase count
  - Stock remaining

### `get_user_rp_purchases(user_id)`
- Returns user's purchase history

## File Structure

```
CREATE_RP_SHOP_SYSTEM.sql          # Database schema
src/app/admin/rp-shop/page.tsx     # Admin management interface
src/app/rp-shop/page.tsx           # User-facing shop
src/app/rewards/page.tsx           # Rewards & wallet page
src/lib/supabase/rpShopService.ts # Service functions
src/app/dashboard/page.tsx        # Updated with RP wallet display
```

## Usage Examples

### Creating a Token Bonus Item
1. Go to `/admin/rp-shop`
2. Click "Create Listing"
3. Fill in:
   - Title: "Token Bonus Pack"
   - Description: "Get 50 bonus tokens!"
   - RP Cost: 100
   - Item Type: "token_bonus"
   - Item Value: 50
   - Stock: Leave empty for unlimited
   - Purchase Limit: 1 (one per user)

### Creating a Cosmetic Badge
1. Title: "Premium Badge"
2. Description: "Show off your dedication"
3. RP Cost: 250
4. Item Type: "badge"
5. Item Value: Leave empty
6. Image URL: Link to badge image

## Security

- RLS policies ensure users can only:
  - View active listings
  - View their own purchases
  - Insert their own purchases
- Admins can manage all listings
- Purchase function validates all constraints server-side

## Next Steps

1. Run the SQL schema in Supabase
2. Access `/admin/rp-shop` to create listings
3. Users can visit `/rp-shop` to browse and purchase
4. Users can view their wallet at `/rewards`

