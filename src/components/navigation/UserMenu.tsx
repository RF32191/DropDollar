'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDownIcon, UserIcon, CogIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface UserMenuProps {
  className?: string;
  variant?: 'default' | 'dark' | 'light';
}

export default function UserMenu({ className = '', variant = 'default' }: UserMenuProps) {
  const { user, isLoading, logout, forceLogout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getVariantStyles = () => {
    switch (variant) {
      case 'dark':
        return {
          button: 'text-gray-300 hover:text-white',
          dropdown: 'bg-gray-800 border-gray-700',
          item: 'text-gray-300 hover:bg-gray-700 hover:text-white'
        };
      case 'light':
        return {
          button: 'text-gray-700 hover:text-green-600',
          dropdown: 'bg-white border-gray-200',
          item: 'text-gray-700 hover:bg-gray-50 hover:text-green-600'
        };
      default:
        return {
          button: 'text-gray-200 hover:text-white',
          dropdown: 'bg-white border-gray-200',
          item: 'text-gray-700 hover:bg-gray-50 hover:text-green-600'
        };
    }
  };

  const styles = getVariantStyles();

  const getUserDisplayName = () => {
    if (!user) return '';
    
    if (user.full_name) {
      return user.full_name.split(' ')[0];
    }
    if (user.username) {
      return user.username;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <Link 
          href="/auth/login" 
          className={`px-4 py-2 ${styles.button} font-medium transition-colors duration-300`}
        >
          Sign In
        </Link>
        <Link 
          href="/auth/register" 
          className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* User Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onDoubleClick={() => {
          // Double-click to go to dashboard
          window.location.href = '/dashboard';
        }}
        className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold transition-all duration-300 rounded-lg border border-white/20 hover:border-white/40 shadow-lg"
        title="Click to open menu, double-click to go to dashboard"
      >
        <UserIcon className="h-5 w-5" />
        <span className="hidden sm:inline">{getUserDisplayName()}</span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-48 ${styles.dropdown} rounded-lg shadow-lg border z-[9999]`}>
          <div className="py-1">
            {/* User Info */}
            <div className="px-4 py-2 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-900">{getUserDisplayName()}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>

            {/* Menu Items */}
            <Link
              href="/dashboard"
              className={`flex items-center px-4 py-2 text-sm ${styles.item} transition-colors duration-200 font-semibold`}
              onClick={() => {
                console.log('Dashboard clicked');
                setIsOpen(false);
              }}
            >
              <CogIcon className="h-4 w-4 mr-3" />
              🏠 Dashboard
            </Link>
            
            <Link
              href="/profile"
              className={`flex items-center px-4 py-2 text-sm ${styles.item} transition-colors duration-200`}
              onClick={() => {
                console.log('Profile clicked');
                setIsOpen(false);
              }}
            >
              <UserIcon className="h-4 w-4 mr-3" />
              Profile
            </Link>

            <Link
              href="/settings"
              className={`flex items-center px-4 py-2 text-sm ${styles.item} transition-colors duration-200`}
              onClick={() => {
                console.log('Settings clicked');
                setIsOpen(false);
              }}
            >
              <CogIcon className="h-4 w-4 mr-3" />
              Settings
            </Link>

                {/* Divider */}
                <div className="border-t border-gray-200 my-1"></div>

                {/* Logout */}
                <button
                  onClick={() => {
                    console.log('Logout clicked');
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className={`flex items-center w-full px-4 py-2 text-sm ${styles.item} transition-colors duration-200 font-semibold text-red-600 hover:text-red-800 hover:bg-red-50`}
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                  🚪 Sign Out
                </button>

                {/* Force Logout */}
                <button
                  onClick={() => {
                    console.log('Force logout clicked');
                    setIsOpen(false);
                    forceLogout();
                  }}
                  className={`flex items-center w-full px-4 py-2 text-sm ${styles.item} transition-colors duration-200 font-semibold text-red-800 hover:text-red-900 hover:bg-red-100 border-l-2 border-red-300`}
                  title="Use this if you're having login issues"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                  🚨 Force Logout
                </button>
          </div>
        </div>
      )}
    </div>
  );
}
