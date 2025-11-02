# 📧 EMAIL NOTIFICATION SYSTEM - SETUP GUIDE

**Status**: ✅ IMPLEMENTED
**Admin Email**: ryanfermoselle@outlook.com
**Service**: Resend (Free tier - 3,000 emails/month)

---

## 🎯 WHAT WAS BUILT

### 1. **Email Service** (`src/lib/emailService.ts`)
- Sends beautiful HTML emails to admin when suspicious activity is detected
- Automatic notifications for suspicion scores > 60
- Different templates for rejected vs accepted-but-flagged games

### 2. **User Warning System** (`src/components/warnings/SuspiciousActivityWarning.tsx`)
- Shows warning modal to users when their gameplay is flagged
- Explains what happened and how to avoid future flags
- Provides contact support option

### 3. **API Integration** (`src/app/api/game-session/validate/route.ts`)
- Automatically sends emails when suspicion detected
- Logs to database for tracking
- Non-blocking (doesn't fail validation if email fails)

---

## 🚀 SETUP STEPS

### Step 1: Create Resend Account (2 minutes)

1. Go to https://resend.com/signup
2. Sign up with your email
3. You'll get **3,000 free emails per month** (plenty for alerts!)

### Step 2: Get API Key (1 minute)

1. After logging in, go to **API Keys** section
2. Click **"Create API Key"**
3. Give it a name: "Anti-Cheat Notifications"
4. Copy the key (starts with `re_...`)

### Step 3: Add to Environment (30 seconds)

Add to your `.env.local` file:

```bash
# Email Notifications (Resend)
RESEND_API_KEY=re_your_api_key_here
```

### Step 4: Restart Server (10 seconds)

```bash
# Stop server (Ctrl+C)
# Then restart:
npm run dev
```

---

## ✅ TESTING

### Test Notification System:

**Option 1: Trigger Manually (Easiest)**

You can test by creating a test script or temporarily lowering the threshold:

```typescript
// Temporarily in src/app/api/game-session/validate/route.ts
// Change line 207 from:
if (result.suspicionScore && result.suspicionScore > 60) {

// To (for testing only):
if (result.suspicionScore && result.suspicionScore > 0) {
```

Then play any game and you'll get an email!

**Option 2: Play Suspiciously**

Try to trigger high suspicion:
- Click extremely fast
- Move mouse in perfect patterns
- Use automated tools (not recommended!)

---

## 📧 WHAT YOU'LL RECEIVE

When suspicious activity is detected, you'll get an email like this:

```
Subject: ⚠️ WARNING: Suspicious Activity Detected (Score: 75)

[Beautiful HTML Email with:]
- Suspicion Score: 75/100
- Game Type: ⚔️ Blade Bounce
- User ID: abc-123-xyz
- User Email: user@example.com
- Session ID: session-456
- Client Score: 9,999
- Server Score: 5,432
- Status: ACCEPTED (FLAGGED)

Detection Reasons:
• Suspiciously consistent timing: 8.5ms std dev
• Input rate slightly high: 42/s

Recommended Action:
This session was accepted but flagged. Monitor this user for
repeated suspicious activity...
```

---

## 👤 USER EXPERIENCE

When a user's game is flagged (suspicion > 60), they'll see:

```
┌──────────────────────────────────────────┐
│ ⚠️ Performance Notice                    │
├──────────────────────────────────────────┤
│                                          │
│ Your gameplay was flagged for unusual    │
│ patterns. Your score has been accepted,  │
│ but repeated flags may result in account │
│ review.                                  │
│                                          │
│ Alert Level: Moderate [||||------] 65%  │
│                                          │
│ What does this mean?                     │
│ • Our system detected patterns that may  │
│   indicate automated play                │
│ • This could be a false positive if you  │
│   have exceptional skills                │
│ • Multiple flags may trigger manual      │
│   review                                 │
│                                          │
│ 💡 To avoid future flags:               │
│ • Play at a natural human pace           │
│ • Avoid automated tools or scripts       │
│ • Ensure stable internet connection      │
│ • Don't modify browser or game code      │
│                                          │
│    [I Understand]  [Contact Support]     │
│                                          │
└──────────────────────────────────────────┘
```

---

## 🔔 NOTIFICATION TRIGGERS

Emails are sent when:

| Suspicion Score | Status | Email? | User Warning? |
|----------------|--------|--------|---------------|
| 0-59           | ✅ Accepted | ❌ No | ❌ No |
| 60-79          | ⚠️ Accepted (Flagged) | ✅ Yes | ✅ Yes |
| 80-100         | ❌ Rejected | ✅ Yes | ❌ No (game rejected) |

---

## 🎨 EMAIL CUSTOMIZATION

### Want to change the "From" address?

Currently using: `onboarding@resend.dev` (Resend test domain)

**To use your own domain:**

1. Add your domain in Resend dashboard
2. Add DNS records they provide
3. Verify domain
4. Update in `src/lib/emailService.ts`:

```typescript
private static readonly FROM_EMAIL = 'alerts@yourdomain.com';
```

### Want to change admin email?

Update in `src/lib/emailService.ts`:

```typescript
private static readonly ADMIN_EMAIL = 'newemail@example.com';
```

---

## 📊 MONITORING

### Check Email Stats:

Go to Resend dashboard to see:
- Emails sent today
- Delivery rate
- Bounce rate  
- Click rate (if you add links)

### Check Database Logs:

```sql
-- View all flagged sessions
SELECT 
  user_id,
  game_type,
  suspicion_score,
  reasons,
  flagged_at
FROM anti_cheat_logs
ORDER BY flagged_at DESC
LIMIT 20;

-- Count emails that should have been sent
SELECT COUNT(*) as total_alerts
FROM anti_cheat_logs
WHERE suspicion_score > 60;
```

---

## 🔧 TROUBLESHOOTING

### "Email not sending"

**Check:**
```bash
# Is API key set?
cat .env.local | grep RESEND_API_KEY

# Server restarted after adding key?
npm run dev
```

### "No email received"

1. Check spam folder
2. Verify API key is correct in Resend dashboard
3. Check Resend dashboard logs for errors
4. Look at terminal logs for errors

### "Email going to spam"

- Use your own verified domain instead of test domain
- Add SPF/DKIM records in Resend
- Warm up your domain by sending small volumes first

---

## 💰 COST BREAKDOWN

**Free Tier** (Resend):
- 3,000 emails/month FREE
- Perfect for small to medium platforms

**Paid Tier** (if you need more):
- $20/month for 50,000 emails
- $80/month for 1 million emails

**Typical Usage:**
- 10 suspicious sessions/day = 300 emails/month (well within free tier!)

---

## 🎯 NEXT STEPS

After email notifications are working:

### Optional Enhancements:

1. **Discord/Slack Integration**
   - Add webhook URL to `.env.local`
   - Get instant notifications in your team chat

2. **Daily Summary Emails**
   - Aggregate suspicious activity
   - Send once per day instead of per event

3. **Admin Dashboard**
   - View all alerts in web interface
   - Mark as reviewed/cleared
   - Ban users directly from dashboard

4. **SMS Alerts** (for critical events)
   - Use Twilio for high-suspicion events (> 90)
   - Get texts for potential major cheating

---

## 📝 CHECKLIST

Before going live:

- [ ] Resend account created
- [ ] API key added to `.env.local`
- [ ] Server restarted
- [ ] Test email sent and received
- [ ] Email looks good (check HTML rendering)
- [ ] User warning modal tested
- [ ] Database logs verified
- [ ] Spam folder checked (if using test domain)

---

## ✅ SUMMARY

You now have:

✅ **Automatic email notifications** to ryanfermoselle@outlook.com
✅ **User warnings** for flagged gameplay
✅ **Beautiful HTML email templates**
✅ **Database logging** for tracking
✅ **Non-blocking** (won't break games if email fails)
✅ **Free tier** (3,000 emails/month)

**Total setup time: ~5 minutes**

---

**Questions?** Check the Resend docs at https://resend.com/docs or review the code in:
- `src/lib/emailService.ts`
- `src/components/warnings/SuspiciousActivityWarning.tsx`
- `src/app/api/game-session/validate/route.ts`

🎉 **Your anti-cheat system now has eyes and ears!** 🎉

