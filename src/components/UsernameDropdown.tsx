'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  UserIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  HomeIcon,
  TrophyIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

export default function UsernameDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{username: string, firstName: string, lastName: string} | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user info from localStorage to avoid AuthContext issues
  useEffect(() => {
    const getUserInfo = () => {
      try {
        console.log('🔍 UsernameDropdown: Checking for user data...');
        
        // Try to get user info from localStorage
        const userData = localStorage.getItem('user');
        console.log('🔍 UsernameDropdown: User data from localStorage:', userData);
        
        if (userData) {
          const parsedUser = JSON.parse(userData);
          console.log('🔍 UsernameDropdown: Parsed user:', parsedUser);
          setUser({
            username: parsedUser.username || parsedUser.firstName || 'User',
            firstName: parsedUser.firstName || 'User',
            lastName: parsedUser.lastName || ''
          });
        } else {
          // Check if there's a simple login session
          const isLoggedIn = localStorage.getItem('isLoggedIn');
          console.log('🔍 UsernameDropdown: isLoggedIn flag:', isLoggedIn);
          
          if (isLoggedIn === 'true') {
            console.log('🔍 UsernameDropdown: Setting user from isLoggedIn flag');
            setUser({
              username: 'User',
              firstName: 'User',
              lastName: ''
            });
          } else {
            console.log('🔍 UsernameDropdown: No user data found');
          }
        }
      } catch (error) {
        console.log('🔍 UsernameDropdown: Error getting user data:', error);
      }
    };

    getUserInfo();
    
    // Also listen for storage changes (in case user logs in on another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'isLoggedIn') {
        console.log('🔍 UsernameDropdown: Storage changed, rechecking user data');
        getUserInfo();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    // Clear all user data
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('sb-access-token');
    localStorage.removeItem('sb-refresh-token');
    
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    
    setIsOpen(false);
    // Redirect to home page
    window.location.href = '/';
  };

  // Don't render if user is not logged in
  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Username Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
      >
        <UserIcon className="h-5 w-5" />
        <span className="font-medium">{user.username}</span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 z-50 overflow-hidden">
          {/* User Info Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-gray-700 to-gray-600 border-b border-gray-600">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">{user.firstName} {user.lastName}</p>
                <p className="text-sm text-gray-300">@{user.username}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <HomeIcon className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <UserIcon className="h-5 w-5" />
              <span>Profile</span>
            </Link>

            <Link
              href="/tournaments"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <TrophyIcon className="h-5 w-5" />
              <span>Tournaments</span>
            </Link>

            <Link
              href="/buy-tokens"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <CurrencyDollarIcon className="h-5 w-5" />
              <span>Buy Tokens</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <Cog6ToothIcon className="h-5 w-5" />
              <span>Settings</span>
            </Link>

            {/* Divider */}
            <div className="border-t border-gray-600 my-2"></div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors w-full text-left"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
