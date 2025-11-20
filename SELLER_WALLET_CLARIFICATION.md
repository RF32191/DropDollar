# 💰 Seller Wallet System - SELLER DASHBOARD ONLY

## ⚠️ IMPORTANT: Dual Wallet is SELLER-ONLY Feature

The dual wallet system (Pending + Released) is **EXCLUSIVELY** for the **Seller Dashboard**.

Regular users do NOT see this - they only have their normal token balance.

---

## 👥 Different User Types

### **Regular Users (Winners/Buyers)**
- ✅ See: Token balance (for playing games)
- ✅ See: Transaction history
- ✅ See: Game history
- ❌ DO NOT SEE: Dual wallet
- ❌ DO NOT SEE: Pending/Released balances

### **Approved Sellers**
- ✅ See: Everything regular users see
- ✅ PLUS: Seller Dashboard tab
- ✅ PLUS: Dual wallet (Pending + Released)
- ✅ PLUS: Pending shipments list
- ✅ PLUS: Stripe withdrawal option

---

## 🎯 Where Dual Wallet Appears

### **Seller Dashboard Tab ONLY:**

```typescript
// In src/app/dashboard/page.tsx

{activeTab === 'seller' && isSeller && (
  <div className="seller-dashboard">
    
    {/* DUAL WALLET - ONLY VISIBLE TO SELLERS */}
    <SellerWallet />
    
    {/* Shows: */}
    {/* - Pending Balance: $X.XX (awaiting tracking) */}
    {/* - Released Balance: $Y.YY (ready to withdraw) */}
    {/* - [Withdraw to Bank] button */}
    
    {/* PENDING SHIPMENTS */}
    <PendingShipments />
    
  </div>
)}
```

---

## 🔒 Access Control

### **RLS Policy:**
```sql
-- Only sellers can see their own wallet
CREATE POLICY "Sellers can view own wallet"
    ON public.seller_wallets
    FOR SELECT
    TO authenticated
    USING (seller_id = auth.uid());
```

### **Frontend Check:**
```typescript
// Only show seller dashboard if user is approved seller
const isSeller = userProfile?.is_seller && 
                 userProfile?.seller_status === 'approved';

// Only fetch wallet if seller
if (isSeller) {
  const wallet = await supabase.rpc('get_seller_wallet');
  // Show dual wallet
} else {
  // Show regular token balance only
}
```

---

## 📊 Dashboard Layouts

### **Regular User Dashboard:**
```
┌────────────────────────────────────────┐
│  Dashboard - john_doe                  │
├────────────────────────────────────────┤
│  Tabs:                                 │
│  - Recent Games                        │
│  - Practice History                    │
│  - Competition History                 │
│  - Statistics                          │
│  - Token History                       │
│  - Messages                            │
│  - Shipping Address                    │
│                                        │
│  Token Balance: 1,250 🪙               │
│  (Regular token balance for games)     │
└────────────────────────────────────────┘
```

### **Seller Dashboard (Additional Tab):**
```
┌────────────────────────────────────────┐
│  Dashboard - jane_seller               │
├────────────────────────────────────────┤
│  Tabs:                                 │
│  - Recent Games                        │
│  - Practice History                    │
│  - ...                                 │
│  - Messages                            │
│  - Shipping Address                    │
│  - 🏪 SELLER DASHBOARD ← NEW!         │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  💰 Seller Wallet                │ │
│  ├──────────────────────────────────┤ │
│  │  ⏳ Pending (Awaiting Tracking)  │ │
│  │     $125.50 (3 sales)            │ │
│  │                                  │ │
│  │  ✅ Released (Ready to Withdraw) │ │
│  │     $450.00 (12 sales)           │ │
│  │     [💳 Withdraw to Bank]        │ │
│  │                                  │ │
│  │  📊 Lifetime Stats               │ │
│  │     Total Earned: $1,250.00      │ │
│  │     Total Withdrawn: $675.50     │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  📦 Pending Shipments            │ │
│  ├──────────────────────────────────┤ │
│  │  PS5 Console - $127.50           │ │
│  │  [📝 Add Tracking Number]        │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

---

## 🎯 Implementation Checklist

### **Frontend - Dashboard Tabs:**
- [ ] Regular tabs (for all users)
  - Recent Games
  - Practice History
  - Competition History
  - Statistics
  - Token History
  - Messages
  - Shipping Address

- [ ] Seller tab (ONLY if `isSeller === true`)
  - Dual Wallet display
  - Pending shipments
  - Listing management
  - Stripe withdrawal

### **Data Fetching:**
```typescript
// Regular users - fetch token balance
if (!isSeller) {
  const { tokenBalance } = useTokenSync(); // Regular tokens
}

// Sellers - fetch both
if (isSeller) {
  const { tokenBalance } = useTokenSync(); // For playing games
  const wallet = await supabase.rpc('get_seller_wallet'); // Seller earnings
}
```

### **Database Tables:**
- `users.token_balance` → All users (game tokens)
- `seller_wallets` → ONLY sellers (sales earnings)

---

## 💡 Why Two Separate Systems?

### **Token Balance (All Users):**
- Purpose: Play games
- Source: Purchased or won in competitions
- Used for: Game entry fees
- Table: `users.token_balance`

### **Seller Wallet (Sellers Only):**
- Purpose: Sales earnings
- Source: Marketplace listings won by others
- Used for: Stripe withdrawal to bank
- Table: `seller_wallets`

### **These are COMPLETELY SEPARATE!**
- Tokens ≠ Dollars
- Token balance is for playing
- Seller wallet is for earnings
- No conversion between them

---

## 🔐 Security

### **Regular Users CANNOT:**
- ❌ Access seller_wallets table
- ❌ Call get_seller_wallet() if not a seller
- ❌ See seller dashboard tab
- ❌ Submit tracking numbers
- ❌ Withdraw to bank

### **Only Approved Sellers Can:**
- ✅ Access their own seller_wallets record
- ✅ Call get_seller_wallet()
- ✅ See seller dashboard tab
- ✅ Submit tracking numbers
- ✅ Withdraw via Stripe

---

## 📋 Summary

| Feature | Regular Users | Sellers |
|---------|--------------|---------|
| Token Balance | ✅ Yes | ✅ Yes |
| Game History | ✅ Yes | ✅ Yes |
| Messages | ✅ Yes | ✅ Yes |
| **Dual Wallet** | ❌ NO | ✅ **YES** |
| **Pending Balance** | ❌ NO | ✅ **YES** |
| **Released Balance** | ❌ NO | ✅ **YES** |
| **Stripe Withdrawal** | ❌ NO | ✅ **YES** |
| **Submit Tracking** | ❌ NO | ✅ **YES** |

---

## ✅ Implementation Notes

1. **Check seller status:**
   ```typescript
   const isSeller = user?.is_seller && user?.seller_status === 'approved';
   ```

2. **Conditionally show seller tab:**
   ```typescript
   {isSeller && (
     <Tab>Seller Dashboard</Tab>
   )}
   ```

3. **Only fetch wallet if seller:**
   ```typescript
   if (isSeller) {
     const wallet = await supabase.rpc('get_seller_wallet');
   }
   ```

4. **RLS ensures security:**
   - Non-sellers get permission denied if they try to access
   - Database enforces this even if frontend is bypassed

---

**The dual wallet is EXCLUSIVELY for sellers!** 🏪

Regular users never see it - they only see their token balance for playing games. 🎮

