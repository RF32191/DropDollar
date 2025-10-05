# 🏠 DIRECT GODADDY DEPLOYMENT GUIDE

## 🎯 **THREE GODADDY DEPLOYMENT OPTIONS**

### **OPTION 1: SHARED HOSTING (Most Common)**
✅ Works with basic GoDaddy shared hosting plans  
✅ Uses static files + .htaccess for routing  
✅ No Node.js required  

### **OPTION 2: NODE.JS HOSTING**
✅ If your GoDaddy plan supports Node.js  
✅ Full Next.js functionality  
✅ Server-side rendering  

### **OPTION 3: cPANEL + NODE.JS**  
✅ If you have cPanel with Node.js support  
✅ Easy file management  

---

## 🚀 **STEP 1: BUILD YOUR SITE**

Run this command to create your GoDaddy deployment package:

```bash
./build-for-godaddy.sh
```

This creates:
- `godaddy-deployment/` folder with all files
- `dropdollar-godaddy-deployment.zip` for easy upload

---

## 📤 **STEP 2: UPLOAD TO GODADDY**

### **For Shared Hosting:**
1. **Login to GoDaddy** → My Products → Web Hosting → Manage
2. **Open File Manager** or use FTP
3. **Navigate to** your domain's folder (usually `public_html` or domain folder)
4. **Upload** `dropdollar-godaddy-deployment.zip`
5. **Extract** the ZIP file
6. **Move contents** to root (so `index.html` is in domain root)

### **For Node.js Hosting:**
1. **Upload** `dropdollar-godaddy-deployment.zip` 
2. **Extract** in your app directory
3. **SSH into server** (if available)
4. **Run:**
   ```bash
   npm install
   npm start
   ```

### **For cPanel:**
1. **Login to cPanel**
2. **File Manager** → Navigate to `public_html`
3. **Upload & Extract** ZIP file
4. **If Node.js available:** Set up Node.js app

---

## 🔧 **STEP 3: CONFIGURE GODADDY SETTINGS**

### **Set Environment Variables:**
In GoDaddy hosting panel, add these environment variables:

```env
NEXT_PUBLIC_APP_URL=https://drop-dollar.com
NEXT_PUBLIC_SUPABASE_URL=https://xqkjdmgfcpjwqpjzgmhz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxa2pkbWdmY3Bqd3FwanpnbWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc5NzI4ODUsImV4cCI6MjA0MzU0ODg4NX0.C6t1TGRJlmABGUbCzLbCJpqOzgpvFiZ5JfQlNxHlGR4
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51Q9vXfEMlzOaQXPNKGxLRqPKJxKjMdMCl4w0fPGKv3VQKqBjEQEtXhkD9wNKKtSZlhXKGsL7JzDLKpNfz9R5VxVx00dKcGt9Gq
STRIPE_SECRET_KEY=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
```

### **SSL Certificate:**
- Enable SSL in GoDaddy panel
- Force HTTPS redirects

---

## 🔐 **STEP 4: UPDATE OAUTH & SUPABASE**

### **Google OAuth Console:**
1. [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. **Edit OAuth 2.0 Client**
4. **Authorized redirect URIs:**
   ```
   https://drop-dollar.com/auth/callback
   https://www.drop-dollar.com/auth/callback
   ```

### **GitHub OAuth:**
1. [GitHub Developer Settings](https://github.com/settings/developers)
2. **Edit OAuth App**
3. **Authorization callback URL:**
   ```
   https://drop-dollar.com/auth/callback
   ```

### **Supabase Dashboard:**
1. **Authentication** → **URL Configuration**
2. **Site URL:** `https://drop-dollar.com`
3. **Redirect URLs:**
   ```
   https://drop-dollar.com/auth/callback
   https://www.drop-dollar.com/auth/callback
   ```

---

## 🛠️ **TROUBLESHOOTING**

### **Common Issues:**

1. **404 Errors on Refresh:**
   - Ensure `.htaccess` is in root directory
   - Check URL rewriting is enabled

2. **Environment Variables Not Working:**
   - Set them in GoDaddy hosting panel
   - Restart application if using Node.js

3. **OAuth Not Working:**
   - Verify redirect URLs match exactly
   - Ensure HTTPS is working

4. **Database Connection Issues:**
   - Check Supabase URL and keys
   - Verify network access from GoDaddy servers

---

## ✅ **SUCCESS CHECKLIST**

- [ ] Site builds successfully
- [ ] Files uploaded to GoDaddy
- [ ] Environment variables set
- [ ] SSL certificate enabled
- [ ] OAuth URLs updated
- [ ] Supabase URLs updated
- [ ] Site loads at drop-dollar.com
- [ ] Google login works
- [ ] GitHub login works
- [ ] Account creation works
- [ ] Games are playable
- [ ] Payments work

---

## 🎮 **WHAT TYPE OF GODADDY HOSTING DO YOU HAVE?**

To proceed with the best approach:

1. **Shared Hosting** - Basic plan, no Node.js
2. **Business Hosting** - May have Node.js support  
3. **VPS/Dedicated** - Full control, Node.js supported
4. **WordPress Hosting** - Limited options

**Tell me your hosting type, and I'll customize the deployment!**

Your DropDollar gaming site will be live at **https://drop-dollar.com** 🚀🎮
