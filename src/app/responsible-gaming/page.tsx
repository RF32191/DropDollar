'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ShieldCheckIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  HeartIcon,
  PhoneIcon,
  ArrowLeftIcon,
  TrophyIcon,
  LockClosedIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function ResponsibleGamingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-black/50 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <ShieldCheckIcon className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Responsible Gaming</h1>
              <p className="text-gray-400">Our commitment to fair and safe gameplay</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-green-400 mb-3">🎮 Skill-Based Gaming, Not Gambling</h2>
          <p className="text-gray-300">
            DropDollar is a <strong>skill-based gaming platform</strong>. Unlike gambling, where outcomes are 
            determined by chance, our games reward practice, strategy, and genuine skill development. 
            Every player has the same opportunity to succeed through dedication and improvement.
          </p>
        </div>

        {/* Monthly Win Limits */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <TrophyIcon className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Monthly Win Limits</h2>
              <p className="text-gray-400">Fair play for everyone</p>
            </div>
          </div>
          
          <div className="space-y-4 text-gray-300">
            <p>
              To ensure fair opportunities for all players, we implement the following win limits:
            </p>
            
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <h3 className="font-bold text-yellow-400 mb-2">⚡ One Win Per Game Type Per Month</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">•</span>
                  <span>If you win a competitive game listing, you cannot participate in that same game type's competitive listings for the remainder of the month.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">•</span>
                  <span>This applies to Hot Sell and Winner Takes All game listings.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">•</span>
                  <span>Win limits reset on the 1st of each month at 12:00 AM UTC.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">•</span>
                  <span>Practice mode is always available regardless of win status.</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <h3 className="font-bold text-blue-400 mb-2">🤝 1v1 Mode Exception</h3>
              <p className="text-sm">
                1v1 direct challenges are exempt from monthly win limits. You can participate in 
                unlimited 1v1 matches as these are direct skill matchups between players.
              </p>
            </div>
          </div>
        </div>

        {/* How Win Tracking Works */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">How Win Tracking Works</h2>
              <p className="text-gray-400">Transparency in our system</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">📊 Your Dashboard</h3>
              <p className="text-sm text-gray-400">
                View your monthly wins and which game types are currently locked in your 
                dashboard statistics tab.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">🔒 Locked Listings</h3>
              <p className="text-sm text-gray-400">
                Game listings you've won will show a lock icon and countdown until the 
                next month when they become available again.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">🎮 Practice Always Open</h3>
              <p className="text-sm text-gray-400">
                Sharpen your skills anytime in practice mode - no restrictions apply to 
                practice games.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">🔄 Monthly Reset</h3>
              <p className="text-sm text-gray-400">
                All win limits reset automatically on the 1st of each month, giving 
                everyone fresh opportunities.
              </p>
            </div>
          </div>
        </div>

        {/* Time Management */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <ClockIcon className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Time Management</h2>
              <p className="text-gray-400">Play responsibly</p>
            </div>
          </div>
          
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-cyan-400 font-bold">1.</span>
              <span>Set personal time limits for gaming sessions</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400 font-bold">2.</span>
              <span>Take regular breaks - we recommend 10 minutes every hour</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400 font-bold">3.</span>
              <span>Gaming should be entertainment, not a primary income source</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400 font-bold">4.</span>
              <span>Never play when tired, stressed, or under the influence</span>
            </li>
          </ul>
        </div>

        {/* Budget Management */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <LockClosedIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Budget Management</h2>
              <p className="text-gray-400">Stay in control</p>
            </div>
          </div>
          
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Only spend what you can afford to lose</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Set a monthly budget for token purchases and stick to it</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Never chase losses by spending more than planned</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 font-bold">•</span>
              <span>View gaming expenses as entertainment costs, like movies or dining out</span>
            </li>
          </ul>
        </div>

        {/* Warning Signs */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-400">Warning Signs</h2>
              <p className="text-gray-400">Know when to seek help</p>
            </div>
          </div>
          
          <p className="text-gray-300 mb-4">
            If you experience any of the following, consider taking a break or seeking support:
          </p>
          
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-red-400">⚠️</span>
              <span>Spending more money than you can afford</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">⚠️</span>
              <span>Gaming interfering with work, relationships, or daily responsibilities</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">⚠️</span>
              <span>Feeling anxious or irritable when not gaming</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">⚠️</span>
              <span>Lying about time or money spent on gaming</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">⚠️</span>
              <span>Borrowing money or selling possessions to fund gaming</span>
            </li>
          </ul>
        </div>

        {/* Self-Exclusion */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <LockClosedIcon className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Self-Exclusion Options</h2>
              <p className="text-gray-400">Take a break when needed</p>
            </div>
          </div>
          
          <p className="text-gray-300 mb-4">
            We offer self-exclusion options for players who need a break:
          </p>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">24 Hours</div>
              <div className="text-sm text-gray-400">Cool-off period</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">7 Days</div>
              <div className="text-sm text-gray-400">Weekly break</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">30+ Days</div>
              <div className="text-sm text-gray-400">Extended exclusion</div>
            </div>
          </div>
          
          <p className="text-sm text-gray-400 mt-4">
            Contact support@drop-dollar.com to activate self-exclusion for your account.
          </p>
        </div>

        {/* Support Resources */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <HeartIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Support Resources</h2>
              <p className="text-gray-400">You're not alone</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
              <PhoneIcon className="w-6 h-6 text-green-400" />
              <div>
                <div className="font-bold text-white">National Problem Gambling Helpline</div>
                <div className="text-green-400 font-mono">1-800-522-4700</div>
                <div className="text-sm text-gray-400">24/7, Free & Confidential</div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <a 
                href="https://www.ncpgambling.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-colors"
              >
                <div className="font-bold text-white">NCPG</div>
                <div className="text-sm text-gray-400">National Council on Problem Gambling</div>
              </a>
              <a 
                href="https://www.gamblersanonymous.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-colors"
              >
                <div className="font-bold text-white">Gamblers Anonymous</div>
                <div className="text-sm text-gray-400">12-step recovery program</div>
              </a>
            </div>
          </div>
        </div>

        {/* Age Verification */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">🔞 Age Verification</h2>
          <p className="text-gray-300">
            DropDollar is strictly for users 18 years of age or older (21+ in some jurisdictions). 
            We verify age during registration and reserve the right to request additional 
            documentation at any time. Accounts found to be operated by minors will be 
            immediately suspended and any winnings forfeited.
          </p>
        </div>

        {/* Contact */}
        <div className="text-center py-8 border-t border-white/10">
          <p className="text-gray-400 mb-4">
            Questions about responsible gaming? Contact our support team.
          </p>
          <a 
            href="mailto:support@drop-dollar.com" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

