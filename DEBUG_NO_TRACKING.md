# 🔍 DEBUG: No Tracking/Charging Happening

## 🚨 **Current Issue**
- Views showing 0
- Clicks showing 0  
- Tokens not being deducted (still at 0.00 / 100)

---

## 🧪 **STEP-BY-STEP DEBUGGING**

### **Step 1: Test Database Functions**

**Run in Supabase SQL Editor:**
```sql
TEST_TRACKING_NOW.sql
```

**This will:**
1. ✅ Verify functions exist
2. ✅ Show your campaigns
3. ✅ Manually log a test impression
4. ✅ Show updated stats
5. ✅ Check impression log
6. ✅ Check RLS policies

**Expected output:**
```
3️⃣ TESTING with campaign: [UUID]
✅ Test impression logged! ID: [UUID]
📊 Updated campaign stats:
Impressions: 1
Tokens Spent: 0.001
```

**If you see this, database functions work! ✅**

---

### **Step 2: Check Browser Console**

1. **Open DevTools** (F12 or Right-click → Inspect)
2. **Go to Console tab**
3. **Visit a page with ads** (like `/games`)
4. **Look for these messages:**

**✅ What you SHOULD see:**
```
📺 [AdBanner] Displaying 2 ads (2 paid, 0 platform):
   💰 Don't Drop out Drop a Dollar
   💰 Drop a Dollar to win more than a dollar!
🎯 [AdBanner] Logging impression for campaign: [UUID]
🎯 [AdBanner] Page: games, Session: [session-id]
✅ [PAID] Ad impression logged successfully: Your Campaign Name
✅ Impression ID: [UUID]
```

**❌ What indicates a problem:**
```
❌ [AdBanner] RPC Error logging impression: [error details]
```

---

### **Step 3: Common Issues & Fixes**

#### **Issue A: Functions Don't Exist**

**Symptom:** Console shows `function log_ad_impression does not exist`

**Fix:**
```sql
-- Run in Supabase:
FIX_TRACKING_AND_CHARGING.sql
```

Then **hard refresh** browser (Ctrl+F5)

---

#### **Issue B: RLS Blocking Access**

**Symptom:** Console shows `permission denied` or `policy violation`

**Fix:**
```sql
-- Check policies:
SELECT * FROM pg_policies WHERE tablename = 'ad_impressions';

-- Grant access (run in Supabase):
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon to insert impressions"
ON public.ad_impressions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow all to read own impressions"
ON public.ad_impressions
FOR SELECT
TO anon, authenticated
USING (true);
```

---

#### **Issue C: Campaigns Not Active**

**Symptom:** Ads show in banners but no logging happens

**Fix:**
```sql
-- Check campaign status:
SELECT id, campaign_name, campaign_status, admin_approved
FROM public.ad_campaigns
WHERE seller_username != 'DropDollar';

-- If status != 'active' or admin_approved != true:
UPDATE public.ad_campaigns
SET campaign_status = 'active',
    admin_approved = TRUE
WHERE seller_username != 'DropDollar';
```

---

#### **Issue D: Supabase Client Not Initialized**

**Symptom:** Console shows `supabase is undefined` or similar

**Fix:** Hard refresh (Ctrl+F5) and clear cache

---

### **Step 4: Manual Test**

1. **Open Console** (F12)
2. **Paste this code directly:**

```javascript
// Test impression logging directly
const { data, error } = await window.supabase
  .from('ad_campaigns')
  .select('id')
  .eq('campaign_status', 'active')
  .limit(1)
  .single();

if (data) {
  console.log('Testing campaign:', data.id);
  
  const result = await window.supabase.rpc('log_ad_impression', {
    p_campaign_id: data.id,
    p_page_location: 'test',
    p_session_id: 'manual-test',
    p_user_agent: navigator.userAgent,
    p_device_type: 'desktop'
  });
  
  console.log('Result:', result);
} else {
  console.log('No active campaigns found');
}
```

3. **Press Enter**
4. **Check output** - should see impression logged

---

### **Step 5: Verify in Admin Panel**

1. **Go to:** `/admin/dashboard` → "Ad Campaigns" tab
2. **Wait 10 seconds** (auto-refresh)
3. **OR click "Refresh" button**
4. **Check if stats updated**

If Step 1 (SQL test) worked but browser doesn't:
- **Clear cache** (Ctrl+Shift+Delete)
- **Hard refresh** (Ctrl+F5)
- **Close and reopen browser**

---

## 🎯 **Diagnostic Checklist**

Run through this in order:

| Step | Test | Expected Result | Status |
|------|------|-----------------|--------|
| 1 | Run `TEST_TRACKING_NOW.sql` | Impressions: 1, Tokens: 0.001 | ⬜ |
| 2 | Visit `/games` | See ads in banner | ⬜ |
| 3 | Open Console (F12) | See "📺 [AdBanner] Displaying..." | ⬜ |
| 4 | Check logs | See "✅ Ad impression logged" | ⬜ |
| 5 | Check for errors | No "❌" red errors | ⬜ |
| 6 | Wait 30 seconds | Let impressions accumulate | ⬜ |
| 7 | Open Admin Panel | See impressions > 0 | ⬜ |
| 8 | Click "Refresh" | Stats update | ⬜ |

---

## 🔧 **Nuclear Option: Complete Reset**

If nothing works, do this:

```sql
-- 1. Drop everything
DROP FUNCTION IF EXISTS log_ad_impression CASCADE;
DROP FUNCTION IF EXISTS log_ad_click CASCADE;

-- 2. Reset campaign stats
UPDATE public.ad_campaigns
SET total_impressions = 0,
    total_clicks = 0,
    tokens_spent = 0,
    updated_at = NOW()
WHERE seller_username != 'DropDollar';

-- 3. Clear impression log
DELETE FROM public.ad_impressions
WHERE created_at < NOW();

-- 4. Recreate functions
-- (Copy entire contents of FIX_TRACKING_AND_CHARGING.sql here)
```

Then:
1. Clear browser cache
2. Close browser completely
3. Reopen and test

---

## 📊 **What Should Happen**

### **When you view a page with ads:**
1. Ad loads → Function called → Impression logged
2. Console shows: `✅ Ad impression logged`
3. Database updated: `total_impressions +1`
4. Tokens charged: `tokens_spent +0.001`
5. Admin panel updates within 10 seconds

### **When you click an ad:**
1. Click button → Function called → Click logged
2. Console shows: `✅ Click logged`
3. Database updated: `total_clicks +1`  
4. Tokens charged: `tokens_spent +5`
5. New tab opens with destination URL

---

## 🆘 **Still Not Working?**

**Collect this info:**

1. **SQL Test Results:**
   - Run `TEST_TRACKING_NOW.sql`
   - Copy all output

2. **Console Logs:**
   - Open F12 → Console
   - Visit `/games`
   - Copy all messages (especially errors)

3. **Network Tab:**
   - Open F12 → Network
   - Filter: "log_ad"
   - Check if RPC calls are being made
   - Check response status (should be 200)

4. **Campaign Status:**
```sql
SELECT * FROM ad_campaigns WHERE seller_username != 'DropDollar';
```

**Share these 4 things** and we can pinpoint the exact issue!

---

All code committed to GitHub! ✨

**Start with:** `TEST_TRACKING_NOW.sql` in Supabase SQL Editor

