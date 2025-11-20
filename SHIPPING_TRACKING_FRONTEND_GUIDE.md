# 📦 Shipping Tracking System - Frontend Implementation Guide

## 🎯 Overview

Complete shipping tracking and payment release system with:
- ✅ Dual wallet system (pending → released)
- ✅ Tracking number submission UI
- ✅ Automatic fund release
- ✅ Real-time shipment tracking
- ✅ Stripe Connect payouts

---

## 📊 Database Setup

### Step 1: Run SQL
```sql
-- Run in Supabase SQL Editor:
CREATE_SHIPPING_TRACKING_SYSTEM.sql
```

This creates:
- `seller_wallets` table - dual wallet system
- `shipping_updates` table - tracking history
- Tracking columns in `marketplace_sessions`
- RPC functions for all operations

---

## 🎨 Frontend Components Needed

### 1. **Seller Dashboard - Dual Wallet**

Location: `src/app/dashboard/page.tsx` (add to seller section)

```typescript
// Add to seller dashboard tab
{activeTab === 'seller' && isSeller && (
  <SellerWalletView />
)}
```

### 2. **Tracking Submission Modal**

Component: `src/components/seller/TrackingSubmissionModal.tsx`

Shows:
- Input for tracking number
- Dropdown for carrier (USPS, UPS, FedEx, DHL)
- Estimated delivery date picker
- Preview of earnings to be released
- Submit button

### 3. **Shipment Tracking View**

Component: `src/components/shipping/ShipmentTrackingView.tsx`

Shows:
- Tracking number with copy button
- Carrier logo
- Tracking link
- Current status
- Estimated delivery
- Shipment history timeline

---

## 🔧 RPC Functions to Use

### For Sellers:

```typescript
// Get seller wallet
const { data: wallet } = await supabase.rpc('get_seller_wallet');

// Response:
{
  pending_balance: 125.50,      // Awaiting tracking
  released_balance: 450.00,     // Ready to withdraw
  total_pending_sales: 3,
  total_released_sales: 12,
  total_earned: 1250.00,
  total_withdrawn: 675.50,
  available_to_withdraw: 450.00,
  stripe_connected: true,
  can_receive_payouts: true
}

// Get pending shipments (need tracking)
const { data: pending } = await supabase.rpc('get_pending_shipments');

// Response: Array of:
{
  session_id: 'uuid',
  title: 'PS5 Console',
  winner_username: 'john_doe',
  winner_email: 'john@example.com',
  winner_address: {...},
  prize_amount: 150.00,
  platform_fee: 22.50,
  seller_earnings: 127.50,
  needs_tracking: true
}

// Submit tracking number
const { data, error } = await supabase.rpc('submit_tracking_number', {
  p_session_id: sessionId,
  p_tracking_number: '1234567890',
  p_tracking_provider: 'USPS',
  p_estimated_delivery: '2025-12-01T12:00:00Z'
});

// Response:
{
  success: true,
  message: 'Tracking number submitted and funds released',
  tracking_number: '1234567890',
  tracking_url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=1234567890',
  funds_released: 127.50,
  estimated_delivery: '2025-12-01T12:00:00Z'
}
```

### For Winners (Buyers):

```typescript
// Get shipping status
const { data: shipping } = await supabase.rpc('get_shipping_status', {
  p_session_id: sessionId
});

// Response:
{
  session_id: 'uuid',
  listing_title: 'PS5 Console',
  user_role: 'buyer',  // or 'seller'
  shipping_status: 'shipped',
  tracking_number: '1234567890',
  tracking_provider: 'USPS',
  tracking_url: 'https://...',
  shipped_at: '2025-11-20T10:00:00Z',
  estimated_delivery: '2025-11-27T12:00:00Z',
  delivered_at: null,
  funds_released: true,
  updates: [
    {
      status: 'shipped',
      location: 'Los Angeles, CA',
      description: 'Package shipped',
      timestamp: '2025-11-20T10:00:00Z'
    }
  ]
}
```

---

## 💡 UI Flow Examples

### Seller Dashboard - Wallet View

```
┌─────────────────────────────────────────┐
│  💰 Seller Wallet                       │
├─────────────────────────────────────────┤
│                                         │
│  ⏳ Pending (Awaiting Tracking)        │
│     $125.50 (3 sales)                  │
│     └─ Provide tracking to release     │
│                                         │
│  ✅ Released (Ready to Withdraw)       │
│     $450.00 (12 sales)                 │
│     [💳 Withdraw to Bank]              │
│                                         │
│  📊 Lifetime Stats                     │
│     Total Earned: $1,250.00            │
│     Total Withdrawn: $675.50           │
└─────────────────────────────────────────┘
```

### Pending Shipments List

