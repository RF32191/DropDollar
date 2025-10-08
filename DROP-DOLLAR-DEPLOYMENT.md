# 🚀 DROP-DOLLAR.COM DEPLOYMENT GUIDE

## 📋 STEP 1: Update Environment Variables

Update your `.env.local` file with these production values:

```env
# Production Environment Variables for drop-dollar.com
NEXT_PUBLIC_APP_URL=https://drop-dollar.com
NEXT_PUBLIC_SUPABASE_URL=https://xqkjdmgfcpjwqpjzgmhz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxa2pkbWdmY3Bqd3FwanpnbWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc5NzI4ODUsImV4cCI6MjA0MzU0ODg4NX0.C6t1TGRJlmABGUbCzLbCJpqOzgpvFiZ5JfQlNxHlGR4

# Use your LIVE Stripe keys for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51Q9vXfEMlzOaQXPNKGxLRqPKJxKjMdMCl4w0fPGKv3VQKqBjEQEtXhkD9wNKKtSZlhXKGsL7JzDLKpNfz9R5VxVx00dKcGt9Gq
STRIPE_SECRET_KEY=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
```

## 🌐 STEP 2: Deploy to Vercel

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub (recommended)
3. Connect your GitHub account

### 2.2 Push to GitHub (if not already done)
```bash
# In your project directory
git init
git add .
git commit -m "Initial DropDollar deployment"
git branch -M main
git remote add origin https://github.com/yourusername/dropdollar.git
git push -u origin main
```

### 2.3 Deploy to Vercel
1. In Vercel dashboard, click **"New Project"**
2. **Import** your GitHub repository
3. **Configure Environment Variables** in Vercel:
   - Add all the environment variables from above
4. Click **"Deploy"**
5. Wait for deployment (2-3 minutes)
6. Get your Vercel URL (e.g., `dropdollar.vercel.app`)

## 🔗 STEP 3: Point GoDaddy Domain to Vercel

### 3.1 In GoDaddy DNS Management
1. **Login to GoDaddy**
2. Go to **My Products** → **DNS** → **Manage DNS**
3. **Delete existing records** (A, CNAME for @ and www)
4. **Add these records**:

   **A Record:**
   - Type: `A`
   - Name: `@`
   - Value: `76.76.19.61`
   - TTL: `1 Hour`

   **CNAME Record:**
   - Type: `CNAME`
   - Name: `www`
   - Value: `cname.vercel-dns.com`
   - TTL: `1 Hour`

### 3.2 In Vercel Dashboard
1. Go to your project → **Settings** → **Domains**
2. **Add Domain**: `drop-dollar.com`
3. **Add Domain**: `www.drop-dollar.com`
4. Vercel will verify the DNS configuration

## 🔐 STEP 4: Update OAuth Providers

### 4.1 Google OAuth Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. **Edit OAuth 2.0 Client ID**
4. **Authorized redirect URIs** → Add:
   ```
   https://drop-dollar.com/auth/callback
   https://www.drop-dollar.com/auth/callback
   ```

### 4.2 GitHub OAuth Settings
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. **Edit your OAuth App**
3. **Authorization callback URL**:
   ```
   https://drop-dollar.com/auth/callback
   ```

### 4.3 Supabase Settings
1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Site URL**: `https://drop-dollar.com`
3. **Redirect URLs**: 
   ```
   https://drop-dollar.com/auth/callback
   https://www.drop-dollar.com/auth/callback
   ```

## ✅ STEP 5: Test Your Live Site

1. **Visit**: `https://drop-dollar.com`
2. **Test Google Login**: Click Google OAuth button
3. **Test GitHub Login**: Click GitHub OAuth button
4. **Test Account Creation**: Create new account
5. **Test Games**: Play a game
6. **Test Payments**: Try buying tokens

## 🎯 SUCCESS CHECKLIST

- [ ] Environment variables updated
- [ ] Deployed to Vercel
- [ ] GoDaddy DNS pointing to Vercel
- [ ] Google OAuth configured
- [ ] GitHub OAuth configured
- [ ] Supabase URLs updated
- [ ] Site loads at drop-dollar.com
- [ ] OAuth login works
- [ ] Account creation works
- [ ] Games are playable
- [ ] Payments work

## 🚨 IMPORTANT NOTES

1. **DNS Propagation**: May take 1-24 hours for domain to work globally
2. **HTTPS**: Vercel automatically provides SSL certificates
3. **Stripe Live Mode**: Make sure you're using LIVE Stripe keys for production
4. **Testing**: Test thoroughly before announcing launch

Your DropDollar gaming site will be live at **https://drop-dollar.com** 🎮🚀
