# 🛠️ Admin Listing Management Guide

## ✅ Overview

A complete admin panel for viewing and managing all marketplace listings with the ability to delete completed listings and maintain a clean database.

---

## 🎯 What This System Does

### **Admin Capabilities**

✅ **View All Listings** - See every listing on the platform  
✅ **Filter by Status** - All, Active, Completed, Pending  
✅ **Delete Listings** - Remove listings with optional reason  
✅ **Automatic Notifications** - Sellers notified on deletion  
✅ **Full Audit Trail** - All actions logged  
✅ **Bulk Operations** - Delete old completed listings in batch  

---

## 📊 Admin Dashboard Access

**Location**: Admin Dashboard → "Manage Listings" Tab

**URL**: `/admin/dashboard` → Click "Manage Listings"

**Access**: Only `rf32191@gmail.com` (Master Admin)

---

## 🖥️ User Interface

### **Listing Management Panel**

```
┌─────────────────────────────────────────────────────────────┐
│  🛍️ Listing Management                        [Refresh]     │
│  View and manage all marketplace listings                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  [🔍 All Listings] [✅ Completed] [⚡ Active] [⏳ Pending]  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Listing        │ Seller    │ Status    │ Winner  │ Actions │
│  ─────────────────────────────────────────────────────────  │
│  PS5            │ johndoe   │ ✅ Comp   │ rfermo  │ [Delete]│
│  Electronics    │ john@...  │ 2 parts   │ Score:  │         │
│  $500.00        │           │           │ 472.91  │         │
│  ─────────────────────────────────────────────────────────  │
│  iPhone 15      │ janedoe   │ ⚡ Active │    -    │ [Delete]│
│  Electronics    │ jane@...  │ 5 parts   │         │         │
│  $800.00        │           │           │         │         │
└─────────────────────────────────────────────────────────────┘
```

### **Table Columns**

| Column | Description |
|--------|-------------|
| **Listing** | Title, category, game type, price |
| **Seller** | Username and email |
| **Status** | Completed (green), Active (blue), Pending (yellow) |
| **Winner** | Winner username and score (if completed) |
| **Shipping** | Tracking status, shipped/not shipped, funds released |
| **Created** | Creation and completion dates |
| **Actions** | Delete button |

---

## 🗑️ Delete Listing Flow

### **Step 1: Click Delete Button**

Click the red "Delete" button next to any listing.

### **Step 2: Confirmation Modal Opens**

```
┌─────────────────────────────────────────────────────┐
│  🗑️ Delete Listing                          [×]     │
│  This action cannot be undone                       │
└─────────────────────────────────────────────────────┘

  📦 Listing Details
  ─────────────────────────────────────────────────
  Title:        PS5
  Seller:       johndoe
  Status:       completed
  Participants: 2

  📝 Reason for Deletion (Optional)
  ┌─────────────────────────────────────────────────┐
  │ Enter reason for deleting this listing...      │
  │                                                 │
  └─────────────────────────────────────────────────┘
  The seller will be notified about this deletion.

  ⚠️ Warning
  • This listing will be permanently deleted
  • The seller will receive a notification
  • Any active session will be cancelled
  • This action will be logged in the audit trail

  [Cancel]  [🗑️ Delete Listing]
```

### **Step 3: Deletion Executed**

- Listing marked as `status = 'deleted'`
- Session marked as `status = 'cancelled'`
- Seller receives admin message
- Admin action logged
- Success message displayed

---

## 📨 Seller Notification

When a listing is deleted, the seller receives:

```
⚠️ Listing Removed by Admin

Your listing "PS5" has been removed by the platform administrator.

📦 Listing: PS5
🗓️ Removed: Nov 20, 2025 at 14:30
📋 Reason: [Admin's reason or "No specific reason provided"]

If you believe this was done in error, please contact support.
```

---

## 🗄️ Database Functions

### **1. admin_get_all_listings(status_filter)**

**Purpose**: Retrieve all marketplace listings for admin

