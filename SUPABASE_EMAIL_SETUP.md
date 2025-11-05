# 📧 SUPABASE EMAIL CONFIGURATION GUIDE

**Problem**: Password reset emails not being sent  
**Reason**: Supabase's default email is in sandbox mode  
**Solution**: Configure custom SMTP using your existing Resend account

---

## 🎯 QUICK FIX (5 Minutes)

### Step 1: Access Supabase Email Settings

1. Go to: https://supabase.com/dashboard
2. Select your **DropDollar project**
3. Navigate to: **Authentication** → **Email Templates**
4. Scroll down to **SMTP Settings**

### Step 2: Enable Custom SMTP

Click **"Enable Custom SMTP"** and enter:

```
SMTP Host:     smtp.resend.com
Port:          587
Sender email:  noreply@drop-dollar.com (or onboarding@resend.dev for testing)
Sender name:   DropDollar
Username:      resend
Password:      re_Sj83XHSC_Auz63zznjwVjAX7vNFBMvXhd
```

**Note**: The password is your Resend API key!

### Step 3: Test the Configuration

1. Click **"Send test email"** button
2. Check your email inbox
3. If you receive the test email, you're done! ✅

### Step 4: Try Password Reset Again

1. Go to: https://www.drop-dollar.com/auth/forgot-password
2. Enter your email
3. Check inbox (and spam folder)
4. Click reset link and set new password

---

## ⚡ FASTER ALTERNATIVE (No Email Needed)

### Option A: Reset Password in Supabase Dashboard

1. **Supabase Dashboard** → **Authentication** → **Users**
2. **Find your email**: `ryanrfermoselle@yahoo.com`
3. Click **"..."** menu → **"Reset Password"**
4. **Manually set a new password** (e.g., `TempPass123!`)
5. **Go to** https://www.drop-dollar.com/auth/login
6. **Login** with email + new password
7. ✅ **Success!**

---

## 🔍 TROUBLESHOOTING

### "I still don't see my user in Supabase Dashboard"

If you don't see your email in **Authentication → Users**, it means:
- ❌ You were never registered in Supabase Auth
- ✅ Your profile exists in `public.users` (from fake login)
- 🔧 **Solution**: Delete old profile and re-register

Run this SQL to delete old profile:

```sql
DELETE FROM public.users 
WHERE email = 'ryanrfermoselle@yahoo.com';
```

Then go to `/auth/register` and create a fresh account.

---

## 📋 VERIFY CONFIGURATION

Run `MANUAL_PASSWORD_RESET.sql` to check:
- ✅ If your auth account exists
- ✅ If your profile exists  
- ✅ If password is set

---

## 🎯 RECOMMENDED APPROACH

**For immediate access**:
1. Use **Supabase Dashboard** manual password reset (fastest)
2. Login with new password
3. Configure SMTP later for future users

**For production**:
1. Configure Resend SMTP in Supabase
2. Test with a password reset
3. All future emails will work automatically

---

## 📧 EMAIL SYSTEM BREAKDOWN

Your site uses **TWO separate email systems**:

| Purpose | Service | Configuration |
|---------|---------|---------------|
| **Auth emails** (password reset, confirmations) | Supabase Auth | ⚠️ Needs SMTP setup |
| **Game alerts** (anti-cheat notifications) | Resend | ✅ Already configured |

Both can use the same Resend account!

---

## ✅ CHECKLIST

- [ ] Access Supabase Dashboard
- [ ] Find Authentication → Email Templates
- [ ] Enable Custom SMTP with Resend
- [ ] Test email sending
- [ ] Try password reset OR
- [ ] Manually reset password in dashboard
- [ ] Login successfully!

---

**Need help?** Run `MANUAL_PASSWORD_RESET.sql` for diagnostic info!

