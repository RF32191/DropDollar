# 🛡️ COMPLETE SKILL-BASED GAMING SQL SETUP GUIDE

## 📋 OVERVIEW

This guide contains **EVERY FEATURE** needed for legally compliant, fair skill-based gaming with real prize money. Run these SQL files in order to ensure:

- ✅ **Fairness**: RNG seeding so all players in same session get identical randomness
- ✅ **Anti-Cheat**: Bot detection and score validation
- ✅ **Legal Compliance**: Dual wallet system (purchased vs won tokens)
- ✅ **Fraud Prevention**: Rate limiting, IP tracking, device fingerprinting
- ✅ **Audit Trail**: Complete tracking of all prize distributions
- ✅ **Admin Tools**: Review, approve/reject payouts, ban cheaters

---

## 🚀 INSTALLATION - RUN IN THIS ORDER

### **STEP 1: Database Tables** (Run First!)
**File**: `COMPLETE_SKILL_BASED_GAMING_DATABASE.sql`

Creates all database tables:
- ✅ `game_sessions` - Anti-cheat session tracking with bot monitoring
- ✅ `anti_cheat_logs` - Suspicious activity tracking
- ✅ `user_rate_limits` - Abuse prevention (30 games/hour, 200 games/day limits)
- ✅ `payout_audit_trail` - Track ALL prize distributions
- ✅ Adds `rng_seed` to all config tables (hot_sell_configs, winner_takes_all_configs, one_v_one_configs)
- ✅ Enables Row Level Security (RLS) on all tables

**What this gives you:**
- All players in same Hot Sell/Winner Takes All/1v1 session get **SAME RNG seed** = fair!
- Complete audit trail for legal compliance
- Rate limiting prevents spam/abuse
- Bot detection ready

---

### **STEP 2: Validation Functions** (Run Second!)
**File**: `COMPLETE_SKILL_BASED_GAMING_FUNCTIONS.sql`

Creates all validation and security functions:

#### 1. `spend_tokens(user_id, amount)`
- **Dual wallet system**: ALWAYS spends purchased tokens first, then won tokens
- Legal requirement: purchased tokens cannot be cashed out
- Returns: `{success, purchased_spent, won_spent, message}`

#### 2. `check_rate_limit(user_id)`
- Prevents abuse: Max 30 games/hour, 200 games/day
- Checks if user is banned
- Returns: `{allowed: BOOLEAN, reason: TEXT}`

#### 3. `update_rate_limits(user_id)`
- Called after each game to track usage
- Resets hourly/daily counters automatically

#### 4. `log_suspicious_activity(...)`
- Logs flagged games for admin review
- Auto-bans after 3 high-suspicion flags (score ≥ 80)
- Sends email notifications to admin

#### 5. `create_payout_audit(...)`
- Creates audit trail for every prize payout
- Auto-validates if suspicion score < 60
- Flags for review if suspicion ≥ 60

#### 6. `validate_session_not_expired(session_id)`
- Ensures game sessions haven't expired (30 min limit)
- Returns RNG seed for validated sessions

---

### **STEP 3: Join Functions** (Run Third!)
**File**: `COMPLETE_SKILL_BASED_GAMING_JOIN_FUNCTIONS.sql`

Updates all join functions with complete validation:

#### 1. `join_hot_sell_session(session_id, user_id, entry_fee)`
- ✅ Checks rate limits
- ✅ Spends purchased tokens first (dual wallet)
- ✅ Gets RNG seed from config
- ✅ Adds participant to session
- ✅ Updates rate limits
- Returns: `{success, message, new_pot, participant_id, rng_seed}`

#### 2. `join_winner_takes_all_session(session_id, user_id, entry_fee)`
- Same validation as Hot Sell
- Returns: `{success, message, new_prize_pool, participant_id, rng_seed}`

#### 3. `join_1v1_session(session_id, user_id, entry_fee)`
- Same validation as Hot Sell & Winner Takes All
- Returns JSON: `{success, message, newPot, participantsCount, rngSeed, status}`