**Parameters**:
```sql
p_status_filter TEXT DEFAULT 'all'
-- Options: 'all', 'active', 'completed', 'pending'
```

**Returns**: Table with listing, seller, winner, session, and tracking data

**Example**:
```sql
-- Get all completed listings
SELECT * FROM admin_get_all_listings('completed');

-- Get all listings
SELECT * FROM admin_get_all_listings('all');
```

---

### **2. admin_delete_listing(listing_id, reason)**

**Purpose**: Delete a listing and notify seller

**Parameters**:
```sql
p_listing_id  UUID
p_reason      TEXT DEFAULT NULL  -- Optional deletion reason
```

**Returns**: JSON
```json
{
  "success": true,
  "message": "Listing deleted successfully",
  "listing_id": "uuid",
  "listing_title": "PS5",
  "seller_notified": true,
  "participants_affected": 2
}
```

**Actions Performed**:
1. Validates admin access (rf32191@gmail.com only)
2. Gets listing details
3. Marks listing as `deleted`
4. Cancels active session if exists
5. Logs action in `admin_notifications`
6. Sends message to seller
7. Returns confirmation

**Example**:
```sql
SELECT admin_delete_listing(
  'listing-uuid-here',
  'Violates terms of service'
);
```

---

### **3. admin_bulk_delete_completed_listings(days_old, only_shipped)**

**Purpose**: Bulk delete old completed listings

**Parameters**:
```sql
p_days_old      INTEGER DEFAULT 30     -- Delete older than X days
p_only_shipped  BOOLEAN DEFAULT true   -- Only delete if shipped
```

**Returns**: JSON
```json
{
  "success": true,
  "message": "Successfully deleted 25 listings",
  "deleted_count": 25,
  "listing_ids": ["uuid1", "uuid2", ...]
}
```

**Example**:
```sql
-- Delete completed listings older than 60 days (only if shipped)
SELECT admin_bulk_delete_completed_listings(60, true);

-- Delete ALL completed listings older than 90 days
SELECT admin_bulk_delete_completed_listings(90, false);
```

---

## 📊 Statistics View

### **admin_completed_listings_stats**

A view that provides statistics on completed listings:

```sql
SELECT * FROM admin_completed_listings_stats;
```

**Returns**:
- `total_completed` - Total completed listings
- `shipped` - Listings with tracking number
- `not_shipped` - Listings without tracking
- `funds_released` - Listings with funds released
- `delivered` - Listings marked as delivered
- `older_than_30_days` - Count of 30+ day old listings
- `older_than_60_days` - Count of 60+ day old listings
- `older_than_90_days` - Count of 90+ day old listings

**Use Cases**:
- Database maintenance planning
- Identify listings needing cleanup
- Monitor fulfillment rates

---

## 🔒 Security

### **Access Control**

- ✅ Only `rf32191@gmail.com` can access
- ✅ All functions check admin status
- ✅ Unauthorized access raises exception
- ✅ All actions logged in audit trail

### **Audit Trail**

All deletions are logged in `admin_notifications`:

```sql
SELECT * FROM admin_notifications 
WHERE type = 'listing_deleted' 
ORDER BY created_at DESC;
```

**Metadata Includes**:
- `listing_id` - Deleted listing UUID
- `seller_id` - Seller's user ID
- `deleted_by` - Admin user ID
- `reason` - Deletion reason
- `participants_affected` - Number of participants

---

## 📋 Use Cases

### **1. Removing Completed Listings**

**Scenario**: Clean up old completed listings after shipment

**Steps**:
1. Go to Admin Dashboard → Manage Listings
2. Click "Completed" filter
3. Review listings with tracking numbers
4. Click "Delete" on old listings
5. Optional: Add reason "Archiving old completed listing"
6. Confirm deletion

---

### **2. Removing Problematic Listings**

**Scenario**: Remove listing that violates terms

**Steps**:
1. Navigate to listing in admin panel
2. Click "Delete"
3. Enter reason: "Violates terms of service - Section 3.2"
4. Confirm deletion
5. Seller automatically notified with reason

