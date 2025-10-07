# 🚀 COMPLETE SUPABASE SETUP GUIDE FOR DROPDOLLAR
## Get Login & Registration Working in 10 Minutes!

---

## 📋 **STEP 1: CREATE SUPABASE PROJECT**

### 1.1 Go to Supabase
- Visit: **https://supabase.com**
- Click **"Start your project"**
- Sign up/Sign in (GitHub recommended for easy integration)

### 1.2 Create New Project
- **Project Name**: `DropDollar` or `dropdollar-production`
- **Database Password**: Generate a strong password (SAVE THIS!)
- **Region**: Choose closest to your users (US East for most US users)
- Click **"Create new project"**
- ⏳ Wait 2-3 minutes for project to initialize

---

## 🔑 **STEP 2: GET YOUR API KEYS**

### 2.1 Navigate to API Settings
- In your Supabase dashboard, go to **Settings** → **API**
- You'll see 3 important values:

### 2.2 Copy These Keys (SAVE THEM!):
```
Project URL: https://your-project-id.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (very long)
Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (very long, different from anon)
```

---

## 💾 **STEP 3: CREATE ENVIRONMENT FILE**

### 3.1 Create .env.local File
In your project root (`/Users/ryanjoshuafermoselle/Desktop/CryptoMarket/`), create a file called `.env.local`:

```bash
# Copy the env.template file and rename it to .env.local
cp env.template .env.local
```

### 3.2 Edit .env.local File
Replace the placeholder values with your actual Supabase keys:

```bash
# SUPABASE CONFIGURATION (REQUIRED FOR LOGIN/REGISTRATION)
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_from_step_2
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_from_step_2

# SITE CONFIGURATION
NEXT_PUBLIC_SITE_URL=https://drop-dollar.com
NEXT_PUBLIC_APP_NAME=DropDollar
NEXT_PUBLIC_APP_DESCRIPTION=Skill-based gaming marketplace

# DEVELOPMENT SETTINGS
NODE_ENV=production
NEXT_PUBLIC_DEBUG_MODE=false
```

**⚠️ IMPORTANT**: Replace `your-actual-project-id`, `your_actual_anon_key_from_step_2`, and `your_actual_service_role_key_from_step_2` with the real values from Step 2!

---

## 🗄️ **STEP 4: DEPLOY DATABASE SCHEMA**

### 4.1 Open Supabase SQL Editor
- In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
- Click **"New Query"**

### 4.2 Run the Schema
- Copy the entire contents of `supabase-production-schema.sql` file
- Paste it into the SQL Editor
- Click **"Run"** button
- ✅ Wait for "Success. No rows returned" message

### 4.3 Enable Authentication
- Go to **Authentication** → **Settings**
- Under **Site URL**, add: `https://drop-dollar.com`
- Under **Redirect URLs**, add: `https://drop-dollar.com/**`
- Click **Save**

---

## 🔐 **STEP 5: CONFIGURE AUTHENTICATION**

### 5.1 Enable Email Authentication
- In Supabase dashboard: **Authentication** → **Providers**
- Make sure **Email** is enabled (should be by default)
- **Confirm email**: Turn OFF for faster testing (turn ON for production)

### 5.2 Optional: Enable Social Login
- **Google**: Add OAuth credentials if you want Google login
- **GitHub**: Add OAuth credentials if you want GitHub login
- For now, email login is sufficient

---

## 🚀 **STEP 6: TEST THE SETUP**

### 6.1 Restart Your Development Server
```bash
cd /Users/ryanjoshuafermoselle/Desktop/CryptoMarket
npm run dev
```

### 6.2 Test Registration
1. Go to `http://localhost:3000` (or your dev server URL)
2. Click **"Sign Up"**
3. Fill out the registration form
4. Submit the form
5. ✅ Should create account successfully!

### 6.3 Test Login
1. Try logging in with the account you just created
2. ✅ Should redirect to dashboard or home page when logged in

---

## 🌐 **STEP 7: UPDATE PRODUCTION ENVIRONMENT**

### 7.1 For Vercel Deployment
Add these environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

### 7.2 Update Supabase Site URL
- In Supabase: **Authentication** → **Settings**
- **Site URL**: `https://drop-dollar.com`
- **Redirect URLs**: `https://drop-dollar.com/**`

---

## ✅ **WHAT YOU GET:**

### 🔐 **Authentication System:**
- ✅ User registration with email/password
- ✅ Secure login/logout
- ✅ Password reset functionality
- ✅ User sessions and persistence
- ✅ Protected routes and pages

### 💾 **Database Features:**
- ✅ User profiles and data
- ✅ Game scores and statistics
- ✅ Tournament participation
- ✅ Payment transaction history
- ✅ Location-based compliance
- ✅ Automatic backups

### 🚀 **Production Ready:**
- ✅ Scales to millions of users
- ✅ Enterprise-grade security
- ✅ Real-time data updates
- ✅ Global CDN and edge functions
- ✅ Automatic SSL certificates

---

## 🆘 **TROUBLESHOOTING**

### Problem: "Missing Supabase environment variables"
**Solution**: Make sure `.env.local` file exists and has correct variable names

### Problem: "Invalid API key provided"
**Solution**: Double-check you copied the correct Anon Key and Service Role Key

### Problem: "Failed to create user profile"
**Solution**: Make sure you ran the complete `supabase-production-schema.sql`

### Problem: Login redirects to wrong URL
**Solution**: Update Site URL and Redirect URLs in Supabase Authentication settings

---

## 📞 **NEED HELP?**

1. **Check the browser console** for error messages
2. **Check Supabase logs**: Dashboard → Logs → Auth logs
3. **Verify environment variables** are loaded: `console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)`
4. **Test API connection**: Try creating a simple query in Supabase SQL Editor

---

**🎉 Once you complete these steps, your login and registration system will be fully functional!**

**The entire setup should take about 10-15 minutes. The free Supabase tier supports up to 50,000 monthly active users, which is perfect for launching!**
