# 📦 Supabase Storage Bucket Setup

## Issue: "Bucket not found" for Seller Registration

When uploading seller documents (Driver's License, Selfie), you need a Supabase Storage bucket.

---

## 🚀 Quick Fix (2 minutes)

### Step 1: Go to Supabase Dashboard
1. Open https://supabase.com/dashboard
2. Select your project: **DropDollar**

### Step 2: Navigate to Storage
1. Click **Storage** in left sidebar
2. Click **"New Bucket"** button

### Step 3: Create the Bucket
Fill in the form:
- **Name:** `seller-documents`
- **Public:** ❌ **NO** (keep it PRIVATE)
- **Allowed MIME types:** Leave empty (allows all)
- **File size limit:** 10 MB (default is fine)

Click **"Create Bucket"**

---

## 🔐 Step 4: Set Access Policies

After creating the bucket, click on `seller-documents` → **Policies** tab.

### Policy 1: Allow Authenticated Users to Upload
```sql
CREATE POLICY "Authenticated users can upload seller docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'seller-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 2: Allow Users to Read Their Own Files
```sql
CREATE POLICY "Users can read own seller docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'seller-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 3: Allow Admins to Read All Files
```sql
CREATE POLICY "Admins can read all seller docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'seller-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.email = 'rf32191@gmail.com'
  )
);
```

---

## ✅ That's It!

Now seller registration will work:
- ✅ Driver's License Front/Back uploads
- ✅ Selfie with ID upload
- ✅ Secure storage (private bucket)
- ✅ Admin can view all documents
- ✅ Users can only see their own

---

## 🧪 Test It

1. Go to `/seller/register`
2. Fill out Step 1-2
3. **Step 3 (Identity Verification):**
   - Upload Driver's License (front)
   - Upload Driver's License (back)
   - Upload Selfie with ID
   - Fill in name, DOB, SSN last 4
4. Click "Next: Contact Info"

**Should now work without "Bucket not found" error!** 🎉

