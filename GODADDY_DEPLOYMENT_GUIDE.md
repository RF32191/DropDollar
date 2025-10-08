# 🚀 DropDollar GoDaddy Deployment Guide

## 📋 Prerequisites
- GoDaddy hosting account with your domain
- FTP access or File Manager access
- Your domain name (e.g., yourdomain.com)

## 🔧 Step 1: Build Your Site

1. **Navigate to your project folder:**
   ```bash
   cd /Users/ryanjoshuafermoselle/Desktop/CryptoMarket
   ```

2. **Run the deployment script:**
   ```bash
   ./deploy-to-godaddy.sh
   ```
   
   OR manually:
   ```bash
   npm run deploy
   ```

3. **This creates an `out/` folder with your static website files**

## 📤 Step 2: Upload to GoDaddy

### Option A: Using GoDaddy File Manager (Recommended)
1. **Log into GoDaddy**: Go to your GoDaddy account
2. **Navigate to**: Hosting → Manage → File Manager
3. **Go to**: `public_html` folder (this is your website root)
4. **Delete existing files** in public_html (if any)
5. **Upload the contents** of your `out/` folder to `public_html`
   - **Important**: Upload the CONTENTS of the `out/` folder, not the folder itself
   - You should see files like: `index.html`, `_next/`, `auth/`, etc.

### Option B: Using FTP
1. **Get FTP credentials** from GoDaddy hosting dashboard
2. **Use an FTP client** (FileZilla, Cyberduck, etc.)
3. **Connect to your hosting**
4. **Navigate to** `public_html` folder
5. **Upload contents** of `out/` folder

## 🌐 Step 3: Update Environment Variables

Since this is a static site, you'll need to update your environment variables for production:

1. **Update your `.env.local` with production URLs:**
   ```env
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
   STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
   STRIPE_SECRET_KEY=your-stripe-secret-key
   ```

2. **Rebuild and redeploy** after updating environment variables

## 🔐 Step 4: Update OAuth Providers

### Google OAuth:
1. **Go to**: [Google Cloud Console](https://console.cloud.google.com/)
2. **Navigate to**: APIs & Services → Credentials
3. **Edit your OAuth 2.0 Client**
4. **Update Authorized redirect URIs:**
   ```
   https://yourdomain.com/auth/callback
   ```

### GitHub OAuth:
1. **Go to**: [GitHub Developer Settings](https://github.com/settings/developers)
2. **Edit your OAuth App**
3. **Update Authorization callback URL:**
   ```
   https://yourdomain.com/auth/callback
   ```

### Supabase:
1. **Go to**: Supabase Dashboard → Authentication → URL Configuration
2. **Update Site URL**: `https://yourdomain.com`
3. **Update Redirect URLs**: `https://yourdomain.com/auth/callback`

## ✅ Step 5: Test Your Deployment

1. **Visit your domain**: `https://yourdomain.com`
2. **Test OAuth login**: Click Google/GitHub login buttons
3. **Test account creation**: Create a new account
4. **Test navigation**: Browse different pages
5. **Test games**: Play a game to ensure functionality

## 🛠️ Troubleshooting

### Common Issues:

1. **404 errors on refresh:**
   - Add `.htaccess` file to handle client-side routing

2. **OAuth not working:**
   - Verify redirect URLs match exactly
   - Check HTTPS is working on your domain

3. **Environment variables not working:**
   - Rebuild after updating `.env.local`
   - Ensure `NEXT_PUBLIC_` prefix for client-side variables

4. **Images not loading:**
   - Check image paths are relative
   - Verify images are in the `out/` folder

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify all URLs use HTTPS
3. Ensure OAuth redirect URLs are exact matches
4. Test Supabase connection from production domain

## 🎯 Success Checklist

- [ ] Site loads at your domain
- [ ] Google OAuth login works
- [ ] GitHub OAuth login works  
- [ ] Account creation works
- [ ] Username displays after login
- [ ] Games are playable
- [ ] Payment integration works
- [ ] All pages navigate correctly

Your DropDollar gaming site is now live! 🎮✨