**What this gives you:**
- Every game join is validated
- No one can play if banned or rate-limited
- Purchased tokens always spent first (legal compliance)
- All players in same session get same RNG = fair!

---

### **STEP 4: Admin Tools** (Run Fourth!)
**File**: `COMPLETE_SKILL_BASED_GAMING_ADMIN_TOOLS.sql`

Creates admin functions for monitoring and enforcement:

#### 1. `get_suspicious_sessions(min_suspicion)`
- Returns all sessions with high suspicion scores
- Default: Shows sessions with score ≥ 60

#### 2. `get_pending_payout_reviews()`
- Returns all payouts awaiting admin review
- Shows: user, amount, score, suspicion level

#### 3. `approve_payout(payout_id, admin_id, notes)`
- Approves payout and awards tokens to user's WON wallet
- Clears anti-cheat flags
- Creates audit trail

#### 4. `reject_payout(payout_id, admin_id, reason)`
- Rejects payout due to cheating/fraud
- Withholds prize
- Increments user's suspicious flag counter

#### 5. `ban_user(user_id, admin_id, days, reason)`
- Bans user for specified number of days
- User cannot join any games while banned

#### 6. `unban_user(user_id, admin_id, notes)`
- Unbans user after review

#### 7. `get_user_compliance_report(user_id)`
- Generates detailed compliance report for any user
- Shows: games played, flags, payouts, ban status

#### 8. `get_daily_compliance_stats()`
- Dashboard statistics
- Shows: games today, flags today, pending payouts, banned users

---

## 🎯 WHAT YOU GET - COMPLETE FEATURE LIST

### ✅ **Fairness & RNG Seeding**
- All players in same session get identical RNG seed
- No luck-based advantages
- Skill determines winner

### ✅ **Anti-Cheat Protection**
- Bot detection (reaction time, input patterns)
- Score validation (server-side replay)
- Session expiration (30 minute limit)
- Device fingerprinting

### ✅ **Legal Compliance**
- Dual wallet system (purchased vs won tokens)
- Purchased tokens always spent first
- Won tokens can be withdrawn
- Complete audit trail for regulators

### ✅ **Fraud Prevention**
- Rate limiting (30/hour, 200/day)
- IP address tracking
- User agent tracking
- Automatic bans for repeat offenders

### ✅ **Prize Distribution**
- All payouts tracked in `payout_audit_trail`
- High-suspicion payouts flagged for review
- Admin approval required for suspicious wins
- Won tokens added to WON wallet (cashable)

### ✅ **Admin Tools**
- View suspicious sessions
- Approve/reject payouts
- Ban/unban users
- Generate compliance reports
- Daily dashboard statistics

---

## 📊 SUSPICION SCORE THRESHOLDS

| Score | Status | Action | Admin Review? |
|-------|--------|--------|---------------|
| 0-59  | ✅ Clean | Auto-approve payout | No |
| 60-79 | ⚠️ Suspicious | Flag for review | Yes |
| 80-100 | ❌ Highly Suspicious | Auto-reject or ban | Yes |

### Auto-Ban Trigger:
- **3+ high-suspicion flags** (score ≥ 80) = Automatic 7-day ban

---

## 🔍 RATE LIMITS

### Hourly Limit:
- **Max 30 games per hour**
- Resets automatically after 1 hour

### Daily Limit:
- **Max 200 games per day**
- Resets automatically after 24 hours

### Ban Enforcement:
- Banned users **cannot join any games**
- Ban duration set by admin (e.g., 7 days, 30 days, permanent)

---

## 🎮 HOW IT ALL WORKS TOGETHER

