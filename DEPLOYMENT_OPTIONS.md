# 🚀 DropDollar GoDaddy Deployment Guide (Node.js)

## 🎯 **RECOMMENDED APPROACH: Deploy to Vercel First**

Since OAuth requires consistent domain URLs and GoDaddy's Node.js hosting can be complex, I recommend deploying to **Vercel** first (free and optimized for Next.js), then pointing your GoDaddy domain to Vercel.

### 🌟 **Option 1: Vercel + GoDaddy Domain (RECOMMENDED)**

#### Step 1: Deploy to Vercel
1. **Create Vercel account**: [vercel.com](https://vercel.com)
2. **Connect GitHub**: Link your repository
3. **Deploy**: Vercel will auto-deploy your Next.js app
4. **Get Vercel URL**: e.g., `dropdollar.vercel.app`

#### Step 2: Point GoDaddy Domain to Vercel
1. **In GoDaddy**: Go to DNS Management
2. **Add CNAME record**:
   - Name: `www`
   - Value: `cname.vercel-dns.com`
3. **Add A record**:
   - Name: `@`
   - Value: `76.76.19.61` (Vercel's IP)
4. **In Vercel**: Add your custom domain in project settings

#### Step 3: Update OAuth URLs
- Google: `https://yourdomain.com/auth/callback`
- GitHub: `https://yourdomain.com/auth/callback`
- Supabase: `https://yourdomain.com`

### 🔧 **Option 2: Direct GoDaddy Node.js Hosting**

If you prefer GoDaddy hosting:

#### Requirements:
- GoDaddy hosting plan with Node.js support
- SSH access to your hosting account

#### Steps:
1. **Build your app**: `npm run build`
2. **Upload via FTP/SSH**: Upload entire project folder
3. **Install dependencies**: `npm install` on server
4. **Start application**: `npm start`
5. **Configure environment variables** on GoDaddy panel

### 🎯 **What's Your GoDaddy Domain?**

To proceed, I need to know:
1. **Your domain name** (e.g., dropdollar.com)
2. **Your GoDaddy hosting type** (Shared, VPS, Dedicated)
3. **Do you have Node.js support** on your GoDaddy plan?

### ⚡ **Quick Start Commands**

```bash
# Test build locally
npm run build
npm start

# Check if everything works at http://localhost:3000
```

### 🔐 **Environment Variables for Production**

Update your `.env.local`:
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
STRIPE_PUBLISHABLE_KEY=your-stripe-live-key
STRIPE_SECRET_KEY=your-stripe-live-secret
```

## 🎮 **Next Steps**

1. **Tell me your domain name**
2. **Choose deployment method** (Vercel recommended)
3. **I'll help configure OAuth** with your domain
4. **Test live authentication**

Your DropDollar gaming site will be live and OAuth will work perfectly! 🚀
