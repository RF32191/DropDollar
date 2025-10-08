# 🚀 Dollar Drop Deployment Guide

## ✅ Pre-Deployment Checklist

Your Next.js site is now **production-ready**! The build completed successfully with these optimizations:
- ✅ Fixed Stripe configuration issues
- ✅ Optimized for static generation where possible
- ✅ All API routes properly configured
- ✅ Build size optimized (84kB shared JS)

## 🌐 Deployment Options

### **Option 1: Vercel (Recommended) ⭐**

**Why Vercel?**
- Made by the Next.js team
- Zero-config deployment
- Automatic HTTPS
- Global CDN
- Easy custom domain setup
- Generous free tier

**Steps:**

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub (recommended)

2. **Connect Your Repository**
   ```bash
   # First, initialize git if not already done
   cd /Users/ryanjoshuafermoselle/Desktop/CryptoMarket
   git init
   git add .
   git commit -m "Initial commit - Dollar Drop site"
   
   # Create GitHub repository and push
   # (You'll need to create a repo on GitHub first)
   git remote add origin https://github.com/yourusername/dollar-drop.git
   git branch -M main
   git push -u origin main
   ```

3. **Deploy to Vercel**
   - In Vercel dashboard, click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings
   - Click "Deploy"

4. **Configure Environment Variables**
   - In Vercel project settings → Environment Variables
   - Add these variables:
   ```
   STRIPE_SECRET_KEY=sk_live_your_live_key_here
   STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   PAYPAL_CLIENT_ID=your_paypal_client_id
   PAYPAL_CLIENT_SECRET=your_paypal_client_secret
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   NODE_ENV=production
   ```

5. **Connect Your GoDaddy Domain**
   - In Vercel project → Settings → Domains
   - Add your domain (e.g., `yourdomain.com`)
   - Vercel will provide DNS records
   - Go to GoDaddy DNS management
   - Add the CNAME record: `www` → `cname.vercel-dns.com`
   - Add A record: `@` → Vercel's IP addresses
   - Wait 24-48 hours for DNS propagation

### **Option 2: Netlify**

**Steps:**
1. Go to [netlify.com](https://netlify.com)
2. Connect GitHub repository
3. Build settings: `npm run build`, publish directory: `.next`
4. Add environment variables in site settings
5. Configure custom domain in domain settings

### **Option 3: Traditional Hosting (GoDaddy/cPanel)**

**Steps:**
1. Build the site: `npm run build`
2. Export static files: `npm run export` (requires Next.js config changes)
3. Upload files to GoDaddy hosting via FTP
4. Configure server for SPA routing

## 🔧 Environment Variables Setup

Create these environment variables in your deployment platform:

### **Required for Basic Functionality:**
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### **For Payment Processing:**
```env
# Stripe (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal (get from https://developer.paypal.com/)
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

### **For Blockchain Features:**
```env
# Ethereum/Web3 (get from https://infura.io)
INFURA_PROJECT_ID=...
PRIVATE_KEY=... # Your deployment wallet private key
CONTRACT_ADDRESS=... # Your deployed DROP token contract
```

### **For Database (if using external DB):**
```env
DATABASE_URL=postgresql://...
```

## 🌍 GoDaddy Domain Configuration

### **DNS Records for Vercel:**
1. Log into GoDaddy Domain Manager
2. Go to DNS Management for your domain
3. Add these records:

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 1 Hour

Type: A
Name: @
Value: 76.76.19.61
TTL: 1 Hour

Type: A
Name: @
Value: 76.223.126.88
TTL: 1 Hour
```

### **DNS Records for Netlify:**
```
Type: CNAME
Name: www
Value: your-site-name.netlify.app
TTL: 1 Hour

Type: A
Name: @
Value: 75.2.60.5
TTL: 1 Hour
```

## 📋 Post-Deployment Checklist

After deployment, test these features:

### **Core Functionality:**
- [ ] Homepage loads correctly
- [ ] User registration/login works
- [ ] Games load and function properly
- [ ] Tournament system works
- [ ] Listing creation and browsing
- [ ] Seller dashboard functionality

### **Payment Systems:**
- [ ] Stripe payments work (use test mode first)
- [ ] PayPal payments work
- [ ] Token distribution works
- [ ] Webhook endpoints respond correctly

### **Performance:**
- [ ] Site loads quickly (< 3 seconds)
- [ ] Images optimize properly
- [ ] Mobile responsiveness
- [ ] SEO meta tags present

## 🔒 Security Considerations

### **Environment Variables:**
- Never commit `.env` files to git
- Use different keys for development/production
- Rotate API keys regularly

### **API Security:**
- All payment webhooks use proper signature verification
- Rate limiting on API endpoints
- Input validation on all forms

### **SSL/HTTPS:**
- Vercel/Netlify provide automatic HTTPS
- Ensure all external API calls use HTTPS
- Set secure cookie flags in production

## 🚨 Troubleshooting

### **Common Issues:**

**Build Fails:**
- Check environment variables are set
- Ensure all dependencies are in package.json
- Review build logs for specific errors

**Domain Not Working:**
- DNS propagation can take 24-48 hours
- Check DNS records are correct
- Clear browser cache
- Use DNS checker tools

**Payments Not Working:**
- Verify webhook URLs are correct
- Check API keys are live (not test) keys
- Ensure webhook signatures are validated

**Games Not Loading:**
- Check for JavaScript errors in browser console
- Verify all game assets are included in build
- Test on different browsers/devices

## 📞 Support Resources

- **Vercel Support:** [vercel.com/support](https://vercel.com/support)
- **GoDaddy Support:** [godaddy.com/help](https://godaddy.com/help)
- **Stripe Support:** [stripe.com/support](https://stripe.com/support)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)

## 🎯 Next Steps After Deployment

1. **Set up monitoring** (Vercel Analytics, Google Analytics)
2. **Configure error tracking** (Sentry, LogRocket)
3. **Set up automated backups**
4. **Plan for scaling** (database, CDN, caching)
5. **Implement CI/CD pipeline** for future updates

---

## 🚀 Quick Start Command

To deploy to Vercel right now:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from your project directory
cd /Users/ryanjoshuafermoselle/Desktop/CryptoMarket
vercel

# Follow the prompts to deploy
```

Your site will be live at a Vercel URL immediately, then you can add your custom domain!


