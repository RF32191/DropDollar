'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  UserCircleIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  BellIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ClockIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface UserMenuProps {
  variant?: 'light' | 'dark';
}

export default function UserMenu({ variant = 'light' }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout, sessionExpiry, extendSession } = useAuth();
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Session warning logic
  useEffect(() => {
    if (sessionExpiry) {
      const timeUntilExpiry = sessionExpiry.getTime() - Date.now();
      const warningTime = 5 * 60 * 1000; // 5 minutes

      if (timeUntilExpiry <= warningTime && timeUntilExpiry > 0) {
        setShowSessionWarning(true);
      } else {
        setShowSessionWarning(false);
      }
    }
  }, [sessionExpiry]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleExtendSession = async () => {
    await extendSession();
    setShowSessionWarning(false);
  };

  const getTimeUntilExpiry = () => {
    if (!sessionExpiry) return '';
    const minutes = Math.max(0, Math.floor((sessionExpiry.getTime() - Date.now()) / 60000));
    return `${minutes} minutes`;
  };

  if (!user) {
    return (
      <div className="flex items-center space-x-4">
        <Link
          href="/auth/login"
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            variant === 'dark' 
              ? 'text-white hover:bg-white/10' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Sign In
        </Link>
        <Link
          href="/auth/register"
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            variant === 'dark'
              ? 'bg-white text-gray-900 hover:bg-gray-100'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Session Warning Banner */}
      {showSessionWarning && (
        <div className="absolute top-0 right-0 transform translate-y-full mb-2 w-80 bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-lg z-50">
          <div className="flex items-start">
            <ClockIcon className="h-5 w-5 text-yellow-400 mt-0.5 mr-2" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800">Session Expiring Soon</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Your session will expire in {getTimeUntilExpiry()}. Click below to extend.
              </p>
              <button
                onClick={handleExtendSession}
                className="mt-2 text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
              >
                Extend Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
          variant === 'dark'
            ? 'text-white hover:bg-white/10'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.firstName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <span className="text-white text-sm font-medium">
              {user.firstName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <span className="hidden sm:block font-medium">
          {user.firstName} {user.lastName}
        </span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-40">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.firstName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-medium">
                    {user.firstName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
                <div className="flex items-center mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' :
                    user.role === 'seller' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                  {user.isVerified && (
                    <ShieldCheckIcon className="h-4 w-4 text-green-500 ml-2" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/dashboard"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <UserCircleIcon className="h-5 w-5 mr-3 text-gray-400" />
              Dashboard
            </Link>

            <Link
              href="/profile"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Cog6ToothIcon className="h-5 w-5 mr-3 text-gray-400" />
              Profile Settings
            </Link>

            <Link
              href="/notifications"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <BellIcon className="h-5 w-5 mr-3 text-gray-400" />
              Notifications
            </Link>

            <Link
              href="/billing"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <CreditCardIcon className="h-5 w-5 mr-3 text-gray-400" />
              Billing & Payments
            </Link>

            {user.role === 'seller' && (
              <Link
                href="/seller/dashboard"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Cog6ToothIcon className="h-5 w-5 mr-3 text-gray-400" />
                Seller Dashboard
              </Link>
            )}

            <div className="border-t border-gray-100 mt-2 pt-2">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Session Info */}
          {sessionExpiry && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center text-xs text-gray-500">
                <ClockIcon className="h-4 w-4 mr-1" />
                Session expires in {getTimeUntilExpiry()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
