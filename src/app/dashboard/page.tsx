'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { SimpleGameService } from '@/lib/supabase/simpleGameService';
import { UserService } from '@/lib/supabase/userService';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenSync } from '@/hooks/useTokenSync';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import PageWalletDisplay from '@/components/wallet/PageWalletDisplay';
import AdvancedSellerRegistration from '@/components/seller/AdvancedSellerRegistration';
import SellerDashboard from '@/components/seller/SellerDashboard';
import MessagingHub from '@/components/messaging/MessagingHub';
// Dashboard with comprehensive icon imports
import { ArrowPathIcon, BanknotesIcon, TrophyIcon, StarIcon, FireIcon, HeartIcon, ChartBarIcon, ClockIcon, CheckIcon, ShieldCheckIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

interface GameHistoryRecord {
  id: string;
  game_type: string;
  score: number;
  accuracy: number;
  avg_reaction_time?: number;
  is_practice: boolean;
  listing_id?: string;
  entry_number?: number;
  match_id?: string;
  opponent_id?: string;
  tournament_id?: string;
  entry_fee?: number;
  tokens_wagered?: number;
  tokens_won?: number;
  game_duration?: number;
  created_at: string;
}

interface HighScoreRecord {
  game_type: string;
  best_score: number;
  best_accuracy?: number;
  best_reaction_time?: number;
  last_score?: number;
  last_accuracy?: number;
  games_played: number;
  practice_games: number;
  competition_games: number;
}

interface UserStats {
  totalGames: number;
  practiceGames: number;
  competitionGames: number;
  totalTokensWagered: number;
  totalTokensWon: number;
  totalPrizeMoney: number;
  averageScore: number;
}

export default function TriumphStyleDashboard() {
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading, refreshTokens } = useAuth();
  const { tokenBalance, isLoading: tokensLoading } = useTokenSync();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [gameHistory, setGameHistory] = useState<GameHistoryRecord[]>([]);
  const [highScores, setHighScores] = useState<HighScoreRecord[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalGames: 0,
    practiceGames: 0,
    competitionGames: 0,
    totalTokensWagered: 0,
    totalTokensWon: 0,
    totalPrizeMoney: 0,
    averageScore: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tokenBalanceUpdated, setTokenBalanceUpdated] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'practice' | 'competition' | 'stats' | 'messages'>('recent');
  
  // Seller registration state
  const [isSeller, setIsSeller] = useState(false);
  const [sellerStatus, setSellerStatus] = useState<any>(null);
  const [isCheckingSeller, setIsCheckingSeller] = useState(true);
  const [showSellerForm, setShowSellerForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [sellerFormData, setSellerFormData] = useState({
    businessName: '',
    contactEmail: '',
    contactPhone: ''
  });

  useEffect(() => {
    // Check URL parameters for tab selection
    const tab = searchParams.get('tab');
    if (tab && ['recent', 'practice', 'competition', 'stats', 'messages'].includes(tab)) {
      setActiveTab(tab as any);
    }
    
    // Check for new score/match flags
    const newScore = searchParams.get('newScore');
    const newMatch = searchParams.get('newMatch');
    
    if (newScore || newMatch) {
      // Show a brief notification
      console.log('🎉 New game result detected!');
    }
    
    // Check for new game score flag from localStorage
    const hasNewScore = localStorage.getItem('hasNewGameScore');
    if (hasNewScore === 'true') {
      console.log('🎉 New game score detected in localStorage! Refreshing dashboard...');
      localStorage.removeItem('hasNewGameScore'); // Clear the flag
      // Reload dashboard data
      if (user && isAuthenticated) {
        loadDashboardData();
      }
    }
    
    // Only load data if user is authenticated AND auth is not loading
    if (user && isAuthenticated && !authLoading) {
      console.log('🎮 [Dashboard] User authenticated, loading data immediately...');
      loadDashboardData();
    }
  }, [searchParams, user?.id, isAuthenticated, authLoading]);

  // Separate useEffect for seller status check to prevent flashing
  useEffect(() => {
    // Only check seller status once when user is first authenticated
    if (user && isAuthenticated && !authLoading && isCheckingSeller) {
      console.log('🔍 [Dashboard] Running one-time seller status check...');
      checkSellerStatus();
    }
  }, [user?.id, isAuthenticated, authLoading]);

  // Token synchronization is now handled by useTokenSync hook

  // Focus-based refresh is now handled by useTokenSync hook

  const showTokenUpdateIndicator = () => {
    setTokenBalanceUpdated(true);
    setTimeout(() => {
      setTokenBalanceUpdated(false);
    }, 3000); // Show indicator for 3 seconds
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      console.log('🎮 [Dashboard] Loading Triumph-style dashboard data...');

      // Use the same authentication method as practice games
      if (!user || !isAuthenticated) {
        console.log('❌ [Dashboard] No authenticated user from useAuth context');
        setIsLoading(false);
        return;
      }

      console.log('✅ [Dashboard] User authenticated via useAuth:', user.id);
      console.log('✅ [Dashboard] User email:', user.email);

      // Set user profile from useAuth context immediately
      setUserProfile(user);
      console.log('✅ [Dashboard] Profile loaded from useAuth:', user.username);

      // Token balance is now handled by useTokenSync hook

      // Load game data in parallel
      const [gameHistory, highScores, userStats] = await Promise.all([
        loadGameHistory(user.id).catch(err => {
          console.error('❌ [Dashboard] Game history load failed:', err);
          return [];
        }),
        loadHighScores(user.id).catch(err => {
          console.error('❌ [Dashboard] High scores load failed:', err);
          return [];
        }),
        loadUserStats(user.id).catch(err => {
          console.error('❌ [Dashboard] User stats load failed:', err);
          return {
            totalGames: 0,
            practiceGames: 0,
            competitionGames: 0,
            totalTokensWagered: 0,
            totalTokensWon: 0,
            totalPrizeMoney: 0,
            averageScore: 0
          };
        })
      ]);

      setGameHistory(gameHistory);
      setHighScores(highScores);
      setUserStats(userStats);

      console.log('✅ [Dashboard] All data loaded successfully');
      console.log('✅ [Dashboard] Game history loaded:', gameHistory.length, 'games');
      console.log('✅ [Dashboard] High scores loaded:', highScores.length, 'games');
      console.log('✅ [Dashboard] User stats loaded:', userStats);

    } catch (error) {
      console.error('❌ [Dashboard] Error loading dashboard:', error);
      // Set default values to prevent UI crashes
      setGameHistory([]);
      setHighScores([]);
      setUserStats({
        totalGames: 0,
        practiceGames: 0,
        competitionGames: 0,
        totalTokensWagered: 0,
        totalTokensWon: 0,
        totalPrizeMoney: 0,
        averageScore: 0
      });
    } finally {
      // Always set loading to false, even on errors
      setIsLoading(false);
      console.log('✅ [Dashboard] Loading state cleared');
    }
  };

  const loadGameHistory = async (userId: string) => {
    try {
      console.log('🎮 [Dashboard] Loading game history...');
      
      const gameHistory = await SimpleGameService.getUserGameHistory(userId);
      console.log('✅ [Dashboard] Game history loaded:', gameHistory.length, 'games');
      return gameHistory; // Return instead of setting state
    } catch (error) {
      console.error('❌ [Dashboard] Error in loadGameHistory:', error);
      return []; // Return empty array on error
    }
  };

  const loadHighScores = async (userId: string): Promise<HighScoreRecord[]> => {
    try {
      console.log('🏆 [Dashboard] Loading high scores...');
      
      const highScores = await SimpleGameService.getUserHighScores(userId);
      console.log('✅ [Dashboard] High scores loaded:', Object.keys(highScores).length, 'games');
      return Object.values(highScores) as unknown as HighScoreRecord[]; // Return instead of setting state
    } catch (error) {
      console.error('❌ [Dashboard] Error in loadHighScores:', error);
      return [] as HighScoreRecord[]; // Return empty array on error
    }
  };

  const loadUserStats = async (userId: string) => {
    try {
      console.log('📊 [Dashboard] Loading user stats...');
      
      const userStats = await SimpleGameService.getUserGameStats(userId);
      console.log('✅ [Dashboard] User stats loaded:', userStats);
      return userStats; // Return instead of setting state
    } catch (error) {
      console.error('❌ [Dashboard] Error in loadUserStats:', error);
      return {
        totalGames: 0,
        practiceGames: 0,
        competitionGames: 0,
        totalTokensWagered: 0,
        totalTokensWon: 0,
        totalPrizeMoney: 0,
        averageScore: 0
      };
    }
  };

  const checkSellerStatus = async () => {
    if (!user?.id) {
      setIsCheckingSeller(false);
      return;
    }
    
    try {
      console.log('🔍 [Dashboard] Checking seller status...');
      
      const { data, error } = await supabase.rpc('check_seller_status');
      
      if (error) {
        console.error('❌ [Dashboard] Error checking seller status:', error);
        setIsSeller(false);
        setIsCheckingSeller(false);
        return;
      }
      
      console.log('✅ [Dashboard] Seller status raw data:', data);
      
      // RPC returns an array, get first item
      const sellerData = Array.isArray(data) ? data[0] : data;
      
      console.log('✅ [Dashboard] Seller status parsed:', sellerData);
      setSellerStatus(sellerData);
      
      // Only set as seller if approved
      const isApprovedSeller = sellerData?.is_seller === true && sellerData?.status === 'approved';
      console.log('✅ [Dashboard] Is approved seller:', isApprovedSeller);
      setIsSeller(isApprovedSeller);
      
      // Pre-fill email if user is already a seller
      if (sellerData?.is_seller && sellerData?.contact_email) {
        setSellerFormData(prev => ({
          ...prev,
          contactEmail: sellerData.contact_email,
          businessName: sellerData.business_name || '',
          contactPhone: sellerData.contact_phone || ''
        }));
      }
    } catch (error) {
      console.error('❌ [Dashboard] Error checking seller status:', error);
      setIsSeller(false);
    } finally {
      setIsCheckingSeller(false);
    }
  };

  const handleSellerRegistration = async () => {
    if (!user?.id) return;
    
    if (!sellerFormData.contactEmail.trim()) {
      alert('Please provide a contact email');
      return;
    }
    
    try {
      setIsRegistering(true);
      console.log('📝 [Dashboard] Registering as seller...');
      
      const { data, error } = await supabase.rpc('register_as_seller', {
        contact_email_param: sellerFormData.contactEmail.trim(),
        business_name_param: sellerFormData.businessName.trim() || null,
        contact_phone_param: sellerFormData.contactPhone.trim() || null
      });
      
      if (error) {
        console.error('❌ [Dashboard] Error registering as seller:', error);
        alert('Failed to register as seller: ' + error.message);
        return;
      }
      
      console.log('✅ [Dashboard] Registered as seller:', data);
      alert('📝 Seller registration submitted!\n\nYour application is pending admin approval. You will be notified once an admin reviews your application.\n\nThank you for your patience!');
      
      // Refresh seller status
      await checkSellerStatus();
      setShowSellerForm(false);
    } catch (error: any) {
      console.error('❌ [Dashboard] Error registering as seller:', error);
      alert('Failed to register: ' + (error.message || 'Unknown error'));
    } finally {
      setIsRegistering(false);
    }
  };

  const refreshAllData = async () => {
    if (!user || isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      console.log('🔄 [Dashboard] Refreshing all data...');
      
      // Refresh game data (token balance is handled by useTokenSync hook)
      const [gameHistory, highScores, userStats] = await Promise.all([
        loadGameHistory(user.id),
        loadHighScores(user.id),
        loadUserStats(user.id)
      ]);
      
      // Update state with the returned values
      setGameHistory(gameHistory);
      setHighScores(highScores);
      setUserStats(userStats);
      
      console.log('✅ [Dashboard] All data refreshed successfully');
    } catch (error) {
      console.error('❌ [Dashboard] Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatGameType = (gameType: string) => {
    const gameNames: Record<string, string> = {
      'sword-parry': 'Sword Parry',
      'quick-click': 'Quick Click',
      'memory-color': 'Memory Color',
      'number-tap': 'Multi-Target Reaction',
      'shape-tap': 'Shape Tap',
      'reaction-test': 'Reaction Test'
    };
    return gameNames[gameType] || gameType;
  };

  const formatScore = (score: number) => {
    return score.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGameIcon = (gameType: string) => {
    const icons: Record<string, any> = {
      'sword-parry': <FireIcon className="w-5 h-5 text-red-500" />,
      'quick-click': <StarIcon className="w-5 h-5 text-yellow-500" />,
      'memory-color': <HeartIcon className="w-5 h-5 text-pink-500" />,
      'number-tap': <ChartBarIcon className="w-5 h-5 text-blue-500" />,
      'shape-tap': <TrophyIcon className="w-5 h-5 text-purple-500" />,
      'reaction-test': <ClockIcon className="w-5 h-5 text-green-500" />
    };
    return icons[gameType] || <TrophyIcon className="w-5 h-5 text-gray-500" />;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
        <div className="text-center">
              <p className="text-lg mb-4">Please log in to view your dashboard</p>
              <Link href="/signin" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Sign In
          </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/5 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>

      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Wallet Display */}
        <PageWalletDisplay />
        
        {/* Header with Enhanced Token Balance */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 animate-slide-up">
                Welcome back, <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{userProfile?.username || 'Player'}</span>!
              </h1>
              <p className="text-gray-300 text-lg animate-slide-up delay-100">Your gaming dashboard and statistics</p>
          </div>
            <div className="flex items-center gap-4">
              {/* Hidden Admin Link - Only for rf32191@gmail.com */}
              {user?.email === 'rf32191@gmail.com' && (
                <Link
                  href="/admin/dashboard"
                  className="bg-gradient-to-r from-red-600 to-purple-600 backdrop-blur-xl rounded-xl px-4 py-3 border border-red-500/30 hover:from-red-700 hover:to-purple-700 transition-all duration-300 flex items-center gap-2 shadow-lg"
                  title="Admin Dashboard"
                >
                  <ShieldCheckIcon className="w-5 h-5 text-white" />
                  <span className="text-white font-bold text-sm">ADMIN</span>
                </Link>
              )}
              
              {/* Refresh Button */}
              <button
                onClick={refreshAllData}
                disabled={isRefreshing}
                className="bg-white/10 backdrop-blur-xl rounded-xl p-3 border border-white/20 hover:bg-white/20 transition-all duration-300 disabled:opacity-50"
                title="Refresh all data"
              >
                <ArrowPathIcon className={`w-6 h-6 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              
              {/* Token Balance */}
              <div className={`bg-gradient-to-r from-yellow-500 via-yellow-400 to-orange-500 rounded-2xl p-6 shadow-2xl border border-yellow-300/20 animate-scale-in transition-all duration-500 ${
                tokenBalanceUpdated ? 'ring-4 ring-green-400 ring-opacity-50' : ''
              }`}>
                <div className="flex items-center">
                  <div className="relative">
                    <BanknotesIcon className="w-10 h-10 text-white mr-4 animate-pulse" />
                    <div className="absolute inset-0 w-10 h-10 bg-yellow-300/20 rounded-full animate-ping"></div>
                    {tokenBalanceUpdated && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                        <CheckIcon className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">Token Balance</p>
                    <p className="text-3xl font-bold text-white animate-count-up">{tokenBalance}</p>
                    {tokenBalanceUpdated && (
                      <p className="text-green-200 text-xs font-medium animate-pulse">Updated!</p>
                    )}
                  </div>
                </div>
              </div>
                  </div>
                  </div>
                </div>

        {/* Stats Overview - Enhanced with Animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-slide-up delay-100">
            <div className="flex items-center">
              <div className="relative">
                <TrophyIcon className="w-8 h-8 text-yellow-400 mr-3 animate-pulse" />
                <div className="absolute inset-0 w-8 h-8 bg-yellow-400/20 rounded-full animate-ping"></div>
              </div>
              <div>
                <p className="text-purple-200 text-sm font-medium">Total Games</p>
                <p className="text-2xl font-bold text-white animate-count-up">{userStats.totalGames}</p>
                  </div>
                  </div>
                </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-slide-up delay-200">
            <div className="flex items-center">
              <div className="relative">
                <StarIcon className="w-8 h-8 text-blue-400 mr-3 animate-pulse" />
                <div className="absolute inset-0 w-8 h-8 bg-blue-400/20 rounded-full animate-ping"></div>
                  </div>
              <div>
                <p className="text-purple-200 text-sm font-medium">Practice Games</p>
                <p className="text-2xl font-bold text-white animate-count-up">{userStats.practiceGames}</p>
                  </div>
                </div>
              </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-slide-up delay-300">
                <div className="flex items-center">
              <div className="relative">
                <FireIcon className="w-8 h-8 text-red-400 mr-3 animate-pulse" />
                <div className="absolute inset-0 w-8 h-8 bg-red-400/20 rounded-full animate-ping"></div>
              </div>
              <div>
                <p className="text-purple-200 text-sm font-medium">Competitions</p>
                <p className="text-2xl font-bold text-white animate-count-up">{userStats.competitionGames}</p>
                  </div>
                  </div>
                </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-slide-up delay-400">
            <div className="flex items-center">
              <div className="relative">
                <ChartBarIcon className="w-8 h-8 text-green-400 mr-3 animate-pulse" />
                <div className="absolute inset-0 w-8 h-8 bg-green-400/20 rounded-full animate-ping"></div>
              </div>
              <div>
                <p className="text-purple-200 text-sm font-medium">Average Score</p>
                <p className="text-2xl font-bold text-white animate-count-up">{Math.round(userStats.averageScore)}</p>
              </div>
            </div>
              </div>
            </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
            <div className="flex border-b border-white/20 overflow-x-auto">
              {[
                { id: 'recent', label: 'Recent Games', icon: ClockIcon },
                { id: 'practice', label: 'Practice History', icon: StarIcon },
                { id: 'competition', label: 'Competition History', icon: TrophyIcon },
                { id: 'stats', label: 'Statistics', icon: ChartBarIcon },
                { id: 'messages', label: 'Messages', icon: EnvelopeIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-6 py-4 text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5'
                      : 'text-purple-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              ))}
                </div>

            {/* Tab Content */}
                <div className="p-6">
          {activeTab === 'recent' && (
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <ClockIcon className="w-6 h-6 mr-2 text-blue-500" />
                Recent Games
              </h2>
              {gameHistory.length === 0 ? (
                    <div className="text-center py-8">
                  <TrophyIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No games played yet</p>
                  <Link href="/practice" className="text-blue-500 hover:text-blue-400 mt-2 inline-block">
                    Start playing now!
                      </Link>
                    </div>
                  ) : (
                <div className="space-y-4">
                  {gameHistory.slice(0, 10).map((game) => (
                    <div key={game.id} className="flex items-center justify-between bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                          <div className="flex items-center">
                        {getGameIcon(game.game_type)}
                        <div className="ml-4">
                          <p className="text-white font-medium capitalize">{formatGameType(game.game_type)}</p>
                          <p className="text-purple-200 text-sm">
                            {game.is_practice ? 'Practice' : 'Competition'} • {formatDate(game.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                        <p className="text-white font-bold text-lg">{formatScore(game.score)}</p>
                        <p className="text-purple-200 text-sm">
                          {game.accuracy ? `${game.accuracy}% accuracy` : ''}
                          {game.tokens_won ? ` • +${game.tokens_won} tokens` : ''}
                        </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
          )}

          {activeTab === 'practice' && (
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <StarIcon className="w-6 h-6 mr-2 text-yellow-500" />
                Practice History
              </h2>
              {gameHistory.filter(g => g.is_practice).length === 0 ? (
                <div className="text-center py-8">
                  <StarIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No practice games yet</p>
                  <Link href="/practice" className="text-blue-500 hover:text-blue-400 mt-2 inline-block">
                    Start practicing!
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {gameHistory.filter(g => g.is_practice).slice(0, 10).map((game) => (
                    <div key={game.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div className="flex items-center">
                        {getGameIcon(game.game_type)}
                        <div className="ml-3">
                          <p className="font-medium text-white">{formatGameType(game.game_type)}</p>
                          <p className="text-sm text-gray-400">{formatDate(game.created_at)}</p>
                  </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{formatScore(game.score)}</p>
                        <p className="text-sm text-gray-400">
                          {game.accuracy ? `${game.accuracy}% accuracy` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'competition' && (
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <TrophyIcon className="w-6 h-6 mr-2 text-red-500" />
                Competition History
              </h2>
              {gameHistory.filter(g => !g.is_practice).length === 0 ? (
                <div className="text-center py-8">
                  <TrophyIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No competitions entered yet</p>
                  <Link href="/tournaments" className="text-blue-500 hover:text-blue-400 mt-2 inline-block">
                    Enter a competition!
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {gameHistory.filter(g => !g.is_practice).slice(0, 10).map((game) => (
                    <div key={game.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div className="flex items-center">
                        {getGameIcon(game.game_type)}
                        <div className="ml-3">
                          <p className="font-medium text-white">{formatGameType(game.game_type)}</p>
                          <p className="text-sm text-gray-400">
                            Competition • {formatDate(game.created_at)}
                            {game.entry_fee ? ` • $${game.entry_fee} entry` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{formatScore(game.score)}</p>
                        <p className="text-sm text-gray-400">
                          {game.tokens_won ? `+${game.tokens_won} tokens` : 'No win'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <ChartBarIcon className="w-6 h-6 mr-2 text-green-500" />
                Your Statistics
              </h2>
              
              {/* Overall Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Games</p>
                      <p className="text-2xl font-bold text-white">{userStats.totalGames}</p>
                    </div>
                    <ChartBarIcon className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Practice Games</p>
                      <p className="text-2xl font-bold text-white">{userStats.practiceGames}</p>
                    </div>
                    <StarIcon className="w-8 h-8 text-yellow-500" />
                          </div>
                        </div>
                
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Competitions</p>
                      <p className="text-2xl font-bold text-white">{userStats.competitionGames}</p>
                                </div>
                    <TrophyIcon className="w-8 h-8 text-red-500" />
                        </div>
                      </div>
                      
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                            <div>
                      <p className="text-gray-400 text-sm">Avg Score</p>
                      <p className="text-2xl font-bold text-white">{Math.round(userStats.averageScore)}</p>
                    </div>
                    <FireIcon className="w-8 h-8 text-orange-500" />
                            </div>
                          </div>
                        </div>

              {/* Token Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                            <div>
                      <p className="text-gray-400 text-sm">Tokens Wagered</p>
                      <p className="text-2xl font-bold text-white">{userStats.totalTokensWagered}</p>
                            </div>
                    <BanknotesIcon className="w-8 h-8 text-purple-500" />
                          </div>
                        </div>
                
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Tokens Won</p>
                      <p className="text-2xl font-bold text-white">{userStats.totalTokensWon}</p>
                    </div>
                    <HeartIcon className="w-8 h-8 text-green-500" />
                  </div>
                </div>
              </div>

              {/* High Scores Section */}
              <div className="mt-8">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <TrophyIcon className="w-5 h-5 mr-2 text-yellow-500" />
                  High Scores by Game
                </h3>
                {highScores.length === 0 ? (
                    <div className="text-center py-8">
                    <ChartBarIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No high scores yet</p>
                    <p className="text-sm text-gray-500">Play some games to see your best scores!</p>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {highScores.map((score) => (
                      <div key={score.game_type} className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            {getGameIcon(score.game_type)}
                            <h3 className="font-medium text-white ml-2">{formatGameType(score.game_type)}</h3>
                          </div>
                          <TrophyIcon className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-white">{formatScore(score.best_score)}</p>
                          <p className="text-sm text-gray-400">
                            {score.games_played} games played
                            {score.practice_games > 0 && ` • ${score.practice_games} practice`}
                            {score.competition_games > 0 && ` • ${score.competition_games} competitions`}
                          </p>
                          {score.best_accuracy && (
                            <p className="text-sm text-gray-400">
                              Best accuracy: {score.best_accuracy}%
                            </p>
                          )}
                        </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <MessagesTab />
          )}
            </div>
          </div>
        </div>

        {/* Seller Registration Section */}
        <div className="mt-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <BanknotesIcon className="w-6 h-6 text-yellow-400 mr-3" />
                <h2 className="text-xl font-bold text-white">Seller Status</h2>
              </div>
              {isSeller && (
                <Link 
                  href="/sell"
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                >
                  Manage Listings →
                </Link>
              )}
            </div>

            {isCheckingSeller ? (
              <div className="text-center py-16 min-h-[400px] flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mb-4"></div>
                <p className="text-gray-400 text-lg">Checking seller status...</p>
              </div>
            ) : sellerStatus?.status === 'pending' ? (
              <div className="bg-yellow-500/10 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/20">
                <div className="flex items-center">
                  <ClockIcon className="w-6 h-6 text-yellow-400 mr-3" />
                  <div>
                    <p className="text-white font-medium">⏳ Seller application pending</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Your application is awaiting admin approval
                    </p>
                    <p className="text-gray-400 text-sm">You will be notified once your application is reviewed.</p>
                  </div>
                </div>
              </div>
            ) : isSeller ? (
              <div className="space-y-6">
                {/* Seller Dashboard - wrapped to prevent flashing */}
                <div className="min-h-[200px]">
                  <SellerDashboard />
                </div>
              </div>
            ) : (
              <div>
                {!showSellerForm ? (
                  <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-4 border border-blue-500/20">
                    <p className="text-white mb-3">Want to sell products on the marketplace?</p>
                    <button
                      onClick={() => setShowSellerForm(true)}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300"
                    >
                      Register as Seller
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white font-bold text-xl">Seller Registration</h3>
                      <button
                        onClick={() => setShowSellerForm(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        ✕ Close
                      </button>
                    </div>
                    <AdvancedSellerRegistration 
                      onComplete={() => {
                        setShowSellerForm(false);
                        checkSellerStatus();
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/games" className="group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white p-6 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
            <StarIcon className="w-8 h-8 mx-auto mb-3 group-hover:animate-pulse" />
            <p className="font-semibold text-lg">Practice Games</p>
            <p className="text-blue-100 text-sm">Improve your skills</p>
          </Link>
          
          <Link href="/tournaments" className="group bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white p-6 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
            <TrophyIcon className="w-8 h-8 mx-auto mb-3 group-hover:animate-pulse" />
            <p className="font-semibold text-lg">Enter Competition</p>
            <p className="text-red-100 text-sm">Win real prizes</p>
          </Link>
          
          <Link href="/buy-tokens" className="group bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white p-6 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
            <BanknotesIcon className="w-8 h-8 mx-auto mb-3 group-hover:animate-pulse" />
            <p className="font-semibold text-lg">Buy Tokens</p>
            <p className="text-green-100 text-sm">Get more tokens</p>
          </Link>
        </div>
      </div>
    </div>
  );
}