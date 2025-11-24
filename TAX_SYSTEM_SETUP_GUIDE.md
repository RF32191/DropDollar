# 🧾 Tax Reporting System - W-9 & 1099-NEC Setup Guide

Complete implementation guide for IRS-compliant tax reporting on your skill-gaming platform.

---

## ⚠️ LEGAL DISCLAIMER

**This implementation is NOT legal or tax advice.** Before deploying to production:

1. **Hire a licensed CPA** to review all tax logic and calculations
2. **Consult with a tax attorney** regarding electronic W-9 signatures and compliance
3. **Verify** that your business structure and location support this approach
4. **Test thoroughly** with dummy data before going live

The authors of this code assume no liability for tax compliance issues.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [What This System Does](#what-this-system-does)
3. [Database Setup](#database-setup)
4. [Environment Variables](#environment-variables)
5. [Integration with Existing Code](#integration-with-existing-code)
6. [Testing the W-9 Flow](#testing-the-w-9-flow)
7. [1099 Generation & Delivery](#1099-generation--delivery)
8. [IRS E-Filing](#irs-e-filing)
9. [Cron Jobs / Scheduled Tasks](#cron-jobs--scheduled-tasks)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This system implements:

- **W-9 Collection**: Electronic W-9 forms with secure SSN handling (only last 4 digits stored)
- **Earnings Tracking**: Comprehensive ledger of all taxable income
- **Payout Blocking**: Automatically blocks withdrawals until W-9 is completed
- **1099-NEC Generation**: Automatic form generation for users earning $600+
- **Email Delivery**: Sends 1099s to users by January 31 deadline
- **IRS Export**: CSV export for third-party e-file providers

---

## 🚀 What This System Does

### For Users:
1. User tries to withdraw cash or redeem a prize
2. System checks if they've completed W-9
3. If not, shows blocking modal requiring W-9 submission
4. User fills out W-9 form electronically
5. System stores W-9 data securely (only SSN last 4 digits)
6. User can now withdraw funds
7. If user earns $600+ in a calendar year, they receive a 1099-NEC by Jan 31

### For Admins:
1. Track all user earnings in real-time
2. Generate 1099s with one click (or automatically via cron)
3. Email 1099s to all eligible users
4. Export data for IRS e-filing via third-party provider

---

## 🗄️ Database Setup

### Step 1: Deploy Schema

Run the SQL migration in Supabase:

```bash
# Copy the contents of src/lib/supabase/tax-system-schema.sql
# and run it in your Supabase SQL Editor
```

This creates:
- `tax_profiles` - W-9 information
- `earnings_ledger` - All taxable earnings
- `payout_requests` - Withdrawal requests
- `tax_year_summaries` - Annual earnings totals
- Helper functions for recording earnings and calculating 1099 needs
- RLS policies for data security

### Step 2: Create Storage Bucket

In Supabase, create a storage bucket for 1099 documents:

1. Go to **Storage** in Supabase Dashboard
2. Create new bucket: `tax-documents`
3. Set as **Private** (users access via signed URLs)
4. Set retention policy (keep for 7+ years per IRS requirements)

---

## 🔐 Environment Variables

Add these to your `.env.local` file:

```bash
# ===================================
# TAX SYSTEM CONFIGURATION
# ===================================

# Payer Information (YOUR COMPANY)
# TODO: Replace with your actual company details
TAX_PAYER_EIN=12-3456789
NEXT_PUBLIC_COMPANY_LEGAL_NAME=DropaDollar, Inc.
TAX_PAYER_ADDRESS_LINE1=123 Main Street, Suite 100
TAX_PAYER_ADDRESS_LINE2=
TAX_PAYER_CITY=San Francisco
TAX_PAYER_STATE=CA
TAX_PAYER_POSTAL_CODE=94102
TAX_PAYER_PHONE=(555) 123-4567
TAX_CONTACT_EMAIL=tax@dropadollar.com

# 1099 Generation
TAX_1099_GENERATION_ENABLED=true
TAX_AUTO_SEND_1099=false  # Set true after testing

# Email Configuration (for 1099 delivery)
TAX_EMAIL_FROM_NAME=DropaDollar Tax Team
TAX_EMAIL_FROM=tax@dropadollar.com

# Email Provider API Key (choose one)
# RESEND_API_KEY=re_...
# SENDGRID_API_KEY=SG....
# POSTMARK_API_KEY=...

# Admin API Key (for cron jobs)
ADMIN_API_KEY=your-secure-random-key-here
```

### Important:
- **Never commit `.env.local` to git**
- Use your actual EIN (Employer Identification Number)
- Use a real business address
- Set up an email provider (Resend, SendGrid, etc.)

---

## 🔗 Integration with Existing Code

### Step 1: Record Earnings When Users Win

Whenever a user wins a game or prize, record the earning:

```typescript
// In your game completion logic
import { recordGameWin } from '@/lib/tax/earnings';

// After determining winner and prize amount
await recordGameWin(
  userId,           // Winner's user ID
  prizeAmountCents, // e.g., 1500 for $15.00
  gameSessionId,    // Reference to game session
  'Laser Dodge'     // Game name
);
```

### Step 2: Add W-9 Check to Payout Flow

In your withdrawal/payout page:

```typescript
'use client';

import { useState } from 'react';
import W9OnboardingModal from '@/components/tax/W9OnboardingModal';

export default function WithdrawPage() {
  const [showW9Modal, setShowW9Modal] = useState(false);

  const handleWithdrawRequest = async (amountCents: number) => {
    const response = await fetch('/api/tax/payouts/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ amount_cents: amountCents }),
    });

    const result = await response.json();

    if (result.blocked && result.blocked_reason === 'W9_REQUIRED') {
      // Show W-9 modal
      setShowW9Modal(true);
    } else if (result.success) {
      // Payout request created successfully
      alert('Withdrawal request submitted!');
    }
  };

  return (
    <div>
      {/* Your withdrawal UI */}
      <button onClick={() => handleWithdrawRequest(5000)}>
        Withdraw $50
      </button>

      <W9OnboardingModal
        isOpen={showW9Modal}
        onClose={() => setShowW9Modal(false)}
        onSuccess={() => {
          setShowW9Modal(false);
          // Retry the withdrawal
          handleWithdrawRequest(5000);
        }}
        isBlocking={true} // Can't close without completing
      />
    </div>
  );
}
```

### Step 3: Record Other Earnings

For other earning types:

```typescript
import { 
  recordTournamentPrize, 
  recordRefund,
  recordAdjustment 
} from '@/lib/tax/earnings';

// Tournament prize
await recordTournamentPrize(userId, 10000, tournamentId, 1); // $100, 1st place

// Refund (negative earning)
await recordRefund(userId, 1500, originalEarningId, 'Game cancelled');

// Manual adjustment (admin action)
await recordAdjustment(userId, 500, 'Bonus for reporting bug', adminUserId);
```

---

## 🧪 Testing the W-9 Flow

### Test Scenario 1: New User Withdrawal

1. Create a test user account
2. Give them some earnings (use `recordGameWin`)
3. Navigate to withdrawal page
4. Click "Withdraw" button
5. **Expected**: W-9 modal appears (blocking)
6. Fill out W-9 form with test data:
   - Use fake SSN: `123-45-6789`
   - Use test address
   - Sign electronically
7. Submit form
8. **Expected**: Modal closes, withdrawal proceeds

### Test Scenario 2: Verify Data Storage

After W-9 submission, check Supabase:

```sql
-- Check tax profile was created
SELECT * FROM tax_profiles WHERE user_id = 'test-user-uuid';

-- Verify only last 4 of SSN stored
-- Should see: ssn_last4 = '6789', NOT full SSN

-- Check signature metadata
-- Should have signed_at, signature_ip, signature_user_agent
```

### Test Scenario 3: $600 Threshold

1. Record multiple earnings for test user totaling $600+
2. Check tax year summary:

```sql
SELECT * FROM tax_year_summaries 
WHERE user_id = 'test-user-uuid' 
AND tax_year = 2025;

-- Should show:
-- total_earnings_cents >= 60000
-- needs_1099 = true
```

---

## 📧 1099 Generation & Delivery

### Manual Generation (For Testing)

Use the admin API to generate 1099s:

```bash
curl -X POST http://localhost:3000/api/tax/admin/generate-1099s \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-admin-api-key" \
  -d '{"tax_year": 2024}'
```

**Response:**
```json
{
  "success": true,
  "tax_year": 2024,
  "stats": {
    "success": 15,
    "failed": 0,
    "total": 15
  },
  "errors": []
}
```

### Email Delivery

After generation, send emails to users:

```bash
curl -X POST http://localhost:3000/api/tax/admin/email-1099s \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-admin-api-key" \
  -d '{"tax_year": 2024}'
```

**Important**: Before emailing:
1. Set up email provider (Resend, SendGrid, etc.)
2. Update `sendTaxEmail()` function in `src/lib/tax/form1099.ts`
3. Test with your own email first
4. Set `TAX_AUTO_SEND_1099=true` in production

---

## 🏛️ IRS E-Filing

### Export 1099 Data

You **cannot** e-file directly to the IRS yourself (unless you're an approved provider).
Instead, export data and upload to a third-party service:

#### Step 1: Export Data

```bash
# Export as CSV
curl "http://localhost:3000/api/tax/admin/export-1099s?tax_year=2024&format=csv" \
  -H "x-api-key: your-admin-api-key" \
  > 1099-NEC-2024.csv

# Or export as JSON
curl "http://localhost:3000/api/tax/admin/export-1099s?tax_year=2024&format=json" \
  -H "x-api-key: your-admin-api-key" \
  > 1099-NEC-2024.json
```

#### Step 2: Sign Up with E-File Provider

Recommended providers:
- **Tax1099.com** - Popular, affordable
- **Track1099.com** - User-friendly
- **Tax Bandits** - Good for small businesses
- **TaxAct 1099** - Comprehensive

#### Step 3: Upload & File

1. Log into your e-file provider
2. Upload the CSV export
3. Review all records for accuracy
4. Submit to IRS (they'll handle the e-filing)
5. **Deadline**: January 31

#### Step 4: Record Keeping

Keep copies of all 1099 records for **7 years** (IRS requirement).

---

## ⏰ Cron Jobs / Scheduled Tasks

### Recommended Schedule

Set up these automated jobs:

#### Job 1: Generate 1099s (Early January)

**When**: January 10-15 (gives time to fix errors before deadline)

**Vercel Cron** (in `vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/tax/admin/generate-1099s",
      "schedule": "0 0 10 1 *"
    }
  ]
}
```

**Or use an external cron service** (like cron-job.org):
```
POST https://yourdomain.com/api/tax/admin/generate-1099s
Header: x-api-key: your-admin-api-key
Schedule: January 10 at 00:00
```

#### Job 2: Email 1099s (Mid-January)

**When**: January 20 (10 days before deadline)

```json
{
  "path": "/api/tax/admin/email-1099s",
  "schedule": "0 0 20 1 *"
}
```

### Manual Triggers

You can also trigger these manually from an admin dashboard:

```typescript
// Admin Dashboard Component
const trigger1099Generation = async () => {
  const response = await fetch('/api/tax/admin/generate-1099s', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY,
    },
    body: JSON.stringify({ tax_year: 2024 }),
  });
  
  const result = await response.json();
  alert(`Generated ${result.stats.success} 1099s`);
};
```

---

## 🔍 Troubleshooting

### Issue 1: W-9 Modal Doesn't Appear

**Symptom**: User clicks withdraw, but no W-9 modal shows

**Solutions**:
- Check that W-9 modal component is imported and rendered
- Verify API response includes `blocked_reason: 'W9_REQUIRED'`
- Check browser console for errors
- Ensure `isOpen` state is properly set

### Issue 2: "Only Last 4 Digits" Not Working

**Symptom**: Full SSN is being stored

**Solutions**:
- Check `getSSNLast4()` function is being called in API
- Verify database column is `ssn_last4` (not `ssn`)
- Check that W-9 submission endpoint uses `getSSNLast4(body.ssn)`

### Issue 3: 1099 Generation Fails

**Symptom**: `/api/tax/admin/generate-1099s` returns errors

**Common Causes**:
- Missing tax profiles (users didn't complete W-9)
- Invalid payer EIN in config
- Supabase storage bucket doesn't exist
- Missing environment variables

**Debug**:
```sql
-- Find users needing 1099s but missing tax profiles
SELECT tys.user_id, tys.total_earnings_cents
FROM tax_year_summaries tys
LEFT JOIN tax_profiles tp ON tp.user_id = tys.user_id
WHERE tys.needs_1099 = true
  AND tys.tax_year = 2024
  AND tp.id IS NULL;
```

### Issue 4: Emails Not Sending

**Symptom**: 1099s generated but users don't receive emails

**Solutions**:
- Verify email provider API key is set
- Update `sendTaxEmail()` in `src/lib/tax/form1099.ts` with actual email code
- Check email provider dashboard for delivery logs
- Test with your own email first
- Ensure `from` email is verified with your provider

### Issue 5: RLS (Row Level Security) Errors

**Symptom**: Users can't access their own tax data

**Solutions**:
- Verify RLS policies were created (check `tax-system-schema.sql`)
- Ensure user is authenticated when calling APIs
- Use service role key for server-side operations
- Check Supabase logs for specific RLS violations

---

## 📞 Support & Additional Resources

### IRS Resources
- [Form W-9 Instructions](https://www.irs.gov/forms-pubs/about-form-w-9)
- [Form 1099-NEC Instructions](https://www.irs.gov/forms-pubs/about-form-1099-nec)
- [IRS Publication 15-A](https://www.irs.gov/publications/p15a) - Employer's Supplemental Tax Guide

### Email Providers
- [Resend](https://resend.com/) - Modern, developer-friendly
- [SendGrid](https://sendgrid.com/) - Enterprise-grade
- [Postmark](https://postmarkapp.com/) - Transactional email specialist

### E-File Providers
- [Tax1099.com](https://www.tax1099.com/)
- [Track1099.com](https://www.track1099.com/)
- [Tax Bandits](https://www.taxbandits.com/)

---

## ✅ Pre-Launch Checklist

Before going to production:

- [ ] CPA reviewed all tax logic
- [ ] Tax attorney approved electronic W-9 approach
- [ ] Environment variables configured with real company info
- [ ] Email provider integrated and tested
- [ ] Supabase storage bucket created
- [ ] RLS policies verified
- [ ] W-9 flow tested with dummy users
- [ ] Earnings recording integrated into game wins
- [ ] Payout blocking tested
- [ ] 1099 generation tested with fake data
- [ ] Email delivery tested
- [ ] Signed up with IRS e-file provider
- [ ] Cron jobs configured
- [ ] Retention policy set (7+ years)
- [ ] Privacy policy updated to mention tax data collection
- [ ] Terms of service updated

---

## 🎉 You're All Set!

Your tax reporting system is now fully implemented and IRS-compliant (pending professional review).

**Remember**:
1. Test thoroughly before going live
2. Have professionals review before production
3. Keep records for 7+ years
4. Send 1099s by January 31
5. File with IRS via approved provider

Good luck! 🚀

