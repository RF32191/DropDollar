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
  DocumentTextIcon
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
  game_type: string;
  score: number;
  accuracy: number;
  flags: string[];
  suspicion_level: string;
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
  
  const [activeTab, setActiveTab] = useState<'sellers' | 'audits' | 'notifications' | 'tracking' | 'listings' | 'tax'>('sellers');
  const [pendingSellers, setPendingSellers] = useState<PendingSeller[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
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
    try {
      const { data, error } = await supabase.rpc('get_unreviewed_audit_logs');
      
      if (error) throw error;
      
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
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
            <h2 className="text-2xl font-bold mb-4">Suspicious Game Activity</h2>
            
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <CheckCircleIcon className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <p className="text-xl text-gray-300">No suspicious activity detected!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((audit) => (
                  <div key={audit.id} className={`rounded-lg p-6 border ${
                    audit.suspicion_level === 'critical' 
                      ? 'bg-red-900/20 border-red-700' 
                      : audit.suspicion_level === 'high'
                      ? 'bg-orange-900/20 border-orange-700'
                      : 'bg-yellow-900/20 border-yellow-700'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <ExclamationTriangleIcon className={`h-6 w-6 mr-2 ${
                            audit.suspicion_level === 'critical' ? 'text-red-400' :
                            audit.suspicion_level === 'high' ? 'text-orange-400' :
                            'text-yellow-400'
                          }`} />
                          <h3 className="text-xl font-bold text-white">
                            {audit.username} - {audit.game_type}
                          </h3>
                          <span className={`ml-3 px-3 py-1 rounded-full text-xs font-bold ${
                            audit.suspicion_level === 'critical' ? 'bg-red-600' :
                            audit.suspicion_level === 'high' ? 'bg-orange-600' :
                            'bg-yellow-600'
                          }`}>
                            {audit.suspicion_level.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-400">Score</p>
                            <p className="text-white font-bold">{audit.score}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Accuracy</p>
                            <p className="text-white font-bold">{audit.accuracy}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Date</p>
                            <p className="text-white">{new Date(audit.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Flags:</p>
                          <div className="flex flex-wrap gap-2">
                            {audit.flags.map((flag, index) => (
                              <span key={index} className="bg-gray-700 px-3 py-1 rounded-full text-xs text-white">
                                {flag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 ml-4">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                          Review
                        </button>
                        <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                          Ban User
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
        
        {/* Tax Management Tab */}
        {activeTab === 'tax' && (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <DocumentTextIcon className="w-6 h-6 mr-2 text-blue-400" />
              W-9 & 1099 Tax Management
            </h2>
            <AdminTaxDashboard />
          </div>
        )}
      </div>
    </div>
  );
}

