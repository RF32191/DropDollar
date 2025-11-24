# 🔗 Tax System Integration Examples

Quick reference guide for integrating the tax system into your existing codebase.

---

## 📝 Table of Contents

1. [Recording Game Wins](#recording-game-wins)
2. [Recording Tournament Prizes](#recording-tournament-prizes)
3. [Payout Page Integration](#payout-page-integration)
4. [Admin Dashboard](#admin-dashboard)
5. [User Tax Profile View](#user-tax-profile-view)
6. [Email Provider Setup](#email-provider-setup)

---

## 🎮 Recording Game Wins

### Example 1: After 1v1 Game Completion

```typescript
// src/app/api/game-session/complete/route.ts

import { recordGameWin } from '@/lib/tax/earnings';

export async function POST(request: NextRequest) {
  // ... your existing game completion logic ...
  
  const winnerId = determineWinner(gameSession);
  const prizeAmount = gameSession.prize_pool_cents;
  
  // Record earning for tax purposes
  try {
    await recordGameWin(
      winnerId,
      prizeAmount,
      gameSession.id,
      gameSession.game_type
    );
    console.log(`✅ Recorded $${prizeAmount / 100} earning for user ${winnerId}`);
  } catch (error) {
    console.error('Failed to record earning:', error);
    // Note: Don't block game completion if this fails
  }
  
  // ... rest of your logic ...
}
```

### Example 2: Hot Sell Game Completion

```typescript
// When distributing prizes in Hot Sell

import { recordGameWin } from '@/lib/tax/earnings';

async function distributeHotSellPrizes(sessionId: string) {
  const topPlayers = await getTopPlayers(sessionId, 3);
  
  for (const player of topPlayers) {
    // Award prize
    await awardPrize(player.user_id, player.prize_cents);
    
    // Record for taxes
    await recordGameWin(
      player.user_id,
      player.prize_cents,
      sessionId,
      'Hot Sell'
    );
  }
}
```

### Example 3: Winner Takes All

```typescript
// src/lib/winnerTakesAll.ts

import { recordGameWin } from '@/lib/tax/earnings';

export async function payoutWinnerTakesAll(tournamentId: string) {
  const winner = await getWinner(tournamentId);
  const prizePool = await getTotalPrizePool(tournamentId);
  
  // Pay the winner
  await creditUserBalance(winner.user_id, prizePool);
  
  // Record for taxes
  await recordGameWin(
    winner.user_id,
    prizePool,
    tournamentId,
    'Winner Takes All'
  );
  
  return winner;
}
```

---

## 🏆 Recording Tournament Prizes

```typescript
// src/lib/tournaments.ts

import { recordTournamentPrize } from '@/lib/tax/earnings';

export async function distributeTournamentPrizes(tournamentId: string) {
  const results = await getTournamentResults(tournamentId);
  
  // 1st Place: $1000
  await recordTournamentPrize(
    results[0].user_id,
    100000,
    tournamentId,
    1 // placement
  );
  
  // 2nd Place: $500
  await recordTournamentPrize(
    results[1].user_id,
    50000,
    tournamentId,
    2
  );
  
  // 3rd Place: $250
  await recordTournamentPrize(
    results[2].user_id,
    25000,
    tournamentId,
    3
  );
}
```

---

## 💰 Payout Page Integration

### Full Example: Wallet Page with W-9 Check

```typescript
// src/app/wallet/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import W9OnboardingModal from '@/components/tax/W9OnboardingModal';

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [showW9Modal, setShowW9Modal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClientComponentClient();

  const handleWithdraw = async () => {
    if (withdrawAmount < 5) {
      setError('Minimum withdrawal is $5.00');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in');
        return;
      }

      const response = await fetch('/api/tax/payouts/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount_cents: withdrawAmount * 100,
          payment_method: 'stripe',
        }),
      });

      const result = await response.json();

      if (result.blocked && result.blocked_reason === 'W9_REQUIRED') {
        // Show W-9 modal
        setShowW9Modal(true);
      } else if (result.success) {
        alert('Withdrawal request submitted successfully!');
        setWithdrawAmount(0);
        // Refresh balance
        fetchBalance();
      } else {
        setError(result.message || 'Withdrawal failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    // Your existing balance fetching logic
    // ...
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  return (
    <div className="container mx-auto p-8">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Your Wallet</h1>
        
        {/* Balance Display */}
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl p-8 text-white mb-8">
          <p className="text-sm uppercase tracking-wide mb-2">Available Balance</p>
          <p className="text-5xl font-bold">${balance.toFixed(2)}</p>
        </div>

        {/* Withdrawal Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Withdrawal Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-500 text-xl">$</span>
              <input
                type="number"
                min="5"
                max={balance}
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(parseFloat(e.target.value))}
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl text-xl focus:border-blue-500 focus:outline-none"
                placeholder="0.00"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">Minimum: $5.00</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={handleWithdraw}
            disabled={loading || withdrawAmount < 5}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Request Withdrawal'}
          </button>
        </div>

        {/* Tax Information Notice */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-sm text-gray-700">
            📋 <strong>Tax Information:</strong> Withdrawals require W-9 tax information.
            If you earn $600+ in a year, you'll receive a 1099-NEC form by January 31.
          </p>
        </div>
      </div>

      {/* W-9 Modal */}
      <W9OnboardingModal
        isOpen={showW9Modal}
        onClose={() => setShowW9Modal(false)}
        onSuccess={() => {
          setShowW9Modal(false);
          // Automatically retry withdrawal
          handleWithdraw();
        }}
        isBlocking={true}
      />
    </div>
  );
}
```

---

## 🛠️ Admin Dashboard

### Example: Tax Admin Page

```typescript
// src/app/admin/tax/page.tsx

'use client';

import { useState } from 'react';

export default function TaxAdminPage() {
  const [taxYear, setTaxYear] = useState(new Date().getFullYear() - 1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const generate1099s = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tax/admin/generate-1099s', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || '',
        },
        body: JSON.stringify({ tax_year: taxYear }),
      });

      const data = await response.json();
      setResult(data);
      alert(`Generated ${data.stats.success} 1099 forms`);
    } catch (error) {
      alert('Error generating 1099s');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const email1099s = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tax/admin/email-1099s', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || '',
        },
        body: JSON.stringify({ tax_year: taxYear }),
      });

      const data = await response.json();
      setResult(data);
      alert(`Emailed ${data.stats.success} 1099 forms`);
    } catch (error) {
      alert('Error emailing 1099s');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const export1099s = () => {
    window.open(
      `/api/tax/admin/export-1099s?tax_year=${taxYear}&format=csv`,
      '_blank'
    );
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Tax Administration</h1>

      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl">
        <div className="mb-6">
          <label className="block font-semibold mb-2">Tax Year</label>
          <input
            type="number"
            value={taxYear}
            onChange={(e) => setTaxYear(parseInt(e.target.value))}
            className="px-4 py-2 border-2 border-gray-200 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={generate1099s}
            disabled={loading}
            className="px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          >
            1. Generate 1099s
          </button>

          <button
            onClick={email1099s}
            disabled={loading}
            className="px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          >
            2. Email to Users
          </button>

          <button
            onClick={export1099s}
            disabled={loading}
            className="px-6 py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          >
            3. Export for IRS
          </button>
        </div>

        {result && (
          <div className="mt-8 p-6 bg-gray-50 rounded-xl">
            <h3 className="font-bold text-lg mb-4">Results:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 👤 User Tax Profile View

```typescript
// src/app/profile/tax/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import W9OnboardingModal from '@/components/tax/W9OnboardingModal';

export default function TaxProfilePage() {
  const [taxProfile, setTaxProfile] = useState<any>(null);
  const [showW9Modal, setShowW9Modal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClientComponentClient();

  const fetchTaxProfile = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/tax/w9/submit', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (result.has_submitted) {
        setTaxProfile(result.tax_profile);
      }
    } catch (error) {
      console.error('Error fetching tax profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxProfile();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!taxProfile) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Tax Information Not Submitted</h2>
          <p className="text-gray-700 mb-6">
            You haven't submitted your W-9 tax information yet. This is required before
            you can withdraw any winnings.
          </p>
          <button
            onClick={() => setShowW9Modal(true)}
            className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all"
          >
            Submit W-9 Information
          </button>
        </div>

        <W9OnboardingModal
          isOpen={showW9Modal}
          onClose={() => setShowW9Modal(false)}
          onSuccess={() => {
            setShowW9Modal(false);
            fetchTaxProfile();
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Your Tax Information</h1>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">Full Name</label>
            <p className="text-lg font-semibold">{taxProfile.full_name}</p>
          </div>

          <div>
            <label className="text-sm text-gray-500">Tax Classification</label>
            <p className="text-lg font-semibold capitalize">
              {taxProfile.tax_classification.replace('_', ' ')}
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-500">Submitted On</label>
            <p className="text-lg font-semibold">
              {new Date(taxProfile.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm text-gray-700">
              ✅ <strong>W-9 Complete:</strong> You're all set to receive withdrawals.
              If you earn $600+ in a year, you'll receive a 1099-NEC by January 31.
            </p>
          </div>

          <button
            onClick={() => setShowW9Modal(true)}
            className="mt-4 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl transition-all"
          >
            Update Tax Information
          </button>
        </div>
      </div>

      <W9OnboardingModal
        isOpen={showW9Modal}
        onClose={() => setShowW9Modal(false)}
        onSuccess={() => {
          setShowW9Modal(false);
          fetchTaxProfile();
        }}
      />
    </div>
  );
}
```

---

## 📧 Email Provider Setup

### Option 1: Resend (Recommended)

```typescript
// src/lib/tax/form1099.ts

import { Resend } from 'resend';

async function sendTaxEmail(
  toEmail: string,
  taxYear: number,
  form1099Url: string,
  totalEarningsCents: number
): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: `${TAX_CONFIG.email.from_name} <${TAX_CONFIG.email.from_email}>`,
      to: toEmail,
      subject: `Your ${taxYear} 1099-NEC Tax Form from ${TAX_CONFIG.payer.legal_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your ${taxYear} 1099-NEC Tax Form</h2>
          
          <p>Thank you for participating on our platform in ${taxYear}.</p>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 18px;">
              <strong>Total Earnings:</strong> ${formatCurrency(totalEarningsCents)}
            </p>
          </div>
          
          <p>Your 1099-NEC form is available for download:</p>
          
          <a href="${form1099Url}" 
             style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Download 1099-NEC
          </a>
          
          <p style="color: #666; font-size: 14px; margin-top: 32px;">
            <strong>Important:</strong> Please consult with your tax advisor regarding how to report this income on your tax return.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            If you have any questions, please contact us at 
            <a href="mailto:${TAX_CONFIG.payer.contact_email}">${TAX_CONFIG.payer.contact_email}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          
          <p style="color: #999; font-size: 12px;">
            ${TAX_CONFIG.payer.legal_name}<br />
            ${TAX_CONFIG.payer.address.line1}<br />
            ${TAX_CONFIG.payer.address.city}, ${TAX_CONFIG.payer.address.state} ${TAX_CONFIG.payer.address.postal_code}
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    console.log(`✅ Email sent to ${toEmail}:`, data);
    return true;
  } catch (error) {
    console.error('Error sending tax email:', error);
    return false;
  }
}
```

### Option 2: SendGrid

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

async function sendTaxEmail(
  toEmail: string,
  taxYear: number,
  form1099Url: string,
  totalEarningsCents: number
): Promise<boolean> {
  try {
    await sgMail.send({
      to: toEmail,
      from: TAX_CONFIG.email.from_email,
      subject: `Your ${taxYear} 1099-NEC Tax Form`,
      html: `<h2>Your 1099-NEC Form</h2>...`, // Same HTML as above
    });

    return true;
  } catch (error) {
    console.error('SendGrid error:', error);
    return false;
  }
}
```

---

## 🎉 That's It!

You now have all the code examples you need to integrate the tax system into your platform.

**Next Steps:**
1. Copy relevant examples into your codebase
2. Customize UI/UX to match your brand
3. Test thoroughly
4. Deploy! 🚀

