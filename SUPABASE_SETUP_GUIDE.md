# 🚀 DropDollar Supabase Setup Guide

## Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" (Free tier is perfect to start!)
3. Sign up/Sign in with GitHub, Google, or email
4. Create new project:
   - Name: `DropDollar` or `dropdollar-production`
   - Database password: Generate strong password (SAVE IT!)
   - Region: Choose closest to your users

## Step 2: Get Your API Keys
Once project is created:
1. Go to **Settings** → **API**
2. Copy these 3 values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Step 3: Update Environment Variables
Replace the placeholders in `.env.local`:
```bash
# Replace these with your actual Supabase values:
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

## Step 4: Deploy Database Schema
1. Go to your Supabase project
2. Click **SQL Editor** in the sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase-production-schema.sql`
5. Click **Run** to create all tables and indexes

## Step 5: Enable Row Level Security
The schema automatically sets up RLS policies for:
- ✅ User data protection
- ✅ Secure authentication
- ✅ Location compliance
- ✅ Payment transaction security
- ✅ Multi-user isolation

## Step 6: Test the Setup
After updating `.env.local` and running the schema:
1. Restart your dev server: `npm run dev`
2. Visit `http://localhost:3002`
3. Try creating an account
4. Test the authentication flow
5. Check the dashboard functionality

## What You Get:
- 🔐 **Complete Authentication System**
- 💰 **User Balances & Transactions**
- 🏦 **Bank Account Management**
- 🎮 **Game Scores & Leaderboards**
- 🏆 **Tournament System**
- 📊 **Analytics & Reporting**
- 🌍 **Location-Based Compliance**
- 💳 **Payment Processing Integration**
- 🔒 **Enterprise-Grade Security**

## Need Help?
- Supabase has excellent documentation at [supabase.com/docs](https://supabase.com/docs)
- The free tier includes 50,000 monthly active users
- Automatic backups and scaling included

---

**Once you have the Supabase keys, just paste them into `.env.local` and restart the server!** 🚀
