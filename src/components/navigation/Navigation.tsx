'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

interface NavigationProps {
  variant?: 'default' | 'dark' | 'light';
  showSettings?: boolean;
  showSellButton?: boolean;
  className?: string;
}

export default function Navigation({ 
  variant = 'default', 
  showSettings = true, 
  showSellButton = true,
  className = ''
}: NavigationProps) {
  const { user, isLoading } = useAuth();
  const deviceInfo = useDeviceDetection();

  const getVariantStyles = () => {
    switch (variant) {
      case 'dark':
        return {
          container: 'bg-gray-900 text-white',
          navLink: 'text-gray-300 hover:text-white',
          navLinkBold: 'text-purple-400 hover:text-purple-300',
          border: 'border-gray-700',
          userText: 'text-gray-300'
        };
      case 'light':
        return {
          container: 'bg-white text-gray-900',
          navLink: 'text-gray-700 hover:text-green-600',
          navLinkBold: 'text-purple-600 hover:text-purple-700',
          border: 'border-gray-200',
          userText: 'text-gray-700'
        };
      default:
        return {
          container: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600',
          navLink: 'text-gray-200 hover:text-white',
          navLinkBold: 'text-yellow-300 hover:text-yellow-200',
          border: 'border-gray-300',
          userText: 'text-gray-200'
        };
    }
  };

  const styles = getVariantStyles();

  const getUserDisplayName = () => {
    if (!user) return '';
    
    // Try to get a display name from various sources
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

  return (
    <div className={`flex items-center space-x-1 sm:space-x-3 ${className}`}>
      {/* Settings Link */}
      {showSettings && !deviceInfo.isMobile && (
        <Link 
          href="/settings" 
          className={`hidden md:flex items-center space-x-2 px-3 py-2 ${styles.navLink} transition-colors duration-300`}
        >
          <span>⚙️</span>
          <span className="text-sm font-medium">Settings</span>
        </Link>
      )}

      {/* User Authentication Section */}
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span className={`text-sm ${styles.userText}`}>Loading...</span>
        </div>
      ) : user ? (
        <div className="flex items-center space-x-3">
          {/* User Name */}
          <Link 
            href="/dashboard" 
            className={`px-3 py-2 ${styles.userText} hover:text-white font-medium transition-colors duration-300 flex items-center space-x-2`}
          >
            <span className="text-lg">👤</span>
            <span className="text-sm font-semibold">Welcome, {getUserDisplayName()}</span>
          </Link>
          
          {/* Dashboard Link */}
          <Link 
            href="/dashboard" 
            className={`px-3 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl ${deviceInfo.isMobile ? 'text-sm px-2 py-1' : ''}`}
          >
            Dashboard
          </Link>
          
          {/* Logout Button */}
          <Link 
            href="/auth/login" 
            className={`px-3 py-2 ${styles.navLink} font-medium transition-colors duration-300 ${deviceInfo.isMobile ? 'text-sm px-2 py-1' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              // Handle logout here if needed
              window.location.href = '/auth/login';
            }}
          >
            Logout
          </Link>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          {/* Sign In Link */}
          <Link 
            href="/auth/login" 
            className={`${deviceInfo.isMobile ? 'px-2 py-1 text-sm' : 'px-3 py-2'} ${styles.navLink} font-medium transition-colors duration-300`}
          >
            Sign In
          </Link>
          
          {/* Sign Up Link */}
          <Link 
            href="/auth/register" 
            className={`${deviceInfo.isMobile ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'} bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl`}
          >
            Sign Up
          </Link>
        </div>
      )}

      {/* Sell Button */}
      {showSellButton && (
        <Link 
          href="/seller/apply" 
          className={`${deviceInfo.isMobile ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'} bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl`}
        >
          Sell
        </Link>
      )}
    </div>
  );
}
