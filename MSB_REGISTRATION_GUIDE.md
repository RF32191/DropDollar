# Money Services Business (MSB) Registration Guide

## Overview

This guide covers the regulatory requirements for Drop Dollar to operate legally as a skill-based gaming platform that handles virtual currency and prize payouts.

---

## 1. Do You Need MSB Registration?

### The Short Answer: **MAYBE**

The FinCEN definition of a Money Services Business includes businesses that:
- Transfer money
- Deal in foreign exchange
- Check cash
- Issue or sell money orders/traveler's checks
- **Provide prepaid access** (includes virtual currency in some cases)

### Drop Dollar's Situation

| Activity | MSB Relevance |
|----------|---------------|
| Selling tokens for cash | ⚠️ Could be considered prepaid access |
| Paying out winnings | ⚠️ Could be considered money transmission |
| In-platform transfers | ✅ Internal credits, not transmission |

### Key Exemption: **Payment Processor Exemption**

If you use a licensed payment processor (like **Stripe**) for ALL money movement:
- Stripe handles the actual money transmission
- Stripe is the MSB, not Drop Dollar
- Drop Dollar just sells digital goods/credits

**THIS IS THE RECOMMENDED APPROACH.**

---

## 2. How to Stay Exempt (Recommended)

### Use Stripe for Everything

1. **Token Purchases**: Stripe processes all payments
2. **Prize Payouts**: Use Stripe Connect for instant payouts
3. **Never hold user funds**: All money flows through Stripe

### Structure Your Business This Way

```
User Purchases Tokens:
User → Stripe → Drop Dollar (tokens granted instantly)
        ↑
   Stripe holds the money, not Drop Dollar

User Withdraws Winnings:
Drop Dollar → Stripe Connect → User's Bank
              ↑
    Stripe handles the money transmission
```

### What This Means

- **Drop Dollar is a software platform** that sells digital goods (tokens)
- **Stripe is the licensed MSB** that handles money movement
- **No direct money holding** by Drop Dollar

---

## 3. If You DO Need MSB Registration

If you cannot use the Stripe-only model, here's the registration process:

### Step 1: Federal Registration (FinCEN)

**Website:** https://www.fincen.gov/msb-registration

**Required Information:**
- Business legal name and DBA
- EIN (Employer Identification Number)
- Principal place of business
- Ownership information (25%+ owners)
- Types of MSB activities
- Agent locations (if any)

**Timeline:** 
- Registration can be completed online
- Processing takes 1-3 business days
- **Registration renewal required every 2 years**

**Cost:** FREE (but compliance is expensive)

### Step 2: State Licenses

Most states require **Money Transmitter Licenses (MTL)**. This is the expensive and time-consuming part.

| State | License Required? | Cost | Timeline |
|-------|-------------------|------|----------|
| California | Yes | $5,000 | 3-6 months |
| New York | Yes (BitLicense too) | $5,000+ | 6-12 months |
| Texas | Yes | $2,500 | 3-6 months |
| Florida | Yes | $1,000 | 2-4 months |
| Washington | Yes | $3,100 | 4-6 months |

**Typical Requirements:**
- Surety bond ($10,000 - $500,000+ depending on volume)
- Net worth requirements ($25,000 - $1,000,000+)
- Fingerprinting and background checks
- Business plan and compliance policies
- Annual audited financial statements

### Step 3: Compliance Program

**Required Policies:**
1. Anti-Money Laundering (AML) Policy
2. Know Your Customer (KYC) Procedures
3. Suspicious Activity Reporting (SAR)
4. Currency Transaction Reports (CTR)
5. Record Retention (5 years minimum)

**Ongoing Requirements:**
- Designate a Compliance Officer
- Annual independent AML audits
- Employee training programs
- Regular risk assessments

---

## 4. Recommended Approach for Drop Dollar

### Phase 1: Use Stripe Only (Current)

1. ✅ All payments through Stripe
2. ✅ All payouts through Stripe Connect
3. ✅ Never hold user funds directly
4. ✅ Clear token terms (non-refundable, non-cashable)
5. ✅ Prize winnings = Stripe payouts

### Phase 2: Get Legal Opinion

1. Consult with a gaming/fintech attorney
2. Get written opinion on MSB applicability
3. Keep documentation for compliance records

### Phase 3: If Required, Register

1. Register with FinCEN (free, quick)
2. Prioritize state licenses where you have most users
3. Consider using a compliance-as-a-service provider

---

## 5. Compliance Checklist

Even if using Stripe, implement these:

### KYC (Know Your Customer)
- [x] Email verification
- [x] Phone verification
- [ ] ID verification for withdrawals >$100
- [ ] Address verification for large withdrawals

### AML (Anti-Money Laundering)
- [x] Transaction monitoring (SECURE_AUDIT_SYSTEM.sql)
- [x] Velocity checks (rapid transaction alerts)
- [ ] SAR filing procedures (if suspicious activity)
- [x] Customer due diligence records

### Record Keeping
- [x] All transactions logged with checksums
- [x] User identity records
- [x] 5+ year retention (implemented in database)

---

## 6. Cost Comparison

### Option A: Stripe Only (Recommended)
| Item | Cost |
|------|------|
| Stripe fees | 2.9% + $0.30 per transaction |
| Legal opinion | $1,000 - $5,000 (one-time) |
| Compliance software | $0 (built into platform) |
| **Total Year 1** | **~$5,000 + transaction fees** |

### Option B: Full MSB Registration
| Item | Cost |
|------|------|
| FinCEN registration | Free |
| State licenses (5 states) | $15,000 - $50,000 |
| Surety bonds | $5,000 - $50,000/year |
| Compliance officer | $80,000 - $150,000/year |
| Annual audits | $10,000 - $30,000/year |
| Legal/consulting | $20,000 - $100,000/year |
| **Total Year 1** | **$130,000 - $380,000+** |

---

## 7. Resources

### FinCEN
- Website: https://www.fincen.gov
- MSB Registration: https://www.fincen.gov/msb-registrant-search
- Guidance: https://www.fincen.gov/resources/statutes-and-regulations/guidance

### State Regulators
- NMLS (Nationwide Multistate Licensing System): https://www.nmls.org
- State-by-state requirements: https://www.nmls.org/

### Stripe
- Stripe Connect: https://stripe.com/connect
- Compliance documentation: https://stripe.com/docs/connect/required-verification-information

### Legal Resources
- Money Transmission Modernization Act
- Bank Secrecy Act (BSA)
- FinCEN Virtual Currency Guidance (2019)

---

## 8. Summary

**For Drop Dollar's Current Scale:**

1. ✅ **Use Stripe for all money movement** (recommended)
2. ✅ **Implement robust KYC/AML** (already done)
3. ✅ **Get legal opinion letter** (see Stripe letter template)
4. ⏸️ **MSB registration** only if Stripe model is insufficient
5. ⏸️ **State licenses** only if required by legal counsel

**Key Principle:** The platform sells digital goods (tokens/credits). Stripe handles all actual money transmission. Drop Dollar is a gaming software company, not a money transmitter.

---

*This guide is for informational purposes only. Consult with a licensed attorney for legal advice specific to your situation.*

