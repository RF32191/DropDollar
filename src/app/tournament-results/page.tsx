'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrophyIcon,
  EyeIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CalendarIcon,
  ChartBarIcon,
  StarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import TournamentPaymentService from '@/lib/tournamentPayments';

export default function TournamentResultsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toDateString());
  const [dailyWinners, setDailyWinners] = useState<any>({});
  const [tournamentStats, setTournamentStats] = useState<any>({});

  useEffect(() => {
    // Load daily winners and tournament statistics
    const winners = TournamentPaymentService.getDailyWinners(selectedDate);
    setDailyWinners(winners);

    // Mock tournament statistics
    const stats = {
      'starter-100': {
        totalCollected: 2500,
        platformFee: 375,
        finalPrizePool: 2125,
        participantCount: 2500,
        todaysWinners: 8,
        maxWinners: 10
      },
      'intermediate-500': {
        totalCollected: 1200,
        platformFee: 180,
        finalPrizePool: 1020,
        participantCount: 1200,
        todaysWinners: 3,
        maxWinners: 5
      },
      'advanced-2500': {
        totalCollected: 5000,
        platformFee: 750,
        finalPrizePool: 4250,
        participantCount: 5000,
        todaysWinners: 2,
        maxWinners: 5
      },
      'elite-25000': {
        totalCollected: 15000,
        platformFee: 2250,
        finalPrizePool: 12750,
        participantCount: 15000,
        todaysWinners: 1,
        maxWinners: 2
      }
    };
    setTournamentStats(stats);
  }, [selectedDate]);

  const tournamentConfigs = [
    { id: 'starter-100', name: 'Starter Tournament', prize: 100, color: 'green' },
    { id: 'intermediate-500', name: 'Intermediate Tournament', prize: 500, color: 'blue' },
    { id: 'advanced-2500', name: 'Advanced Tournament', prize: 2500, color: 'purple' },
    { id: 'elite-25000', name: 'Elite Championship', prize: 25000, color: 'red' }
  ];

  // Mock recent winners data
  const mockRecentWinners = {
    'starter-100': [
      { userId: 'GameMaster123', score: 9850, gameType: 'Simon Says Reflex', winTime: '14:30', rank: 1 },
      { userId: 'SkillPlayer456', score: 9720, gameType: 'Multi-Target Reaction', winTime: '15:45', rank: 2 },
      { userId: 'ProGamer789', score: 9680, gameType: 'Cognitive Reflex', winTime: '16:20', rank: 3 },
      { userId: 'EliteUser001', score: 9650, gameType: 'Rhythm Reflex', winTime: '17:10', rank: 4 },
      { userId: 'Champion999', score: 9600, gameType: 'Falling Object Catch', winTime: '18:30', rank: 5 },
      { userId: 'MasterPlayer', score: 9580, gameType: 'Pattern Memory', winTime: '19:15', rank: 6 },
      { userId: 'SkillLord777', score: 9550, gameType: 'Color Sequence', winTime: '20:00', rank: 7 },
      { userId: 'GameWizard', score: 9520, gameType: 'Word Chain Reflex', winTime: '20:45', rank: 8 }
    ],
    'intermediate-500': [
      { userId: 'Champion001', score: 9950, gameType: 'Number Sequence', winTime: '16:30', rank: 1 },
      { userId: 'ElitePlayer999', score: 9900, gameType: 'Simon Says Reflex', winTime: '18:15', rank: 2 },
      { userId: 'MegaSkill555', score: 9850, gameType: 'Pattern Memory', winTime: '19:45', rank: 3 }
    ],
    'advanced-2500': [
      { userId: 'MegaWinner777', score: 9980, gameType: 'Cognitive Reflex', winTime: '17:20', rank: 1 },
      { userId: 'UltimateGamer', score: 9960, gameType: 'Multi-Target Reaction', winTime: '21:30', rank: 2 }
    ],
    'elite-25000': [
      { userId: 'LegendaryPlayer', score: 9999, gameType: 'Falling Object Catch', winTime: '22:15', rank: 1 }
    ]
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green': return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' };
      case 'blue': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' };
      case 'purple': return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' };
      case 'red': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <img src="/DropCoin.png" alt="Dollar Drop" className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900">Dollar Drop</span>
            </Link>
            <nav className="flex space-x-8">
              <Link href="/hot-sell" className="text-red-600 hover:text-red-700 font-bold">🔥 Hot Sell</Link>
              <Link href="/tournaments" className="text-purple-600 hover:text-purple-700 font-bold">🏆 Tournaments</Link>
              <Link href="/tournament-results" className="text-blue-600 hover:text-blue-700 font-bold">📊 Results</Link>
              <Link href="/games" className="text-green-600 hover:text-green-700 font-medium">🎮 Games</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <EyeIcon className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Tournament Results & Transparency</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Complete transparency of all tournament results, winners, and prize distributions
          </p>
        </div>

        {/* Date Selector */}
        <div className="mb-8 flex justify-center">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center space-x-4">
              <CalendarIcon className="h-5 w-5 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">Select Date:</label>
              <input
                type="date"
                value={new Date(selectedDate).toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value).toDateString())}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tournament Statistics Overview */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            📊 Daily Tournament Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tournamentConfigs.map(tournament => {
              const stats = tournamentStats[tournament.id] || {};
              const colors = getColorClasses(tournament.color);
              
              return (
                <div key={tournament.id} className={`${colors.bg} ${colors.border} border-2 rounded-2xl p-6 shadow-lg`}>
                  <div className="text-center mb-4">
                    <TrophyIcon className={`h-8 w-8 mx-auto ${colors.text} mb-2`} />
                    <h3 className="text-lg font-bold text-gray-900">{tournament.name}</h3>
                    <div className={`text-2xl font-bold ${colors.text}`}>${tournament.prize.toLocaleString()}</div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Collected:</span>
                      <span className="font-bold text-gray-900">${stats.totalCollected?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Platform Fee (15%):</span>
                      <span className="font-bold text-orange-600">${stats.platformFee?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Final Prize Pool:</span>
                      <span className="font-bold text-green-600">${stats.finalPrizePool?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Participants:</span>
                      <span className="font-bold text-blue-600">{stats.participantCount?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Winners Today:</span>
                      <span className="font-bold text-purple-600">{stats.todaysWinners || 0}/{stats.maxWinners || 0}</span>
                    </div>
                  </div>

                  {/* Winner Slots Progress */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Winner Slots</span>
                      <span className="text-gray-900 font-medium">
                        {Math.round(((stats.todaysWinners || 0) / (stats.maxWinners || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${colors.text.replace('text-', 'bg-')} h-2 rounded-full`}
                        style={{ width: `${((stats.todaysWinners || 0) / (stats.maxWinners || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tournament Winners */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            🏆 Tournament Winners - {new Date(selectedDate).toLocaleDateString()}
          </h2>
          
          <div className="space-y-8">
            {tournamentConfigs.map(tournament => {
              const winners = mockRecentWinners[tournament.id as keyof typeof mockRecentWinners] || [];
              const colors = getColorClasses(tournament.color);
              
              return (
                <div key={tournament.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <TrophyIcon className={`h-8 w-8 ${colors.text}`} />
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{tournament.name}</h3>
                        <p className="text-gray-600">${tournament.prize.toLocaleString()} Prize Pool</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Winners Today</div>
                      <div className={`text-2xl font-bold ${colors.text}`}>{winners.length}</div>
                    </div>
                  </div>

                  {winners.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Rank</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Winner</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Score</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Game Type</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Win Time</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Prize</th>
                          </tr>
                        </thead>
                        <tbody>
                          {winners.map((winner, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div className="flex items-center">
                                  {winner.rank === 1 && <span className="text-yellow-500 mr-2">🥇</span>}
                                  {winner.rank === 2 && <span className="text-gray-400 mr-2">🥈</span>}
                                  {winner.rank === 3 && <span className="text-orange-400 mr-2">🥉</span>}
                                  {winner.rank > 3 && <span className="text-blue-500 mr-2">🏆</span>}
                                  <span className="font-bold">#{winner.rank}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900">{winner.userId}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-green-600">{winner.score.toLocaleString()}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-purple-600 font-medium">{winner.gameType}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center text-gray-600">
                                  <ClockIcon className="h-4 w-4 mr-1" />
                                  {winner.winTime}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className={`font-bold ${colors.text}`}>${tournament.prize.toLocaleString()}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <TrophyIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No winners yet for this tournament today</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Transparency Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start">
            <EyeIcon className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-800 mb-2">🔍 Complete Transparency</h3>
              <ul className="text-blue-700 space-y-1 text-sm">
                <li>• <strong>Real-time Results:</strong> All tournament results published immediately after completion</li>
                <li>• <strong>Prize Distribution:</strong> Exact amounts paid to each winner with transaction details</li>
                <li>• <strong>Platform Fees:</strong> 15% platform fee clearly shown and deducted transparently</li>
                <li>• <strong>Winner Verification:</strong> All winners verified through location and identity checks</li>
                <li>• <strong>Game Integrity:</strong> Skill-based games with anti-bot protection and fair scoring</li>
                <li>• <strong>Cooldown Tracking:</strong> 3-month winner cooldowns enforced and publicly visible</li>
                <li>• <strong>Historical Data:</strong> Complete tournament history available for audit</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2024 Dollar Drop - Transparent Tournament Results</p>
          <div className="mt-4 flex justify-center space-x-6">
            <Link href="/how-it-works" className="text-gray-400 hover:text-white">How It Works</Link>
            <Link href="/games" className="text-gray-400 hover:text-white">Practice Games</Link>
            <Link href="/admin/compliance" className="text-gray-400 hover:text-white">Compliance</Link>
            <Link href="/terms" className="text-gray-400 hover:text-white">Terms & Conditions</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