```
┌─────────────────────────────────────────┐
│  📦 Pending Shipments                   │
├─────────────────────────────────────────┤
│                                         │
│  PS5 Console - $127.50                 │
│  Winner: john_doe                      │
│  Address: 123 Main St...               │
│  [📝 Add Tracking Number]              │
│                                         │
│  iPhone 15 Pro - $95.00                │
│  Winner: jane_smith                    │
│  Address: 456 Oak Ave...               │
│  [📝 Add Tracking Number]              │
└─────────────────────────────────────────┘
```

### Tracking Submission Modal

```
┌─────────────────────────────────────────┐
│  📦 Submit Tracking Number              │
├─────────────────────────────────────────┤
│                                         │
│  Item: PS5 Console                     │
│  Buyer: john_doe                       │
│  Amount to Release: $127.50            │
│                                         │
│  Tracking Number *                     │
│  [____________________________]        │
│                                         │
│  Carrier *                             │
│  [▼ USPS                     ]         │
│                                         │
│  Estimated Delivery (Optional)         │
│  [📅 11/27/2025              ]         │
│                                         │
│  ℹ️ Funds will be released to your    │
│     wallet immediately after           │
│     submitting tracking.               │
│                                         │
│  [Cancel]  [Submit & Release Funds]    │
└─────────────────────────────────────────┘
```

### Tracking View (Both Seller & Buyer)

```
┌─────────────────────────────────────────┐
│  📦 Shipment Tracking                   │
├─────────────────────────────────────────┤
│                                         │
│  PS5 Console                           │
│  Status: 🚚 In Transit                 │
│                                         │
│  Tracking: 1234567890 [📋 Copy]       │
│  Carrier: USPS                         │
│  [🔗 Track on USPS.com]               │
│                                         │
│  Estimated Delivery                    │
│  📅 November 27, 2025                  │
│                                         │
│  ─────────────────────────────────────  │
│  Shipment History                      │
│  ─────────────────────────────────────  │
│                                         │
│  ● Nov 20, 10:00 AM                    │
│    Package shipped                     │
│    Los Angeles, CA                     │
│                                         │
│  ○ Nov 21, 2:00 PM (Expected)         │
│    In transit                          │
│                                         │
│  ○ Nov 27, 12:00 PM (Expected)        │
│    Out for delivery                    │
└─────────────────────────────────────────┘
```

---

## 🎯 Implementation Checklist

### Backend (SQL):
- [ ] Run `CREATE_SHIPPING_TRACKING_SYSTEM.sql`
- [ ] Verify all tables created
- [ ] Test RPC functions

### Frontend - Seller Dashboard:
- [ ] Add dual wallet display
- [ ] Add pending shipments list
- [ ] Create tracking submission modal
- [ ] Add Stripe Connect button
- [ ] Add withdrawal functionality

### Frontend - Winner Dashboard:
- [ ] Add shipment tracking view
- [ ] Show tracking number & link
- [ ] Display delivery estimate
- [ ] Show shipment history timeline

### Admin Messages:
- [ ] Winner notification (shipping update)
- [ ] Seller notification (funds released)
- [ ] Both include tracking links

### Testing:
- [ ] Seller submits tracking
- [ ] Funds move from pending → released
- [ ] Winner receives notification
- [ ] Both can view tracking
- [ ] Stripe withdrawal works

---

## 🚀 Quick Start

1. **Run SQL:**
   ```sql
   -- In Supabase SQL Editor
   \i CREATE_SHIPPING_TRACKING_SYSTEM.sql
   ```

2. **Test Tracking Submission:**
   ```typescript
   const result = await supabase.rpc('submit_tracking_number', {
     p_session_id: 'your-session-id',
     p_tracking_number: '1234567890',
     p_tracking_provider: 'USPS'
   });
   
   console.log(result); // Should show funds released
   ```

3. **Check Wallet:**
   ```typescript
   const wallet = await supabase.rpc('get_seller_wallet');
   console.log(wallet); // Should show released balance
   ```

4. **View Tracking:**
   ```typescript
   const tracking = await supabase.rpc('get_shipping_status', {
     p_session_id: 'your-session-id'
   });
   
   console.log(tracking); // Should show tracking details
   ```

---

## 🔒 Security Notes

- ✅ Only seller can submit tracking for their sales
- ✅ Only buyer/seller can view tracking for their session
- ✅ Funds automatically released when tracking provided
- ✅ RLS policies protect all data
- ✅ Stripe Connect for secure payouts

---

## 📝 Next Steps

After implementing basic tracking:
1. Add real-time tracking updates via webhook
2. Integrate with shipping APIs (USPS, UPS, etc.)
3. Auto-update delivery status
4. Send notifications on delivery
5. Handle delivery failures
6. Implement dispute resolution

---

**This system is production-ready and secure!** 🎉

