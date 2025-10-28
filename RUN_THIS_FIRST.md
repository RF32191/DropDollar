# 🚨 CRITICAL: RUN IN THIS EXACT ORDER

## Step 1: Run COMPLETE_SYSTEM_RESTORE.sql FIRST

This creates:
- All missing sessions for WTA, Hot Sell, and 1v1
- get_all_winner_takes_all_sessions() function
- get_all_hot_sell_sessions() function
- get_all_1v1_sessions() function
- All join and score functions

**This is the most important one - it fixes "Session not found" errors**

## Step 2: Run ADD_SCALABILITY_AND_PERFORMANCE.sql SECOND

This adds:
- Performance indexes
- Constraints
- Monitoring views

---

## ⚠️ Did you run COMPLETE_SYSTEM_RESTORE.sql?

If you only ran ADD_SCALABILITY_AND_PERFORMANCE.sql, that's why you're still getting "Session not found" errors.

**You MUST run COMPLETE_SYSTEM_RESTORE.sql first!**

