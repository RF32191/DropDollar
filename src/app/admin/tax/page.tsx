'use client';

/**
 * COMPREHENSIVE TAX ADMIN DASHBOARD
 * 
 * Features:
 * 1. Admin Test Section - Test W-9 and 1099 flow
 * 2. View All W-9s - Search and filter all user W-9 forms
 * 3. View All 1099s - See generated 1099 forms by year
 * 4. Backup Management - Download and verify backups
 * 5. Quick Actions - Generate, email, export 1099s
 */

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import W9OnboardingModal from '@/components/tax/W9OnboardingModal';
import AdCampaignManagement from '@/components/admin/AdCampaignManagement';

interface W9Record {
  id: string;
  user_id: string;
  user_email: string;
  full_name: string;
  business_name: string | null;
  tax_classification: string;
  ssn_last4: string;
  ein: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string | null;
  signed_at: string;
  is_verified: boolean;
  total_lifetime_earnings_cents: number;
  needs_1099_current_year: boolean;
}

interface Form1099Record {
  user_id: string;
  user_email: string;
  full_name: string;
  tax_year: number;
  total_earnings_cents: number;
  form_1099_generated_at: string | null;
  form_1099_delivery_status: string;
  form_1099_pdf_url: string | null;
  form_1099_sent_at: string | null;
}

