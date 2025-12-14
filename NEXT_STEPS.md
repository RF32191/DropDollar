# 🚀 Next Steps to Get SMS Working

## Step 1: Get a Twilio Phone Number (5 minutes)

1. **Go to Twilio Console:**
   - Open: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
   - Sign in if needed

2. **Buy/Get a Phone Number:**
   - Click **"Buy a number"** or **"Get a number"** button
   - Select **"United States"** (or your country)
   - Check the box for **"SMS"** capability
   - Click **"Search"**
   - Pick a phone number from the list
   - Click **"Buy"** or **"Get"**
   - Confirm the purchase

3. **Copy the Phone Number:**
   - It will be shown in **E.164 format**
   - Example: `+15551234567` (must include `+` and country code)
   - **Copy this entire number**

---

## Step 2: Add Phone Number to Environment Variables

### For Local Development (.env.local):

1. **Open your `.env.local` file** in the project root
2. **Add this line** (replace with your actual phone number):
   ```bash
   TWILIO_FROM_NUMBER=+15551234567
   ```
3. **Save the file**

Your `.env.local` should now have:
```bash
TWILIO_ACCOUNT_SID=ACcef3f25a50c5ef89db6479c657687069
TWILIO_AUTH_TOKEN=0fb59408cd4d2c592a1555b48bd343fb
TWILIO_VERIFY_SERVICE_SID=VA175e12088e53a31ce96df509fd93af35
TWILIO_FROM_NUMBER=+15551234567  # <-- ADD THIS
```

### For Production (Vercel):

1. Go to: https://vercel.com/dashboard
2. Select your **DropDollar** project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Add:
   - **Key:** `TWILIO_FROM_NUMBER`
   - **Value:** `+15551234567` (your phone number)
   - **Environment:** Production (and Preview if you want)
6. Click **"Save"**
7. **Redeploy** your application

---

## Step 3: Restart Your Dev Server

```bash
npm run dev
```

**Important:** You MUST restart the server after adding environment variables!

---

## Step 4: Test It!

1. **Open your browser:**
   - Go to: http://localhost:3000/auth/register

2. **Test Phone Verification:**
   - Enter your **real phone number** (the one you want to receive SMS on)
   - Click **"Send Verification Code"**
   - **Check your phone** - you should receive an SMS! 📱
   - Enter the code to verify

3. **Check Server Logs:**
   - Look for: `✅ Twilio SMS sent successfully to +1...`
   - If you see errors, check the error message

---

## Troubleshooting

### ❌ "Failed to send SMS" or "Phone number required"

**Check:**
- Did you add `TWILIO_FROM_NUMBER` to `.env.local`?
- Did you restart the dev server?
- Is the phone number in E.164 format? (`+15551234567` not `5551234567`)

### ❌ "Invalid phone number format"

**Fix:**
- Phone number MUST include `+` and country code
- ✅ Correct: `+15551234567`
- ❌ Wrong: `5551234567` (missing `+1`)

### ❌ No SMS received

**Check:**
- Twilio console for errors: https://console.twilio.com/us1/monitor/logs/errors
- Server logs for detailed error messages
- Twilio account has credits/balance
- Phone number has SMS capability enabled

### ❌ Still not working?

1. **Check server console** for error messages
2. **Verify environment variables:**
   ```bash
   # In your terminal, check if variables are loaded:
   echo $TWILIO_FROM_NUMBER
   ```
3. **Check Twilio Console:**
   - Go to: https://console.twilio.com/us1/monitor/logs/errors
   - Look for recent errors

---

## ✅ Success Checklist

- [ ] Got a Twilio phone number
- [ ] Added `TWILIO_FROM_NUMBER` to `.env.local`
- [ ] Restarted dev server (`npm run dev`)
- [ ] Tested at `/auth/register`
- [ ] Received SMS with verification code
- [ ] Added `TWILIO_FROM_NUMBER` to Vercel (for production)

---

## Need Help?

- **Twilio Console:** https://console.twilio.com/
- **Twilio Docs:** https://www.twilio.com/docs/sms
- **Check Logs:** Look at your terminal/server console for detailed error messages

