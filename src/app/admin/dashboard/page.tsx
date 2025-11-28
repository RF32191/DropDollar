'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import PageWalletDisplay from '@/components/wallet/PageWalletDisplay';
import ShippingTrackingPanel from '@/components/admin/ShippingTrackingPanel';
import ListingManagementPanel from '@/components/admin/ListingManagementPanel';
import {
  ShieldCheckIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BellIcon,
  ChartBarIcon,
  TruckIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  IdentificationIcon,
  DocumentDuplicateIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';

// Dynamically import admin tax dashboard
const AdminTaxDashboard = dynamic(() => import('@/app/admin/tax/page').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="text-white">Loading tax dashboard...</div>
});

interface PendingSeller {
  id: string;
  user_id: string;
  username: string;
  email: string;
  business_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  username: string;
  email: string;
  game_type: string;
  game_mode: string;
  score: number;
  score_rating: number;
  accuracy: number;
  reaction_time: number;
  duration_seconds: number;
  cheat_score: number;
  threat_level: string;
  suspicious: boolean;
  suspicious_reasons: string[];
  ip_address: string;
  created_at: string;
}

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
}

interface SellerVerification {
  seller_id: string;
  user_id: string;
  username: string;
  email: string;
  shop_name: string;
  shop_description: string;
  business_name: string;
  business_type: string;
  full_legal_name: string;
  date_of_birth: string;
  ssn_last4: string;
  contact_email: string;
  contact_phone: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  dl_front_url: string;
  dl_back_url: string;
  selfie_url: string;
  status: string;
  registration_step: number;
  risk_score: number;
  risk_flags: string[];
  identity_verified: boolean;
  verified: boolean;
  documents_count: number;
  submitted_at: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Password protection
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const ADMIN_PASSWORD = '321SnoopDog1994321!';
  
  // Secondary password for sensitive tabs (Tax, Verification)
  const [isSensitiveTabsUnlocked, setIsSensitiveTabsUnlocked] = useState(false);
  const [sensitivePasswordInput, setSensitivePasswordInput] = useState('');
  const [sensitivePasswordError, setSensitivePasswordError] = useState('');
  const SENSITIVE_TABS_PASSWORD = '124816SnoopDog';
  