```
┌──────────────────────────────────────────────────────┐
│ 1. USER TRIES TO JOIN GAME                          │
│    ↓                                                 │
│ 2. check_rate_limit() → Are they allowed?           │
│    ↓                                                 │
│ 3. spend_tokens() → Deduct purchased tokens first   │
│    ↓                                                 │
│ 4. Add to session with RNG seed from config         │
│    ↓                                                 │
│ 5. update_rate_limits() → Track usage               │
│    ↓                                                 │
│ 6. USER PLAYS GAME (same RNG as all other players)  │
│    ↓                                                 │
│ 7. GAME ENDS - Score submitted                      │
│    ↓                                                 │
│ 8. Server validates inputs & calculates score       │
│    ↓                                                 │
│ 9. Bot detection analyzes patterns → Suspicion score│
│    ↓                                                 │
│ 10. IF suspicion ≥ 60:                              │
│     → log_suspicious_activity()                     │
│     → Email notification to admin                   │
│     → Flag payout for review                        │
│    ↓                                                 │
│ 11. IF winner:                                       │
│     → create_payout_audit()                         │
│     → IF suspicion < 60: Auto-approve               │
│     → IF suspicion ≥ 60: Await admin review         │
│    ↓                                                 │
│ 12. ADMIN REVIEWS (if needed):                       │
│     → approve_payout() → Tokens to WON wallet       │
│     OR                                               │
│     → reject_payout() → Prize withheld              │
└──────────────────────────────────────────────────────┘
```

---

## ✅ VERIFICATION AFTER RUNNING ALL SQL FILES

Run these queries to verify everything is set up correctly:

```sql
-- 1. Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'game_sessions', 
  'anti_cheat_logs', 
  'user_rate_limits', 
  'payout_audit_trail'
)
ORDER BY table_name;
-- Should return 4 rows

-- 2. Check RNG seeds added to configs
SELECT 
  'hot_sell_configs' as table_name,
  COUNT(*) as configs_with_rng_seed
FROM hot_sell_configs 
WHERE rng_seed IS NOT NULL AND rng_seed > 0

UNION ALL

SELECT 
  'winner_takes_all_configs',
  COUNT(*)
FROM winner_takes_all_configs 
WHERE rng_seed IS NOT NULL AND rng_seed > 0

UNION ALL

SELECT 
  'one_v_one_configs',
  COUNT(*)
FROM one_v_one_configs 
WHERE rng_seed IS NOT NULL AND rng_seed > 0;
-- Should show counts for each config type

-- 3. Check all functions exist
SELECT proname as function_name
FROM pg_proc
WHERE proname IN (
  'spend_tokens',
  'check_rate_limit',
  'update_rate_limits',
  'log_suspicious_activity',
  'create_payout_audit',
  'validate_session_not_expired',
  'join_hot_sell_session',
  'join_winner_takes_all_session',
  'join_1v1_session',
  'get_suspicious_sessions',
  'get_pending_payout_reviews',
  'approve_payout',
  'reject_payout',
  'ban_user',
  'unban_user',
  'get_user_compliance_report',
  'get_daily_compliance_stats'
)
ORDER BY proname;
-- Should return 17 functions

-- 4. Check token balances for your test accounts
SELECT 
  email,
  COALESCE(purchased_tokens, 0) as purchased,
  COALESCE(won_tokens, 0) as won,
  COALESCE(purchased_tokens, 0) + COALESCE(won_tokens, 0) as total
FROM public.users
WHERE email ILIKE '%ryan%'
ORDER BY email;
```

---

## 🎉 DONE!

After running all 4 SQL files in order, your gaming platform will have:

✅ **Fair gameplay** (RNG seeding)
✅ **Anti-cheat protection** (bot detection)
✅ **Legal compliance** (dual wallet, audit trail)
✅ **Fraud prevention** (rate limiting, bans)
✅ **Admin tools** (review, approve/reject)
✅ **Complete audit trail** (for regulators)

**Your gaming platform is now ready for real money skill-based gaming!** 🚀

---

## 🆘 SUPPORT

If you encounter any errors:

1. Check which SQL file caused the error
2. Look at the error message (column missing, function exists, etc.)
3. The SQL files include `IF EXISTS` checks to prevent duplicate creation
4. Safe to re-run if needed

**Need help?** Check the `NOTICE` messages in the SQL output for debugging info!

