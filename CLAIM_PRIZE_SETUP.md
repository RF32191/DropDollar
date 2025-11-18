# 🏆 Claim Prize System - Setup Guide

## ✅ What You Just Got

### 🎉 **GIANT "CLAIM YOUR PRIZE" Button**
- Golden gradient with pulsing animation
- Only visible to winners
- Impossible to miss!

### 📦 **Complete Winner → Seller Flow**
1. Winner gets message: "Congratulations! Click Claim Prize"
2. Winner clicks golden "CLAIM YOUR PRIZE!" button
3. Modal opens for shipping address
4. Address saved + automatically sent to seller
5. Seller receives message with full address
6. Seller ships item + releases funds

---

## 🚀 Quick Setup (3 SQL Files)

Run these in order in **Supabase SQL Editor**:

### 1️⃣ COMPLETE_MARKETPLACE_AUTOMATION.sql
Creates:
- Shipping address fields
- System user for messages
- Base messaging functions

### 2️⃣ UPDATE_MARKETPLACE_WITH_AUTOMATED_MESSAGES.sql
Integrates:
- Winner notification
- Seller notification
- Automatic messaging

### 3️⃣ ADD_CLAIM_PRIZE_SYSTEM.sql ⭐ **NEW!**
Adds:
- `send_winner_address_to_seller()` function
- Enhanced message types
- Address delivery system

---

## 🎮 How It Works

### **Winner Experience:**

#### Step 1: Win the Game
- Timer expires
- Winner determined by highest score
- Celebration animations appear

#### Step 2: Get Message
```
🎉 Congratulations! You won: [Product Name]

🏆 You are the winner!

📦 NEXT STEP: Click "Claim Prize" on the listing to 
provide your shipping address.
```

#### Step 3: See Claim Button
On the listing card:
- **GIANT GOLDEN BUTTON**: 🏆 CLAIM YOUR PRIZE! 🎉
- Pulsing animation
- Yellow gradient
- Can't be missed!

#### Step 4: Enter Address
Click button → Modal opens:
- Full name
- Address line 1 & 2
- City, State, Zip
- Phone number
- Country

#### Step 5: Confirmed!
- Address saved to profile
- Button changes to: ✅ Prize Claimed
- Seller automatically notified

---

### **Seller Experience:**

#### Step 1: Winner Determined
Receives message:
```
💰 Winner Determined: [Product Name]

✅ A winner has been selected!

🏆 Winner: [Username]
💵 Prize Pool: X tokens (you receive 85% = Y tokens)

⏳ WAITING: The winner needs to claim their prize 
and provide their shipping address.
```

#### Step 2: Winner Claims Prize
Receives NEW message:
```
📦 SHIP NOW: [Product Name]

✅ The winner has claimed their prize!

🏆 Winner: [Username]

📍 SHIPPING ADDRESS:
[Full Name]
[Address Line 1]
[Address Line 2]
[City, State Zip]
Phone: [Phone Number]

💰 RELEASE FUNDS: Y tokens
Once you ship the item, click the button below 
to release your funds!
```

#### Step 3: Ship & Release Funds
- Ship the item to winner
- Click "Release Funds" button in message
- Tokens transferred to wallet
- Done!

---

## 🎨 Button States

### For Winner:
**Before Claiming:**
```
🏆 CLAIM YOUR PRIZE! 🎉
(Golden, pulsing, huge, impossible to miss)
```

**After Claiming:**
```
✅ Prize Claimed - Seller has your address!
(Green, static, confirmed)
```

### For Seller:
**Before Winner Claims:**
```
📦 Your Listing - Cannot Join Own Competition
(Purple, informational)
```

**After Winner Claims:**
- Seller gets message with address
- No button on listing (uses message system)

---

## 📊 Status Flow

