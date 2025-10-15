'use client';

import React, { useState, useMemo } from 'react';
import { 
  TrophyIcon, 
  ChartBarIcon, 
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface GameHistory {
  id: string;
  gameType: string;
  gameName: string;
  score: number;
  accuracy: number;
  avgReactionTime?: number;
  gameDuration: number;
  isPractice: boolean;
  isCompetition: boolean;
  listingId?: string;
  entryNumber?: number;
  
  // Match information
  opponentName?: string;
  opponentScore?: number;
  matchId?: string;
  lotNumber?: string;
  
  prizeWon: number;
  createdAt: string;
}

interface GameHistoryTableProps {
  gameHistory: GameHistory[];
}

const GAME_NAME_MAP: Record<string, string> = {
  'multi-target': 'Multi-Target Reaction',
  'falling-object': 'Falling Object',
  'color-sequence': 'Color Sequence',
  'laser-dodge': 'Laser Dodge',
  'quick-click': 'Quick Click',
  'sword-parry': 'Sword Parry'
};

export default function GameHistoryTable({ gameHistory }: GameHistoryTableProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'practice' | 'competition'>('all');
  const [filterGame, setFilterGame] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'accuracy'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const itemsPerPage = 10;

  // Get unique game types
  const gameTypes = useMemo(() => {
    const types = new Set(gameHistory.map(g => g.gameType));
    return ['all', ...Array.from(types)];
  }, [gameHistory]);

  // Filter and sort games
  const filteredGames = useMemo(() => {
    let filtered = [...gameHistory];

    // Filter by mode
    if (filterMode === 'practice') {
      filtered = filtered.filter(g => g.isPractice);
    } else if (filterMode === 'competition') {
      filtered = filtered.filter(g => g.isCompetition);
    }

    // Filter by game type
    if (filterGame !== 'all') {
      filtered = filtered.filter(g => g.gameType === filterGame);
    }

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(g => 
        (GAME_NAME_MAP[g.gameType] || g.gameType).toLowerCase().includes(term) ||
        g.score.toString().includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'score') {
        comparison = a.score - b.score;
      } else if (sortBy === 'accuracy') {
        comparison = a.accuracy - b.accuracy;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [gameHistory, filterMode, filterGame, searchTerm, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredGames.length / itemsPerPage);
  const paginatedGames = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGames.slice(start, start + itemsPerPage);
  }, [filteredGames, currentPage]);

  const handleSort = (newSortBy: 'date' | 'score' | 'accuracy') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  if (gameHistory.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-600">
        <ChartBarIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-xl font-semibold">No Game History Yet</p>
        <p className="text-gray-500 mt-2">Play some games to see your complete history here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-6 rounded-2xl border border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-black text-white flex items-center">
            <ChartBarIcon className="h-8 w-8 mr-3 text-purple-400" />
            Complete Game History
          </h2>
          <div className="text-right">
            <div className="text-3xl font-black text-purple-400">{gameHistory.length}</div>
            <div className="text-sm text-gray-400">Total Games</div>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-500/20 p-3 rounded-xl">
            <div className="text-blue-400 text-sm font-semibold">Practice</div>
            <div className="text-2xl font-bold text-white">
              {gameHistory.filter(g => g.isPractice).length}
            </div>
          </div>
          <div className="bg-red-500/20 p-3 rounded-xl">
            <div className="text-red-400 text-sm font-semibold">Competition</div>
            <div className="text-2xl font-bold text-white">
              {gameHistory.filter(g => g.isCompetition).length}
            </div>
          </div>
          <div className="bg-green-500/20 p-3 rounded-xl">
            <div className="text-green-400 text-sm font-semibold">Avg Score</div>
            <div className="text-2xl font-bold text-white">
              {Math.round(gameHistory.reduce((sum, g) => sum + g.score, 0) / gameHistory.length)}
            </div>
          </div>
          <div className="bg-yellow-500/20 p-3 rounded-xl">
            <div className="text-yellow-400 text-sm font-semibold">Prizes Won</div>
            <div className="text-2xl font-bold text-white">
              ${gameHistory.reduce((sum, g) => sum + g.prizeWon, 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Mode Filter */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block flex items-center">
              <FunnelIcon className="h-4 w-4 mr-1" />
              Mode
            </label>
            <select
              value={filterMode}
              onChange={(e) => {
                setFilterMode(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
            >
              <option value="all">All Modes</option>
              <option value="practice">Practice Only</option>
              <option value="competition">Competition Only</option>
            </select>
          </div>

          {/* Game Filter */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block flex items-center">
              <FunnelIcon className="h-4 w-4 mr-1" />
              Game
            </label>
            <select
              value={filterGame}
              onChange={(e) => {
                setFilterGame(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
            >
              <option value="all">All Games</option>
              {gameTypes.filter(t => t !== 'all').map(type => (
                <option key={type} value={type}>
                  {GAME_NAME_MAP[type] || type}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Sort By</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-');
                setSortBy(by as any);
                setSortOrder(order as any);
              }}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="score-desc">Highest Score</option>
              <option value="score-asc">Lowest Score</option>
              <option value="accuracy-desc">Best Accuracy</option>
              <option value="accuracy-asc">Worst Accuracy</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block flex items-center">
              <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search games..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-center text-gray-400 text-sm">
          Showing {paginatedGames.length} of {filteredGames.length} games
        </div>
      </div>

      {/* Games Table */}
      <div className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Date & Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Game</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Mode</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Opponent</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300 cursor-pointer hover:text-purple-400" onClick={() => handleSort('score')}>
                  Score {sortBy === 'score' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300 cursor-pointer hover:text-purple-400" onClick={() => handleSort('accuracy')}>
                  Accuracy {sortBy === 'accuracy' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Reaction</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Prize</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginatedGames.map((game) => (
                <tr key={game.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-4 text-sm text-gray-300">
                    <div>{new Date(game.createdAt).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500">{new Date(game.createdAt).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-white">{GAME_NAME_MAP[game.gameType] || game.gameType}</div>
                    {game.listingId && (
                      <div className="text-xs text-gray-500">Entry #{game.entryNumber}</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {game.isPractice ? (
                      <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs font-bold rounded-full">
                        PRACTICE
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs font-bold rounded-full">
                        COMP
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {game.opponentName ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-white">{game.opponentName}</div>
                        {game.opponentScore && (
                          <div className="text-xs text-gray-400">
                            Score: {game.opponentScore.toLocaleString()}
                          </div>
                        )}
                        {game.lotNumber && (
                          <div className="text-xs text-purple-400">
                            Lot #{game.lotNumber}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">
                        {game.isPractice ? 'Solo Practice' : 'Waiting for Match'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="text-lg font-bold text-white">{game.score.toLocaleString()}</div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className={`font-semibold ${
                      game.accuracy >= 90 ? 'text-green-400' :
                      game.accuracy >= 75 ? 'text-yellow-400' :
                      'text-orange-400'
                    }`}>
                      {game.accuracy.toFixed(1)}%
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-gray-300">
                    {game.avgReactionTime ? `${game.avgReactionTime.toFixed(0)}ms` : '-'}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {game.prizeWon > 0 ? (
                      <div className="space-y-1">
                        <div className="font-bold text-green-400 text-lg">
                          +${game.prizeWon.toFixed(2)}
                        </div>
                        <div className="text-xs text-green-300">WON</div>
                      </div>
                    ) : game.isCompetition ? (
                      <div className="space-y-1">
                        <div className="font-bold text-red-400 text-lg">
                          -$1.00
                        </div>
                        <div className="text-xs text-red-300">LOST</div>
                      </div>
                    ) : (
                      <div className="text-gray-500">-</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Previous
          </button>
          
          <div className="text-white font-semibold">
            Page {currentPage} of {totalPages}
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            Next
            <ChevronRightIcon className="h-5 w-5 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}

