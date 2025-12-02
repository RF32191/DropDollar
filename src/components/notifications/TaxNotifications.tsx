'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  DocumentTextIcon, 
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface TaxNotification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  message_type: string;
  is_read: boolean;
  metadata: {
    tax_year?: number;
    amount?: number;
    generated_at?: string;
  };
  created_at: string;
}

interface TaxNotificationsProps {
  onUnreadCountChange?: (count: number) => void;
}

export default function TaxNotifications({ onUnreadCountChange }: TaxNotificationsProps) {
  const [notifications, setNotifications] = useState<TaxNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    } catch (err) {
      console.error('Error loading user:', err);
    }
  };

  const loadNotifications = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('[TaxNotifications] Loading notifications for user:', user.id);
      
      const { data, error: fetchError } = await supabase
        .from('user_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('[TaxNotifications] Error fetching:', fetchError);
        setError(fetchError.message);
        setNotifications([]);
      } else {
        console.log('[TaxNotifications] Loaded', data?.length || 0, 'notifications');
        setNotifications(data || []);
        
        // Count unread notifications
        const unreadCount = (data || []).filter((n: TaxNotification) => !n.is_read).length;
        if (onUnreadCountChange) {
          onUnreadCountChange(unreadCount);
        }
      }
    } catch (err: any) {
      console.error('[TaxNotifications] Unexpected error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_messages')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (!error) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        
        // Update unread count
        const unreadCount = notifications.filter(n => !n.is_read && n.id !== notificationId).length;
        if (onUnreadCountChange) {
          onUnreadCountChange(unreadCount);
        }
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="text-center py-8 text-gray-400">
        <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <p>Please log in to view notifications</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center">
          <DocumentTextIcon className="w-6 h-6 mr-2 text-blue-400" />
          Tax Documents & Notifications
        </h3>
        <button
          onClick={loadNotifications}
          className="flex items-center px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
        >
          <ArrowPathIcon className="w-4 h-4 mr-1" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-xl mb-4 flex items-center">
          <ExclamationCircleIcon className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-lg font-semibold mb-2">No Tax Documents Yet</p>
          <p className="text-gray-500 text-sm">
            Your 1099 and other tax documents will appear here when available.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.is_read && markAsRead(notification.id)}
              className={`relative p-5 rounded-xl border transition-all duration-300 cursor-pointer ${
                notification.is_read
                  ? 'bg-white/5 border-white/10 hover:bg-white/10'
                  : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-400/30 hover:from-blue-500/30 hover:to-purple-500/30 shadow-lg shadow-blue-500/10'
              }`}
            >
              {/* Unread indicator */}
              {!notification.is_read && (
                <div className="absolute top-4 right-4 w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50"></div>
              )}

              {/* Icon and Title */}
              <div className="flex items-start mb-3">
                {notification.message_type === '1099_notification' || notification.message_type === 'tax_1099' ? (
                  <div className="p-2 bg-green-500/20 rounded-lg mr-3">
                    <DocumentTextIcon className="w-6 h-6 text-green-400" />
                  </div>
                ) : (
                  <div className="p-2 bg-blue-500/20 rounded-lg mr-3">
                    <DocumentTextIcon className="w-6 h-6 text-blue-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="text-white font-semibold text-lg">{notification.title}</h4>
                  <p className="text-gray-400 text-xs mt-1">
                    {formatDate(notification.created_at)}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="bg-black/20 rounded-lg p-4 mb-3">
                <p className="text-gray-300 text-sm whitespace-pre-wrap">
                  {notification.content}
                </p>
              </div>

              {/* Tax metadata if available */}
              {notification.metadata?.amount && (
                <div className="flex items-center justify-between bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg px-4 py-3 border border-green-500/20">
                  <div>
                    <span className="text-gray-400 text-sm">Tax Year:</span>
                    <span className="text-white font-semibold ml-2">{notification.metadata.tax_year || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Total Earnings:</span>
                    <span className="text-green-400 font-bold text-lg ml-2">
                      ${typeof notification.metadata.amount === 'number' 
                        ? notification.metadata.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : notification.metadata.amount}
                    </span>
                  </div>
                </div>
              )}

              {/* Read status */}
              <div className="flex items-center justify-end mt-3">
                {notification.is_read ? (
                  <span className="flex items-center text-gray-500 text-xs">
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    Read
                  </span>
                ) : (
                  <span className="text-blue-400 text-xs font-semibold">
                    Click to mark as read
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

