'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserIcon, CogIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface UserStatusBannerProps {
  className?: string;
  variant?: 'top' | 'floating' | 'inline';
}

export default function UserStatusBanner({ 
  className = '', 
  variant = 'top' 
}: UserStatusBannerProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className={`bg-blue-50 border-b border-blue-200 py-2 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-blue-600">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Don't show anything if user is not logged in
  }

  const getUserDisplayName = () => {
    if (user.full_name) {
      return user.full_name.split(' ')[0]; // First name only
    }
    if (user.username) {
      return user.username;
    }
    if (user.email) {
      return user.email.split('@')[0]; // Username part of email
    }
    return 'User';
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'floating':
        return {
          container: 'fixed top-4 right-4 z-50 bg-white shadow-lg rounded-lg border border-gray-200',
          padding: 'p-3'
        };
      case 'inline':
        return {
          container: 'bg-gray-50 border border-gray-200 rounded-lg',
          padding: 'p-3'
        };
      default: // top
        return {
          container: 'bg-gradient-to-r from-green-50 to-blue-50 border-b border-green-200',
          padding: 'py-2'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${styles.padding}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 rounded-full p-2">
              <UserIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Welcome back, {getUserDisplayName()}!
              </p>
              <p className="text-xs text-gray-600">
                Ready to play and win? 🎮
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <CogIcon className="h-4 w-4 mr-1" />
              Dashboard
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              onClick={(e) => {
                e.preventDefault();
                // Handle logout here if needed
                window.location.href = '/auth/login';
              }}
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-1" />
              Logout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