---

### **3. Database Maintenance**

**Scenario**: Archive old completed listings in bulk

**Steps**:
1. Connect to Supabase SQL Editor
2. Run diagnostic:
```sql
SELECT * FROM admin_completed_listings_stats;
```
3. Execute bulk deletion:
```sql
SELECT admin_bulk_delete_completed_listings(90, true);
-- Deletes listings 90+ days old that have been shipped
```
4. Review results in admin dashboard

---

### **4. Handling Disputes**

**Scenario**: Remove listing involved in dispute

**Steps**:
1. Review listing details in admin panel
2. Check shipping status and participants
3. Click "Delete"
4. Enter reason: "Dispute resolution - Case #12345"
5. Confirm deletion
6. Follow up with affected parties manually

---

## 🚨 Important Notes

### **When to Delete Listings**

✅ **Delete When**:
- Completed and shipped (30+ days old)
- Violates terms of service
- Duplicate listings
- Test listings
- Dispute resolution
- Seller request

❌ **Don't Delete When**:
- Active with participants (refund first)
- Pending shipment without reason
- Recent completions (< 7 days)
- Under investigation

### **Best Practices**

1. **Always Provide Reason**: Helps maintain transparency
2. **Check Participants**: Be aware of affected users
3. **Verify Shipping**: For completed listings, check if shipped
4. **Document Actions**: Keep notes on why listings were deleted
5. **Bulk Delete Carefully**: Start with small batches (30 days)
6. **Monitor Seller Messages**: Ensure sellers receive notifications

---

## 🔧 Maintenance Schedule

### **Recommended Cleanup**

| Frequency | Action | Command |
|-----------|--------|---------|
| **Weekly** | Review completed listings | View in admin panel |
| **Monthly** | Delete 30+ day old shipped listings | Bulk delete function |
| **Quarterly** | Archive 90+ day old listings | Bulk delete function |
| **As Needed** | Remove problematic listings | Individual deletion |

---

## 📊 Monitoring

### **Check Deletion Logs**

```sql
-- Recent deletions
SELECT 
  type,
  title,
  message,
  metadata->>'reason' as reason,
  created_at
FROM admin_notifications 
WHERE type IN ('listing_deleted', 'bulk_deletion')
ORDER BY created_at DESC
LIMIT 20;
```

### **Check Seller Notifications**

```sql
-- Deleted listing notifications sent to sellers
SELECT 
  u.username,
  u.email,
  am.title,
  am.message,
  am.created_at
FROM admin_messages am
JOIN users u ON u.id = am.user_id
WHERE am.message_type = 'listing_removed'
ORDER BY am.created_at DESC;
```

---

## 🎯 Quick Reference

**Access**: Admin Dashboard → Manage Listings  
**Authorization**: rf32191@gmail.com only  
**Filter Options**: All, Completed, Active, Pending  
**Delete**: Click red "Delete" button  
**Reason**: Optional but recommended  
**Notification**: Automatic to seller  
**Audit**: All actions logged  

---

## ✅ Features Summary

| Feature | Status | Notes |
|---------|--------|-------|
| View All Listings | ✅ | With full details |
| Filter by Status | ✅ | 4 filter options |
| Delete Individual | ✅ | With confirmation modal |
| Delete Reason | ✅ | Optional text field |
| Seller Notification | ✅ | Automatic admin message |
| Bulk Deletion | ✅ | Via SQL function |
| Audit Trail | ✅ | Full logging |
| Statistics View | ✅ | Database view |
| Security | ✅ | Admin-only access |

---

## 🚀 Production Ready

This system is fully functional and ready for production use. All deletions are:
- ✅ Properly logged
- ✅ Reversible (marked as deleted, not physically removed)
- ✅ Communicated to sellers
- ✅ Traceable in audit logs
- ✅ Secured with proper authorization

---

**For Support**: Review admin_notifications table or contact platform admin (rf32191@gmail.com)

