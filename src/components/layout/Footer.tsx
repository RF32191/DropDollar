import Link from 'next/link';
import { 
  HeartIcon, 
  ShieldCheckIcon, 
  CurrencyDollarIcon,
  PuzzlePieceIcon
} from '@heroicons/react/24/outline';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">$</span>
              </div>
              <span className="text-xl font-bold">DropDollar</span>
            </div>
            <p className="text-gray-400 text-sm">
              Revolutionary skill-based gaming marketplace. Win incredible prizes through gaming talent, not luck!
            </p>
            <div className="flex items-center space-x-2 text-sm">
              <PuzzlePieceIcon className="h-4 w-4 text-green-400" />
              <span className="text-green-400">Skill-Based Gaming Platform</span>
            </div>
          </div>

          {/* Gaming */}
          <div>
            <h3 className="text-lg font-semibold mb-4">🎮 Gaming</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/games" className="text-gray-400 hover:text-white transition-colors">
                  Practice Games
                </Link>
              </li>
              <li>
                <Link href="/listings" className="text-gray-400 hover:text-white transition-colors">
                  Live Competitions
                </Link>
              </li>
              <li>
                <Link href="/hot-sell" className="text-gray-400 hover:text-white transition-colors">
                  🔥 Hot Sell
                </Link>
              </li>
              <li>
                <Link href="/testimonials" className="text-gray-400 hover:text-white transition-colors">
                  Winner Stories
                </Link>
              </li>
            </ul>
          </div>

          {/* Learn */}
          <div>
            <h3 className="text-lg font-semibold mb-4">📚 Learn</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/seller/apply" className="text-gray-400 hover:text-white transition-colors">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  Gaming Rules
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  Fair Play Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-lg font-semibold mb-4">👤 Account</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/auth/register" className="text-gray-400 hover:text-white transition-colors">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="text-gray-400 hover:text-white transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-6 text-sm text-gray-400 mb-4 md:mb-0">
              <div className="flex items-center space-x-2">
                <ShieldCheckIcon className="h-4 w-4" />
                <span>Secure Gaming</span>
              </div>
              <div className="flex items-center space-x-2">
                <CurrencyDollarIcon className="h-4 w-4" />
                <span>$1 Entry</span>
              </div>
              <div className="flex items-center space-x-2">
                <HeartIcon className="h-4 w-4" />
                <span>Fair Play</span>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              © 2024 DropDollar. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}