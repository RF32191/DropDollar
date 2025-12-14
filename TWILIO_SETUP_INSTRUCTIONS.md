# 📱 Twilio SMS Setup Instructions

## Environment Variables to Add

Add these to your `.env.local` file (for local development) and Vercel environment variables (for production):

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACcef3f25a50c5ef89db6479c657687069
TWILIO_AUTH_TOKEN=0fb59408cd4d2c592a1555b48bd343fb

# Option 1: Use Twilio Verify Service (Recommended)
# Get this from: https://console.twilio.com/us1/develop/verify/services
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Option 2: Use Regular SMS (Alternative if you don't have Verify Service)
# Get this from: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
# Format: +1234567890 (E.164 format with country code)
TWILIO_FROM_NUMBER=+1234567890
```

## Setup Steps

### Step 1: Add to Local Environment

1. Open `.env.local` file in your project root
2. Add the Twilio credentials above
3. Save the file

### Step 2: Add to Vercel (Production)

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable:
   - `TWILIO_ACCOUNT_SID` = `ACcef3f25a50c5ef89db6479c657687069`
   - `TWILIO_AUTH_TOKEN` = `0fb59408cd4d2c592a1555b48bd343fb`
   - `TWILIO_VERIFY_SERVICE_SID` = (your Verify Service SID, if you have one)
   - `TWILIO_FROM_NUMBER` = (your Twilio phone number, if using regular SMS)

3. Redeploy your application

### Step 3: Get Twilio Verify Service SID (Recommended)

1. Go to: https://console.twilio.com/us1/develop/verify/services
2. Click "Create new Verify Service" or use existing one
3. Copy the Service SID (starts with `VA`)
4. Add it as `TWILIO_VERIFY_SERVICE_SID` in environment variables

**OR**

### Step 3 Alternative: Get Twilio Phone Number (For Regular SMS)

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Get a phone number (or use existing one)
3. Copy the phone number in E.164 format (e.g., `+15551234567`)
4. Add it as `TWILIO_FROM_NUMBER` in environment variables

## How It Works

The system will:
1. **First try**: Twilio Verify API (if `TWILIO_VERIFY_SERVICE_SID` is set)
2. **Fallback**: Regular Twilio SMS API (if `TWILIO_FROM_NUMBER` is set)
3. **Dev mode**: Return code in response (if neither is configured)

## Testing

After adding environment variables:

1. Restart your dev server: `npm run dev`
2. Go to `/auth/register`
3. Enter a phone number
4. Click "Send Verification Code"
5. You should receive an SMS with the code!

## Troubleshooting

- **No SMS received**: Check Twilio console for errors
- **"Service SID required"**: Add `TWILIO_VERIFY_SERVICE_SID` or `TWILIO_FROM_NUMBER`
- **"Invalid phone number"**: Ensure phone is in E.164 format (+1XXXXXXXXXX)
- **Rate limits**: Twilio has rate limits on trial accounts

## Security Notes

- ⚠️ **NEVER** commit `.env.local` to git
- ⚠️ Keep your Auth Token secret
- ✅ Use different credentials for dev/production
- ✅ Rotate credentials if compromised

