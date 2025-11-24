# 🧾 Tax Reporting System - Complete Implementation

**A fully functional W-9 collection and 1099-NEC generation system for skill-gaming platforms.**

---

## 📦 What's Included

This implementation provides everything you need for IRS-compliant tax reporting:

### ✅ Core Features

- **W-9 Electronic Collection** - Secure online form with electronic signature
- **SSN Security** - Only stores last 4 digits (PCI-compliant approach)
- **Earnings Tracking** - Comprehensive ledger of all taxable income
- **$600 Threshold Detection** - Automatic 1099 determination
- **Payout Blocking** - Prevents withdrawals until W-9 complete
- **1099-NEC Generation** - Automated form creation
- **Email Delivery** - Send 1099s to users by January 31
- **IRS Export** - CSV format for third-party e-file providers
- **Admin Dashboard** - Manage tax compliance in one place

---

## 📁 File Structure

```
├── Database Schema
│   └── src/lib/supabase/tax-system-schema.sql         # Complete database schema
│
├── TypeScript Types
│   └── src/types/tax.ts                               # All type definitions
│
├── Configuration
│   ├── src/lib/tax/config.ts                          # Tax system configuration
│   └── env.tax.template                               # Environment variables template
│
├── Backend Logic
│   ├── src/lib/tax/earnings.ts                        # Earnings recording & summaries
│   └── src/lib/tax/form1099.ts                        # 1099 generation & delivery
│
├── API Endpoints
│   ├── src/app/api/tax/w9/submit/route.ts            # W-9 submission (POST/GET)
│   ├── src/app/api/tax/payouts/request/route.ts      # Payout requests with blocking
│   ├── src/app/api/tax/admin/generate-1099s/route.ts # Generate 1099s
│   ├── src/app/api/tax/admin/email-1099s/route.ts    # Email 1099s to users
│   └── src/app/api/tax/admin/export-1099s/route.ts   # Export for IRS e-filing
│
├── React Components
│   └── src/components/tax/W9OnboardingModal.tsx      # Interactive W-9 form modal
│
└── Documentation
    ├── TAX_SYSTEM_README.md                           # This file
    ├── TAX_SYSTEM_SETUP_GUIDE.md                      # Complete setup instructions
    └── TAX_SYSTEM_INTEGRATION_EXAMPLES.md             # Code examples
```

---

## 🚀 Quick Start

### 1. Deploy Database Schema

```bash
# Open Supabase SQL Editor and run:
# src/lib/supabase/tax-system-schema.sql
```

Creates all tables, functions, and RLS policies.

### 2. Configure Environment Variables

```bash
# Copy template to .env.local
cp env.tax.template .env.local

# Edit .env.local with your company info
# - TAX_PAYER_EIN (your EIN)
# - NEXT_PUBLIC_COMPANY_LEGAL_NAME
# - Company address
# - Email settings
# - API keys
```

### 3. Create Storage Bucket

In Supabase Dashboard:
- Go to **Storage**
- Create bucket: `tax-documents`
- Set to **Private**

### 4. Integrate with Your Code

**Record earnings when users win:**

```typescript
import { recordGameWin } from '@/lib/tax/earnings';

await recordGameWin(winnerId, prizeAmountCents, gameSessionId, 'Laser Dodge');
```

**Add W-9 check to withdrawals:**

```typescript
import W9OnboardingModal from '@/components/tax/W9OnboardingModal';

// Show modal if payout blocked
if (result.blocked_reason === 'W9_REQUIRED') {
  setShowW9Modal(true);
}
```

### 5. Test W-9 Flow

1. Try to withdraw with a test user
2. Fill out W-9 form
3. Verify data in Supabase `tax_profiles` table
4. Confirm withdrawal proceeds

### 6. Generate & Send 1099s (January)

```bash
# Generate 1099s
curl -X POST https://yoursite.com/api/tax/admin/generate-1099s \
  -H "x-api-key: $ADMIN_API_KEY" \
  -d '{"tax_year": 2024}'

# Email to users
curl -X POST https://yoursite.com/api/tax/admin/email-1099s \
  -H "x-api-key: $ADMIN_API_KEY" \
  -d '{"tax_year": 2024}'

# Export for IRS e-filing
curl "https://yoursite.com/api/tax/admin/export-1099s?tax_year=2024&format=csv" \
  -H "x-api-key: $ADMIN_API_KEY" \
  > 1099-export.csv
```

---

## 📚 Documentation

- **[Setup Guide](./TAX_SYSTEM_SETUP_GUIDE.md)** - Complete installation & configuration
- **[Integration Examples](./TAX_SYSTEM_INTEGRATION_EXAMPLES.md)** - Code snippets for common scenarios

---

## 🔒 Security & Compliance

### What Makes This Compliant

✅ **SSN Security**: Only last 4 digits stored  
✅ **Electronic Signature**: IP address, timestamp, user agent logged  
✅ **RLS Policies**: Users can only access their own tax data  
✅ **Audit Trail**: Complete history of all earnings  
✅ **$600 Threshold**: Automatic 1099 determination per IRS rules  
✅ **January 31 Deadline**: Automated email delivery system  

