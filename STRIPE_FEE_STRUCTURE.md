# Stripe Fee Structure for DropDollar

## Payment Processing Fees (Incoming)

When users purchase tokens:
- **3.0% + $0.30 per transaction** (US domestic cards)
- **Example:** $10 token purchase = $0.60 fee ($10 × 0.03 + $0.30) = **You receive $9.40**

## Payout Fees (Outgoing to Winners)

### Option 1: Instant Payouts
- **1.5% of payout amount** (capped at $10)
- **Example:** $100 payout = $1.50 fee = **Winner receives $98.50**

### Option 2: Standard Payouts (1-3 business days)
- **FREE** for most transactions
- **No fee** when paying out to winners

## Recommended Structure

### Token Purchases (Non-Escrow System)
1. User buys tokens → **Stripe charges 3% + $0.30**
2. Money goes directly to your Stripe account
3. Tokens credited to user's account

### Winner Payouts
1. Winner requests withdrawal from token balance
2. Convert tokens to USD (1 token = $1)
3. Use **Standard Payouts (FREE)** to send money to winner's bank
4. Winner receives full amount, no deduction

### Your Revenue Model
- **Entry Fees:** Keep a percentage of each game entry (e.g., 6% platform fee)
- **Payment Processing:** Absorbed by you (3% + $0.30 per purchase)
- **Payouts:** FREE using standard transfers

## Example Transaction Flow

### $100 Tournament Entry
1. **User pays:** $100
2. **Stripe fee:** $3.30 (3% + $0.30)
3. **You receive:** $96.70
4. **Platform fee (6%):** $6.00
5. **Prize pool:** $90.70

### Winner Payout
1. **Winner tokens:** 90.70 tokens
2. **Conversion:** $90.70 USD
3. **Payout fee:** $0.00 (standard payout)
4. **Winner receives:** $90.70

## Important Notes

✅ **Standard payouts are FREE** - This is the best option for paying winners
✅ **No fee from your Chase business account** - Stripe handles the transfer
✅ **Instant payouts cost 1.5%** - Only use if winner needs immediate funds
✅ **International cards cost more** - 4.4% + $0.30 for non-US cards

## Implementation Strategy

1. **Token Purchase:** Direct Stripe charge → Credit user tokens
2. **Game Entry:** Deduct tokens from user wallet → Add to prize pool in database
3. **Winner Determination:** Calculate winner based on scores
4. **Payout:** Credit winner's token balance → Use Stripe Connect standard payout (FREE)

**No escrow needed** - All funds in your Stripe account, you control payouts

