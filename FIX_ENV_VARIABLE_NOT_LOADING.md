# 🔧 Fix: Environment Variable Not Loading

## The Problem

Even though `TWILIO_FROM_NUMBER=+19809444207` is in `.env.local`, Next.js isn't reading it.

## ✅ Solution: Full Server Restart

### Step 1: Stop the Dev Server

**Press `Ctrl + C` in the terminal where `npm run dev` is running**

Or if it's running in the background, find and kill the process:
```bash
pkill -f "next dev"
```

### Step 2: Clear Next.js Cache (Important!)

```bash
rm -rf .next
```

This clears Next.js build cache which might have cached old environment variables.

### Step 3: Restart the Dev Server

```bash
npm run dev
```

**Wait for it to fully start** - you should see:
```
✓ Ready in X seconds
```

### Step 4: Test Again

1. Go to: http://localhost:3000/auth/register
2. Enter phone number
3. Click "Send Verification Code"

---

## 🔍 Verify Environment Variable is Loaded

Check your server console when you start it. You should see logs showing Twilio is configured.

If you want to verify it's loaded, add this temporary debug line to see the value:

**In `src/app/api/auth/send-phone-verification/route.ts` around line 72, add:**
```typescript
console.log('🔍 DEBUG - TWILIO_FROM_NUMBER:', process.env.TWILIO_FROM_NUMBER);
```

Then restart and check the console output.

---

## ⚠️ Common Issues

### Issue 1: Server Not Fully Restarted
- **Fix:** Make sure you completely stopped the server (Ctrl+C) before restarting
- **Check:** Look for "Ready in X seconds" message

### Issue 2: Next.js Cache
- **Fix:** Delete `.next` folder: `rm -rf .next`
- **Then:** Restart server

### Issue 3: Wrong File Location
- **Check:** `.env.local` should be in the **project root** (same folder as `package.json`)
- **Verify:** Run `ls -la .env.local` in project root

### Issue 4: Variable Format
- **Check:** No spaces around `=`
- ✅ Correct: `TWILIO_FROM_NUMBER=+19809444207`
- ❌ Wrong: `TWILIO_FROM_NUMBER = +19809444207` (spaces)

### Issue 5: Multiple .env Files
- **Check:** Make sure you're editing `.env.local` not `.env`
- **Verify:** `cat .env.local | grep TWILIO_FROM_NUMBER`

---

## 🚀 Quick Fix Command

Run these commands in order:

```bash
# Stop server (Ctrl+C if running, or):
pkill -f "next dev"

# Clear cache
rm -rf .next

# Restart
npm run dev
```

Then test again!

---

## ✅ Success Indicators

After restarting, you should see:
- Server starts without errors
- No "TWILIO_FROM_NUMBER is required" error
- SMS sends successfully
- Console shows: `✅ Twilio SMS sent successfully to +1...`

