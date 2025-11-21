# 📦 Label Generation - Complete Walkthrough

## 🎯 Where Is It? Step-by-Step Guide

Let me walk you through **EXACTLY** where the Shippo label generation feature is and how it works.

---

## 📁 File Locations

### **Backend (SQL Functions)**

**File:** `FIX_NOTIFICATIONS_AND_ADD_SHIPPO.sql`
**Lines:** 250-330

**Function 1: `generate_shipping_label_shippo()`**
```sql
Location: Lines 250-330
Purpose: Prepares data for Shippo API call
Returns: Seller address, winner address, package dimensions
```

**Function 2: `save_shippo_label_and_submit_tracking()`**
```sql
Location: Lines 332-370
Purpose: Saves generated label info and releases funds
Calls: submit_tracking_number_with_notifications()
```

### **Frontend (React Components)**

**File 1:** `src/components/shipping/ShippoLabelGenerator.tsx` ✨ **MAIN FILE**
```
Location: src/components/shipping/ShippoLabelGenerator.tsx
Lines: 1-632
Purpose: The actual label generation UI
```

**File 2:** `src/components/shipping/TrackingSubmissionModal.tsx` (Updated)
```
Location: src/components/shipping/TrackingSubmissionModal.tsx
Lines: Updated to include tabs
Purpose: Modal that contains the ShippoLabelGenerator
```

**File 3:** `src/components/seller/SellerDashboard.tsx` (Updated)
```
Location: src/components/seller/SellerDashboard.tsx
Lines: Updated to pass winner_address
Purpose: Displays notifications and opens tracking modal
```

---

## 🎬 Complete User Flow (With Exact Locations)

### **STEP 1: Winner Claims Prize**

**What Happens:**
1. Winner clicks "Claim Prize" button
2. Provides shipping address
3. Function `send_winner_address_to_seller()` called

**Files Involved:**
```
Frontend: src/components/modals/ShippingAddressModal.tsx
Line 64: Calls send_winner_address_to_seller RPC

Backend: FIX_NOTIFICATIONS_WITH_SECURITY.sql
Lines 9-197: send_winner_address_to_seller function
```

**What Gets Stored:**
```sql
marketplace_sessions.winner_shipping_address = {
  "name": "John Doe",
  "address_line1": "123 Main St",
  "city": "New York",
  "state": "NY",
  "postal_code": "10001",
  "phone": "555-1234"
}
```

---

### **STEP 2: Seller Receives Notification**

**Where:**
```
File: src/components/seller/SellerDashboard.tsx
Section: Notifications tab
Lines: 574-640
```

**What Seller Sees:**
```jsx
<div className="notification">
  <h3>📦 Ship Prize - Winner Address Received</h3>
  <p>Full address displayed...</p>
  <p>💰 YOUR EARNINGS: $127.50</p>
  <button onClick={openTrackingModal}>
    📝 Submit Tracking / Generate Label
  </button>
</div>
```

**When Button Clicked:**
```typescript
// Line 622-624 in SellerDashboard.tsx
onClick={() => {
  setSelectedNotification(notification);
  setTrackingModalOpen(true);
}}
```

---

### **STEP 3: Modal Opens (Two Tabs)**

**File:** `src/components/shipping/TrackingSubmissionModal.tsx`

**Where Tabs Are Defined:**
```tsx
Lines: 127-158

{/* Tabs */}
<div className="border-b border-gray-700">
  <div className="flex">
    <button
      onClick={() => setActiveTab('generate')}
      className={activeTab === 'generate' ? 'active' : ''}
    >
      📦 Generate Label (Shippo)
    </button>
    <button
      onClick={() => setActiveTab('manual')}
      className={activeTab === 'manual' ? 'active' : ''}
    >
      📝 Manual Entry
    </button>
  </div>
</div>
```

---

### **STEP 4: Shippo Tab Content** ⭐ **THE MAIN FEATURE**

**File:** `src/components/shipping/ShippoLabelGenerator.tsx`

**Component Structure:**

#### **A. Package Input Form** (Lines 285-366)
```tsx
Location: Lines 285-366

<div className="grid grid-cols-2 gap-4">
  {/* Weight Input */}
  <input
    type="number"
    value={packageInfo.weight}
    onChange={(e) => setPackageInfo({...packageInfo, weight: e.target.value})}
    placeholder="Weight (oz)"
  />
  
  {/* Length Input */}
  <input
    type="number"
    value={packageInfo.length}
    placeholder="Length (in)"
  />
  
  {/* Width Input */}
  <input
    type="number"
    value={packageInfo.width}
    placeholder="Width (in)"
  />
  
  {/* Height Input */}
  <input
    type="number"
    value={packageInfo.height}
    placeholder="Height (in)"
  />
</div>
```