  const [activeTab, setActiveTab] = useState<'sellers' | 'audits' | 'notifications' | 'tracking' | 'listings' | 'tax' | 'verification'>('sellers');
  const [pendingSellers, setPendingSellers] = useState<PendingSeller[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [sellerVerifications, setSellerVerifications] = useState<SellerVerification[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      checkAdminStatus();
    }
  }, [isAuthenticated]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsPasswordVerified(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
      setPasswordInput('');
    }
  };

  const handleSensitivePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sensitivePasswordInput === SENSITIVE_TABS_PASSWORD) {
      setIsSensitiveTabsUnlocked(true);
      setSensitivePasswordError('');
    } else {
      setSensitivePasswordError('Incorrect password');
      setSensitivePasswordInput('');
    }
  };

  const checkAdminStatus = async () => {
    try {
      setIsLoading(true);
      
      // Check if user email is rf32191@gmail.com or rf32191@yahoo.com
      const isMasterAdmin = user?.email === 'rf32191@gmail.com' || user?.email === 'rf32191@yahoo.com';
      
      if (isMasterAdmin) {
        // Master admin - set permissions manually
        setIsAdmin(true);
        setAdminRole('master_admin');
        setPermissions({
          is_admin: true,
          role: 'master_admin',
          can_approve_sellers: true,
          can_review_audits: true,
          can_ban_users: true,
          can_manage_admins: true
        });
        
        await loadPendingSellers();
        await loadAuditLogs();
        await loadSellerVerifications();
      } else {
        // Try RPC for other potential admins
        const { data, error } = await supabase.rpc('check_admin_status');
        
        if (error) throw error;
        
        if (data?.is_admin) {
          setIsAdmin(true);
          setAdminRole(data.role);
          setPermissions(data);
          
          if (data.can_approve_sellers) {
            await loadPendingSellers();
          }
          if (data.can_review_audits) {
            await loadAuditLogs();
          }
        } else {
          setIsAdmin(false);
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingSellers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_pending_sellers');
      
      if (error) throw error;
      
      setPendingSellers(data || []);
    } catch (error) {
      console.error('Error loading pending sellers:', error);
    }
  };

  const loadAuditLogs = async () => {
    console.log('🔍 Loading audit logs...');
    try {
      // Query the game_audit_log table directly
      const { data, error } = await supabase
        .from('game_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('❌ Error loading from game_audit_log table:', error);
        console.log('📋 Error details:', {
          message: error.message,
          code: error.code,
          hint: error.hint
        });
        
        // If table doesn't exist, show helpful message
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.error('🚨 TABLE DOES NOT EXIST! You need to deploy the SQL file first!');
          console.error('📦 Deploy this file: DEPLOY_AUDIT_NO_DEADLOCK.sql');
        }
        throw error;
      }
      
      setAuditLogs(data || []);
      console.log('✅ Successfully loaded', data?.length || 0, 'audit logs from game_audit_log table');
      console.log('📊 Sample audit log:', data?.[0]);
    } catch (error: any) {
      console.error('❌ Failed to load audit logs:', error);
      
      // Try the view as fallback
      console.log('🔄 Trying to load from view instead...');
      try {
        const { data: viewData, error: viewError } = await supabase
          .from('admin_detailed_audit_view')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (viewError) {
          console.error('❌ View also failed:', viewError);
          console.log('🚨 AUDIT SYSTEM NOT DEPLOYED!');
          console.log('📦 You must deploy: DEPLOY_AUDIT_NO_DEADLOCK.sql');
          setAuditLogs([]);
        } else if (viewData) {
          setAuditLogs(viewData);
          console.log('✅ Loaded', viewData.length, 'audit logs from view');
        }
      } catch (viewErr) {
        console.error('❌ Both table and view failed. Audit system not deployed.');
        setAuditLogs([]);
      }
    }
  };

  const loadSellerVerifications = async () => {
    try {
      // Load ALL seller registrations (step 6+ or any status)
      const { data: sellersData, error: sellersError } = await supabase
        .from('seller_profiles')
        .select(`
          id,
          user_id,
          shop_name,
          shop_description,
          business_name,
          business_type,
          full_legal_name,
          date_of_birth,
          ssn_last4,
          dl_front_url,
          dl_back_url,
          selfie_url,
          contact_email,
          contact_phone,
          address_line1,
          city,
          state,
          postal_code,
          status,
          registration_step,
          submitted_at,
          identity_verified,
          verified,
          created_at
        `)
        .gte('registration_step', 1)
        .order('created_at', { ascending: false })
        .limit(100);

      if (sellersError) throw sellersError;

      // Load risk scores
      const { data: riskData, error: riskError } = await supabase
        .from('seller_risk_scores')
        .select('seller_id, overall_risk_score, risk_flags');

      // Load document counts
      const { data: docsData, error: docsError } = await supabase
        .from('seller_documents')
        .select('seller_id');

      // Combine the data
      const verifications = await Promise.all((sellersData || []).map(async (seller) => {
        // Get user info
        const { data: userData } = await supabase
          .from('users')
          .select('username, email')
          .eq('id', seller.user_id)
          .single();

        const risk = riskData?.find(r => r.seller_id === seller.id);
        const docCount = docsData?.filter(d => d.seller_id === seller.id).length || 0;

        return {
          seller_id: seller.id,
          user_id: seller.user_id,
          username: userData?.username || 'Unknown',
          email: userData?.email || 'No email',
          shop_name: seller.shop_name || 'No shop name',
          shop_description: seller.shop_description || '',
          business_name: seller.business_name || '',
          business_type: seller.business_type || '',
          full_legal_name: seller.full_legal_name || '',
          date_of_birth: seller.date_of_birth || '',
          ssn_last4: seller.ssn_last4 || '',
          dl_front_url: seller.dl_front_url || '',
          dl_back_url: seller.dl_back_url || '',
          selfie_url: seller.selfie_url || '',
          contact_email: seller.contact_email || '',
          contact_phone: seller.contact_phone || '',
          address_line1: seller.address_line1 || '',
          city: seller.city || '',
          state: seller.state || '',
          postal_code: seller.postal_code || '',
          status: seller.status || 'pending',
          registration_step: seller.registration_step || 0,
          submitted_at: seller.submitted_at || seller.created_at,
          risk_score: risk?.overall_risk_score || 0,
          risk_flags: risk?.risk_flags || [],
          identity_verified: seller.identity_verified || false,
          verified: seller.verified || false,
          documents_count: docCount,
          created_at: seller.created_at
        };
      }));

      setSellerVerifications(verifications);
    } catch (error) {
      console.error('Error loading seller verifications:', error);
    }
  };

  const handleApproveSeller = async (sellerId: string) => {
    try {
      const { data, error } = await supabase.rpc('approve_seller', {
        seller_profile_id_param: sellerId,
        notes_param: 'Approved by admin'
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setMessage({ type: 'success', text: 'Seller approved successfully!' });
        await loadPendingSellers();
      } else {
        throw new Error(data?.message || 'Failed to approve seller');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to approve seller' });
    }
  };

  const handleRejectSeller = async (sellerId: string) => {
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return; // User cancelled
    
    try {
      const { data, error } = await supabase.rpc('reject_seller', {
        seller_profile_id_param: sellerId,
        reason_param: reason || 'Application rejected by admin'
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setMessage({ type: 'success', text: 'Seller application rejected' });
        await loadPendingSellers();
      } else {
        throw new Error(data?.message || 'Failed to reject seller');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to reject seller' });
    }
  };

  const handleDeleteAuditLog = async (auditId: string) => {
    if (!confirm('Are you sure you want to delete this audit log?')) return;
    
    try {
      const { error } = await supabase
        .from('game_audit_log')
        .delete()
        .eq('id', auditId);
      
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Audit log deleted successfully!' });
      // Remove from local state immediately for better UX
      setAuditLogs(prev => prev.filter(log => log.id !== auditId));
    } catch (error: any) {
      console.error('Error deleting audit log:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to delete audit log' });
    }
  };

  const handleClearAllAuditLogs = async () => {
    const confirmText = prompt('Type "DELETE ALL" to confirm clearing all audit logs:');
    if (confirmText !== 'DELETE ALL') {
      setMessage({ type: 'error', text: 'Deletion cancelled - confirmation text did not match.' });
      return;
    }
    
    try {
      // Delete all audit logs
      const { error } = await supabase
        .from('game_audit_log')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // This deletes all rows
      
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'All audit logs cleared successfully!' });
      setAuditLogs([]);
    } catch (error: any) {
      console.error('Error clearing audit logs:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to clear audit logs' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg">Loading admin dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
              <p className="text-gray-300 mb-6">You don't have admin permissions to view this page.</p>
              <a href="/" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold">
                Go Home
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Password verification screen for admin
  if (isAdmin && !isPasswordVerified) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 w-full max-w-md">
              <div className="text-center mb-6">
                <ShieldCheckIcon className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold mb-2">Admin Access</h1>
                <p className="text-gray-300">Enter admin password to continue</p>
              </div>
              
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-red-400 text-sm mt-2">{passwordError}</p>
                  )}
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                >
                  Enter Admin Dashboard
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <PageWalletDisplay />
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
                <ShieldCheckIcon className="w-10 h-10 mr-3 text-blue-400" />
                Admin Dashboard
              </h1>
              <p className="text-gray-300">
                Role: <span className="font-bold text-blue-400">{adminRole}</span>
                {permissions?.email && ` • ${permissions.email}`}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-blue-600 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">{pendingSellers.length}</div>
                <div className="text-sm">Pending Sellers</div>
              </div>
              <div className="bg-red-600 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">{auditLogs.length}</div>
                <div className="text-sm">Audit Alerts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-900/20 border border-green-700 text-green-300' 
              : 'bg-red-900/20 border border-red-700 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-700">
          <div className="flex space-x-4">
            {permissions?.can_approve_sellers && (
              <button
                onClick={() => setActiveTab('sellers')}
                className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'sellers'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <UserGroupIcon className="inline h-5 w-5 mr-2" />
                Pending Sellers ({pendingSellers.length})
              </button>
            )}
            {permissions?.can_review_audits && (
              <button
                onClick={() => setActiveTab('audits')}
                className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'audits'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <ExclamationTriangleIcon className="inline h-5 w-5 mr-2" />
                Audit Logs ({auditLogs.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('tracking')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'tracking'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <TruckIcon className="inline h-5 w-5 mr-2" />
              Shipping Tracking
            </button>
            <button
              onClick={() => setActiveTab('listings')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'listings'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <ShoppingBagIcon className="inline h-5 w-5 mr-2" />
              Manage Listings
            </button>
            <button
              onClick={() => setActiveTab('tax')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'tax'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <DocumentTextIcon className="inline h-5 w-5 mr-2" />
              W-9 & 1099 Tax
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'verification'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <IdentificationIcon className="inline h-5 w-5 mr-2" />
              Seller Verification
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'sellers' && permissions?.can_approve_sellers && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Pending Seller Applications</h2>
            
            {pendingSellers.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <CheckCircleIcon className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <p className="text-xl text-gray-300">All caught up! No pending sellers.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSellers.map((seller) => (
                  <div key={seller.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">
                          {seller.username}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-400">Email</p>
                            <p className="text-white">{seller.email}</p>
                          </div>
                          {seller.business_name && (
                            <div>
                              <p className="text-sm text-gray-400">Business Name</p>
                              <p className="text-white">{seller.business_name}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-gray-400">Contact Email</p>
                            <p className="text-white">{seller.contact_email}</p>
                          </div>
                          {seller.contact_phone && (
                            <div>
                              <p className="text-sm text-gray-400">Contact Phone</p>
                              <p className="text-white">{seller.contact_phone}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-gray-400">Applied</p>
                            <p className="text-white flex items-center">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              {new Date(seller.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 ml-4">
                        <button
                          onClick={() => handleApproveSeller(seller.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center"
                        >
                          <CheckCircleIcon className="h-5 w-5 mr-2" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectSeller(seller.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center"
                        >
                          <XCircleIcon className="h-5 w-5 mr-2" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'audits' && permissions?.can_review_audits && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center">
                <ChartBarIcon className="h-8 w-8 mr-3 text-blue-400" />
                Game Audit Logs - All Games
                <span className="ml-4 text-sm text-gray-400">({auditLogs.length} games)</span>
              </h2>
              
              {auditLogs.length > 0 && (
                <button
                  onClick={handleClearAllAuditLogs}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  <TrashIcon className="h-5 w-5" />
                  Clear All Logs
                </button>
              )}
            </div>
            
            {/* 🔥 TEST BUTTON - Click to test if audit logging works */}
            <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
              <p className="text-yellow-400 font-bold mb-2">🔧 Debug: Test Audit Function</p>
              <button
                onClick={async () => {
                  console.log('🧪 TEST BUTTON CLICKED - Testing audit function...');
                  try {
                    // Get current user
                    const { data: { user } } = await supabase.auth.getUser();
                    console.log('🧪 Current user:', user?.email || 'NOT LOGGED IN');
                    
                    // Call the RPC function directly
                    const { data, error } = await supabase.rpc('frontend_log_game_completion', {
                      p_game_type: 'ADMIN_TEST_BUTTON',
                      p_game_mode: 'test',
                      p_score: Math.floor(Math.random() * 1000) + 100,
                      p_accuracy: 85.5,
                      p_reaction_time: 200,
                      p_duration_seconds: 30,
                      p_additional_data: { test: true, timestamp: new Date().toISOString() }
                    });
                    
                    if (error) {
                      console.error('❌ TEST FAILED:', error);
                      alert('❌ TEST FAILED: ' + error.message);
                    } else {
                      console.log('✅ TEST SUCCESS:', data);
                      alert('✅ TEST SUCCESS! Check console for details. Refresh page to see new log.');
                      // Reload audit logs
                      window.location.reload();
                    }
                  } catch (err) {
                    console.error('❌ TEST ERROR:', err);
                    alert('❌ TEST ERROR: ' + (err instanceof Error ? err.message : 'Unknown error'));
                  }
                }}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg transition-colors"
              >
                🧪 Test Audit Function Now
              </button>
              <p className="text-yellow-300/70 text-sm mt-2">
                Click this button to test if the audit SQL function is working. Check browser console for details.
              </p>
            </div>
            
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <CheckCircleIcon className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <p className="text-xl text-gray-300">No games played yet!</p>
                <p className="text-sm text-gray-500 mt-2">Game results will appear here automatically</p>
              </div>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((audit) => (
                  <div key={audit.id} className={`rounded-lg p-6 border ${
                    audit.threat_level === 'CRITICAL' 
                      ? 'bg-red-900/20 border-red-700' 
                      : audit.threat_level === 'HIGH'
                      ? 'bg-orange-900/20 border-orange-700'
                      : audit.threat_level === 'MEDIUM'
                      ? 'bg-yellow-900/20 border-yellow-700'
                      : audit.threat_level === 'LOW'
                      ? 'bg-blue-900/20 border-blue-700'
                      : 'bg-green-900/20 border-green-700'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          {audit.suspicious ? (
                            <ExclamationTriangleIcon className={`h-6 w-6 mr-2 ${
                              audit.threat_level === 'CRITICAL' ? 'text-red-400' :
                              audit.threat_level === 'HIGH' ? 'text-orange-400' :
                              'text-yellow-400'
                            }`} />
                          ) : (
                            <CheckCircleIcon className="h-6 w-6 mr-2 text-green-400" />
                          )}
                          <h3 className="text-xl font-bold text-white">
                            {audit.username || 'Unknown'}
                          </h3>
                          <span className="mx-2 text-gray-500">•</span>
                          <span className="text-blue-400">{audit.game_type}</span>
                          <span className="mx-2 text-gray-500">•</span>
                          <span className="text-gray-400 text-sm">{audit.game_mode}</span>
                          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
                            audit.threat_level === 'CRITICAL' ? 'bg-red-600' :
                            audit.threat_level === 'HIGH' ? 'bg-orange-600' :
                            audit.threat_level === 'MEDIUM' ? 'bg-yellow-600' :
                            audit.threat_level === 'LOW' ? 'bg-blue-600' :
                            'bg-green-600'
                          }`}>
                            {audit.threat_level || 'CLEAN'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-3 mb-3">
                          <div className="bg-gray-800/50 rounded p-2">
                            <p className="text-xs text-gray-400">Score</p>
                            <p className="text-lg font-bold text-white">{audit.score}</p>
                          </div>
                          <div className="bg-gray-800/50 rounded p-2">
                            <p className="text-xs text-gray-400">Rating</p>
                            <p className="text-lg font-bold text-blue-400">{audit.score_rating?.toFixed(1) || '0'}/10</p>
                          </div>
                          <div className="bg-gray-800/50 rounded p-2">
                            <p className="text-xs text-gray-400">Accuracy</p>
                            <p className="text-lg font-bold text-white">{audit.accuracy?.toFixed(1) || '0'}%</p>
                          </div>
                          <div className="bg-gray-800/50 rounded p-2">
                            <p className="text-xs text-gray-400">Cheat Score</p>
                            <p className={`text-lg font-bold ${
                              (audit.cheat_score || 0) >= 60 ? 'text-red-400' :
                              (audit.cheat_score || 0) >= 40 ? 'text-yellow-400' :
                              'text-green-400'
                            }`}>
                              {audit.cheat_score?.toFixed(0) || '0'}
                            </p>
                          </div>
                        </div>

                        <div className="text-sm text-gray-400 mb-2">
                          <span>Duration: {audit.duration_seconds}s</span>
                          {audit.reaction_time && <span className="ml-4">Reaction: {audit.reaction_time.toFixed(2)}ms</span>}
                          <span className="ml-4">{new Date(audit.created_at).toLocaleString()}</span>
                        </div>

                        {audit.suspicious && audit.suspicious_reasons && audit.suspicious_reasons.length > 0 && (
                          <div className="mt-2 p-2 bg-red-900/30 rounded">
                            <p className="text-xs text-red-300 font-semibold mb-1">🚨 Suspicious:</p>
                            <div className="flex flex-wrap gap-1">
                              {audit.suspicious_reasons.map((reason, index) => (
                                <span key={index} className="bg-red-900/60 text-red-200 px-2 py-1 rounded text-xs">
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Delete Button */}
                      <div className="ml-4 flex flex-col gap-2">
                        <button
                          onClick={() => handleDeleteAuditLog(audit.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600 border border-red-600 text-red-400 hover:text-white rounded-lg font-medium transition-all"
                          title="Delete this audit log"
                        >
                          <TrashIcon className="h-5 w-5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Shipping Tracking Tab */}
        {activeTab === 'tracking' && (
          <ShippingTrackingPanel />
        )}
        
        {/* Listing Management Tab */}
        {activeTab === 'listings' && (
          <ListingManagementPanel />
        )}
        
        {/* Tax Management Tab - Password Protected */}
        {activeTab === 'tax' && (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <DocumentTextIcon className="w-6 h-6 mr-2 text-blue-400" />
              W-9 & 1099 Tax Management
              {!isSensitiveTabsUnlocked && <span className="ml-2 text-sm text-yellow-400">🔒 Locked</span>}
            </h2>
            {!isSensitiveTabsUnlocked ? (
              <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">🔐</div>
                  <h3 className="text-xl font-bold text-white">Sensitive Data Protection</h3>
                  <p className="text-gray-400 mt-2">Enter password to access tax documents</p>
                </div>
                <form onSubmit={handleSensitivePasswordSubmit}>
                  <input
                    type="password"
                    value={sensitivePasswordInput}
                    onChange={(e) => setSensitivePasswordInput(e.target.value)}
                    placeholder="Enter sensitive data password"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4"
                  />
                  {sensitivePasswordError && (
                    <p className="text-red-400 text-sm mb-4">{sensitivePasswordError}</p>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold"
                  >
                    Unlock Tax Documents
                  </button>
                </form>
              </div>
            ) : (
              <AdminTaxDashboard />
            )}
          </div>
        )}

        {/* Seller Verification Tab - Password Protected */}
        {activeTab === 'verification' && (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <IdentificationIcon className="w-6 h-6 mr-2 text-green-400" />
              Seller Verification & Risk Management
              {!isSensitiveTabsUnlocked && <span className="ml-2 text-sm text-yellow-400">🔒 Locked</span>}
            </h2>
            
            {!isSensitiveTabsUnlocked ? (
              <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">🔐</div>
                  <h3 className="text-xl font-bold text-white">Sensitive Data Protection</h3>
                  <p className="text-gray-400 mt-2">Enter password to access seller verification data</p>
                </div>
                <form onSubmit={handleSensitivePasswordSubmit}>
                  <input
                    type="password"
                    value={sensitivePasswordInput}
                    onChange={(e) => setSensitivePasswordInput(e.target.value)}
                    placeholder="Enter sensitive data password"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4"
                  />
                  {sensitivePasswordError && (
                    <p className="text-red-400 text-sm mb-4">{sensitivePasswordError}</p>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold"
                  >
                    Unlock Seller Verification
                  </button>
                </form>
              </div>
            ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-600 rounded-lg p-4">
                <div className="text-2xl font-bold">
                  {sellerVerifications.filter(s => s.identity_verified).length}
                </div>
                <div className="text-sm">Verified Sellers</div>
              </div>
              <div className="bg-yellow-600 rounded-lg p-4">
                <div className="text-2xl font-bold">
                  {sellerVerifications.filter(s => !s.identity_verified).length}
                </div>
                <div className="text-sm">Unverified Sellers</div>
              </div>
              <div className="bg-red-600 rounded-lg p-4">
                <div className="text-2xl font-bold">
                  {sellerVerifications.filter(s => s.risk_score >= 40).length}
                </div>
                <div className="text-sm">High Risk Sellers</div>
              </div>
            </div>

            {sellerVerifications.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <CheckCircleIcon className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <p className="text-xl text-gray-300">No sellers to review!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sellerVerifications.map((seller) => (
                  <div key={seller.seller_id} className={`rounded-lg p-6 border ${
                    seller.risk_score >= 70 ? 'bg-red-900/20 border-red-700' :
                    seller.risk_score >= 40 ? 'bg-yellow-900/20 border-yellow-700' :
                    'bg-gray-800 border-gray-700'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {seller.identity_verified ? (
                            <CheckCircleIcon className="h-6 w-6 mr-2 text-green-400" />
                          ) : (
                            <ExclamationTriangleIcon className="h-6 w-6 mr-2 text-yellow-400" />
                          )}
                          <h3 className="text-xl font-bold text-white">
                            {seller.shop_name}
                          </h3>
                          <span className={`ml-3 px-3 py-1 rounded-full text-xs font-bold ${
                            seller.risk_score >= 70 ? 'bg-red-600' :
                            seller.risk_score >= 40 ? 'bg-yellow-600' :
                            'bg-green-600'
                          }`}>
                            Risk Score: {seller.risk_score}
                          </span>
                        </div>
                        
                        {/* Registration Status Badge */}
                        <div className="mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            seller.status === 'approved' ? 'bg-green-600' :
                            seller.status === 'rejected' ? 'bg-red-600' :
                            'bg-yellow-600'
                          }`}>
                            {seller.status === 'pending' ? '⏳ Pending Review' :
                             seller.status === 'approved' ? '✅ Approved' :
                             '❌ Rejected'}
                          </span>
                          {seller.submitted_at && (
                            <span className="ml-3 text-sm text-gray-400">
                              Submitted: {new Date(seller.submitted_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Registration Details - Grid Layout */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 bg-gray-900/50 p-4 rounded-lg">
                          <div className="col-span-2 md:col-span-3 border-b border-gray-700 pb-2 mb-2">
                            <p className="text-sm font-bold text-blue-400">📋 Registration Information</p>
                          </div>
                          
                          {/* Identity Information */}
                          <div>
                            <p className="text-xs text-gray-400">Legal Name</p>
                            <p className="text-sm text-white">{seller.full_legal_name || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Date of Birth</p>
                            <p className="text-sm text-white">
                              {seller.date_of_birth ? new Date(seller.date_of_birth).toLocaleDateString() : 'Not provided'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">SSN Last 4</p>
                            <p className="text-sm text-white">***-**-{seller.ssn_last4 || '****'}</p>
                          </div>
                          
                          {/* Business Information */}
                          <div>
                            <p className="text-xs text-gray-400">Business Type</p>
                            <p className="text-sm text-white">{seller.business_type || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Business Name</p>
                            <p className="text-sm text-white">{seller.business_name || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Shop Description</p>
                            <p className="text-sm text-white line-clamp-2">{seller.shop_description || 'Not provided'}</p>
                          </div>
                          
                          {/* Contact Information */}
                          <div>
                            <p className="text-xs text-gray-400">Contact Email</p>
                            <p className="text-sm text-white">{seller.contact_email || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Contact Phone</p>
                            <p className="text-sm text-white">{seller.contact_phone || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Address</p>
                            <p className="text-sm text-white">
                              {seller.address_line1 ? 
                                `${seller.city}, ${seller.state} ${seller.postal_code}` : 
                                'Not provided'}
                            </p>
                          </div>
                          
                          {/* Documents */}
                          <div className="col-span-2 md:col-span-3 border-t border-gray-700 pt-2 mt-2">
                            <p className="text-xs text-gray-400 mb-2">Identity Documents</p>
                            <div className="flex gap-2">
                              {seller.dl_front_url && (
                                <a href={seller.dl_front_url} target="_blank" rel="noopener noreferrer"
                                   className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">
                                  DL Front
                                </a>
                              )}
                              {seller.dl_back_url && (
                                <a href={seller.dl_back_url} target="_blank" rel="noopener noreferrer"
                                   className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">
                                  DL Back
                                </a>
                              )}
                              {seller.selfie_url && (
                                <a href={seller.selfie_url} target="_blank" rel="noopener noreferrer"
                                   className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">
                                  Selfie
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {seller.risk_flags && seller.risk_flags.length > 0 && (
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Risk Flags:</p>
                            <div className="flex flex-wrap gap-2">
                              {seller.risk_flags.map((flag, index) => (
                                <span key={index} className="bg-red-700 px-3 py-1 rounded-full text-xs text-white">
                                  {flag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <button 
                          onClick={() => window.open(`/admin/seller/${seller.seller_id}`, '_blank')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          View Details
                        </button>
                        {!seller.identity_verified && (
                          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                            Verify Now
                          </button>
                        )}
                        <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                          Suspend
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

