# Stripe Live Key Setup Instructions

## 🔑 Stripe Live Secret Key

The Stripe live secret key has been provided and needs to be added to your Vercel environment variables:

**Secret Key:**
```
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
```

## 📝 Steps to Configure

1. **Go to Vercel Dashboard**
   - Navigate to your project settings
   - Go to "Environment Variables"

2. **Add the Secret Key**
   - Variable Name: `STRIPE_SECRET_KEY`
   - Value: `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`
   - Environment: Production (and Preview if needed)

3. **Get Publishable Key**
   - Go to your Stripe Dashboard: https://dashboard.stripe.com/apikeys
   - Copy your **Live** publishable key (starts with `pk_live_`)
   - Add it to Vercel as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

4. **Redeploy**
   - After adding the environment variables, redeploy your application
   - The token purchase page will now use the live Stripe keys

## ✅ Verification

After deployment, test the token purchase flow:
1. Go to https://www.drop-dollar.com/buy-tokens
2. Enter a custom token amount
3. Complete a test purchase
4. Verify tokens are credited to the user account

## 🔒 Security Note

- Never commit the secret key to git
- Keep the secret key secure
- Only use live keys in production environment