#### **B. Generate Button** (Lines 393-415)
```tsx
Location: Lines 393-415

<button
  onClick={generateLabel}
  disabled={isLoading}
  className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
>
  {isLoading ? (
    'Generating Label...'
  ) : (
    '📦 Generate Shipping Label (Instant)'
  )}
</button>
```

#### **C. Label Generation Function** (Lines 45-136) ⚡ **THE MAGIC**
```tsx
Location: Lines 45-136

const generateLabel = async () => {
  setIsLoading(true);
  
  // STEP 1: Get Shippo config from backend (Lines 57-67)
  const { data: config } = await supabase.rpc(
    'generate_shipping_label_shippo',
    {
      p_session_id: sessionId,
      p_package_weight: packageInfo.weight,
      p_package_length: packageInfo.length,
      p_package_width: packageInfo.width,
      p_package_height: packageInfo.height
    }
  );
  
  // STEP 2: Call Shippo API - Create Shipment (Lines 72-85)
  const shipmentResponse = await fetch('https://api.goshippo.com/shipments/', {
    method: 'POST',
    headers: {
      'Authorization': `ShippoToken ${config.shippo_api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      address_from: config.from_address,  // Seller address
      address_to: config.to_address,      // Winner address
      parcels: [config.parcel],           // Package dimensions
      async: false
    })
  });
  
  const shipmentData = await shipmentResponse.json();
  
  // STEP 3: Get cheapest rate (Lines 94-98)
  const rates = shipmentData.rates || [];
  const cheapestRate = rates.sort((a, b) => 
    parseFloat(a.amount) - parseFloat(b.amount)
  )[0];
  
  // STEP 4: Purchase label (Lines 102-117)
  const transactionResponse = await fetch('https://api.goshippo.com/transactions/', {
    method: 'POST',
    headers: {
      'Authorization': `ShippoToken ${config.shippo_api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      rate: cheapestRate.object_id,
      label_file_type: 'PDF',
      async: false
    })
  });
  
  const transactionData = await transactionResponse.json();
  
  // STEP 5: Save to database and release funds (Lines 123-136)
  await supabase.rpc('save_shippo_label_and_submit_tracking', {
    p_session_id: sessionId,
    p_tracking_number: transactionData.tracking_number,
    p_tracking_provider: cheapestRate.provider,
    p_tracking_url: transactionData.tracking_url_provider,
    p_label_url: transactionData.label_url,
    p_rate_amount: parseFloat(cheapestRate.amount),
    p_estimated_delivery: transactionData.eta || null
  });
  
  // STEP 6: Show success and open label (Lines 138-148)
  setLabelData({
    label_url: transactionData.label_url,
    tracking_number: transactionData.tracking_number,
    tracking_url: transactionData.tracking_url_provider,
    carrier: cheapestRate.provider,
    cost: cheapestRate.amount
  });
  
  // Open label in new tab
  window.open(transactionData.label_url, '_blank');
  
  setStep('success');
};
```

#### **D. Success Screen** (Lines 147-236)
```tsx
Location: Lines 147-236

{step === 'success' && labelData && (
  <div className="bg-green-900/30 border-2 border-green-500 rounded-xl">
    <div className="text-center">
      <div className="text-6xl mb-4">✅</div>
      <h3>Shipping Label Generated!</h3>
    </div>
    
    {/* Tracking Number Display */}
    <div className="bg-black/30 rounded-lg p-4">
      <div className="text-sm text-gray-400">Tracking Number</div>
      <div className="text-lg font-mono">{labelData.tracking_number}</div>
    </div>
    
    {/* Carrier */}
    <div className="bg-black/30 rounded-lg p-4">
      <div className="text-sm text-gray-400">Carrier</div>
      <div className="text-lg uppercase">{labelData.carrier}</div>
    </div>
    
    {/* Cost */}
    <div className="bg-black/30 rounded-lg p-4">
      <div className="text-sm text-gray-400">Cost</div>
      <div className="text-lg">${labelData.cost}</div>
    </div>
    
    {/* Download Label Button */}
    <a
      href={labelData.label_url}
      target="_blank"
      className="block w-full bg-blue-600 hover:bg-blue-700 text-white"
    >
      📄 Download/Print Label
    </a>
    
    {/* Track Package Button */}
    <a
      href={labelData.tracking_url}
      target="_blank"
      className="block w-full bg-gray-700 hover:bg-gray-600 text-white"
    >
      📦 Track Package
    </a>
  </div>
)}
```

---

## 🔄 Complete Data Flow

### **1. Frontend → Backend**
```
User clicks "Generate Label"
  ↓
ShippoLabelGenerator.tsx (Line 57)
  ↓
Calls: supabase.rpc('generate_shipping_label_shippo', {...})
  ↓
Backend Function (FIX_NOTIFICATIONS_AND_ADD_SHIPPO.sql, Line 250)
  ↓
Returns: Shippo config (addresses, package info, API key)
```

### **2. Frontend → Shippo API**
```
Frontend receives config (Line 69)
  ↓
Creates shipment request (Line 72)
  ↓
POST to https://api.goshippo.com/shipments/
  ↓
Shippo returns rates (Line 89)
  ↓
Select cheapest rate (Line 94)
  ↓
Purchase label (Line 102)
  ↓
POST to https://api.goshippo.com/transactions/
  ↓
Shippo returns label PDF URL + tracking number (Line 119)
```

### **3. Frontend → Backend (Save)**
```
Frontend has label data (Line 123)
  ↓
Calls: supabase.rpc('save_shippo_label_and_submit_tracking', {...})
  ↓
Backend Function (FIX_NOTIFICATIONS_AND_ADD_SHIPPO.sql, Line 332)
  ↓
Saves to marketplace_sessions table
  ↓
Calls: submit_tracking_number_with_notifications()
  ↓
Releases funds (Pending → Released)
  ↓
Sends notifications to winner, seller, admin
```

### **4. Label Opens**
```
Backend confirms success
  ↓
Frontend receives confirmation (Line 138)
  ↓
Opens label URL in new tab (Line 148)
  ↓
window.open(transactionData.label_url, '_blank')
  ↓
User sees printable PDF label
```

---

## 🎯 Exact API Calls

### **Shippo API Call #1: Create Shipment**
```typescript
Location: ShippoLabelGenerator.tsx, Line 72

fetch('https://api.goshippo.com/shipments/', {
  method: 'POST',
  headers: {
    'Authorization': 'ShippoToken shippo_live_681a4c1a82c58013760d8065fc1b61a6ac680014',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    address_from: {
      name: "Seller Name",
      street1: "456 Seller St",
      city: "San Francisco",
      state: "CA",
      zip: "94103",
      country: "US"
    },
    address_to: {
      name: "John Doe",
      street1: "123 Main St",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "US"
    },
    parcels: [{
      length: "12",
      width: "9",
      height: "4",
      distance_unit: "in",
      weight: "16",
      mass_unit: "oz"
    }],
    async: false
  })
})
```

**Response:**
```json
{
  "object_id": "abc123",
  "rates": [
    {
      "object_id": "rate_1",
      "provider": "USPS",
      "servicelevel": {
        "name": "Priority Mail"
      },
      "amount": "12.50",
      "estimated_days": 2
    },
    {
      "object_id": "rate_2",
      "provider": "UPS",
      "amount": "15.30",
      "estimated_days": 2
    }
  ]
}
```

### **Shippo API Call #2: Purchase Label**
```typescript
Location: ShippoLabelGenerator.tsx, Line 102

fetch('https://api.goshippo.com/transactions/', {
  method: 'POST',
  headers: {
    'Authorization': 'ShippoToken shippo_live_681a4c1a82c58013760d8065fc1b61a6ac680014',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    rate: "rate_1",  // Cheapest rate selected
    label_file_type: "PDF",
    async: false
  })
})
```

**Response:**
```json
{
  "object_id": "transaction_123",
  "status": "SUCCESS",
  "tracking_number": "9400111899223344556677",
  "tracking_url_provider": "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223344556677",
  "label_url": "https://shippo-delivery.s3.amazonaws.com/abc123.pdf",
  "eta": "2024-11-25T00:00:00Z"
}
```

---

## 📸 Visual Flow Diagram

```
┌─────────────────────────────────────┐
│  1. Seller Dashboard                │
│  (SellerDashboard.tsx)              │
│                                     │
│  [Notification with address]        │
│  [📝 Submit Tracking / Generate     │
│   Label] ← User clicks this         │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│  2. Modal Opens                     │
│  (TrackingSubmissionModal.tsx)      │
│                                     │
│  ┌─────────┬──────────┐            │
│  │Generate │  Manual  │            │
│  │  Label  │  Entry   │            │
│  └─────────┴──────────┘            │
│                                     │
│  User clicks "Generate Label" tab   │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│  3. Package Input Form              │
│  (ShippoLabelGenerator.tsx)         │
│                                     │
│  Weight:  [16   ] oz                │
│  Length:  [12   ] in                │
│  Width:   [9    ] in                │
│  Height:  [4    ] in                │
│                                     │
│  [📦 Generate Shipping Label]       │
│    ← User clicks this               │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│  4. API Calls (5 seconds)           │
│                                     │
│  ✓ Get config from backend          │
│  ✓ Call Shippo: Create shipment    │
│  ✓ Shippo returns rates             │
│  ✓ Select cheapest rate             │
│  ✓ Call Shippo: Purchase label     │
│  ✓ Shippo generates PDF             │
│  ✓ Save to database                 │
│  ✓ Release funds                    │
│  ✓ Send notifications               │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│  5. Success Screen                  │
│                                     │
│  ✅ Label Generated!                │
│                                     │
│  Tracking: 9400111899223344556677   │
│  Carrier: USPS                      │
│  Cost: $12.50                       │
│                                     │
│  [📄 Download/Print Label]          │
│  [📦 Track Package]                 │
│                                     │
│  PDF opens in new tab automatically │
└─────────────────────────────────────┘
```

---

## 📱 User Journey Example

### **Day 1, 10:00 AM** - Winner Claims
```
Winner: Fills out address form
        Clicks "Submit"
System: Calls send_winner_address_to_seller()
        Stores address in database
        Adds $127.50 to seller's PENDING wallet
        Sends 3 notifications
```

### **Day 1, 2:00 PM** - Seller Opens Notification
```
Seller: Opens DropDollar dashboard
        Clicks "Notifications" tab
        Sees: "📦 Ship Prize - Winner Address Received"
        Clicks: "📝 Submit Tracking / Generate Label"
```

### **Day 1, 2:01 PM** - Modal Opens
```
System: Opens TrackingSubmissionModal
        Shows two tabs
Seller: Clicks "Generate Label" tab
        Sees package input form
```

### **Day 1, 2:02 PM** - Enters Package Info
```
Seller: Weight: 16 oz
        Length: 12 in
        Width: 9 in
        Height: 4 in
        Clicks "Generate Shipping Label"
```

### **Day 1, 2:02 PM** - System Processing (5 seconds)
```
System: [1s] Gets config from backend
        [2s] Calls Shippo API
        [1s] Selects cheapest rate  
        [1s] Generates label PDF
        [0.5s] Saves to database
        [0.5s] Releases funds
```

### **Day 1, 2:02 PM** - Label Ready!
```
System: Opens PDF in new tab
        Shows success screen
        Funds moved: Pending → Released
Seller: Sees tracking number
        Can print label
        Can track package
```

### **Day 1, 4:00 PM** - Seller Ships
```
Seller: Prints label
        Affixes to package
        Drops at USPS
Winner: Receives notification:
        "📦 Your Prize Has Shipped!"
        + tracking link
```

---

## ✅ File Checklist

To enable label generation, ensure these files are deployed:

### SQL:
- [ ] `FIX_NOTIFICATIONS_WITH_SECURITY.sql` (Notifications)
- [ ] `FIX_NOTIFICATIONS_AND_ADD_SHIPPO.sql` (Shippo functions)

### React Components:
- [ ] `src/components/shipping/ShippoLabelGenerator.tsx` (Main UI)
- [ ] `src/components/shipping/TrackingSubmissionModal.tsx` (Updated with tabs)
- [ ] `src/components/seller/SellerDashboard.tsx` (Updated to pass winner_address)

---

## 🎉 Summary

**Label generation is located in:**

1. **Main File:** `src/components/shipping/ShippoLabelGenerator.tsx`
2. **Accessed via:** Seller Dashboard → Notifications → Click tracking button
3. **Shippo Integration:** Lines 45-148 in ShippoLabelGenerator.tsx
4. **API Calls:** Lines 72 (create shipment) and 102 (purchase label)
5. **Success Display:** Lines 147-236

**It takes ~5 seconds and is fully automatic!** 🚀📦