export default function TaxAdminDashboard() {
  // Test section state
  const [showW9Modal, setShowW9Modal] = useState(false);
  const [testAmount, setTestAmount] = useState('100000'); // $1000 default
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // W-9 list state
  const [w9s, setW9s] = useState<W9Record[]>([]);
  const [w9Search, setW9Search] = useState('');
  const [w9Filter, setW9Filter] = useState('all');
  const [w9Loading, setW9Loading] = useState(false);

  // 1099 list state
  const [form1099s, setForm1099s] = useState<Form1099Record[]>([]);
  const [form1099Year, setForm1099Year] = useState(new Date().getFullYear());
  const [form1099Loading, setForm1099Loading] = useState(false);

  // Stats
  const [stats, setStats] = useState<any>(null);

  const adminEmail = 'rf32191@gmail.com';
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const supabase = createClientComponentClient();

  // Get auth token on mount
  useEffect(() => {
    const getToken = async () => {
      console.log('[Tax Admin] Getting auth token...');
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[Tax Admin] Session found:', session.user?.email);
        setAuthToken(session.access_token);
        setCurrentUserEmail(session.user?.email || null);
      } else {
        console.log('[Tax Admin] No session found');
      }
      setIsAuthReady(true);
    };
    getToken();
    
    // Also listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Tax Admin] Auth state changed:', event, session?.user?.email);
      if (session) {
        setAuthToken(session.access_token);
        setCurrentUserEmail(session.user?.email || null);
      } else {
        setAuthToken(null);
        setCurrentUserEmail(null);
      }
      setIsAuthReady(true);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // ============================================================================
  // LOGIN FUNCTION
  // ============================================================================

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      console.log('[Tax Admin] Attempting login for:', loginEmail);
      
      // Check if email is admin email
      if (loginEmail.toLowerCase() !== adminEmail.toLowerCase()) {
        setLoginError('This login is only for admin access (rf32191@gmail.com)');
        setLoginLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        console.error('[Tax Admin] Login error:', error.message);
        setLoginError(error.message);
      } else if (data.session) {
        console.log('[Tax Admin] Login successful!');
        setAuthToken(data.session.access_token);
        setCurrentUserEmail(data.session.user?.email || null);
        setLoginEmail('');
        setLoginPassword('');
      }
    } catch (err) {
      console.error('[Tax Admin] Login exception:', err);
      setLoginError('An unexpected error occurred');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthToken(null);
    setCurrentUserEmail(null);
  };

  // ============================================================================
  // TEST SECTION - Admin W-9 & 1099 Testing
  // ============================================================================

  const handleAdminW9Submit = () => {
    setShowW9Modal(true);
  };

  // Helper function to get fresh auth token
  const getFreshToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setAuthToken(session.access_token);
      setCurrentUserEmail(session.user?.email || null);
      return session.access_token;
    }
    return null;
  };

  const handleGenerateTest1099 = async () => {
    if (!testAmount || parseInt(testAmount) <= 0) {
      alert('Please enter a valid withdrawal amount');
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    try {
      // Get fresh token
      let token = authToken;
      if (!token) {
        console.log('[Tax Admin] No token cached, getting fresh token...');
        token = await getFreshToken();
      }

      if (!token) {
        setTestResult('❌ Please log in with rf32191@gmail.com to access this feature.\n\nIf you are logged in, try refreshing the page.');
        setTestLoading(false);
        return;
      }

      console.log('[Tax Admin] Generating test 1099 with token...');

      const response = await fetch('/api/tax/admin/test-1099', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: adminEmail,
          amount_cents: parseInt(testAmount),
          tax_year: new Date().getFullYear(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTestResult(
          `✅ Success! Test 1099 sent to your account!\n` +
          `Email: ${adminEmail}\n` +
          `Amount: $${(parseInt(testAmount) / 100).toFixed(2)}\n\n` +
          `📨 Check your account notifications/dashboard to view the 1099 message.`
        );
      } else {
        setTestResult(`❌ Error: ${result.error}\n${result.message || ''}`);
      }
    } catch (error) {
      console.error('Error generating test 1099:', error);
      setTestResult(`❌ Failed to generate test 1099: ${error}`);
    } finally {
      setTestLoading(false);
    }
  };

  // ============================================================================
  // W-9 MANAGEMENT
  // ============================================================================

  const fetchW9s = async () => {
    setW9Loading(true);
    try {
      // Get fresh token
      let token = authToken;
      if (!token) {
        token = await getFreshToken();
      }

      if (!token) {
        console.log('[Tax Admin] No token for fetchW9s');
        setW9Loading(false);
        return;
      }

      let url = `/api/tax/admin/w9s?limit=100&offset=0`;
      
      if (w9Search) {
        url += `&search=${encodeURIComponent(w9Search)}`;
      }
      
      if (w9Filter === 'needs_1099') {
        url += `&needs_1099=true`;
      } else if (w9Filter === 'unverified') {
        url += `&verified=false`;
      }

      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      console.log('[Tax Admin] W-9 API result:', result);
      
      if (result.success && result.data && result.data.length > 0) {
        setW9s(result.data);
      } else {
        console.log('[Tax Admin] API returned empty, trying direct query...');
        // Fallback: Try direct Supabase query
        await fetchW9sDirect();
      }
    } catch (error) {
      console.error('Error fetching W-9s:', error);
      // Try direct query on error
      await fetchW9sDirect();
    } finally {
      setW9Loading(false);
    }
  };

  // Direct Supabase query for W-9s (bypasses API)
  const fetchW9sDirect = async () => {
    try {
      console.log('[Tax Admin] Fetching W-9s directly from Supabase...');
      
      const { data, error } = await supabase
        .from('tax_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Tax Admin] Direct query error:', error);
        return;
      }

      console.log('[Tax Admin] Direct query result:', data);

      if (data && data.length > 0) {
        // Map to expected format
        const mappedW9s = data.map((tp: any) => ({
          id: tp.id,
          user_id: tp.user_id,
          user_email: tp.user_id, // We don't have email in direct query
          full_name: tp.full_name,
          business_name: tp.business_name,
          tax_classification: tp.tax_classification,
          ssn_last4: tp.ssn_last4,
          ein: tp.ein,
          address_line1: tp.address_line1 || null,
          address_line2: tp.address_line2 || null,
          city: tp.city,
          state: tp.state,
          postal_code: tp.postal_code || null,
          signed_at: tp.signed_at || tp.created_at,
          is_verified: tp.is_verified || false,
          total_lifetime_earnings_cents: 0,
          needs_1099_current_year: false,
        }));
        setW9s(mappedW9s);
        console.log('[Tax Admin] Loaded', mappedW9s.length, 'W-9s directly');
      }
    } catch (err) {
      console.error('[Tax Admin] Direct query exception:', err);
    }
  };

  // ============================================================================
  // 1099 MANAGEMENT
  // ============================================================================

  const fetch1099s = async () => {
    setForm1099Loading(true);
    try {
      // Get fresh token
      let token = authToken;
      if (!token) {
        token = await getFreshToken();
      }

      if (!token) {
        console.log('[Tax Admin] No token for fetch1099s');
        setForm1099Loading(false);
        return;
      }

      const response = await fetch(
        `/api/tax/admin/w9s?needs_1099=true&limit=500`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const result = await response.json();
      if (result.success) {
        // Filter by users who have 1099s for the selected year
        const recordsWithDetails = result.data.map((w9: W9Record) => ({
          user_id: w9.user_id,
          user_email: w9.user_email,
          full_name: w9.full_name,
          tax_year: form1099Year,
          total_earnings_cents: w9.total_lifetime_earnings_cents,
          form_1099_generated_at: null,
          form_1099_delivery_status: 'not_generated',
          form_1099_pdf_url: null,
          form_1099_sent_at: null,
        }));
        setForm1099s(recordsWithDetails);
      }
    } catch (error) {
      console.error('Error fetching 1099s:', error);
    } finally {
      setForm1099Loading(false);
    }
  };

  // ============================================================================
  // QUICK ACTIONS
  // ============================================================================

  const generate1099s = async () => {
    if (!confirm(`Generate 1099s for tax year ${form1099Year}?`)) return;

    // Get fresh token
    let token = authToken;
    if (!token) {
      token = await getFreshToken();
    }

    if (!token) {
      alert('Please log in with rf32191@gmail.com');
      return;
    }

    try {
      const response = await fetch('/api/tax/admin/generate-1099s', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tax_year: form1099Year }),
      });

      const result = await response.json();
      alert(
        `1099 Generation Complete!\n\n` +
        `Success: ${result.stats?.success || 0}\n` +
        `Failed: ${result.stats?.failed || 0}\n` +
        `Total: ${result.stats?.total || 0}`
      );

      if (result.success) {
        fetch1099s(); // Refresh list
      }
    } catch (error) {
      alert('Failed to generate 1099s');
      console.error(error);
    }
  };

  const email1099s = async () => {
    if (!confirm(
      `Send 1099 notifications to ALL W-9 submitters for tax year ${form1099Year}?\n\n` +
      `This will send messages to their account dashboards.`
    )) return;

    try {
      // Use direct RPC to send 1099s
      const { data, error } = await supabase.rpc('admin_send_all_1099s', {
        p_tax_year: form1099Year
      });

      if (error) {
        console.error('RPC error:', error);
        alert(`Error: ${error.message}\n\nMake sure you've run SETUP_1099_SYSTEM.sql`);
        return;
      }

      console.log('1099 send result:', data);
      alert(
        `✅ 1099 Notifications Sent!\n\n` +
        `Sent: ${data?.sent_count || 0} messages\n` +
        `Errors: ${data?.errors?.length || 0}\n\n` +
        `Users will see their 1099 in their Messages.`
      );
    } catch (error) {
      console.error('Error sending 1099s:', error);
      alert('Failed to send 1099 notifications. Make sure SETUP_1099_SYSTEM.sql has been run.');
    }
  };

  const export1099s = () => {
    const url = `/api/tax/admin/export-1099s?tax_year=${form1099Year}&format=csv`;
    window.open(url, '_blank');
  };

  const downloadBackup = () => {
    const url = `/api/tax/admin/backup?format=json&tax_year=all`;
    window.open(url, '_blank');
  };

  const verifyIntegrity = async () => {
    // Get fresh token
    let token = authToken;
    if (!token) {
      token = await getFreshToken();
    }

    if (!token) {
      alert('Please log in to verify integrity');
      return;
    }

    try {
      const response = await fetch('/api/tax/admin/backup/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tax_year: form1099Year }),
      });

      const result = await response.json();
      alert(
        `Data Integrity Check - ${result.overall_status || 'Unknown'}\n\n` +
        `Passed: ${result.summary?.passed || 0}\n` +
        `Warnings: ${result.summary?.warnings || 0}\n` +
        `Failed: ${result.summary?.failed || 0}\n\n` +
        `${result.checks?.map((c: any) => `${c.check_name}: ${c.status}`).join('\n') || 'No details'}`
      );
    } catch (error) {
      alert('Failed to verify integrity');
      console.error(error);
    }
  };

  const downloadUserDocs = async (userId: string) => {
    // Get fresh token
    let token = authToken;
    if (!token) {
      token = await getFreshToken();
    }

    if (!token) {
      alert('Please log in');
      return;
    }
    
    try {
      const url = `/api/tax/admin/documents/${userId}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Download as JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `user-tax-docs-${userId}.json`;
        link.click();
        URL.revokeObjectURL(downloadUrl);
      } else {
        alert('Failed to download user documents');
      }
    } catch (error) {
      console.error('Error downloading docs:', error);
      alert('Failed to download user documents');
    }
  };

  const send1099ToUser = async (userId: string, userEmail: string) => {
    // Find the W-9 record to get the user's info
    const w9Record = w9s.find(w => w.user_id === userId);
    const userName = w9Record?.full_name || 'User';
    
    try {
      // Get user's current wallet balance from users table (won_tokens)
      const { data: userData } = await supabase
        .from('users')
        .select('won_tokens, tokens')
        .eq('id', userId)
        .single();

      // Get user's YTD withdrawals from tax_profiles
      const { data: taxProfileData } = await supabase
        .from('tax_profiles')
        .select('total_withdrawals_ytd, withdrawal_year')
        .eq('user_id', userId)
        .single();

      // Get user's total earnings from user_balances
      const { data: balanceData } = await supabase
        .from('user_balances')
        .select('total_earned, cash_balance')
        .eq('user_id', userId)
        .single();

      // Get completed withdrawals for the tax year
      const startOfYear = `${form1099Year}-01-01`;
      const endOfYear = `${form1099Year}-12-31`;
      
      const { data: withdrawals } = await supabase
        .from('withdrawal_requests')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('completed_at', startOfYear)
        .lte('completed_at', endOfYear);
      
      // Get marketplace winnings
      const { data: marketplaceWins } = await supabase
        .from('marketplace_sessions')
        .select('prize_pool')
        .eq('winner_user_id', userId)
        .eq('status', 'completed');

      // Calculate totals
      const walletBalance = Number(userData?.won_tokens || 0);
      const gameTokens = Number(userData?.tokens || 0);
      const taxProfileYTD = (taxProfileData?.withdrawal_year === form1099Year) 
        ? Number(taxProfileData?.total_withdrawals_ytd || 0) 
        : 0;
      const withdrawalTotal = withdrawals?.reduce((sum, w) => sum + Number(w.amount || 0), 0) || 0;
      const marketplaceTotal = marketplaceWins?.reduce((sum, m) => sum + Number(m.prize_pool || 0), 0) || 0;
      const totalEarnedLifetime = Number(balanceData?.total_earned || 0);
      const cashBalance = Number(balanceData?.cash_balance || 0);

      // For 1099, suggest the withdrawn amount (what they actually took out)
      // The 1099 reports money PAID to the user, not their current balance
      let suggestedAmount = taxProfileYTD > 0 ? taxProfileYTD : withdrawalTotal;
      
      // If no withdrawals, but they have marketplace winnings, use that
      if (suggestedAmount === 0 && marketplaceTotal > 0) {
        suggestedAmount = marketplaceTotal;
      }

      // Prompt admin to enter the 1099 amount
      const confirmedAmount = prompt(
        `📊 1099-NEC for ${userName}\n` +
        `Email: ${userEmail}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Tax Year: ${form1099Year}\n\n` +
        `💰 WALLET (Not Yet Withdrawn):\n` +
        `   Current Balance: $${walletBalance.toFixed(2)}\n` +
        `   Game Tokens: ${gameTokens}\n\n` +
        `📤 ACTUAL WITHDRAWALS (Report on 1099):\n` +
        `   ➤ YTD Withdrawn: $${taxProfileYTD.toFixed(2)}\n` +
        `   ➤ Completed Withdrawals: $${withdrawalTotal.toFixed(2)}\n\n` +
        `📈 OTHER EARNINGS DATA:\n` +
        `   Marketplace Wins: $${marketplaceTotal.toFixed(2)}\n` +
        `   Cash Balance: $${cashBalance.toFixed(2)}\n` +
        `   Lifetime Earned: $${totalEarnedLifetime.toFixed(2)}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `⚠️ IMPORTANT: 1099 = MONEY PAID OUT\n` +
        `   (Actual withdrawals, NOT wallet balance)\n\n` +
        `   User has withdrawn: $${Math.max(taxProfileYTD, withdrawalTotal).toFixed(2)}\n\n` +
        `ENTER AMOUNT FOR 1099:`,
        Math.max(taxProfileYTD, withdrawalTotal).toFixed(2)
      );

      if (!confirmedAmount) {
        return; // User cancelled
      }

      const finalAmount = parseFloat(confirmedAmount);
      if (isNaN(finalAmount) || finalAmount < 0) {
        alert('❌ Invalid amount entered');
        return;
      }

      if (finalAmount < 600) {
        const proceed = confirm(
          `⚠️ IRS Threshold Warning\n\n` +
          `The amount $${finalAmount.toFixed(2)} is below the $600 IRS reporting threshold.\n\n` +
          `1099-NEC forms are typically only required for payments of $600 or more.\n\n` +
          `Do you still want to send this 1099?`
        );
        if (!proceed) return;
      }

      // Build full address
      const fullAddress = w9Record ? 
        `${w9Record.address_line1 || ''}${w9Record.address_line2 ? ', ' + w9Record.address_line2 : ''}, ${w9Record.city || ''}, ${w9Record.state || ''} ${w9Record.postal_code || ''}` : 
        null;

      // Use direct RPC to send 1099 with actual amount
      const { data, error } = await supabase.rpc('send_1099_to_user', {
        p_user_id: userId,
        p_full_name: userName,
        p_amount: finalAmount,
        p_tax_year: form1099Year,
        p_ssn_last4: w9Record?.ssn_last4 || null,
        p_address: fullAddress
      });

      if (error) {
        console.error('RPC error:', error);
        alert(`❌ Failed: ${error.message}\n\nMake sure SETUP_1099_SYSTEM.sql has been run.`);
        return;
      }

      console.log('Send 1099 result:', data);
      
      if (data?.success) {
        alert(
          `✅ 1099-NEC Sent Successfully!\n\n` +
          `Recipient: ${userName}\n` +
          `Email: ${userEmail}\n` +
          `Box 1 Amount: $${finalAmount.toFixed(2)}\n` +
          `Tax Year: ${form1099Year}\n\n` +
          `The user will see this in their Dashboard → Messages tab\n` +
          `and can download the PDF.`
        );
        // Refresh data
        fetch1099s();
      } else {
        alert(`❌ Failed: ${data?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending 1099:', error);
      alert('Failed to send 1099 notification. Make sure SETUP_1099_SYSTEM.sql has been run.');
    }
  };

  // Load data when auth is ready
  useEffect(() => {
    if (isAuthReady && authToken) {
      console.log('[Tax Admin] Auth ready, fetching data...');
      // Try direct query first (more reliable)
      fetchW9sDirect();
      fetch1099s();
    }
  }, [isAuthReady, authToken]);

  // Also auto-load on mount after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (w9s.length === 0) {
        console.log('[Tax Admin] Auto-loading W-9s...');
        fetchW9sDirect();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-5xl font-bold mb-2 text-gray-900">🧾 Tax Administration</h1>
        <p className="text-gray-600 mb-4">Manage W-9 forms, 1099 documents, and tax compliance</p>
        
        {/* Auth Status & Login */}
        {!isAuthReady ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8 bg-yellow-100 text-yellow-800">
            ⏳ Loading authentication...
          </div>
        ) : authToken ? (
          <div className="flex items-center gap-4 mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800">
              ✅ Logged in as: {currentUserEmail}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">🔐 Admin Login Required</h2>
            <p className="text-gray-600 mb-6">
              Please log in with your admin credentials to access tax management.
            </p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="rf32191@gmail.com"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                />
              </div>

              {loginError && (
                <div className="p-3 bg-red-100 text-red-700 rounded-xl text-sm">
                  ❌ {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {loginLoading ? 'Logging in...' : '🔓 Log In to Tax Admin'}
              </button>
            </form>
          </div>
        )}

        {/* Only show content when authenticated */}
        {authToken && (
          <>
        {/* ====================================================================== */}
        {/* ADMIN TEST SECTION */}
        {/* ====================================================================== */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl shadow-2xl p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">🧪 Admin Test Zone</h2>
          <p className="text-purple-100 mb-6">
            Test the complete W-9 and 1099 flow for your admin account ({adminEmail})
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Submit W-9 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold mb-3">📋 Step 1: Submit Your W-9</h3>
              <p className="text-purple-100 text-sm mb-4">
                Fill out your W-9 form as an admin to test the submission flow.
              </p>
              <button
                onClick={handleAdminW9Submit}
                className="w-full px-6 py-4 bg-white text-purple-600 font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Fill Out Admin W-9 Form
              </button>
            </div>

            {/* Generate Test 1099 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold mb-3">📧 Step 2: Generate Test 1099</h3>
              <p className="text-purple-100 text-sm mb-4">
                Enter an amount and generate a test 1099 sent to your account notifications.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  Withdrawal Amount (cents)
                </label>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  placeholder="100000"
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:border-white focus:outline-none"
                />
                <p className="text-xs text-purple-100 mt-1">
                  ${(parseInt(testAmount || '0') / 100).toFixed(2)} (e.g., 100000 = $1,000.00)
                </p>
              </div>

              <button
                onClick={handleGenerateTest1099}
                disabled={testLoading}
                className="w-full px-6 py-4 bg-white text-purple-600 font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testLoading ? 'Generating...' : '🚀 Generate & Email Test 1099'}
              </button>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`mt-6 p-6 rounded-2xl ${
              testResult.includes('✅') 
                ? 'bg-green-500/20 border border-green-300/50' 
                : 'bg-red-500/20 border border-red-300/50'
            }`}>
              <pre className="text-sm whitespace-pre-wrap font-mono">{testResult}</pre>
            </div>
          )}
        </div>

        {/* ====================================================================== */}
        {/* QUICK ACTIONS */}
        {/* ====================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={downloadBackup}
            className="px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            📥 Download Backup
          </button>

          <button
            onClick={verifyIntegrity}
            className="px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            ✅ Verify Integrity
          </button>

          <button
            onClick={generate1099s}
            className="px-6 py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            📄 Generate 1099s
          </button>

          <button
            onClick={email1099s}
            className="px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            📨 Message 1099s to Users
          </button>
        </div>

        {/* ====================================================================== */}
        {/* W-9 DOCUMENTS SECTION */}
        {/* ====================================================================== */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">📋 All W-9 Documents</h2>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                w9s.length > 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {w9s.length} records loaded
              </span>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2">
              <input
                type="text"
                value={w9Search}
                onChange={(e) => setW9Search(e.target.value)}
                placeholder="Search by name, email, SSN last 4, or EIN..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>

            <select
              value={w9Filter}
              onChange={(e) => setW9Filter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All W-9s</option>
              <option value="needs_1099">Needs 1099 (This Year)</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={fetchW9s}
              disabled={w9Loading}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {w9Loading ? 'Loading...' : '🔍 Search via API'}
            </button>
            
            <button
              onClick={fetchW9sDirect}
              disabled={w9Loading}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
            >
              📊 Load Direct from Database
            </button>
            
            <span className="flex items-center text-gray-500 text-sm">
              Found: {w9s.length} records
            </span>
          </div>
          
          {/* Note: SSN is already masked - only last 4 digits shown */}

          {/* W-9 Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tax ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Earnings</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {w9s.map((w9) => (
                  <tr key={w9.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{w9.full_name}</div>
                      {w9.business_name && (
                        <div className="text-sm text-gray-500">{w9.business_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{w9.user_email}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-700">
                      {w9.ssn_last4 ? `***-**-${w9.ssn_last4}` : w9.ein || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ${(w9.total_lifetime_earnings_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {w9.needs_1099_current_year && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                            Needs 1099
                          </span>
                        )}
                        {w9.is_verified && (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            Verified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            alert(
                              `📋 W-9 DETAILS\n\n` +
                              `Name: ${w9.full_name}\n` +
                              `Business: ${w9.business_name || 'N/A'}\n` +
                              `Tax Class: ${w9.tax_classification}\n` +
                              `SSN Last 4: ***-**-${w9.ssn_last4 || 'N/A'}\n` +
                              `EIN: ${w9.ein || 'N/A'}\n` +
                              `City: ${w9.city}\n` +
                              `State: ${w9.state}\n` +
                              `Signed: ${w9.signed_at ? new Date(w9.signed_at).toLocaleDateString() : 'N/A'}`
                            );
                          }}
                          className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-xs font-semibold transition-all"
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => send1099ToUser(w9.user_id, w9.user_email)}
                          className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold transition-all"
                        >
                          📨 Send 1099
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {w9s.length === 0 && !w9Loading && (
              <div className="p-8 text-center text-gray-500">
                No W-9 records found. Try adjusting your search or filters.
              </div>
            )}
          </div>
        </div>

        {/* ====================================================================== */}
        {/* 1099 DOCUMENTS SECTION */}
        {/* ====================================================================== */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">📊 1099-NEC Documents</h2>
            
            <div className="flex items-center gap-4">
              <label className="font-semibold text-gray-700">Tax Year:</label>
              <select
                value={form1099Year}
                onChange={(e) => {
                  setForm1099Year(parseInt(e.target.value));
                  setTimeout(() => fetch1099s(), 100);
                }}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              >
                {[2024, 2023, 2022, 2021].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <button
                onClick={export1099s}
                className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition-all"
              >
                📊 Export CSV
              </button>
            </div>
          </div>

          {/* 1099 Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Recipient</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Sent</th>
                </tr>
              </thead>
              <tbody>
                {form1099s.map((form, idx) => (
                  <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">{form.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{form.user_email}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ${(form.total_earnings_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        form.form_1099_delivery_status === 'sent_email' 
                          ? 'bg-green-100 text-green-800'
                          : form.form_1099_delivery_status === 'generated'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {form.form_1099_delivery_status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {form.form_1099_sent_at 
                        ? new Date(form.form_1099_sent_at).toLocaleDateString()
                        : 'Not sent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {form1099s.length === 0 && !form1099Loading && (
              <div className="p-8 text-center text-gray-500">
                No 1099 records for {form1099Year}. Generate 1099s using the button above.
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </div>

      {/* ====================================================================== */}
      {/* AD CAMPAIGNS SECTION */}
      {/* ====================================================================== */}
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-purple-500/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white">📢 Ad Campaigns Management</h2>
            <p className="text-gray-300 mt-2">Approve, monitor, and manage advertising campaigns</p>
          </div>
        </div>

        <AdCampaignManagement />
      </div>

      {/* W-9 Modal */}
      <W9OnboardingModal
        isOpen={showW9Modal}
        onClose={() => setShowW9Modal(false)}
        onSuccess={() => {
          setShowW9Modal(false);
          alert('✅ W-9 submitted successfully! Now you can generate a test 1099.');
          fetchW9s(); // Refresh W-9 list
        }}
        isBlocking={false}
      />
    </div>
  );
}

