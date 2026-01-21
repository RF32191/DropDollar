# 🏆 Winners Page Setup Instructions

## Quick Setup (2 minutes)

The Winners Page needs SQL functions to fetch winner data. Follow these steps:

### Step 1: Copy the SQL
Click this file to open it and copy all contents:
- **[SETUP_WINNERS_PAGE.sql](./SETUP_WINNERS_PAGE.sql)** ← Click here

### Step 2: Run in Supabase
1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Paste the entire SQL content
5. Click **Run** (or press Cmd/Ctrl + Enter)

### Step 3: Verify
You should see:
```
✅ Winners Page SQL functions created successfully!
```

### Step 4: Test
Refresh your Winners page at `/winners` - it should now work!

---

## What This Creates

The SQL creates 4 functions:
- `get_wta_winners(limit)` - Fetches Winner Takes All winners
- `get_hot_sell_winners(limit)` - Fetches Hot Sell winners (1st, 2nd, 3rd)
- `get_coin_play_winners(limit)` - Placeholder for Coin Play
- `get_1v1_winners(limit)` - Placeholder for 1v1 battles

---

## Troubleshooting

### Still seeing "Application error"?
1. Open browser console (F12)
2. Look for the specific error message
3. Make sure you ran the SQL in Supabase
4. Hard refresh the page (Cmd/Ctrl + Shift + R)

### Functions already exist?
That's fine! The SQL uses `CREATE OR REPLACE` so it will update them.

---

## Need Help?
Check the browser console for detailed error messages.

