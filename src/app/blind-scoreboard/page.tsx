'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BlindScoreboardService, BlindListing } from '@/lib/supabase/blindScoreboardService';
import BlindScoreboard from '@/components/games/BlindScoreboard';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { 
  PlusIcon, 
  TrophyIcon, 
  ClockIcon,
  UserIcon,
  FireIcon
} from '@heroicons/react/24/outline';

export default function BlindScoreboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [listings, setListings] = useState<BlindListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    title: '',
    game_key: 'laser_dodge',
    required_players: 2,
    entry_cost_tokens: 10
  });

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setIsLoading(true);
      const openListings = await BlindScoreboardService.getOpenListings();
      setListings(openListings);
    } catch (error) {
      console.error('❌ [BlindScoreboardPage] Error loading listings:', error);
      setMessage({ type: 'error', text: 'Failed to load listings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateListing = async () => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to create listings' });
      return;
    }

    if (!createForm.title.trim()) {
      setMessage({ type: 'error', text: 'Please enter a title' });
      return;
    }

    try {
      setIsCreating(true);
      
      const listing = await BlindScoreboardService.createListing({
        title: createForm.title,
        game_key: createForm.game_key,
        required_players: createForm.required_players,
        entry_cost_tokens: createForm.entry_cost_tokens,
        creator_user_id: user.id
      });

      setMessage({ type: 'success', text: 'Listing created successfully!' });
      setShowCreateForm(false);
      setCreateForm({
        title: '',
        game_key: 'laser_dodge',
        required_players: 2,
        entry_cost_tokens: 10
      });
      
      // Reload listings
      await loadListings();
      
    } catch (error) {
      console.error('❌ [BlindScoreboardPage] Error creating listing:', error);
      setMessage({ type: 'error', text: 'Failed to create listing' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleGameStart = (matchId: string) => {
    console.log('🎮 Game starting for match:', matchId);
    // Here you would typically navigate to the game or show the game component
  };

  const handleScoreSubmit = (matchId: string, score: number) => {
    console.log('📊 Score submitted:', { matchId, score });
    // Here you would typically update the UI or show results
  };

  const getGameIcon = (gameKey: string) => {
    switch (gameKey) {
      case 'laser_dodge': return '🚀';
      case 'multi_target_reaction': return '🎯';
      case 'sword_parry': return '⚔️';
      case 'quick_click': return '⚡';
      case 'memory_color': return '🧠';
      default: return '🎮';
    }
  };

  const getGameName = (gameKey: string) => {
    switch (gameKey) {
      case 'laser_dodge': return 'Laser Dodge';
      case 'multi_target_reaction': return 'Multi Target Reaction';
      case 'sword_parry': return 'Sword Parry';
      case 'quick_click': return 'Quick Click';
      case 'memory_color': return 'Memory Color';
      default: return gameKey;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Blind Scoreboard System</h1>
            <p className="text-lg text-gray-300 mb-8">Please log in to access competitive matches</p>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 max-w-md mx-auto">
              <TrophyIcon className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-4">Features</h2>
              <ul className="text-gray-300 space-y-2 text-left">
                <li>• Blind scoring until all players finish</li>
                <li>• 1v1 and multi-player matches</li>
                <li>• Token-based entry system</li>
                <li>• Automatic winner determination</li>
                <li>• Secure score submission</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Blind Scoreboard System</h1>
          <p className="text-lg text-gray-300 mb-6">Competitive matches with hidden scores until completion</p>
          
          {/* Create Listing Button */}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <PlusIcon className="w-5 h-5 inline mr-2" />
            Create New Listing
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg max-w-md mx-auto ${
            message.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-300' :
            message.type === 'error' ? 'bg-red-500/20 border border-red-500/50 text-red-300' :
            'bg-blue-500/20 border border-blue-500/50 text-blue-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-8 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-white mb-4">Create New Listing</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Epic Laser Dodge Battle"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Game Type</label>
                <select
                  value={createForm.game_key}
                  onChange={(e) => setCreateForm({ ...createForm, game_key: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="laser_dodge">🚀 Laser Dodge</option>
                  <option value="multi_target_reaction">🎯 Multi Target Reaction</option>
                  <option value="sword_parry">⚔️ Sword Parry</option>
                  <option value="quick_click">⚡ Quick Click</option>
                  <option value="memory_color">🧠 Memory Color</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Players Required</label>
                <select
                  value={createForm.required_players}
                  onChange={(e) => setCreateForm({ ...createForm, required_players: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={2}>2 Players (1v1)</option>
                  <option value={3}>3 Players</option>
                  <option value={4}>4 Players</option>
                  <option value={5}>5 Players</option>
                  <option value={6}>6 Players</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Entry Cost (Tokens)</label>
                <input
                  type="number"
                  min="0"
                  value={createForm.entry_cost_tokens}
                  onChange={(e) => setCreateForm({ ...createForm, entry_cost_tokens: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCreateListing}
                  disabled={isCreating}
                  className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Listing'}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Listings Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <span className="ml-3 text-white text-lg">Loading listings...</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <TrophyIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No Active Listings</h2>
            <p className="text-gray-300">Create a new listing to start a competitive match!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                {/* Listing Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getGameIcon(listing.game_key)}</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">{listing.title}</h3>
                      <p className="text-sm text-gray-300">{getGameName(listing.game_key)}</p>
                    </div>
                  </div>
                  <div className="flex items-center bg-blue-500/20 rounded-full px-3 py-1">
                    <FireIcon className="w-4 h-4 mr-1 text-blue-400" />
                    <span className="text-blue-300 text-xs font-semibold">BLIND</span>
                  </div>
                </div>

                {/* Listing Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Entry Cost:</span>
                    <span className="text-white font-semibold">{listing.entry_cost_tokens} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Players:</span>
                    <span className="text-white font-semibold">{listing.required_players}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Status:</span>
                    <span className="text-green-400 font-semibold">{listing.state}</span>
                  </div>
                </div>

                {/* Blind Scoreboard Component */}
                <BlindScoreboard
                  listing={listing}
                  onGameStart={handleGameStart}
                  onScoreSubmit={handleScoreSubmit}
                />
              </div>
            ))}
          </div>
        )}

        {/* Features Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <ClockIcon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">1. Join & Wait</h3>
              <p className="text-gray-300">Join a listing and wait for enough players to fill the match</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <UserIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">2. Play Blind</h3>
              <p className="text-gray-300">Play your game - scores are hidden until all players finish</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <TrophyIcon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">3. Reveal & Win</h3>
              <p className="text-gray-300">Scores are revealed and winners get their token payouts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
