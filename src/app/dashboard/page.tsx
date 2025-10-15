'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { UserService, UserProfile, TokenTransaction, WithdrawalRequest, GameHistory } from '@/lib/supabase/userService';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import GameHistoryTable from '@/components/GameHistoryTable';
import { 
  TrophyIcon, 
  StarIcon, 
  HeartIcon,
  XMarkIcon,
  CheckIcon,
  BanknotesIcon,
  CreditCardIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  FireIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface LastGameResult {
  score: number;
  gameType: string;
  entryFee: number;
  queueId: string;
  matchId?: string;
  opponent?: string;
  timestamp: string;
}

interface BankAccount {
  id: string;
  accountId: string;
  bankName: string;
  accountType: string;
  last4: string;
  isVerified: boolean;
  isOnboarded: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  country: string;
  email: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  completedAt?: string;
}

// Game name mapping for better display
const GAME_NAME_MAP: Record<string, string> = {
  'multi-target': 'Multi-Target Reaction',
  'falling-object': 'Falling Object',
  'color-sequence': 'Color Sequence',
  'laser-dodge': 'Laser Dodge',
  'quick-click': 'Quick Click',
  'sword-parry': 'Sword Parry'
};

// Latest Game Result Component - Shows immediately after game completion
function LatestGameResultSection() {
  const [latestGameResult, setLatestGameResult] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('lastGameResult');
    if (stored) {
      try {
        const result = JSON.parse(stored);
        setLatestGameResult(result);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
          setLatestGameResult(null);
          localStorage.removeItem('lastGameResult');
        }, 10000);
      } catch (error) {
        console.error('Error parsing latest game result:', error);
      }
    }
  }, []);

  if (!latestGameResult) return null;

  const gameTypeDisplay = latestGameResult.gameType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="mb-16">
      <div className="bg-gradient-to-br from-green-900/70 to-blue-900/70 backdrop-blur-xl p-8 rounded-3xl border-4 border-green-500/70 shadow-2xl hover:shadow-green-500/50 transition-all duration-500 hover:scale-[1.02] animate-pulse">
        <div className="flex items-center justify-center mb-6">
          <TrophyIcon className="h-12 w-12 text-green-400 mr-3 animate-bounce" />
          <h2 className="text-3xl font-black bg-gradient-to-r from-green-300 via-green-400 to-blue-500 bg-clip-text text-transparent drop-shadow-lg">
            🎮 LATEST GAME COMPLETED!
          </h2>
          <TrophyIcon className="h-12 w-12 text-green-400 ml-3 animate-bounce" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-black/30 backdrop-blur-sm p-6 rounded-2xl border border-green-500/30">
            <h3 className="text-xl font-bold text-green-300 mb-4 flex items-center">
              <ChartBarIcon className="h-6 w-6 mr-2" />
              Game Details
            </h3>
            <div className="space-y-2 text-white">
              <p><span className="text-green-400 font-semibold">Game:</span> {gameTypeDisplay}</p>
              <p><span className="text-green-400 font-semibold">Mode:</span> {latestGameResult.mode}</p>
              <p><span className="text-green-400 font-semibold">Score:</span> {latestGameResult.score.toFixed(2)}</p>
              <p><span className="text-green-400 font-semibold">Accuracy:</span> {latestGameResult.accuracy?.toFixed(1)}%</p>
              <p><span className="text-green-400 font-semibold">Completed:</span> {new Date(latestGameResult.timestamp).toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-sm p-6 rounded-2xl border border-green-500/30">
            <h3 className="text-xl font-bold text-green-300 mb-4 flex items-center">
              <FireIcon className="h-6 w-6 mr-2" />
              Status
            </h3>
            <div className="space-y-2 text-white">
              <p className="text-green-400 font-semibold">✅ Game Completed Successfully!</p>
              <p className="text-green-400 font-semibold">✅ Score Saved to Database</p>
              <p className="text-green-400 font-semibold">✅ Added to Game History</p>
              <p className="text-yellow-400 font-semibold">🎯 Check your high scores below!</p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-green-300 text-lg mb-4">This notification will disappear in 10 seconds</p>
          <button 
            onClick={() => {
              setLatestGameResult(null);
              localStorage.removeItem('lastGameResult');
            }}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// Last Game Result Component
function LastGameResultSection() {
  const [lastGameResult, setLastGameResult] = useState<LastGameResult | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('lastGameResult');
    if (stored) {
      try {
        const result = JSON.parse(stored);
        setLastGameResult(result);
      } catch (error) {
        console.error('Error parsing last game result:', error);
      }
    }
  }, []);

  if (!lastGameResult) return null;

  const gameTypeDisplay = lastGameResult.gameType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="mb-16">
      <div className="bg-gradient-to-br from-green-900/70 to-blue-900/70 backdrop-blur-xl p-8 rounded-3xl border-4 border-green-500/70 shadow-2xl hover:shadow-green-500/50 transition-all duration-500 hover:scale-[1.02]">
        <div className="flex items-center justify-center mb-6">
          <TrophyIcon className="h-12 w-12 text-green-400 mr-3 animate-pulse" />
          <h2 className="text-3xl font-black bg-gradient-to-r from-green-300 via-green-400 to-blue-500 bg-clip-text text-transparent drop-shadow-lg">
            🎮 LAST GAME RESULT
          </h2>
          <TrophyIcon className="h-12 w-12 text-green-400 ml-3 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-black/30 backdrop-blur-sm p-6 rounded-2xl border border-green-500/30">
            <h3 className="text-xl font-bold text-green-300 mb-4 flex items-center">
              <ChartBarIcon className="h-6 w-6 mr-2" />
              Game Details
            </h3>
            <div className="space-y-2 text-white">
              <p><span className="text-green-400 font-semibold">Game:</span> {gameTypeDisplay}</p>
              <p><span className="text-green-400 font-semibold">Entry Fee:</span> ${lastGameResult.entryFee}</p>
              <p><span className="text-green-400 font-semibold">Score:</span> {lastGameResult.score.toFixed(2)}</p>
              <p><span className="text-green-400 font-semibold">Played:</span> {new Date(lastGameResult.timestamp).toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-sm p-6 rounded-2xl border border-green-500/30">
            <h3 className="text-xl font-bold text-green-300 mb-4 flex items-center">
              <FireIcon className="h-6 w-6 mr-2" />
              Match Status
            </h3>
            <div className="space-y-2 text-white">
              {lastGameResult.opponent ? (
                <>
                  <p><span className="text-green-400 font-semibold">Opponent:</span> {lastGameResult.opponent}</p>
                  <p><span className="text-green-400 font-semibold">Match ID:</span> {lastGameResult.matchId || 'Processing...'}</p>
                  <p className="text-yellow-400 font-semibold">✅ Match Found!</p>
                </>
              ) : (
                <>
                  <p><span className="text-yellow-400 font-semibold">Status:</span> Waiting for opponent...</p>
                  <p><span className="text-yellow-400 font-semibold">Queue ID:</span> {lastGameResult.queueId}</p>
                  <p className="text-blue-400 font-semibold">⏳ Searching for match...</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link 
            href={`/1v1-results?score=${lastGameResult.score}&game=${lastGameResult.gameType}&fee=${lastGameResult.entryFee}&queueId=${lastGameResult.queueId}&matchId=${lastGameResult.matchId || ''}`}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <TrophyIcon className="h-5 w-5 mr-2" />
            View Full Results
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SimpleDashboard() {
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [testimonialData, setTestimonialData] = useState({
    title: '',
    story: '',
    gameType: '',
    prizeWon: '',
    rating: 5
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [tokenTransactions, setTokenTransactions] = useState<TokenTransaction[]>([]);
  const [showBankLinking, setShowBankLinking] = useState(false);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [highScores, setHighScores] = useState<Record<string, { score: number; mode: string; date: string }>>({});

  // Reload data when component mounts or comes back into focus
  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('🔍 [Dashboard] Checking authentication...');
        
        // Multiple ways to detect logged-in user
        const isLoggedInFlag = localStorage.getItem('isLoggedIn') === 'true';
        const userData = localStorage.getItem('user');
        const sessionId = localStorage.getItem('sessionId');
        
        console.log('🔍 [Dashboard] Auth flags:', { 
          isLoggedInFlag, 
          hasUserData: !!userData, 
          hasSessionId: !!sessionId 
        });
        
        // If any auth flag is present, user is logged in
        if (!isLoggedInFlag && !userData && !sessionId) {
          console.log('❌ [Dashboard] No authentication found, redirecting to login');
          setTimeout(() => {
            window.location.href = '/auth/login';
          }, 100);
          return;
        }
        
        console.log('✅ [Dashboard] User is logged in, loading profile...');
        
        // Get current user using UserService
        const currentUser = UserService.getCurrentUser();
        
        if (!currentUser) {
          console.log('⚠️ [Dashboard] Could not get user from localStorage');
          
          // Try to reconstruct user from localStorage directly
          if (userData) {
            const parsedUser = JSON.parse(userData);
            const reconstructedUser = {
              id: parsedUser.id || sessionId || 'user_' + Date.now(),
              username: parsedUser.username || 'User',
              firstName: parsedUser.firstName || parsedUser.username || 'User',
              lastName: parsedUser.lastName || '',
              email: parsedUser.email || 'user@dropdollar.com'
            };
            
            console.log('🔧 [Dashboard] Reconstructed user:', reconstructedUser);
            
            // Get or create user profile in Supabase
            const profile = await UserService.getOrCreateUser(reconstructedUser);
            setUserProfile(profile);
            
            // Load token transactions
            const transactions = await UserService.getUserTokenTransactions(profile.id);
            setTokenTransactions(transactions);
            
            // Load withdrawal requests
            const withdrawals = await UserService.getUserWithdrawalRequests(profile.id);
            setWithdrawalRequests(withdrawals);
            
            console.log('✅ [Dashboard] User profile loaded:', profile);
            console.log('💰 [Dashboard] Current tokens:', profile.tokens);
            console.log('💵 [Dashboard] Current balance:', profile.balance);
          } else {
            console.log('❌ [Dashboard] Cannot reconstruct user, redirecting to login');
            setTimeout(() => {
              window.location.href = '/auth/login';
            }, 100);
          }
          return;
        }
        
        console.log('✅ [Dashboard] User found:', currentUser.username);
        
        // Get or create user profile in Supabase
        const profile = await UserService.getOrCreateUser(currentUser);
        setUserProfile(profile);
        
        // Load token transactions
        const transactions = await UserService.getUserTokenTransactions(profile.id);
        setTokenTransactions(transactions);
        
        // Load withdrawal requests
        const withdrawals = await UserService.getUserWithdrawalRequests(profile.id);
        setWithdrawalRequests(withdrawals);
        
        // Load game history
        const games = await UserService.getUserGameHistory(profile.id);
        setGameHistory(games);
        console.log('✅ [Dashboard] Loaded', games.length, 'games from Supabase');
        
        // Debug: Check what types of games we have
        const competitionGames = games.filter(g => g.isCompetition);
        const practiceGames = games.filter(g => g.isPractice);
        console.log('🏆 [Dashboard] Competition games loaded:', competitionGames.length);
        console.log('⭐ [Dashboard] Practice games loaded:', practiceGames.length);
        
        if (competitionGames.length > 0) {
          console.log('🏆 [Dashboard] Sample competition game:', competitionGames[0]);
        }
        
        // Check if there's a new game score or forced reload
        const hasNewScore = localStorage.getItem('hasNewGameScore');
        const forceReload = localStorage.getItem('forceDashboardReload');
        if (hasNewScore === 'true' || forceReload === 'true') {
          console.log('🎮 [Dashboard] NEW GAME SCORE DETECTED! Loading latest data...');
          localStorage.removeItem('hasNewGameScore');
          localStorage.removeItem('forceDashboardReload');
          
          // Force reload game history
          const games = await UserService.getUserGameHistory(profile.id);
          setGameHistory(games);
          console.log('🔄 [Dashboard] Game history reloaded:', games.length, 'games');
        }
        
        // Load user-specific scores from Supabase (not localStorage)
        console.log('🔍 [Dashboard] Loading user-specific scores from Supabase...');
        console.log('🔍 [Dashboard] User ID:', l.id);
        
        let userScoresFromDB: Record<string, { best: number; last: number }> = {};
        
        try {
          // Try to call the get_user_high_scores function
          const supabaseClient = (await import('@/lib/supabase/client')).default;
          const { data: scoresData, error: scoresError } = await supabaseClient
            .rpc('get_user_high_scores', { user_id_param: l.id });
          
          if (scoresError) {
            console.warn('⚠️ [Dashboard] RPC function not found, falling back to direct query');
            console.error('❌ [Dashboard] Error:', scoresError);
            
            // Fallback: Query game_history directly
            const { data: gameHistory, error: historyError } = await supabaseClient
              .from('game_history')
              .select('game_type, score, created_at')
              .eq('user_id', l.id)
              .eq('is_practice', true)
              .order('created_at', { ascending: false });
            
            if (!historyError && gameHistory) {
              console.log('✅ [Dashboard] Loaded game history:', gameHistory.length, 'entries');
              
              // Process game history to get best and last scores
              const gameScores: Record<string, { best: number; last: number }> = {};
              gameHistory.forEach((entry: any) => {
                if (!gameScores[entry.game_type]) {
                  gameScores[entry.game_type] = { best: 0, last: 0 };
                }
                // Track best score
                if (entry.score > gameScores[entry.game_type].best) {
                  gameScores[entry.game_type].best = entry.score;
                }
              });
              
              // Get last scores (most recent entry per game)
              const lastScores: Record<string, number> = {};
              gameHistory.forEach((entry: any) => {
                if (!lastScores[entry.game_type]) {
                  lastScores[entry.game_type] = entry.score;
                }
              });
              
              // Merge into userScoresFromDB
              Object.keys(gameScores).forEach(gameType => {
                userScoresFromDB[gameType] = {
                  best: gameScores[gameType].best,
                  last: lastScores[gameType] || 0
                };
              });
              
              console.log('✅ [Dashboard] Processed scores from game_history:', userScoresFromDB);
            }
          } else if (scoresData) {
            console.log('✅ [Dashboard] Loaded scores from RPC function:', scoresData);
            scoresData.forEach((gameScore: any) => {
              userScoresFromDB[gameScore.game_type] = {
                best: gameScore.best_score || 0,
                last: gameScore.last_score || 0
              };
            });
            console.log('✅ [Dashboard] Processed user scores:', userScoresFromDB);
          }
        } catch (error) {
          console.error('❌ [Dashboard] Exception loading scores:', error);
        }
        
        // Build the scores object using Supabase data (user-specific)
        const scores: Record<string, { 
          highScore: number; 
          highScoreMode: string; 
          highScoreDate: string;
          recentScore: number;
          recentScoreMode: string;
          recentScoreDate: string;
          totalPlayed: number;
        }> = {};
        
        // Process all 6 games - Use Supabase data for user-specific scores
        const allGames = ['multi-target', 'falling-object', 'color-sequence', 'laser-dodge', 'quick-click', 'sword-parry'];
        
        console.log('🔄 [Dashboard] Processing games from Supabase...');
        console.log('📦 [Dashboard] Games with scores:', Object.keys(userScoresFromDB));
        
        allGames.forEach(gameId => {
          const gameScore = userScoresFromDB[gameId];
          
          console.log(`🎮 [Dashboard] ${gameId}:`, {
            bestScore: gameScore?.best,
            lastScore: gameScore?.last,
            hasData: !!gameScore
          });
          
          // Add to scores if we have ANY data for this game from Supabase
          if (gameScore && (gameScore.best > 0 || gameScore.last > 0)) {
            const highScore = Math.max(gameScore.best, gameScore.last);
            
            scores[gameId] = {
              highScore: highScore,
              highScoreMode: 'Practice',
              highScoreDate: new Date().toISOString(),
              recentScore: gameScore.last || gameScore.best,
              recentScoreMode: 'Practice',
              recentScoreDate: new Date().toISOString(),
              totalPlayed: 1
            };
            console.log(`✅ [Dashboard] Added ${gameId}:`, {
              high: highScore,
              recent: gameScore.last || gameScore.best
            });
          } else {
            console.log(`⚠️ [Dashboard] No scores for ${gameId} in database`);
          }
        });
        
        console.log('📊 [Dashboard] Final scores object:', scores);
        console.log('📊 [Dashboard] Total games with scores:', Object.keys(scores).length);
        
        // Merge with Supabase data if available
        games.forEach(game => {
          const gameKey = game.gameType || game.gameName || 'Unknown Game';
          
          if (!scores[gameKey]) {
            scores[gameKey] = {
              highScore: game.score,
              highScoreMode: game.isPractice ? 'Practice' : 'Competition',
              highScoreDate: game.createdAt,
              recentScore: game.score,
              recentScoreMode: game.isPractice ? 'Practice' : 'Competition',
              recentScoreDate: game.createdAt,
              totalPlayed: 1
            };
          } else {
            scores[gameKey].totalPlayed++;
            
            // Update high score if Supabase has a better one
            if (game.score > scores[gameKey].highScore) {
              scores[gameKey].highScore = game.score;
              scores[gameKey].highScoreMode = game.isPractice ? 'Practice' : 'Competition';
              scores[gameKey].highScoreDate = game.createdAt;
            }
            
            // Update recent score if Supabase has a more recent one
            if (new Date(game.createdAt) > new Date(scores[gameKey].recentScoreDate)) {
              scores[gameKey].recentScore = game.score;
              scores[gameKey].recentScoreMode = game.isPractice ? 'Practice' : 'Competition';
              scores[gameKey].recentScoreDate = game.createdAt;
            }
          }
        });
        
        setHighScores(scores);
        console.log('✅ [Dashboard] Final game statistics (localStorage + Supabase):', scores);
        console.log('📊 [Dashboard] Games with scores:', Object.keys(scores).length);
        
        console.log('✅ [Dashboard] User profile loaded:', profile);
        console.log('💰 [Dashboard] Current tokens:', profile.tokens);
        console.log('💵 [Dashboard] Current balance:', profile.balance);
        console.log('📜 [Dashboard] Transactions loaded:', transactions.length);
      } catch (error) {
        console.error('❌ [Dashboard] Error loading user data:', error);
        // Don't redirect on error, show error message instead
        console.log('⚠️ [Dashboard] Continuing with limited functionality');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();

    // Add event listener to reload data when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 [Dashboard] Page is visible again - reloading data...');
        loadUserData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleTestimonialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testimonialData.title || !testimonialData.story || !testimonialData.gameType || !testimonialData.prizeWon) {
      alert('Please fill in all fields');
      return;
    }

    if (!userProfile) {
      alert('Please log in to submit a testimonial');
      return;
    }

    try {
      // Create testimonial object
      const testimonial = {
        id: Date.now().toString(),
        username: userProfile.username,
        ...testimonialData,
        createdAt: new Date().toISOString()
      };

      // Save to localStorage for now (can be moved to Supabase later)
      const existingTestimonials = localStorage.getItem('victoryTestimonials');
      const testimonials = existingTestimonials ? JSON.parse(existingTestimonials) : [];
      testimonials.push(testimonial);
      localStorage.setItem('victoryTestimonials', JSON.stringify(testimonials));
      
      // Reset form
      setTestimonialData({
        title: '',
        story: '',
        gameType: '',
        prizeWon: '',
        rating: 5
      });
      setShowTestimonialForm(false);
      
      alert('Victory story submitted successfully!');
    } catch (error) {
      console.error('Error saving testimonial:', error);
      alert('Error saving testimonial. Please try again.');
    }
  };

  const handleBankAccountLink = async () => {
    try {
      if (!userProfile) {
        alert('Please log in to link a bank account');
        return;
      }
      
      // Create Stripe Connect account
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userProfile.id,
          email: userProfile.email,
          country: 'US'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Stripe Connect account');
      }

      const { accountId, onboardingUrl } = await response.json();
      
      // Store account ID for later use
      const newAccount: BankAccount = {
        id: Date.now().toString(),
        accountId: accountId,
        bankName: 'Pending Setup',
        accountType: 'Checking',
        last4: '****',
        isVerified: false,
        isOnboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        country: 'US',
        email: userProfile.email
      };
      
      const updatedAccounts = [...bankAccounts, newAccount];
      setBankAccounts(updatedAccounts);
      localStorage.setItem('userBankAccounts', JSON.stringify(updatedAccounts));
      setShowBankLinking(false);
      
      // Redirect to Stripe Connect onboarding
      window.location.href = onboardingUrl;
      
    } catch (error) {
      console.error('Error linking bank account:', error);
      alert('Failed to link bank account. Please try again.');
    }
  };

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile) {
      alert('Please log in to request a withdrawal');
      return;
    }
    
    const amount = parseFloat(withdrawalAmount);
    if (amount <= 0 || amount > userProfile.balance) {
      alert('Invalid withdrawal amount');
      return;
    }
    
    if (bankAccounts.length === 0) {
      alert('Please link a bank account first');
      return;
    }
    
    // Find a verified bank account
    const verifiedAccount = bankAccounts.find(account => account.isOnboarded && account.payoutsEnabled);
    if (!verifiedAccount) {
      alert('Please complete bank account verification first');
      return;
    }
    
    try {
      // Create Stripe payout
      const response = await fetch('/api/stripe/connect/create-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: verifiedAccount.accountId,
          amount: amount,
          currency: 'usd'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payout');
      }

      const payoutData = await response.json();
      
      const withdrawal: WithdrawalRequest = {
        id: payoutData.payoutId,
        userId: userProfile.id,
        amount,
        status: payoutData.status === 'paid' ? 'completed' : 'processing',
        stripeAccountId: verifiedAccount.accountId,
        payoutId: payoutData.payoutId,
        requestedAt: new Date().toISOString(),
        completedAt: payoutData.status === 'paid' ? new Date().toISOString() : undefined
      };
      
      // Save to Supabase
      await UserService.addWithdrawalRequest(withdrawal);
      
      // Update local state
      const updatedWithdrawals = [...withdrawalRequests, withdrawal];
      setWithdrawalRequests(updatedWithdrawals);
      
      // Update user balance in Supabase
      const newBalance = userProfile.balance - amount;
      await UserService.updateUserBalance(userProfile.id, newBalance);
      
      // Update local profile
      setUserProfile(prev => prev ? { ...prev, balance: newBalance } : null);
      
      setWithdrawalAmount('');
      setShowWithdrawalForm(false);
      
      alert(`Withdrawal ${payoutData.status === 'paid' ? 'completed' : 'processing'} for $${amount.toFixed(2)}`);
      
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      alert('Failed to process withdrawal. Please try again.');
    }
  };

  const renderStars = (rating: number, onRatingChange?: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => onRatingChange && onRatingChange(i + 1)}
        className={`h-6 w-6 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-400'
        } ${onRatingChange ? 'hover:text-yellow-300 cursor-pointer' : ''}`}
      >
        <StarIcon className="h-full w-full" />
      </button>
    ));
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center animate-pulse">
            <img
              src="/DropCoin.png"
              alt="DropDollar Logo"
              className="w-12 h-12 object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Dashboard...</h2>
          <p className="text-gray-400">Fetching your profile and data from Supabase</p>
          <div className="mt-6 flex justify-center space-x-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Clean Navigation */}
      <CleanNavigation variant="gradient" currentPage="/dashboard" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent animate-pulse">
              🎯 Dashboard
            </span>
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-green-400 to-teal-500 mx-auto rounded-full animate-pulse mb-6"></div>
              <p className="text-xl text-transparent bg-gradient-to-r from-green-300 to-blue-300 bg-clip-text animate-pulse">
                Welcome to your DropDollar dashboard, {userProfile?.username}!
              </p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Token Balance */}
          <div className="bg-gradient-to-br from-purple-800 to-pink-800 p-8 rounded-2xl border-2 border-purple-400 hover:border-purple-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">🎮 DropTokens</h3>
              <BanknotesIcon className="h-8 w-8 text-purple-300" />
            </div>
                <div className="text-4xl font-bold text-white mb-4">{userProfile?.tokens || 0}</div>
            <p className="text-purple-200 mb-6">Available for gaming competitions</p>
            <Link href="/buy-tokens" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105 inline-block">
              Buy More Tokens
            </Link>
          </div>

          {/* Cash Balance */}
          <div className="bg-gradient-to-br from-green-800 to-emerald-800 p-8 rounded-2xl border-2 border-green-400 hover:border-green-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">💰 Cash Balance</h3>
              <CreditCardIcon className="h-8 w-8 text-green-300" />
            </div>
                <div className="text-4xl font-bold text-white mb-4">${(userProfile?.balance || 0).toFixed(2)}</div>
            <p className="text-green-200 mb-6">Available for withdrawal</p>
            <button 
              onClick={() => setShowWithdrawalForm(true)}
              disabled={(userProfile?.balance || 0) <= 0 || bankAccounts.length === 0}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-xl transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed inline-block"
            >
              Request Withdrawal
            </button>
          </div>

          {/* Bank Accounts */}
          <div className="bg-gradient-to-br from-blue-800 to-indigo-800 p-8 rounded-2xl border-2 border-blue-400 hover:border-blue-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">🏦 Bank Accounts</h3>
              <ShieldCheckIcon className="h-8 w-8 text-blue-300" />
            </div>
            <div className="text-4xl font-bold text-white mb-4">{bankAccounts.length}</div>
            <p className="text-blue-200 mb-6">Linked for withdrawals</p>
            <button 
              onClick={() => setShowBankLinking(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105 inline-block"
            >
              Link Bank Account
            </button>
          </div>
        </div>

        {/* Latest Game Result Section - Show immediately after game */}
        <LatestGameResultSection />

        {/* Last Game Result Section */}
        <LastGameResultSection />

        {/* High Scores Section - PROMINENT DISPLAY */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-yellow-900/70 to-orange-900/70 backdrop-blur-xl p-10 rounded-3xl border-4 border-yellow-500/70 shadow-2xl hover:shadow-yellow-500/50 transition-all duration-500 hover:scale-[1.02]">
            <div className="flex items-center justify-center mb-8 animate-pulse">
              <TrophyIcon className="h-16 w-16 text-yellow-400 mr-4 animate-bounce" />
              <h2 className="text-5xl font-black bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-500 bg-clip-text text-transparent drop-shadow-lg">
                🏆 YOUR HIGH SCORES 🏆
              </h2>
              <TrophyIcon className="h-16 w-16 text-yellow-400 ml-4 animate-bounce" />
            </div>
            
            {/* Show ALL 6 games - played or not */}
            {(() => {
              const allGames = ['multi-target', 'falling-object', 'color-sequence', 'laser-dodge', 'quick-click', 'sword-parry'];
              const hasAnyScores = Object.keys(highScores).length > 0;
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {allGames.map(gameId => {
                    const gameData = highScores[gameId];
                    const gameName = GAME_NAME_MAP[gameId] || gameId;
                    const hasPlayed = !!gameData;
                    
                    return (
                      <div
                        key={gameId}
                        className={`p-8 rounded-3xl border-4 transition-all duration-300 shadow-2xl group relative overflow-hidden ${
                          hasPlayed 
                            ? 'bg-gradient-to-br from-purple-900/80 to-pink-900/80 border-purple-500/50 hover:border-yellow-400 transform hover:scale-105 hover:shadow-purple-500/50'
                            : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-600/30 border-dashed'
                        }`}
                      >
                        {/* Animated background effect */}
                        {hasPlayed && (
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        )}
                        
                        <div className="relative z-10">
                          {/* Game Title */}
                          <div className="flex items-center justify-center mb-4">
                            <h3 className={`text-2xl font-black text-center flex items-center ${hasPlayed ? 'text-white' : 'text-gray-500'}`}>
                              <TrophyIcon className={`h-6 w-6 mr-2 ${hasPlayed ? 'text-yellow-400' : 'text-gray-600'}`} />
                              {gameName}
                            </h3>
                          </div>
                          
                          {hasPlayed ? (
                            <>
                              {/* High Score */}
                              <div className="mb-4 p-4 bg-yellow-500/10 rounded-2xl border-2 border-yellow-500/30">
                                <div className="text-xs text-yellow-400 font-bold mb-1 text-center">🏆 HIGHEST SCORE</div>
                                <div className="text-4xl font-black bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-500 bg-clip-text text-transparent text-center">
                                  {gameData.highScore.toLocaleString()}
                                </div>
                                <div className="text-center mt-2 space-y-1">
                                  <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                                    gameData.highScoreMode === 'Competition' 
                                      ? 'bg-red-600 text-white' 
                                      : 'bg-blue-600 text-white'
                                  }`}>
                                    {gameData.highScoreMode === 'Competition' ? '🏆 COMP' : '⭐ PRACTICE'}
                                  </span>
                                  <p className="text-gray-400 text-xs">
                                    {new Date(gameData.highScoreDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Recent Score */}
                              <div className="mb-4 p-4 bg-blue-500/10 rounded-2xl border-2 border-blue-500/30">
                                <div className="text-xs text-blue-400 font-bold mb-1 text-center">📅 MOST RECENT</div>
                                <div className="text-3xl font-black text-blue-300 text-center">
                                  {gameData.recentScore.toLocaleString()}
                                </div>
                                <div className="text-center mt-2 space-y-1">
                                  <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                                    gameData.recentScoreMode === 'Competition' 
                                      ? 'bg-red-600 text-white' 
                                      : 'bg-blue-600 text-white'
                                  }`}>
                                    {gameData.recentScoreMode === 'Competition' ? '🏆 COMP' : '⭐ PRACTICE'}
                                  </span>
                                  <p className="text-gray-400 text-xs">
                                    {new Date(gameData.recentScoreDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Stats */}
                              <div className="text-center bg-green-500/10 py-2 rounded-xl border border-green-400/30">
                                <span className="text-green-400 text-sm font-bold">
                                  🎮 Played {gameData.totalPlayed} time{gameData.totalPlayed !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-8">
                              <div className="text-6xl mb-4">❓</div>
                              <p className="text-gray-500 font-semibold mb-4">Not Played Yet</p>
                              <Link
                                href="/games"
                                className="inline-block px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all duration-300 font-bold text-sm"
                              >
                                Play Now
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Competition History Section */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-red-900/70 to-orange-900/70 backdrop-blur-xl p-8 rounded-3xl border-4 border-red-500/70 shadow-2xl hover:shadow-red-500/50 transition-all duration-500 hover:scale-[1.02]">
            <div className="flex items-center justify-center mb-6">
              <TrophyIcon className="h-12 w-12 text-red-400 mr-3 animate-pulse" />
              <h2 className="text-3xl font-black bg-gradient-to-r from-red-300 via-red-400 to-orange-500 bg-clip-text text-transparent drop-shadow-lg">
                🏆 COMPETITION HISTORY
              </h2>
              <TrophyIcon className="h-12 w-12 text-red-400 ml-3 animate-pulse" />
            </div>
            
            {gameHistory.filter(g => g.isCompetition).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gameHistory.filter(g => g.isCompetition).slice(0, 6).map((game, index) => (
                  <div key={index} className="bg-black/30 backdrop-blur-sm p-4 rounded-xl border border-red-500/30">
                    <div className="text-red-300 font-semibold text-lg mb-2">
                      {GAME_NAME_MAP[game.gameType] || game.gameType}
                    </div>
                    <div className="text-white text-sm space-y-1">
                      <div><span className="text-red-400">Score:</span> {game.score.toFixed(2)}</div>
                      <div><span className="text-red-400">Date:</span> {new Date(game.createdAt).toLocaleDateString()}</div>
                      {game.placement && <div><span className="text-red-400">Place:</span> #{game.placement}</div>}
                      {game.prizeWon && <div><span className="text-red-400">Prize:</span> ${game.prizeWon}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-red-300 text-xl mb-4">No competition games yet!</div>
                <Link href="/tournaments" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-xl hover:from-red-700 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
                  <TrophyIcon className="h-5 w-5 mr-2" />
                  Start Competing
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Practice History Section */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-blue-900/70 to-purple-900/70 backdrop-blur-xl p-8 rounded-3xl border-4 border-blue-500/70 shadow-2xl hover:shadow-blue-500/50 transition-all duration-500 hover:scale-[1.02]">
            <div className="flex items-center justify-center mb-6">
              <StarIcon className="h-12 w-12 text-blue-400 mr-3 animate-pulse" />
              <h2 className="text-3xl font-black bg-gradient-to-r from-blue-300 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                ⭐ PRACTICE HISTORY
              </h2>
              <StarIcon className="h-12 w-12 text-blue-400 ml-3 animate-pulse" />
            </div>
            
            {gameHistory.filter(g => g.isPractice).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gameHistory.filter(g => g.isPractice).slice(0, 6).map((game, index) => (
                  <div key={index} className="bg-black/30 backdrop-blur-sm p-4 rounded-xl border border-blue-500/30">
                    <div className="text-blue-300 font-semibold text-lg mb-2">
                      {GAME_NAME_MAP[game.gameType] || game.gameType}
                    </div>
                    <div className="text-white text-sm space-y-1">
                      <div><span className="text-blue-400">Score:</span> {game.score.toFixed(2)}</div>
                      <div><span className="text-blue-400">Date:</span> {new Date(game.createdAt).toLocaleDateString()}</div>
                      <div><span className="text-blue-400">Accuracy:</span> {game.accuracy?.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-blue-300 text-xl mb-4">No practice games yet!</div>
                <Link href="/games" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
                  <StarIcon className="h-5 w-5 mr-2" />
                  Start Practicing
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Games Card */}
          <div className="bg-gradient-to-br from-purple-800 to-pink-800 p-8 rounded-2xl border-2 border-purple-400 hover:border-purple-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <h3 className="text-3xl font-bold text-white mb-6">🎮 Play Games</h3>
            <p className="text-purple-200 mb-8 text-lg">Compete in tournaments and win prizes with our secure gaming platform</p>
            <Link href="/games" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 inline-block">
              Start Playing
            </Link>
          </div>

          {/* Tournaments Card */}
          <div className="bg-gradient-to-br from-yellow-800 to-orange-800 p-8 rounded-2xl border-2 border-yellow-400 hover:border-yellow-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <h3 className="text-3xl font-bold text-white mb-6">🏆 Tournaments</h3>
            <p className="text-yellow-200 mb-8 text-lg">Join competitive tournaments with real-time leaderboards</p>
            <Link href="/tournaments" className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-8 py-4 rounded-xl hover:from-yellow-700 hover:to-orange-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 inline-block">
              View Tournaments
            </Link>
          </div>

          {/* Hot Sell Card */}
          <div className="bg-gradient-to-br from-red-800 to-pink-800 p-8 rounded-2xl border-2 border-red-400 hover:border-red-300 transition-all duration-300 hover:scale-105 shadow-2xl">
            <h3 className="text-3xl font-bold text-white mb-6">🔥 Hot Sell</h3>
            <p className="text-red-200 mb-8 text-lg">Fast-paced cash competitions with real money prizes</p>
            <Link href="/hot-sell" className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 inline-block">
              Enter Hot Sell
            </Link>
          </div>
        </div>

        {/* Bank Account Linking Modal */}
        {showBankLinking && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-8 max-w-md mx-4 text-center">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Link Bank Account</h3>
                <button
                  onClick={() => setShowBankLinking(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="bg-blue-900/30 rounded-lg p-4 mb-4">
                  <ShieldCheckIcon className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-blue-200 text-sm">
                    Bank account linking is powered by Stripe Connect for secure withdrawals.
                  </p>
                </div>
                <p className="text-gray-300 text-sm">
                  In a production environment, this would integrate with Stripe Connect to securely link your bank account for withdrawals.
                </p>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={handleBankAccountLink}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Link Account
                </button>
                <button
                  onClick={() => setShowBankLinking(false)}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal Request Modal */}
        {showWithdrawalForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-8 max-w-md mx-4 text-center">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Request Withdrawal</h3>
                <button
                  onClick={() => setShowWithdrawalForm(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-6">
                    <div className="bg-green-900/30 rounded-lg p-4 mb-4">
                      <div className="text-green-400 font-bold text-lg">Available Balance: ${(userProfile?.balance || 0).toFixed(2)}</div>
                    </div>
                
                <form onSubmit={handleWithdrawalRequest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Withdrawal Amount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                          max={userProfile?.balance || 0}
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5 inline mr-2" />
                      Request Withdrawal
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWithdrawalForm(false)}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Bank Accounts List */}
        {bankAccounts.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Linked Bank Accounts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bankAccounts.map((account) => (
                <div key={account.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">{account.bankName}</h3>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      account.isVerified 
                        ? 'bg-green-900 text-green-200' 
                        : 'bg-yellow-900 text-yellow-200'
                    }`}>
                      {account.isVerified ? 'Verified' : 'Pending'}
                    </div>
                  </div>
                  <div className="text-gray-300">
                    <div className="mb-2">{account.accountType} Account</div>
                    <div className="text-sm">**** **** **** {account.last4}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Withdrawal History */}
        {withdrawalRequests.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Withdrawal History</h2>
            <div className="bg-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-white font-semibold">Amount</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Status</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Requested</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalRequests.map((withdrawal) => (
                      <tr key={withdrawal.id} className="border-t border-gray-700">
                        <td className="px-6 py-4 text-white font-semibold">${withdrawal.amount.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            withdrawal.status === 'completed' ? 'bg-green-900 text-green-200' :
                            withdrawal.status === 'processing' ? 'bg-blue-900 text-blue-200' :
                            withdrawal.status === 'failed' ? 'bg-red-900 text-red-200' :
                            'bg-yellow-900 text-yellow-200'
                          }`}>
                            {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {new Date(withdrawal.requestedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {withdrawal.completedAt ? new Date(withdrawal.completedAt).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Victory Story Section */}
        <div className="mt-16 text-center">
          <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text mb-8">
            🏆 Share Your Victory Story
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Won a game? Got a prize? Tell us about your success and inspire other players!
          </p>
          
          {!showTestimonialForm ? (
            <button
              onClick={() => setShowTestimonialForm(true)}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center"
            >
              <TrophyIcon className="h-6 w-6 mr-2" />
              Write Victory Story
            </button>
          ) : (
            <div className="max-w-2xl mx-auto bg-gray-800 rounded-2xl p-8 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Your Victory Story</h3>
                <button
                  onClick={() => setShowTestimonialForm(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleTestimonialSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Story Title
                  </label>
                  <input
                    type="text"
                    value={testimonialData.title}
                    onChange={(e) => setTestimonialData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., 'My First Big Win!'"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game Type
                  </label>
                  <select
                    value={testimonialData.gameType}
                    onChange={(e) => setTestimonialData(prev => ({ ...prev, gameType: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a game</option>
                    <option value="Multi-Target Reaction">Multi-Target Reaction</option>
                    <option value="Falling Object Catch">Falling Object Catch</option>
                    <option value="Color Sequence Memory">Color Sequence Memory</option>
                    <option value="Laser Dodge EXTREME">Laser Dodge EXTREME</option>
                    <option value="Quick Click">Quick Click</option>
                    <option value="Sword Parry">Sword Parry</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prize Won
                  </label>
                  <input
                    type="text"
                    value={testimonialData.prizeWon}
                    onChange={(e) => setTestimonialData(prev => ({ ...prev, prizeWon: e.target.value }))}
                    placeholder="e.g., '$100 Cash Prize' or 'iPhone 15'"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Story
                  </label>
                  <textarea
                    value={testimonialData.story}
                    onChange={(e) => setTestimonialData(prev => ({ ...prev, story: e.target.value }))}
                    placeholder="Tell us about your victory! How did you feel? What was the experience like?"
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rating
                  </label>
                  <div className="flex items-center space-x-2">
                    {renderStars(testimonialData.rating, (rating) => setTestimonialData(prev => ({ ...prev, rating })))}
                    <span className="text-gray-400 ml-2">{testimonialData.rating}/5</span>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <CheckIcon className="h-5 w-5 inline mr-2" />
                    Submit Story
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTestimonialForm(false)}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          
          <div className="mt-8">
            <Link
              href="/testimonials"
              className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
            >
              View All Victory Stories →
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-16 text-center">
          <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text mb-8">
            Quick Actions
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/listings" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105">
              Browse Listings
            </Link>
            <Link href="/hot-sell" className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-8 py-4 rounded-xl hover:from-red-700 hover:to-orange-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105">
              Hot Sell
            </Link>
            <Link href="/categories" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105">
              Categories
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}