```
Game Ends
    ↓
status = 'winner_selected'
    ↓
Winner Gets Message
    ↓
Winner Clicks "CLAIM PRIZE"
    ↓
Address Modal Opens
    ↓
Winner Submits Address
    ↓
status = 'address_provided'
    ↓
Seller Gets Address Message
    ↓
Seller Ships Item
    ↓
Seller Clicks "Release Funds"
    ↓
status = 'completed'
```

---

## 🧪 Testing Checklist

### Test the Complete Flow:

- [ ] **Create a listing** (Account A - Seller)
- [ ] **Join and play** (Account B - Winner)
- [ ] **Wait 1 minute** (timer expires)
- [ ] **Winner sees message** (Congratulations!)
- [ ] **Winner sees golden "CLAIM PRIZE" button** on listing
- [ ] **Winner clicks button** → Modal opens
- [ ] **Winner enters address** → Submit
- [ ] **Button changes to "Prize Claimed"** ✅
- [ ] **Seller receives message** with winner's address
- [ ] **Seller clicks "Release Funds"** button
- [ ] **Tokens transferred** to seller wallet

---

## 🔍 Verification Queries

### Check Message Flow:
```sql
-- See all system messages in order
SELECT 
    m.created_at,
    u.username as recipient,
    LEFT(m.message_text, 100) as preview,
    m.metadata->>'message_type' as type
FROM messages m
JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
JOIN users u ON u.id = cp.user_id
WHERE m.message_type = 'system'
  AND cp.user_id != (SELECT id FROM users WHERE email = 'system@dropdollar.com')
ORDER BY m.created_at DESC
LIMIT 20;
```

### Check Listing Status:
```sql
-- See listing progression
SELECT 
    ml.title,
    ml.status,
    ms.winner_username,
    ms.status as session_status,
    ms.completed_at
FROM marketplace_listings ml
JOIN marketplace_sessions ms ON ms.listing_id = ml.id
WHERE ms.status = 'completed'
ORDER BY ms.completed_at DESC
LIMIT 10;
```

### Check Saved Addresses:
```sql
-- See who has saved addresses
SELECT 
    username,
    shipping_address_line1,
    shipping_city || ', ' || shipping_state as location,
    shipping_phone
FROM users
WHERE shipping_address_line1 IS NOT NULL
ORDER BY updated_at DESC;
```

---

## 🐛 Troubleshooting

### Issue: "Claim Prize button not showing"
**Check:**
- Is user the winner? (`listing.winner_user_id === user.id`)
- Is status not 'address_provided'?
- Refresh the page

### Issue: "Address not being sent to seller"
**Check:**
1. SQL file #3 ran successfully
2. `send_winner_address_to_seller` function exists
3. Check Supabase logs for errors

### Issue: "Modal submission fails"
**Check:**
1. All required fields filled
2. `update_user_shipping_address` function exists
3. User is authenticated

### Issue: "Seller not getting address message"
**Check:**
1. Winner successfully claimed prize
2. System user exists
3. Run query to see if message was created

---

## ✨ Key Features

✅ **Impossible to Miss** - Giant golden button
✅ **One-Click Claim** - Opens modal immediately
✅ **Auto-Save** - Address saved to profile for future wins
✅ **Auto-Notify** - Seller gets address automatically
✅ **Status Tracking** - Clear progression through states
✅ **Visual Feedback** - Button changes after claiming
✅ **Secure** - Address only sent after winner confirms

---

## 📁 Files Summary

| File | Purpose |
|------|---------|
| `ADD_CLAIM_PRIZE_SYSTEM.sql` | New claim prize functionality |
| `src/components/CategoryPageMarketplace.tsx` | Golden button + status display |
| `src/components/modals/ShippingAddressModal.tsx` | Address capture + send to seller |

---

## 🎯 Success Criteria

✅ Winner sees golden "CLAIM PRIZE" button
✅ Button opens address modal
✅ Address saves to user profile
✅ Seller receives message with full address
✅ Button changes to "Prize Claimed"
✅ Seller can release funds

---

**🎉 Your claim prize system is ready! Just run the 3 SQL files and test it out!**

