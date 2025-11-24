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

interface W9Record {
  id: string;
  user_id: string;
  user_email: string;
  full_name: string;
  business_name: string | null;
  tax_classification: string;
  ssn_last4: string;
  ein: string | null;
  city: string;
  state: string;
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
  
  const supabase = createClientComponentClient();

  // Get auth token on mount
  useEffect(() => {
    const getToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setAuthToken(session.access_token);
      }
    };
    getToken();
  }, []);

  // ============================================================================
  // TEST SECTION - Admin W-9 & 1099 Testing
  // ============================================================================

  const handleAdminW9Submit = () => {
    setShowW9Modal(true);
  };

  const handleGenerateTest1099 = async () => {
    if (!testAmount || parseInt(testAmount) <= 0) {
      alert('Please enter a valid withdrawal amount');
      return;
    }

    if (!authToken) {
      alert('Please log in with rf32191@gmail.com to access this feature');
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/tax/admin/test-1099', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
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
      if (!authToken) {
        alert('Please log in with rf32191@gmail.com to access admin features');
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
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setW9s(result.data);
      } else {
        alert(`Failed to fetch W-9s: ${result.error}`);
      }
    } catch (error) {
      console.error('Error fetching W-9s:', error);
      alert('Failed to fetch W-9 records');
    } finally {
      setW9Loading(false);
    }
  };

  const downloadUserDocs = (userId: string) => {
    const url = `/api/tax/admin/documents/${userId}?format=json`;
    window.open(url, '_blank');
  };

  // ============================================================================
  // 1099 MANAGEMENT
  // ============================================================================

  const fetch1099s = async () => {
    setForm1099Loading(true);
    try {
      if (!authToken) return;

      const response = await fetch(
        `/api/tax/admin/w9s?needs_1099=true&limit=500`,
        { headers: { 'Authorization': `Bearer ${authToken}` } }
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

    if (!authToken) {
      alert('Please log in with rf32191@gmail.com');
      return;
    }

    try {
      const response = await fetch('/api/tax/admin/generate-1099s', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ tax_year: form1099Year }),
      });

      const result = await response.json();
      alert(
        `1099 Generation Complete!\n\n` +
        `Success: ${result.stats.success}\n` +
        `Failed: ${result.stats.failed}\n` +
        `Total: ${result.stats.total}`
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
      `Send 1099 notifications to all users for tax year ${form1099Year}?\n\n` +
      `This will send messages to their account dashboards (not email).`
    )) return;

    if (!authToken) {
      alert('Please log in with rf32191@gmail.com');
      return;
    }

    try {
      const response = await fetch('/api/tax/admin/email-1099s', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ tax_year: form1099Year }),
      });

      const result = await response.json();
      alert(
        `Notification Delivery Complete!\n\n` +
        `✅ Sent to user accounts: ${result.stats.success}\n` +
        `❌ Failed: ${result.stats.failed}\n` +
        `📊 Total: ${result.stats.total}\n\n` +
        `Users can view their 1099s in their account dashboard.`
      );
    } catch (error) {
      alert('Failed to send 1099 notifications');
      console.error(error);
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
    try {
      const response = await fetch('/api/tax/admin/backup/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ tax_year: form1099Year }),
      });

      const result = await response.json();
      alert(
        `Data Integrity Check - ${result.overall_status}\n\n` +
        `Passed: ${result.summary.passed}\n` +
        `Warnings: ${result.summary.warnings}\n` +
        `Failed: ${result.summary.failed}\n\n` +
        `${result.checks.map((c: any) => `${c.check_name}: ${c.status}`).join('\n')}`
      );
    } catch (error) {
      alert('Failed to verify integrity');
      console.error(error);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchW9s();
    fetch1099s();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-5xl font-bold mb-2 text-gray-900">🧾 Tax Administration</h1>
        <p className="text-gray-600 mb-8">Manage W-9 forms, 1099 documents, and tax compliance</p>

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
          <h2 className="text-3xl font-bold mb-6">📋 All W-9 Documents</h2>

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

          <button
            onClick={fetchW9s}
            disabled={w9Loading}
            className="mb-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          >
            {w9Loading ? 'Loading...' : '🔍 Search'}
          </button>

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
                      <button
                        onClick={() => downloadUserDocs(w9.user_id)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-all"
                      >
                        📥 Download
                      </button>
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

