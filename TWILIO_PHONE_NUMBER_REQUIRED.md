# ⚠️ Twilio Phone Number Required

## Why You Need a Phone Number

**Twilio Verify Service cannot send custom codes** - it generates its own codes and manages the entire verification flow.

Since we're using **database-generated codes** (for better control and tracking), we need to use Twilio's **regular SMS API (Messages API)**, which **requires a phone number**.

## Quick Fix

### Step 1: Get a Twilio Phone Number

1. Go to: **https://console.twilio.com/us1/develop/phone-numbers/manage/incoming**
2. Click **"Buy a number"** or **"Get a number"**
3. Select your country (e.g., United States)
4. Check **"SMS"** capability
5. Click **"Search"** → Select a number → Click **"Buy"**

### Step 2: Copy the Phone Number

- The phone number will be shown in **E.164 format**
- Example: `+15551234567` (must include `+` and country code)

### Step 3: Add to Environment Variables

**Local (.env.local):**
```bash
TWILIO_FROM_NUMBER=+15551234567
```

**Vercel (Production):**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `TWILIO_FROM_NUMBER` = `+15551234567`
3. Redeploy

### Step 4: Restart Dev Server

```bash
npm run dev
```

## What About the Verify Service SID?

The Verify Service SID (`VA175e12088e53a31ce96df509fd93af35`) is **not needed** for our current setup since we're using custom codes.

However, you can keep it in your environment variables - it won't cause any issues. The system will prioritize the phone number for sending SMS.

## How It Works Now

1. Database generates a 6-digit code
2. Code is stored in `phone_verification_codes` table
3. Twilio SMS API sends the code via your phone number
4. User enters code → Verified against database

## Testing

After adding `TWILIO_FROM_NUMBER`:

1. Restart dev server: `npm run dev`
2. Go to: `/auth/register`
3. Enter phone number
4. Click "Send Verification Code"
5. You should receive SMS! 📱

## Troubleshooting

### "Failed to send SMS"
- Check Twilio console: https://console.twilio.com/us1/monitor/logs/errors
- Verify phone number format: Must be E.164 (`+15551234567`)
- Check Twilio account has credits
- Verify phone number has SMS capability enabled

### "Invalid phone number format"
- Must include `+` and country code
- Example: `+15551234567` ✅
- Example: `5551234567` ❌ (missing `+1`)

### Still not working?
- Check server logs for detailed error messages
- Verify all environment variables are set correctly
- Make sure you restarted the dev server after adding variables