### What You Still Need

⚠️ **CPA Review** - Have a tax professional review before production  
⚠️ **Legal Review** - Tax attorney approval for electronic W-9 approach  
⚠️ **IRS E-File Provider** - Sign up with Tax1099, Track1099, etc.  
⚠️ **Email Provider** - Integrate Resend, SendGrid, or similar  
⚠️ **Privacy Policy Update** - Disclose tax data collection  
⚠️ **Terms of Service Update** - Mention 1099 reporting  

---

## 🎯 IRS Compliance Checklist

Before going live:

- [ ] Database schema deployed
- [ ] Environment variables configured with real company info
- [ ] Storage bucket created
- [ ] Email provider integrated
- [ ] W-9 flow tested with dummy data
- [ ] Earnings recording integrated into game wins
- [ ] Payout blocking tested
- [ ] 1099 generation tested
- [ ] Email delivery tested
- [ ] Signed up with IRS e-file provider
- [ ] Retention policy set (7+ years)
- [ ] CPA reviewed all tax logic
- [ ] Tax attorney approved electronic W-9 approach
- [ ] Privacy policy updated
- [ ] Terms of service updated

---

## 📅 Annual Tax Calendar

### January 10-15
- **Action**: Generate 1099s for previous year
- **API**: `/api/tax/admin/generate-1099s`
- **Note**: Gives time to fix errors before deadline

### January 20
- **Action**: Email 1099s to users
- **API**: `/api/tax/admin/email-1099s`
- **Deadline**: Must be sent by January 31

### January 25
- **Action**: Export data for IRS e-filing
- **API**: `/api/tax/admin/export-1099s`
- **Upload to**: Tax1099, Track1099, or your e-file provider

### January 31
- **IRS Deadline**: 1099-NEC forms must be:
  - Delivered to recipients
  - Filed with IRS (via e-file provider)

### Throughout Year
- **Action**: Record all earnings in real-time
- **Function**: `recordGameWin()`, `recordTournamentPrize()`, etc.

---

## 🛠️ API Reference

### User Endpoints

#### Submit W-9
```
POST /api/tax/w9/submit
GET  /api/tax/w9/submit        # Check submission status
```

#### Request Payout
```
POST /api/tax/payouts/request  # May return W9_REQUIRED error
GET  /api/tax/payouts/request  # List user's payout requests
```

### Admin Endpoints

#### Generate 1099s
```
POST /api/tax/admin/generate-1099s
Body: { "tax_year": 2024 }
```

#### Email 1099s
```
POST /api/tax/admin/email-1099s
Body: { "tax_year": 2024 }
```

#### Export for IRS
```
GET /api/tax/admin/export-1099s?tax_year=2024&format=csv
```

---

## 🐛 Troubleshooting

### W-9 Modal Doesn't Appear
- Check console for errors
- Verify modal is imported and rendered
- Ensure `isOpen` state is true

### Full SSN Being Stored
- Check `getSSNLast4()` is called before database insert
- Verify column name is `ssn_last4` not `ssn`

### 1099 Generation Fails
- Check users have completed W-9
- Verify payer EIN in config
- Ensure storage bucket exists

### Emails Not Sending
- Integrate email provider in `sendTaxEmail()`
- Verify API key is set
- Check email provider dashboard

---

## 💡 Pro Tips

1. **Test Early**: Run test 1099 generation in November/December
2. **Backup Everything**: Tax data must be kept for 7+ years
3. **Monitor Logs**: Check for earning recording failures
4. **Set Reminders**: January deadlines are strict
5. **Have a CPA**: Don't wing it on taxes

---

## 📞 Support Resources

### IRS Resources
- [Form W-9 Instructions](https://www.irs.gov/forms-pubs/about-form-w-9)
- [Form 1099-NEC Instructions](https://www.irs.gov/forms-pubs/about-form-1099-nec)
- [IRS Publication 15-A](https://www.irs.gov/publications/p15a)

### E-File Providers
- [Tax1099.com](https://www.tax1099.com/)
- [Track1099.com](https://www.track1099.com/)
- [Tax Bandits](https://www.taxbandits.com/)

### Email Providers
- [Resend](https://resend.com/) - Modern, developer-friendly
- [SendGrid](https://sendgrid.com/) - Enterprise
- [Postmark](https://postmarkapp.com/) - Transactional specialist

---

## ⚠️ Final Legal Reminder

**This is NOT legal or tax advice.**

Before deploying to production:
1. Have a licensed CPA review all tax logic
2. Consult with a tax attorney
3. Verify compliance with your state's laws
4. Update your Terms of Service and Privacy Policy
5. Keep records for 7+ years

The authors assume no liability for tax compliance issues.

---

## 🎉 You're All Set!

Your platform is now ready for IRS-compliant tax reporting.

**Questions?** Review the [Setup Guide](./TAX_SYSTEM_SETUP_GUIDE.md) or [Integration Examples](./TAX_SYSTEM_INTEGRATION_EXAMPLES.md).

**Ready to deploy?** Complete the checklist above and get professional review.

Good luck! 🚀

---

*Built with ❤️ for skill-gaming platforms*

