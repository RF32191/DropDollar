# 🔐 Environment Setup for Anti-Cheat System

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Generate a secure random secret (CRITICAL - must be unique and secret!)
# Run one of these commands:
# Option 1: openssl rand -hex 32
# Option 2: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

GAME_TOKEN_SECRET=your-super-secret-key-min-32-chars-long-random

# Optional configuration (defaults shown)
GAME_SESSION_TIMEOUT=300000        # 5 minutes in milliseconds
MAX_INPUT_RATE=50                  # Max inputs per second
MIN_REACTION_TIME=100              # Minimum human reaction time (ms)
SUSPICION_THRESHOLD=60             # Score to flag as bot (0-100)
```

## Setup Steps

1. **Generate Secret Key:**
   ```bash
   openssl rand -hex 32
   ```

2. **Add to `.env.local`:**
   ```bash
   echo "GAME_TOKEN_SECRET=$(openssl rand -hex 32)" >> .env.local
   ```

3. **Verify:**
   ```bash
   cat .env.local | grep GAME_TOKEN_SECRET
   ```

4. **Restart Dev Server:**
   ```bash
   npm run dev
   ```

## Security Notes

- **NEVER** commit `.env.local` to git
- **NEVER** share your `GAME_TOKEN_SECRET`
- Use different secrets for development and production
- Rotate secrets if compromised

## Production Deployment (Vercel)

Add environment variables in Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add `GAME_TOKEN_SECRET` with a new secure random value
4. Redeploy your application

**WARNING**: Do NOT use the same secret in development and production!

