# RP Economics & Shop Listings Guide

## 💰 RP Value System

**Base Conversion:**
- 1 RP = $0.01 (100 RP = $1)
- 1 Coin = $1
- **Profit Margin: 15%**

## 🛍️ RP Shop Listings

### Coin Packs (Token Bonus Items)
All coin packs automatically add coins to user balance when purchased.

| Listing | Coins | RP Cost | Your Cost | Your Profit | Profit % |
|---------|-------|---------|-----------|-------------|----------|
| 10 Coins Pack | 10 | 1,180 RP | $10.00 | $1.18 | 15% |
| 25 Coins Pack | 25 | 2,940 RP | $25.00 | $2.94 | 15% |
| 50 Coins Pack | 50 | 5,880 RP | $50.00 | $5.88 | 15% |
| 100 Coins Pack | 100 | 11,765 RP | $100.00 | $11.76 | 15% |
| 250 Coins Pack | 250 | 29,410 RP | $250.00 | $29.41 | 15% |
| 500 Coins Pack | 500 | 58,820 RP | $500.00 | $58.82 | 15% |

### Gift Cards (Special Items)
Gift cards can be redeemed for credits or cashout.

| Listing | Value | RP Cost | Your Cost | Your Profit | Profit % |
|---------|-------|---------|-----------|-------------|----------|
| $10 Gift Card | $10 | 1,180 RP | $10.00 | $1.18 | 15% |
| $25 Gift Card | $25 | 2,940 RP | $25.00 | $2.94 | 15% |
| $50 Gift Card | $50 | 5,880 RP | $50.00 | $5.88 | 15% |
| $100 Gift Card | $100 | 11,765 RP | $100.00 | $11.76 | 15% |

### Cosmetic Badges
| Listing | RP Cost | Description |
|---------|---------|-------------|
| Bronze Badge | 500 RP | Show off your dedication |
| Silver Badge | 1,000 RP | Premium badge for committed players |
| Gold Badge | 2,500 RP | Elite badge for top players |
| Platinum Badge | 5,000 RP | Ultimate badge for legends |

### Boost Items
| Listing | RP Cost | Effect |
|---------|---------|--------|
| Score Boost x2 | 1,500 RP | Double score for next 3 games |
| Score Boost x3 | 3,000 RP | Triple score for next 2 games |
| XP Boost | 2,000 RP | Earn 2x XP for next 5 games |

## 📅 Daily Challenge RP Rewards

**Range: 15-50 RP per challenge**

Daily challenges automatically regenerate each day with random RP values:

| Challenge Type | RP Range | Typical Value |
|----------------|----------|---------------|
| Practice Games | 15-25 RP | ~20 RP |
| Competition Games | 25-40 RP | ~32 RP |
| Score Threshold | 20-35 RP | ~27 RP |
| Games Count | 30-50 RP | ~40 RP |

**Total Daily RP Available:** ~119 RP (if all challenges completed)

## 📆 Weekly Challenge RP Rewards

**Range: 50-200 RP per challenge**

Weekly challenges automatically regenerate each week (Monday) with random RP values:

| Challenge Type | RP Range | Typical Value |
|----------------|----------|---------------|
| Practice Games | 50-80 RP | ~65 RP |
| Competition Games | 80-120 RP | ~100 RP |
| Score Threshold | 70-100 RP | ~85 RP |
| Games Count | 100-150 RP | ~125 RP |
| Win Competition | 120-180 RP | ~150 RP |
| Total XP | 150-200 RP | ~175 RP |

**Total Weekly RP Available:** ~700 RP (if all challenges completed)

## 💡 RP Earning Strategy

**Daily Maximum:** ~119 RP/day = ~$1.19/day
**Weekly Maximum:** ~700 RP/week = ~$7.00/week
**Monthly Maximum:** ~3,000 RP/month = ~$30/month

**To afford a 100 Coins Pack (11,765 RP):**
- Daily challenges: ~99 days
- Weekly challenges: ~17 weeks
- Combined: ~47 days (if completing all challenges)

## 🎯 Profitability Analysis

**Example: User buys 100 Coins Pack**
- User pays: 11,765 RP
- RP value: $117.65
- You give: 100 coins = $100
- **Your profit: $17.65 (15%)**

**Example: User completes all daily challenges**
- User earns: ~119 RP = $1.19
- You pay out: $1.19 worth of RP
- **No direct cost** (RP is virtual currency)

## 🔄 Auto-Rotation System

- **Daily Challenges:** Automatically regenerate each day at midnight
- **Weekly Challenges:** Automatically regenerate each Monday
- Challenges are created when users view them (lazy loading)
- Old challenges are automatically cleaned up

## 📊 Setup Instructions

1. **Run the SQL file:**
   ```sql
   -- Execute CREATE_RP_SHOP_LISTINGS_AND_CHALLENGES.sql
   ```

2. **Verify listings:**
   - Go to `/admin/rp-shop`
   - You should see all coin packs, gift cards, badges, and boosts

3. **Test challenges:**
   - Go to `/dashboard`
   - Check daily challenges section
   - RP rewards should be 15-50 RP range

4. **Monitor profitability:**
   - Track RP shop purchases
   - Ensure 15% margin is maintained
   - Adjust RP values if needed

## 🎮 User Motivation

The RP system is designed to:
- ✅ Reward daily engagement (15-50 RP/day)
- ✅ Reward weekly commitment (50-200 RP/week)
- ✅ Make premium items achievable (100 coins = ~47 days of play)
- ✅ Maintain 15% profit margin on all purchases
- ✅ Create desire to play for bonuses

