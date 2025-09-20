'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import TournamentPaymentService from '@/lib/tournamentPayments';
import { 
  CurrencyDollarIcon,
  TrophyIcon,
  UserGroupIcon,
  ChartBarIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export default function PlatformRevenuePage() {
  const [revenueStats, setRevenueStats] = useState<any>(null);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [tournamentFinancials, setTournamentFinancials] = useState<any>({});

  useEffect(() => {
    // Load platform statistics
    const stats = TournamentPaymentService.getPlatformStats();
    const daily = TournamentPaymentService.getDailyRevenueSummary();
    
    setRevenueStats(stats);
    setDailySummary(daily);

    // Load individual tournament financials
    const tournaments = ['starter-100', 'intermediate-500', 'advanced-2500', 'elite-25000'];
    const financials: any = {};
    
    tournaments.forEach(tournamentId => {
      financials[tournamentId] = TournamentPaymentService.getTournamentFinancials(tournamentId);
    });
    
    setTournamentFinancials(financials);
  }, []);

  const simulateEntry = async (tournamentId: string, entryFee: number) => {
    // Simulate a tournament entry for demonstration
    const userId = `demo_user_${Date.now()}`;
    await TournamentPaymentService.processTournamentEntry(userId, tournamentId, entryFee, 'credit_card');
    
    // Refresh stats
    const stats = TournamentPaymentService.getPlatformStats();
    const daily = TournamentPaymentService.getDailyRevenueSummary();
    setRevenueStats(stats);
    setDailySummary(daily);
    
    // Update tournament financials
    const financials = { ...tournamentFinancials };
    financials[tournamentId] = TournamentPaymentService.getTournamentFinancials(tournamentId);
    setTournamentFinancials(financials);
  };

  if (!revenueStats || !dailySummary) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-xl">Loading revenue dashboard...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="w-10 h-10 mr-3">
                <img
                  src="/DropCoin.png"
                  alt="Dollar Drop Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900">Dollar Drop</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/hot-sell" className="text-gray-700 hover:text-green-600 font-medium">Back to Tournaments</Link>
              <Link href="/analytics" className="text-gray-700 hover:text-green-600 font-medium">Analytics</Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            💰 Platform Revenue Dashboard
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real-time tracking of tournament entry fees and platform revenue
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
              <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">${revenueStats.totalRevenue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{revenueStats.totalParticipants.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Participants</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <TrophyIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{revenueStats.totalTournaments}</div>
            <div className="text-sm text-gray-600">Tournaments Held</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-100 p-3 rounded-full">
                <BanknotesIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">${revenueStats.averageRevenuePerTournament.toFixed(0)}</div>
            <div className="text-sm text-gray-600">Avg per Tournament</div>
          </div>
        </div>

        {/* Daily Summary */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Today's Revenue Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-green-50 rounded-xl p-6">
              <div className="text-3xl font-bold text-green-600">${dailySummary.totalRevenue.toLocaleString()}</div>
              <div className="text-green-800 font-medium">Today's Revenue</div>
              <div className="text-sm text-green-600 mt-1">Entry fees collected</div>
            </div>
            
            <div className="bg-blue-50 rounded-xl p-6">
              <div className="text-3xl font-bold text-blue-600">{dailySummary.totalParticipants}</div>
              <div className="text-blue-800 font-medium">Participants Today</div>
              <div className="text-sm text-blue-600 mt-1">Across all tournaments</div>
            </div>
            
            <div className="bg-purple-50 rounded-xl p-6">
              <div className="text-3xl font-bold text-purple-600">${dailySummary.projectedDaily.toLocaleString()}</div>
              <div className="text-purple-800 font-medium">Daily Potential</div>
              <div className="text-sm text-purple-600 mt-1">If all tournaments fill</div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-yellow-800 font-medium">
                Platform Profit Margin: ~95% (after payment processing fees)
              </span>
            </div>
          </div>
        </div>

        {/* Tournament Breakdown */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🏆 Tournament Revenue Breakdown</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(tournamentFinancials).map(([tournamentId, data]: [string, any]) => {
              const tournamentNames: { [key: string]: string } = {
                'starter-100': 'Starter ($100 Prize)',
                'intermediate-500': 'Intermediate ($500 Prize)',
                'advanced-2500': 'Advanced ($2,500 Prize)',
                'elite-25000': 'Elite ($25,000 Prize)'
              };

              const entryFees: { [key: string]: number } = {
                'starter-100': 1,
                'intermediate-500': 10,
                'advanced-2500': 50,
                'elite-25000': 500
              };

              return (
                <div key={tournamentId} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      {tournamentNames[tournamentId]}
                    </h3>
                    <button
                      onClick={() => simulateEntry(tournamentId, entryFees[tournamentId])}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Simulate Entry
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entry Fee:</span>
                      <span className="font-bold text-gray-900">${entryFees[tournamentId]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Participants:</span>
                      <span className="font-bold text-gray-900">{data.participants}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenue Collected:</span>
                      <span className="font-bold text-green-600">${data.entryFees.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Token Prize Pool:</span>
                      <span className="font-bold text-purple-600">${data.prizePool.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Platform Profit:</span>
                      <span className="font-bold text-blue-600">${data.platformProfit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">💡 How the Payment System Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">💰 Revenue Flow</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start">
                  <span className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                  <div>
                    <strong>User Pays Entry Fee:</strong> Player pays $1-$500 via credit card, PayPal, etc.
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                  <div>
                    <strong>Payment to Platform:</strong> 100% of entry fee goes to platform owner wallet
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="bg-purple-100 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                  <div>
                    <strong>Tournament Entry:</strong> User is entered into tournament with mystery game
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="bg-orange-100 text-orange-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                  <div>
                    <strong>Prize Distribution:</strong> Winners receive tokens from platform reserve
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">🏆 Token Prize System</h3>
              <div className="space-y-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-900">Platform Token Reserve</div>
                  <div className="text-2xl font-bold text-green-600">{revenueStats.tokenReserve.toLocaleString()} tokens</div>
                  <div className="text-xs text-gray-600">Available for prize distribution</div>
                </div>
                <div className="space-y-2">
                  <div><strong>Prize Structure:</strong> Fixed token amounts per tournament</div>
                  <div><strong>Guaranteed Payouts:</strong> Prizes paid regardless of participation</div>
                  <div><strong>Token Value:</strong> 1 token = $1 USD equivalent</div>
                  <div><strong>Distribution:</strong> Automatic transfer to winner wallets</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
            <h4 className="font-bold text-green-800 mb-2">💡 Business Model Benefits</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• <strong>Immediate Revenue:</strong> Platform owner receives entry fees instantly</li>
              <li>• <strong>Predictable Costs:</strong> Token prizes are fixed and budgetable</li>
              <li>• <strong>Scalable Profit:</strong> More participants = more revenue with same prize costs</li>
              <li>• <strong>User Value:</strong> Players get guaranteed token prizes for winning</li>
              <li>• <strong>Sustainable Model:</strong> Entry fees fund both operations and prize pools</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
