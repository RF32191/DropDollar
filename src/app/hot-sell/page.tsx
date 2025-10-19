'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenSync } from '@/hooks/useTokenSync';
import { TournamentService, HotSellListing, HotSellParticipant } from '@/lib/supabase/tournamentService';
import { FixedGamesService, FixedGameConfig, HotSellSession, PrizeEligibility, FixedGameParticipant } from '@/lib/supabase/fixedGamesService';
import { UserService } from '@/lib/supabase/userService';
import { SimpleGameService } from '@/lib/supabase/simpleGameService';
import { BlindScoreboardService, BlindListing } from '@/lib/supabase/blindScoreboardService';
import CompetitionGameFlow from '@/components/games/CompetitionGameFlow';
import BlindScoreboard from '@/components/games/BlindScoreboard';
import ErrorBoundary from '@/components/ErrorBoundary';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { 
  FireIcon, 
  TrophyIcon, 
  BanknotesIcon, 
  UsersIcon,
  ClockIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  PlayIcon,
  BoltIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

export default function HotSellPage() {
  const { user, isAuthenticated } = useAuth();
  const { tokenBalance: userTokens, isLoading: tokensLoading } = useTokenSync();
  const [hotSellListings, setHotSellListings] = useState<HotSellListing[]>([]);
  const [participants, setParticipants] = useState<{ [listingId: string]: HotSellParticipant[] }>({});
  const [sessionParticipants, setSessionParticipants] = useState<{ [sessionId: string]: FixedGameParticipant[] }>({});
  const [fixedGameConfigs, setFixedGameConfigs] = useState<FixedGameConfig[]>([]);
  const [hotSellSessions, setHotSellSessions] = useState<HotSellSession[]>([]);
  const [userParticipations, setUserParticipations] = useState<string[]>([]);
  const [blindListings, setBlindListings] = useState<BlindListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningListing, setJoiningListing] = useState<string | null>(null);
  const [joiningSession, setJoiningSession] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [currentView, setCurrentView] = useState<'listings' | 'game' | 'scoreboard'>('listings');
  const [selectedGameFlow, setSelectedGameFlow] = useState<{
    gameType: string;
    sessionId: string;
    configId: string;
    entryFee?: number;
  } | null>(null);
  const [selectedListing, setSelectedListing] = useState<HotSellListing | null>(null);
  const [locationVerified, setLocationVerified] = useState(false);
  const [prizeEligibility, setPrizeEligibility] = useState<PrizeEligibility | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{ [sessionId: string]: { minutes: number; seconds: number; isHotSell: boolean } }>({});

  useEffect(() => {
    if (isAuthenticated && user) {
      loadHotSellData();
      checkUserEligibility();
    }
  }, [isAuthenticated, user?.id]); // Use user.id instead of user object to prevent unnecessary re-renders

  // Refresh participants data every 30 seconds
  useEffect(() => {
    if (hotSellSessions.length > 0) {
      const interval = setInterval(() => {
        refreshParticipantsData();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [hotSellSessions.length]);

  useEffect(() => {
    // Update timers every second
    const timer = setInterval(() => {
      updateTimers();
    }, 1000);

    return () => clearInterval(timer);
  }, []); // Remove hotSellSessions dependency to prevent infinite re-renders

  const loadHotSellData = async () => {
    try {
      setIsLoading(true);
      
      // Load data in parallel for better performance
      const [listings, configs, sessions, blindListings] = await Promise.all([
        TournamentService.getActiveHotSellListings(),
        FixedGamesService.getFixedGameConfigs('hot_sell'),
        FixedGamesService.getHotSellSessions(),
        BlindScoreboardService.getOpenListings()
      ]);
      
      setHotSellListings(listings);
      setFixedGameConfigs(configs);
      setHotSellSessions(sessions);
      setBlindListings(blindListings);
      
      // Load participants for each listing (limit to first 3 for performance)
      const participantsData: { [listingId: string]: HotSellParticipant[] } = {};
      const limitedListings = listings.slice(0, 3);
      for (const listing of limitedListings) {
        try {
          const listingParticipants = await TournamentService.getHotSellParticipants(listing.id);
          participantsData[listing.id] = listingParticipants;
        } catch (error) {
          console.warn('Failed to load participants for listing:', listing.id);
        }
      }
      setParticipants(participantsData);
      
      // Load participants for each session (limit to first 5 for performance)
      const sessionParticipantsData: { [sessionId: string]: FixedGameParticipant[] } = {};
      const limitedSessions = sessions.slice(0, 5);
      for (const session of limitedSessions) {
        try {
          const sessionConfig = configs.find(c => c.id === session.config_id);
          if (sessionConfig) {
            const participants = await FixedGamesService.getFixedGameParticipants(session.id);
            sessionParticipantsData[session.id] = participants;
          }
        } catch (error) {
          console.warn(`Failed to load participants for session ${session.id}:`, error);
          sessionParticipantsData[session.id] = [];
        }
      }
      setSessionParticipants(sessionParticipantsData);
      
      // Ensure all configs have sessions (make all banners enterable)
      await ensureAllConfigsHaveSessions(configs, sessions);
      
    } catch (error) {
      console.error('❌ [HotSell] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const ensureAllConfigsHaveSessions = async (configs: FixedGameConfig[], sessions: HotSellSession[]) => {
    try {
      console.log('🔄 [HotSell] Ensuring all configs have sessions...');
      
      for (const config of configs) {
        const hasSession = sessions.some(session => session.config_id === config.id);
        
        if (!hasSession) {
          console.log(`📝 [HotSell] Creating session for config: ${config.title}`);
          try {
            const newSession = await FixedGamesService.createHotSellSession(config.id);
            if (newSession) {
              console.log(`✅ [HotSell] Created session for ${config.title}`);
              // Add to local state
              setHotSellSessions(prev => [...prev, newSession]);
            }
          } catch (error) {
            console.error(`❌ [HotSell] Failed to create session for ${config.title}:`, error);
          }
        }
      }
      
      console.log('✅ [HotSell] All configs now have sessions');
    } catch (error) {
      console.error('❌ [HotSell] Error ensuring sessions:', error);
    }
  };

  const checkUserEligibility = async () => {
    if (!user) return;
    
    try {
      const eligibility = await FixedGamesService.checkPrizeEligibility(user.id, 100);
      setPrizeEligibility(eligibility);
    } catch (error) {
      console.error('❌ [HotSell] Error checking eligibility:', error);
    }
  };

  const updateTimers = () => {
    // Only update if we have sessions to avoid unnecessary state updates
    if (hotSellSessions.length === 0) return;
    
    const newTimeRemaining: { [sessionId: string]: { minutes: number; seconds: number; isHotSell: boolean } } = {};
    
    hotSellSessions.forEach(session => {
      const config = fixedGameConfigs.find(c => c.id === session.config_id);
      const isWinnerTakesAll = config?.title?.includes('Winner Takes It All');
      
      if (isWinnerTakesAll) {
        // Winner Takes It All timer logic
        const payouts = calculateWinnerTakesAllPayouts(config!);
        if (payouts) {
          // For Winner Takes It All, use target_pot as base price
          const basePrice = session.target_pot || payouts.basePrice;
          const isBasePriceMet = (session.current_pot || 0) >= basePrice;
          const isTimerActive = session.status === 'active' && session.timer_started_at;
          
          let timeRemaining = 0;
          if (isTimerActive && session.timer_started_at) {
            const elapsed = Math.floor((Date.now() - new Date(session.timer_started_at).getTime()) / 1000);
            timeRemaining = Math.max(0, config!.game_duration - elapsed);
          }
          
          newTimeRemaining[session.id] = {
            hours: Math.floor(timeRemaining / 3600),
            minutes: Math.floor((timeRemaining % 3600) / 60),
            seconds: timeRemaining % 60,
            isHotSell: false, // Winner Takes It All doesn't have hot sell mode
            isBasePriceMet: isBasePriceMet,
            canJoin: isBasePriceMet,
            isTimerActive: isTimerActive,
            basePrice: basePrice,
            currentPot: session.current_pot || 0
          };
        }
      } else {
        // Regular Hot Sell timer logic
        const basePriceMet = session.current_pot >= session.target_pot;
        
        if (basePriceMet) {
          const timeData = FixedGamesService.getTimeUntilHotSell(session.expires_at);
          newTimeRemaining[session.id] = timeData;
          
          // Update session status if timer expired (but don't call this every second)
          if (timeData.isHotSell && session.status === 'waiting') {
            // Only update once per session to prevent infinite loops
            // Remove the automatic update call to prevent re-renders
            // FixedGamesService.updateHotSellPot(session.id);
          }
        } else {
          // Base price not met yet - show waiting state
          newTimeRemaining[session.id] = { 
            minutes: 0, 
            seconds: 0, 
            isHotSell: false 
          };
        }
      }
    });
    
    // Only update state if there are actual changes to prevent unnecessary re-renders
    const hasChanges = JSON.stringify(newTimeRemaining) !== JSON.stringify(timeRemaining);
    if (hasChanges) {
      setTimeRemaining(newTimeRemaining);
    }
  };

  const joinWinnerTakesAll = async (configId: string) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to join tournaments' });
      return;
    }

    // Find the config for this game
    const config = fixedGameConfigs.find(c => c.id === configId);
    if (!config) {
      setMessage({ type: 'error', text: 'Game configuration not found' });
      return;
    }

    // Create Winner Takes It All config
    const winnerTakesAllConfig = {
      ...config,
      title: `Winner Takes All - ${config.title}`,
      entry_fee: 1, // 1 token entry
      prize_pool: 300, // $3 base prize pool (300 cents)
      max_participants: 1000, // No practical limit
      description: `1 token entry - Winner takes everything! Base pot: $3, grows with each player.`
    };

    // Location verification for legal compliance
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      console.log('Location verified:', position.coords);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Location verification required to join tournaments for legal compliance. Please enable location services.' 
      });
      return;
    }

    if (userTokens < winnerTakesAllConfig.entry_fee) {
      setMessage({ type: 'error', text: `You need ${winnerTakesAllConfig.entry_fee} token to join this tournament` });
      return;
    }

    setJoiningSession(configId);
    
    try {
      // Create a winner-takes-all session (or join existing one)
      let session = await FixedGamesService.createHotSellSession(configId);
      
      if (!session) {
        // If creation failed, try to find an existing session
        const existingSessions = await FixedGamesService.getHotSellSessions();
        session = existingSessions.find(s => s.config_id === configId);
      }
      
      if (session) {
        // Actually join the session using the fixed function
        const participant = await FixedGamesService.joinHotSellSession(
          session.id,
          user.id,
          winnerTakesAllConfig.entry_fee
        );
        
        if (participant) {
          console.log('✅ [WinnerTakesAll] User added to participants:', participant);
          
          // Track user participation locally
          addUserParticipation(session.id);
          
          // Check if this is a duplicate join (user already had a score)
          const isDuplicateJoin = participant.score !== null && participant.score !== undefined;
          
          if (isDuplicateJoin) {
            setMessage({ type: 'info', text: `You have already played this tournament! Your score: ${participant.score}` });
            // Don't start the game again, just show the message
            return;
          }
          
          setMessage({ type: 'success', text: `Successfully joined Winner Takes All tournament! Game starting in 3 seconds...` });
          
          // Start the game flow with 3-second countdown
          setSelectedGameFlow({
            gameType: config.game_type,
            sessionId: session.id,
            configId: config.id,
            entryFee: winnerTakesAllConfig.entry_fee // Pass entry fee for token deduction
          });
          setCurrentView('game');
          
          // Refresh sessions and participants
          const updatedSessions = await FixedGamesService.getHotSellSessions();
          setHotSellSessions(updatedSessions);
          
          // Refresh participants for this session
          const activeGames = await FixedGamesService.getActiveFixedGames('hot_sell');
          const activeGame = activeGames.find(game => game.config_id === session.config_id);
          
          if (activeGame) {
            const updatedParticipants = await FixedGamesService.getFixedGameParticipants(activeGame.id);
            setSessionParticipants(prev => ({
              ...prev,
              [session.id]: updatedParticipants
            }));
          }
        } else {
          console.error('❌ [WinnerTakesAll] Failed to add user to participants');
          setMessage({ type: 'error', text: 'Failed to join the tournament. Please try again.' });
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to create or find tournament session.' });
      }
      
    } catch (error: any) {
      console.error('Error joining winner takes all:', error);
      
      // Check if it's a duplicate user error
      if (error?.code === '23505' || error?.message?.includes('already exists')) {
        setMessage({ 
          type: 'error', 
          text: 'You have already joined this tournament!' 
        });
      } else {
        // Refund tokens on other errors
        try {
          await UserService.updateUserTokens(user.id, userTokens);
        } catch (refundError) {
          console.error('Failed to refund tokens:', refundError);
        }
        setMessage({ 
          type: 'error', 
          text: 'Failed to join tournament. Tokens refunded.' 
        });
      }
    } finally {
      setJoiningSession(null);
    }
  };

  const joinHotSellSession = async (session: HotSellSession, config: FixedGameConfig) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to join tournaments' });
      return;
    }

    // Check if user has already joined this competition
    if (hasUserJoined(session.id)) {
      setMessage({ type: 'error', text: 'You have already joined this competition!' });
      return;
    }

    // Location verification for legal compliance
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      console.log('Location verified:', position.coords);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Location verification required to join tournaments for legal compliance. Please enable location services.' 
      });
      return;
    }

    if (userTokens < config.entry_fee) {
      setMessage({ type: 'error', text: `You need ${config.entry_fee} tokens to join this tournament` });
      return;
    }

    // Check prize eligibility for significant prizes
    if (config.prize_pool >= 100) {
      const eligibility = await FixedGamesService.checkPrizeEligibility(user.id, config.prize_pool);
      if (!eligibility.eligible) {
        setMessage({ type: 'error', text: eligibility.reason });
        return;
      }
    }

    try {
      setJoiningSession(session.id);
      
      console.log('👤 [HotSell] Adding user to fixed game participants...');
      
      // Add user to fixed_game_participants table using the correct function
      const participant = await FixedGamesService.joinHotSellSession(
        session.id,
        user.id,
        config.entry_fee
      );
      
      if (participant) {
        console.log('✅ [HotSell] User added to participants:', participant);
        
        // Track user participation locally
        addUserParticipation(session.id);
        
        // Check if this is a duplicate join (user already had a score)
        const isDuplicateJoin = participant.score !== null && participant.score !== undefined;
        
        if (isDuplicateJoin) {
          setMessage({ type: 'info', text: `You have already played this tournament! Your score: ${participant.score}` });
          // Don't start the game again, just show the message
          return;
        }
        
        setMessage({ type: 'success', text: `Successfully joined ${config.title}! Game starting in 3 seconds...` });
        
        // Start the game flow with 3-second countdown
        console.log('🎮 [HotSell] Starting game flow:', {
          gameType: config.game_type,
          sessionId: session.id,
          configId: config.id,
          entryFee: config.entry_fee
        });
        
        setSelectedGameFlow({
          gameType: config.game_type,
          sessionId: session.id,
          configId: config.id,
          entryFee: config.entry_fee // Pass entry fee for token deduction
        });
        setCurrentView('game');
        
        // Refresh sessions and participants
        const updatedSessions = await FixedGamesService.getHotSellSessions();
        setHotSellSessions(updatedSessions);
        
        // Refresh participants for this session
        // Find the active game for this session's config
        const activeGames = await FixedGamesService.getActiveFixedGames('hot_sell');
        const activeGame = activeGames.find(game => game.config_id === session.config_id);
        
        if (activeGame) {
          const updatedParticipants = await FixedGamesService.getFixedGameParticipants(activeGame.id);
          setSessionParticipants(prev => ({
            ...prev,
            [session.id]: updatedParticipants
          }));
        }
        
        console.log('✅ [HotSell] Sessions and participants refreshed');
      } else {
        console.error('❌ [HotSell] Failed to add user to participants');
        setMessage({ type: 'error', text: 'Failed to join the tournament. Please try again.' });
      }
      
    } catch (error: any) {
      console.error('❌ [HotSell] Error joining session:', error);
      
      // Check if it's a duplicate user error
      if (error?.code === 'P0001' || error?.message?.includes('already joined')) {
        setMessage({ 
          type: 'info', 
          text: 'You have already joined this tournament!' 
        });
      } else {
        setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
      }
    } finally {
      setJoiningSession(null);
    }
  };

  const createHotSellSession = async (config: FixedGameConfig) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to create tournaments' });
      return;
    }

    // Location verification for legal compliance
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      console.log('Location verified:', position.coords);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Location verification required to create tournaments for legal compliance. Please enable location services.' 
      });
      return;
    }

    try {
      const session = await FixedGamesService.createHotSellSession(config.id);
      if (session) {
        setMessage({ type: 'success', text: `Created new ${config.title} session!` });
        loadHotSellData(); // Refresh the list
      } else {
        setMessage({ type: 'error', text: 'Failed to create hot sell session' });
      }
    } catch (error) {
      console.error('❌ [HotSell] Error creating session:', error);
      setMessage({ type: 'error', text: 'An error occurred while creating the session' });
    }
  };

  const joinHotSellListing = async (listing: HotSellListing) => {
    if (!user || !isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to join tournaments' });
      return;
    }

    if (userTokens < listing.entry_fee) {
      setMessage({ type: 'error', text: `You need ${listing.entry_fee} tokens to join this tournament` });
      return;
    }

    try {
      setJoiningListing(listing.id);
      
      // Deduct tokens from user
      const newTokenBalance = userTokens - listing.entry_fee;
      const tokenUpdateSuccess = await UserService.updateUserTokens(user.id, newTokenBalance);
      
      if (!tokenUpdateSuccess) {
        setMessage({ type: 'error', text: 'Failed to deduct tokens. Please try again.' });
        return;
      }

      // Join the listing
      const participant = await TournamentService.joinHotSellListing(
        listing.id,
        user.id,
        listing.entry_fee
      );

      if (participant) {
        setUserTokens(newTokenBalance);
        setMessage({ type: 'success', text: `Successfully joined ${listing.title}!` });
        
        // Refresh participants
        const updatedParticipants = await TournamentService.getHotSellParticipants(listing.id);
        setParticipants(prev => ({
          ...prev,
          [listing.id]: updatedParticipants
        }));
      } else {
        // Refund tokens if join failed
        await UserService.updateUserTokens(user.id, userTokens);
        setMessage({ type: 'error', text: 'Failed to join tournament. Tokens refunded.' });
      }
      
    } catch (error) {
      console.error('❌ [HotSell] Error joining listing:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setJoiningListing(null);
    }
  };

  const startGame = (listing: HotSellListing) => {
    setSelectedListing(listing);
    setCurrentView('game');
    setLocationVerified(false);
  };

  const viewScoreboard = (listing: HotSellListing) => {
    setSelectedListing(listing);
    setCurrentView('scoreboard');
  };

  const handleGameComplete = async (score: number, accuracy: number) => {
    if (!user || !selectedListing) return;

    try {
      // Save game history
      await SimpleGameService.saveGameHistory({
        userId: user.id,
        gameType: 'hot-sell',
        score: score,
        accuracy: accuracy,
        isPractice: false,
        isCompetition: true,
        listingId: selectedListing.id,
        metadata: {
          game_type: 'hot-sell',
          rng_seed: Math.floor(Math.random() * 20) + 1,
          tournament_type: 'hot_sell'
        }
      });

      // Update participant score
      await TournamentService.updateHotSellParticipantScore(
        selectedListing.id,
        user.id,
        score
      );

      console.log('✅ [HotSell] Game completed and saved:', { score, accuracy });
      
      // Show scoreboard after game completion
      setTimeout(() => {
        setCurrentView('scoreboard');
      }, 2000);
      
    } catch (error) {
      console.error('❌ [HotSell] Error saving game result:', error);
    }
  };

  const handleLocationVerified = () => {
    setLocationVerified(true);
  };

  const backToListings = () => {
    setCurrentView('listings');
    setSelectedListing(null);
    setLocationVerified(false);
  };

  // Check if user has already joined a competition
  const hasUserJoined = (competitionId: string) => {
    if (!user?.id) return false;
    
    // Check local state first
    if (userParticipations.includes(competitionId)) {
      return true;
    }
    
    // Check database participants for this session
    const participants = sessionParticipants[competitionId];
    if (participants && participants.length > 0) {
      const hasJoined = participants.some(p => p.user_id === user.id);
      console.log(`🔍 [HotSell] Checking if user ${user.id} joined ${competitionId}:`, hasJoined, participants);
      return hasJoined;
    }
    
    return false;
  };

  // Add user participation tracking
  const addUserParticipation = (competitionId: string) => {
    setUserParticipations(prev => [...prev, competitionId]);
  };

  const refreshParticipantsData = async () => {
    if (!hotSellSessions.length) return;
    
    try {
      console.log('🔄 Refreshing participants data...');
      const participantsData: { [sessionId: string]: FixedGameParticipant[] } = {};
      
      // Get all active games first
      const activeGames = await FixedGamesService.getActiveFixedGames('hot_sell');
      
      for (const session of hotSellSessions) {
        try {
          // Find the active game for this session's config
          const activeGame = activeGames.find(game => game.config_id === session.config_id);
          
          if (activeGame) {
            const participants = await FixedGamesService.getFixedGameParticipants(activeGame.id);
            participantsData[session.id] = participants;
          } else {
            participantsData[session.id] = [];
          }
        } catch (error) {
          console.error(`❌ Error loading participants for session ${session.id}:`, error);
          participantsData[session.id] = [];
        }
      }
      
      setSessionParticipants(participantsData);
      console.log('✅ Participants data refreshed');
    } catch (error) {
      console.error('❌ Error refreshing participants data:', error);
    }
  };

  // Callback to deduct tokens after game completion
  const handleGameCompletion = async (score: number, accuracy: number) => {
    if (!user || !selectedGameFlow?.entryFee) return;
    
    try {
      console.log('🎮 [HotSell] Game completed with score:', score, 'accuracy:', accuracy);
      
      // First, save the game history
      await SimpleGameService.saveGameHistory({
        user_id: user.id,
        game_type: selectedGameFlow.gameType,
        score: score,
        accuracy: accuracy,
        avg_reaction_time: 0,
        is_practice: false,
        listing_id: selectedGameFlow.sessionId,
        entry_number: 1,
        game_duration: 60
      });
      
      console.log('✅ [HotSell] Game history saved');
      
      // Update the participant score in fixed_game_participants table
      // Find the active_fixed_games record for this session's config
      const session = hotSellSessions.find(s => s.id === selectedGameFlow.sessionId);
      if (session) {
        // Find the active_fixed_games record for this config
        const activeGames = await FixedGamesService.getActiveFixedGames('hot_sell');
        const activeGame = activeGames.find(game => game.config_id === session.config_id);
        
        if (activeGame) {
          const participantUpdate = await FixedGamesService.updateFixedGameScore(
            activeGame.id,
            user.id,
            score,
            accuracy
          );
          
          if (participantUpdate) {
            console.log('✅ [HotSell] Participant score updated:', participantUpdate);
          } else {
            console.log('⚠️ [HotSell] Participant score update failed, but continuing...');
          }
        } else {
          console.log('⚠️ [HotSell] Could not find active game for config, skipping score update');
        }
      } else {
        console.log('⚠️ [HotSell] Could not find session, skipping score update');
      }
      
      // Deduct tokens after score is saved
      const newTokenBalance = userTokens - selectedGameFlow.entryFee;
      const tokenUpdateSuccess = await UserService.updateUserTokens(user.id, newTokenBalance);
      
      if (tokenUpdateSuccess) {
        setUserTokens(newTokenBalance);
        console.log(`✅ Tokens deducted: ${selectedGameFlow.entryFee} tokens`);
        console.log(`✅ New balance: ${newTokenBalance} tokens`);
        
        // Update the hot sell pot with the entry fee
        if (selectedGameFlow.sessionId) {
          console.log('💰 Updating hot sell pot with entry fee...');
          await FixedGamesService.updateHotSellPot(selectedGameFlow.sessionId);
          
          // Refresh sessions to show updated pot
          const updatedSessions = await FixedGamesService.getHotSellSessions();
          setHotSellSessions(updatedSessions);
          
          // Refresh participants for this session
          const updatedParticipants = await FixedGamesService.getFixedGameParticipants(selectedGameFlow.sessionId);
          setSessionParticipants(prev => ({
            ...prev,
            [selectedGameFlow.sessionId]: updatedParticipants
          }));
          
          console.log('✅ Hot sell pot updated, sessions refreshed, and participants updated');
          console.log('📊 Updated participants:', updatedParticipants.length, 'players with scores');
        }
      } else {
        console.error('❌ Failed to deduct tokens after game completion');
      }
      
      // Store a flag so dashboard knows to refresh
      localStorage.setItem('hasNewGameScore', 'true');
      console.log('🎉 [HotSell] ✅✅✅ SCORE SAVED SUCCESSFULLY TO YOUR DASHBOARD! ✅✅✅');
      
    } catch (error) {
      console.error('❌ Error in game completion:', error);
    }
  };

  const formatPrizeAmount = (amount: number) => {
    // For amounts less than $10, show decimals. For $10 and above, show whole dollars
    const showDecimals = amount < 10;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0
    }).format(amount);
  };

  // Winner Takes It All payout calculation (separate from hot sell)
  const calculateWinnerTakesAllPayouts = (config: FixedGameConfig) => {
    const title = config.title || '';
    
    // Extract prize amount from title (e.g., "$100 Winner Takes It All" -> 100)
    const prizeMatch = title.match(/\$(\d+(?:,\d{3})*)/);
    if (!prizeMatch) {
      console.warn('Could not extract prize amount from Winner Takes It All title:', title);
      return null;
    }
    
    const prizeAmount = parseInt(prizeMatch[1].replace(/,/g, ''));
    const platformFee = prizeAmount * 0.15; // 15% platform fee
    const winnerPrize = prizeAmount - platformFee; // Winner gets 85% of total
    
    return {
      winnerPrize: winnerPrize,
      platformFee: platformFee,
      totalPrize: prizeAmount,
      entryFee: 1, // Always 1 token = $1
      basePrice: Math.ceil(prizeAmount * 0.1), // Base price is 10% of total prize
      maxPlayers: null, // No limit for Winner Takes It All
      isWinnerTakesAll: true
    };
  };

  // Comprehensive payout calculation system for Hot Sell tournaments
  const calculateTournamentPayouts = (config: FixedGameConfig) => {
    const title = config.title || '';
    
    // Extract prize amount from title (e.g., "$100 Hot Sell" -> 100)
    const prizeMatch = title.match(/\$(\d+(?:,\d{3})*)/);
    if (!prizeMatch) {
      console.warn('Could not extract prize amount from title:', title);
      return null;
    }
    
    const prizeAmount = parseInt(prizeMatch[1].replace(/,/g, ''));
    const platformFee = prizeAmount * 0.15; // 15% platform fee
    const remainingPool = prizeAmount - platformFee;
    
    // Determine payout structure based on prize amount
    let payouts;
    
    if (prizeAmount === 2) {
      // $2 Hot Sell: 1st gets $1.50, 2nd gets $0.35, no 3rd
      payouts = {
        first: 1.50,
        second: 0.35,
        third: 0,
        platformFee: 0.15,
        maxPlayers: 2
      };
    } else if (prizeAmount === 3) {
      // $3 Hot Sell: Winner gets $2.10, 2nd gets $0.45, no 3rd
      payouts = {
        first: 2.10,
        second: 0.45,
        third: 0,
        platformFee: 0.45,
        maxPlayers: 2
      };
    } else if (prizeAmount === 10) {
      // $10 Hot Sell: 1st gets $4.25, 2nd gets $2.55, 3rd gets $1.70
      payouts = {
        first: 4.25,
        second: 2.55,
        third: 1.70,
        platformFee: 1.50,
        maxPlayers: 10
      };
    } else if (prizeAmount === 100) {
      // $100 Hot Sell: Winner gets $85, 2nd gets $15, no 3rd
      payouts = {
        first: 85,
        second: 15,
        third: 0,
        platformFee: 15,
        maxPlayers: 100
      };
    } else if (prizeAmount === 250) {
      // $250 Hot Sell: Winner gets $212.50, 2nd gets $37.50, no 3rd
      payouts = {
        first: 212.50,
        second: 37.50,
        third: 0,
        platformFee: 37.50,
        maxPlayers: 250
      };
    } else if (prizeAmount === 1000) {
      // $1000 Hot Sell: Winner gets $850, 2nd gets $150, no 3rd
      payouts = {
        first: 850,
        second: 150,
        third: 0,
        platformFee: 150,
        maxPlayers: 1000
      };
    } else if (prizeAmount === 2500) {
      // $2500 Hot Sell: Winner gets $2125, 2nd gets $375, no 3rd
      payouts = {
        first: 2125,
        second: 375,
        third: 0,
        platformFee: 375,
        maxPlayers: 2500
      };
    } else {
      // Default calculation for other amounts
      payouts = {
        first: Math.round(remainingPool * 0.5 * 100) / 100,
        second: Math.round(remainingPool * 0.3 * 100) / 100,
        third: Math.round(remainingPool * 0.2 * 100) / 100,
        platformFee: Math.round(platformFee * 100) / 100,
        maxPlayers: prizeAmount // 1 player per dollar
      };
    }
    
    return {
      ...payouts,
      totalPrize: prizeAmount,
      entryFee: 1, // Always 1 token = $1
      playersNeeded: payouts.maxPlayers
    };
  };

  // Adjust entry fees using appropriate payout calculation
  const adjustEntryFee = (config: FixedGameConfig) => {
    // Check if this is a Winner Takes It All tournament
    if (config.title?.includes('Winner Takes It All')) {
      const payouts = calculateWinnerTakesAllPayouts(config);
      
      if (!payouts) {
        console.warn('Could not calculate Winner Takes It All payouts for config:', config.title);
        return config;
      }
      
      return {
        ...config,
        entry_fee: payouts.entryFee,
        prize_pool: payouts.totalPrize,
        max_participants: 999999 // Very high number to simulate unlimited
      };
    } else {
      // Regular Hot Sell tournament
      const payouts = calculateTournamentPayouts(config);
      
      if (!payouts) {
        console.warn('Could not calculate payouts for config:', config.title);
        return config;
      }
      
      return {
        ...config,
        entry_fee: payouts.entryFee,
        prize_pool: payouts.totalPrize,
        max_participants: payouts.maxPlayers
      };
    }
  };

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'multi_target_reaction': return '🎯';
      case 'sword_parry': return '⚔️';
      case 'laser_dodge': return '💥';
      case 'memory_color': return '🎨';
      case 'number_tap': return '🔢';
      default: return '🎮';
    }
  };

  const formatTimeRemaining = (minutes: number, seconds: number): string => {
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  if (isLoading) {
  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white">
        <CleanNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg">Loading hot sell tournaments...</span>
                </div>
              </div>
              </div>
    );
  }

  // Render game flow view
  if (currentView === 'game' && selectedGameFlow) {
    // Find the game configuration to get the RNG seed
    const gameConfig = fixedGameConfigs.find(config => config.id === selectedGameFlow.configId);
    const rngSeed = gameConfig?.rng_seed || 1;
    
    console.log('🎮 [HotSell] Rendering CompetitionGameFlow:', {
      currentView,
      selectedGameFlow,
      gameConfig,
      rngSeed
    });
    
    return (
      <ErrorBoundary>
        <CompetitionGameFlow
          gameType={selectedGameFlow.gameType}
          sessionId={selectedGameFlow.sessionId}
          configId={selectedGameFlow.configId}
          rngSeed={rngSeed}
          onComplete={(score, accuracy) => {
            console.log('Game completed:', { score, accuracy });
            // Deduct tokens after game completion
            handleGameCompletion(score, accuracy);
            setCurrentView('listings');
            setSelectedGameFlow(null);
          }}
          onCancel={() => {
            setCurrentView('listings');
            setSelectedGameFlow(null);
          }}
        />
      </ErrorBoundary>
    );
  }

  // Render legacy game view
  if (currentView === 'game' && selectedListing) {
    return (
      <HotSellGame
        listing={selectedListing}
        onGameComplete={handleGameComplete}
        onLocationVerified={handleLocationVerified}
      />
    );
  }

  // Render scoreboard view
  if (currentView === 'scoreboard' && selectedListing) {
    return (
      <HotSellScoreboard listing={selectedListing} />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/5 rounded-full blur-2xl animate-pulse delay-500"></div>
                </div>
      
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <FireIcon className="w-12 h-12 text-red-500 mr-4 animate-pulse" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              HOT SELL
            </h1>
                </div>
          <p className="text-xl text-gray-300 mb-2">Massive Cash Prize Tournaments</p>
          <p className="text-lg text-gray-400">Compete for huge payouts with real money prizes</p>
          
          {/* User Token Balance */}
          {isAuthenticated && (
            <div className="mt-6 inline-flex items-center bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/20">
              <BanknotesIcon className="w-6 h-6 text-yellow-400 mr-3" />
              <span className="text-lg font-semibold">Your Tokens: {userTokens}</span>
            </div>
          )}
            </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'success' 
              ? 'bg-green-500/20 border-green-500/50 text-green-300' 
              : 'bg-red-500/20 border-red-500/50 text-red-300'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircleIcon className="w-5 h-5 mr-2" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* Hot Sell Games - PRIORITY SECTION */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">🎯 HOT SELL GAMES</h2>
            <p className="text-lg text-gray-300">Daily tournaments with guaranteed prizes and 2-hour timers</p>
            {prizeEligibility && (
              <div className={`mt-4 inline-flex items-center rounded-2xl px-6 py-3 border ${
                prizeEligibility.eligible 
                  ? 'bg-green-500/20 border-green-500/50 text-green-300' 
                  : 'bg-red-500/20 border-red-500/50 text-red-300'
              }`}>
                {prizeEligibility.eligible ? (
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                )}
                <span className="text-sm">{prizeEligibility.reason}</span>
        </div>
            )}
              </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {fixedGameConfigs.map((config) => {
              const adjustedConfig = adjustEntryFee(config);
              const session = hotSellSessions.find(s => s.config_id === config.id);
              const timer = session ? timeRemaining[session.id] : null;
              const isWinnerTakesAll = adjustedConfig.title?.includes('Winner Takes It All');
              const prizeDistribution = isWinnerTakesAll 
                ? calculateWinnerTakesAllPayouts(adjustedConfig)
                : calculateTournamentPayouts(adjustedConfig);
              const isHotSell = timer?.isHotSell || false;
              const canJoin = userTokens >= adjustedConfig.entry_fee;
              
              // Skip rendering if payout calculation failed
              if (!prizeDistribution) {
                console.warn('Skipping config due to payout calculation failure:', adjustedConfig.title);
                return null;
              }
              
              return (
                <div key={config.id} className={`bg-white/10 backdrop-blur-xl rounded-3xl p-6 border transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                  isHotSell ? 'border-red-500/50 bg-red-500/10' : 'border-white/20 hover:bg-white/15'
                }`}>
                  {/* Game Header */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <span className="text-3xl mr-3">{getGameIcon(config.game_type)}</span>
                        <h3 className="text-xl font-bold text-white">{adjustedConfig.title}</h3>
              </div>
                      <div className={`flex items-center rounded-full px-3 py-1 ${
                        isHotSell ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {isHotSell ? (
                          <>
                            <BoltIcon className="w-4 h-4 mr-1" />
                            <span className="text-xs font-semibold">HOT SELL</span>
                          </>
                        ) : (
                          <>
                            <ClockIcon className="w-4 h-4 mr-1" />
                            <span className="text-xs font-semibold">WAITING</span>
                          </>
                        )}
              </div>
            </div>
                    
                    <p className="text-gray-300 mb-4">{adjustedConfig.description}</p>
                    
                    {/* Prize Pool */}
                    <div className={`rounded-2xl p-4 mb-4 ${
                      isHotSell 
                        ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                        : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    }`}>
          <div className="text-center">
                        <p className="text-yellow-100 text-sm font-medium mb-1">PRIZE POOL</p>
                        <p className="text-2xl font-bold text-white">{formatPrizeAmount(adjustedConfig.prize_pool)}</p>
                        {session && (
                          <p className="text-yellow-100 text-xs mt-1">
                            Current Pot: {formatPrizeAmount(session.current_pot)} ({session.participants_count} players)
                          </p>
                        )}
          </div>
        </div>
      </div>

                  {/* Timer Display */}
                  {timer && (
                    <div className="mb-4">
                      <div className={`text-center p-3 rounded-xl ${
                        isWinnerTakesAll ? (
                          timer.isBasePriceMet ? 'bg-green-500/20 border border-green-500/50' : 'bg-yellow-500/20 border border-yellow-500/50'
                        ) : (
                          isHotSell ? 'bg-red-500/20 border border-red-500/50' : 
                          session && session.current_pot >= session.target_pot ? 'bg-blue-500/20 border border-blue-500/50' :
                          'bg-yellow-500/20 border border-yellow-500/50'
                        )
                      }`}>
                        <div className="flex items-center justify-center mb-2">
                          <ClockIcon className={`w-5 h-5 mr-2 ${
                            isWinnerTakesAll ? (
                              timer.isBasePriceMet ? 'text-green-400' : 'text-yellow-400'
                            ) : (
                              isHotSell ? 'text-red-400' : 
                              session && session.current_pot >= session.target_pot ? 'text-blue-400' :
                              'text-yellow-400'
                            )
                          }`} />
                          <span className={`font-semibold ${
                            isWinnerTakesAll ? (
                              timer.isBasePriceMet ? 'text-green-300' : 'text-yellow-300'
                            ) : (
                              isHotSell ? 'text-red-300' : 
                              session && session.current_pot >= session.target_pot ? 'text-blue-300' :
                              'text-yellow-300'
                            )
                          }`}>
                            {isWinnerTakesAll ? (
                              timer.isBasePriceMet ? 'Game Timer Active!' : 'Waiting for Base Price'
                            ) : (
                              isHotSell ? 'HOT SELL MODE!' : 
                              session && session.current_pot >= session.target_pot ? 'Time Remaining' :
                              'Waiting for Base Price'
                            )}
                          </span>
                        </div>
                        <p className={`text-lg font-bold ${
                          isWinnerTakesAll ? (
                            timer.isBasePriceMet ? 'text-green-300' : 'text-yellow-300'
                          ) : (
                            isHotSell ? 'text-red-300' : 
                            session && session.current_pot >= session.target_pot ? 'text-blue-300' :
                            'text-yellow-300'
                          )
                        }`}>
                          {isWinnerTakesAll ? (
                            timer.isBasePriceMet ? formatTimeRemaining(timer.minutes, timer.seconds) : 
                            `Need $${timer.basePrice || 0} more to start`
                          ) : (
                            isHotSell ? formatTimeRemaining(timer.minutes, timer.seconds) :
                            session && session.current_pot >= session.target_pot ? formatTimeRemaining(timer.minutes, timer.seconds) :
                            `Need ${session?.target_pot || 0} more players`
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Prize Distribution */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                      <TrophyIcon className="w-4 h-4 mr-2 text-yellow-400" />
                      {isWinnerTakesAll ? 'Winner Takes All' : 'Prize Distribution'}
                    </h4>
                    <div className="space-y-2">
                      {isWinnerTakesAll ? (
                        // Winner Takes It All display
                        <>
                          <div className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mr-2">
                                <span className="text-white font-bold text-xs">👑</span>
                              </div>
                              <span className="text-white text-sm">Winner Takes All</span>
                            </div>
                            <span className="text-yellow-400 font-bold text-sm">{formatPrizeAmount(prizeDistribution.winnerPrize)}</span>
                          </div>
                          <div className="flex items-center justify-between bg-red-500/20 rounded-lg p-2 border border-red-500/30">
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-2">
                                <span className="text-white font-bold text-xs">📊</span>
                              </div>
                              <span className="text-red-300 text-sm">Platform Fee (15%)</span>
                            </div>
                            <span className="text-red-400 font-bold text-sm">{formatPrizeAmount(prizeDistribution.platformFee)}</span>
                          </div>
                        </>
                      ) : (
                        // Regular Hot Sell display
                        <>
                          <div className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mr-2">
                                <span className="text-white font-bold text-xs">1</span>
              </div>
                              <span className="text-white text-sm">1st Place</span>
              </div>
                            <span className="text-yellow-400 font-bold text-sm">{formatPrizeAmount(prizeDistribution.first)}</span>
              </div>
                          <div className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center mr-2">
                                <span className="text-white font-bold text-xs">2</span>
              </div>
                              <span className="text-white text-sm">2nd Place</span>
              </div>
                            <span className="text-gray-300 font-bold text-sm">{formatPrizeAmount(prizeDistribution.second)}</span>
              </div>
                          {/* Only show 3rd place if there's a prize for it */}
                          {prizeDistribution.third > 0 && (
                            <div className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                              <div className="flex items-center">
                                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mr-2">
                                  <span className="text-white font-bold text-xs">3</span>
                                </div>
                                <span className="text-white text-sm">3rd Place</span>
                              </div>
                              <span className="text-orange-400 font-bold text-sm">{formatPrizeAmount(prizeDistribution.third)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between bg-red-500/20 rounded-lg p-2 border border-red-500/30">
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-2">
                                <span className="text-white font-bold text-xs">📊</span>
      </div>
                              <span className="text-red-300 text-sm">Platform Fee (15%)</span>
              </div>
                            <span className="text-red-400 font-bold text-sm">{formatPrizeAmount(prizeDistribution.platformFee)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                <div className="mb-4">
                    {isWinnerTakesAll ? (
                      // Winner Takes It All progress (base price based)
                      <>
                        <div className="flex justify-between text-sm text-gray-300 mb-2">
                          <span>Pot Progress</span>
                          <span>{formatPrizeAmount(session?.current_pot || 0)} / {formatPrizeAmount(timer?.basePrice || prizeDistribution.basePrice)} base price</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                          <div 
                            className="h-3 rounded-full transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-500" 
                            style={{ 
                              width: `${Math.min(100, ((session?.current_pot || 0) / (timer?.basePrice || prizeDistribution.basePrice)) * 100)}%` 
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>Base Price: {formatPrizeAmount(timer?.basePrice || prizeDistribution.basePrice)}</span>
                          <span>Players: {session?.participants_count || 0} (Unlimited)</span>
                        </div>
                      </>
                    ) : (
                      // Regular Hot Sell progress (player count based)
                      <>
                        <div className="flex justify-between text-sm text-gray-300 mb-2">
                          <span>Participants Progress</span>
                          <span>{session?.participants_count || 0} / {adjustedConfig.max_participants} players</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-300 ${
                              isHotSell 
                                ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                                : 'bg-gradient-to-r from-blue-500 to-purple-500'
                            }`} 
                            style={{ 
                              width: `${Math.min(100, ((session?.participants_count || 0) / adjustedConfig.max_participants) * 100)}%` 
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>Target: {adjustedConfig.max_participants} players</span>
                          <span>Remaining: {Math.max(0, adjustedConfig.max_participants - (session?.participants_count || 0))} players</span>
                        </div>
                      </>
                    )}
                  </div>
                
                  {/* Game Info */}
                  <div className="mb-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <BanknotesIcon className="w-4 h-4 text-green-400 mr-2" />
                        <span className="text-gray-300 text-sm">Entry Fee</span>
                      </div>
                      <span className="text-white font-semibold text-sm">{adjustedConfig.entry_fee} tokens</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <UsersIcon className="w-4 h-4 text-blue-400 mr-2" />
                        <span className="text-gray-300 text-sm">Max Players</span>
                      </div>
                      <span className="text-white font-semibold text-sm">{adjustedConfig.max_participants}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 text-blue-400 mr-2" />
                        <span className="text-gray-300 text-sm">Duration</span>
                      </div>
                      <span className="text-white font-semibold text-sm">{adjustedConfig.game_duration}s</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {!isAuthenticated ? (
                      <div className="bg-gray-600 rounded-xl p-3 text-center">
                        <p className="text-gray-300 text-sm">Please log in to join tournaments</p>
                      </div>
                    ) : !canJoin ? (
                      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-center">
                        <p className="text-red-300 text-sm">You need {adjustedConfig.entry_fee} tokens to join</p>
                      </div>
                    ) : (
                      <>
                        {session ? (
                          <button
                            onClick={() => joinHotSellSession(session, adjustedConfig)}
                            disabled={joiningSession === session.id || hasUserJoined(session.id)}
                            className={`w-full font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                              isHotSell 
                                ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white'
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                            }`}
                          >
                            {joiningSession === session.id ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Joining...
                              </div>
                            ) : hasUserJoined(session.id) ? (
                              <div className="flex items-center justify-center">
                                ✅ ALREADY JOINED
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                {isHotSell ? (
                                  <>
                                    <LockClosedIcon className="w-4 h-4 mr-2" />
                                    <BoltIcon className="w-4 h-4 mr-2" />
                                    JOIN HOT SELL - {adjustedConfig.entry_fee} TOKENS
                                  </>
                                ) : (
                                  <>
                                    <LockClosedIcon className="w-4 h-4 mr-2" />
                                    <PlayIcon className="w-4 h-4 mr-2" />
                                    JOIN SESSION - {adjustedConfig.entry_fee} TOKENS
                                  </>
                                )}
                              </div>
                            )}
                    </button>
                        ) : (
                          <button
                            onClick={() => createHotSellSession(adjustedConfig)}
                            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                          >
                            <div className="flex items-center justify-center">
                              <LockClosedIcon className="w-4 h-4 mr-2" />
                              START NEW SESSION
                            </div>
                    </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Scoreboard Section */}
                  <div className="mt-6">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                      <button
                        onClick={() => {
                          const scoreboardElement = document.getElementById(`scoreboard-${config.id}`);
                          if (scoreboardElement) {
                            scoreboardElement.classList.toggle('hidden');
                          }
                        }}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <h4 className="text-sm font-semibold text-white flex items-center">
                          <TrophyIcon className="w-4 h-4 mr-2 text-yellow-400" />
                          Live Scoreboard
                        </h4>
                        <span className="text-gray-400 text-xs">Click to expand</span>
                    </button>
                      
                      <div id={`scoreboard-${config.id}`} className="hidden mt-3">
                        {session && session.participants_count > 0 ? (
                          <div className="space-y-2">
                            {/* Show locked message for users who haven't played */}
                            {!hasUserJoined(session.id) && (
                              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-center">
                                <div className="flex items-center justify-center">
                                  <LockClosedIcon className="w-4 h-4 mr-2 text-yellow-400" />
                                  <span className="text-yellow-300 text-sm font-medium">
                                    Join the game to see live scores!
                                  </span>
                  </div>
                </div>
                            )}
                            
                            {/* Show scores for users who have played */}
                            {hasUserJoined(session.id) && (
                              <div className="space-y-2">
                                <div className="text-center text-gray-400 text-xs mb-2">
                                  <UsersIcon className="w-4 h-4 inline mr-1" />
                                  {session.participants_count} players • {session.participants_count > 0 ? 'Game in progress' : 'Waiting for players'}
                                </div>
                                
                                {/* Real participant scores */}
                                {sessionParticipants[session.id] && sessionParticipants[session.id].length > 0 ? (
                                  <div className="space-y-2">
                                    {sessionParticipants[session.id]
                                      .filter(p => p.score !== null && p.score !== undefined)
                                      .sort((a, b) => (b.score || 0) - (a.score || 0))
                                      .map((participant, index) => (
                                        <div key={participant.id} className="bg-white/5 rounded-lg p-3">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                                                participant.user_id === user?.id ? 'bg-yellow-500' : 
                                                index === 0 ? 'bg-yellow-500' : 
                                                index === 1 ? 'bg-gray-400' : 
                                                index === 2 ? 'bg-orange-500' : 'bg-gray-600'
                                              }`}>
                                                <span className="text-white font-bold text-xs">{index + 1}</span>
                </div>
                                              <span className="text-white text-sm">
                                                {participant.user_id === user?.id ? 'You' : `Player ${participant.user_id.slice(-4)}`}
                                              </span>
                                            </div>
                                            <span className="text-yellow-400 font-bold text-sm">{participant.score}</span>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                ) : (
                                  <div className="bg-white/5 rounded-lg p-3 text-center">
                                    <span className="text-gray-400 text-sm">No scores yet - game in progress</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 text-sm">
                            {session ? 'No players yet. Be the first to join!' : 'No active session. Create a session to start playing!'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
              </div>
            </div>

        {/* Winner Takes It All Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">🏆 WINNER TAKES IT ALL</h2>
            <p className="text-lg text-gray-300">1 token entry tournaments - Winner gets everything!</p>
            <p className="text-sm text-gray-400">Base pot: $3, grows with each player! No limits on participants.</p>
              </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Winner Takes It All Games */}
            {fixedGameConfigs.map((config) => {
              const winnerTakesAllConfig = {
                ...config,
                title: `Winner Takes All - ${config.title}`,
                entry_fee: 1, // 1 token entry
                prize_pool: 3, // $3 base prize pool
                max_participants: 2, // 2 players max
                description: `1 token entry - Winner takes everything! Base pot: $3, grows with each player.`
              };
              
              return (
                <div key={`winner-${config.id}`} className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:bg-white/15">
                  {/* Game Header */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <span className="text-3xl mr-3">🏆</span>
                        <h3 className="text-xl font-bold text-white">{winnerTakesAllConfig.title}</h3>
                  </div>
                      <div className="flex items-center rounded-full px-3 py-1 bg-purple-500/20 text-purple-300">
                        <StarIcon className="w-4 h-4 mr-1" />
                        <span className="text-xs font-semibold">WINNER TAKES ALL</span>
                  </div>
                </div>
                
                    <p className="text-gray-300 mb-4">{winnerTakesAllConfig.description}</p>
                    
                    {/* Entry Fee */}
                    <div className="rounded-2xl p-4 mb-4 bg-gradient-to-r from-green-500 to-emerald-500">
                      <div className="text-center">
                        <p className="text-green-100 text-sm font-medium mb-1">ENTRY FEE</p>
                        <p className="text-2xl font-bold text-white">{formatPrizeAmount(winnerTakesAllConfig.entry_fee)}</p>
                  </div>
                </div>
                
                    {/* Current Pot (starts at $3) */}
                    <div className="rounded-2xl p-4 mb-4 bg-gradient-to-r from-purple-500 to-pink-500">
                      <div className="text-center">
                        <p className="text-purple-100 text-sm font-medium mb-1">CURRENT POT</p>
                        <p className="text-2xl font-bold text-white">$3.00</p>
                        <p className="text-purple-200 text-xs mt-1">Base pot: $3, grows with players</p>
              </div>
            </div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-300 mb-2">
                        <span>Progress to Target</span>
                        <span>0 / {winnerTakesAllConfig.max_participants} players</span>
                  </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Target: {winnerTakesAllConfig.max_participants} players</span>
                        <span>Remaining: {winnerTakesAllConfig.max_participants} players</span>
                  </div>
                </div>
                
                    {/* Game Info */}
                    <div className="space-y-2 text-sm text-gray-300 mb-6">
                      <div className="flex justify-between">
                        <span>Game Type:</span>
                        <span className="text-white font-medium">{getGameIcon(config.game_type)} {config.game_type.replace('_', ' ').toUpperCase()}</span>
              </div>
                      <div className="flex justify-between">
                        <span>Max Players:</span>
                        <span className="text-white font-medium">{winnerTakesAllConfig.max_participants}</span>
                  </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="text-white font-medium">{config.game_duration}s</span>
                  </div>
                </div>
                
                    {/* Scoreboard Section */}
                    <div className="mt-6 mb-4">
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <button
                          onClick={() => {
                            const scoreboardElement = document.getElementById(`winner-scoreboard-${config.id}`);
                            if (scoreboardElement) {
                              scoreboardElement.classList.toggle('hidden');
                            }
                          }}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <h4 className="text-sm font-semibold text-white flex items-center">
                            <TrophyIcon className="w-4 h-4 mr-2 text-yellow-400" />
                            Live Scoreboard
                          </h4>
                          <span className="text-gray-400 text-xs">Click to expand</span>
                    </button>
                        
                        <div id={`winner-scoreboard-${config.id}`} className="hidden mt-3">
                          <div className="space-y-2">
                            {/* Show locked message for users who haven't played */}
                            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center">
                                <LockClosedIcon className="w-4 h-4 mr-2 text-yellow-400" />
                                <span className="text-yellow-300 text-sm font-medium">
                                  Join the game to see live scores!
                                </span>
                  </div>
                </div>
                
                            {/* Payout Information */}
                            <div className="bg-green-50 rounded-lg p-3 border border-green-200 mt-3">
                              <div className="text-center">
                                <div className="text-green-700 text-xs font-medium mb-1">Winner Takes All</div>
                                <div className="text-green-800 font-bold text-sm">
                                  Winner Gets: $3.00
                                  <span className="text-xs text-green-600 ml-1">(grows with each player)</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Join Button */}
                    <div className="space-y-3">
                      {isAuthenticated ? (
                        <button
                          onClick={() => joinWinnerTakesAll(config.id)}
                          disabled={joiningSession || userTokens < winnerTakesAllConfig.entry_fee}
                          className={`w-full py-3 px-6 rounded-2xl font-bold text-white transition-all duration-300 ${
                            userTokens >= winnerTakesAllConfig.entry_fee
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 hover:scale-105 shadow-lg hover:shadow-xl'
                              : 'bg-gray-600 cursor-not-allowed opacity-50'
                          }`}
                        >
                          {joiningSession ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Joining...
                            </div>
                          ) : userTokens >= winnerTakesAllConfig.entry_fee ? (
                            `🔒 JOIN FOR ${formatPrizeAmount(winnerTakesAllConfig.entry_fee)}`
                          ) : (
                            '❌ Insufficient Tokens'
                          )}
                </button>
                      ) : (
                        <div className="text-center py-3 px-6 rounded-2xl bg-gray-600 text-gray-400">
                          Please log in to join
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
              </div>
            </div>

        {/* Blind Scoreboard Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">🎯 BLIND SCOREBOARD</h2>
            <p className="text-lg text-gray-300">Competitive matches with hidden scores until completion</p>
            <p className="text-sm text-gray-400">Scores are revealed only after all players finish</p>
                </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {blindListings.map((listing) => (
              <div key={listing.id} className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:bg-white/15">
                {/* Game Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">{getGameIcon(listing.game_key)}</span>
                      <h3 className="text-xl font-bold text-white">{listing.title}</h3>
                    </div>
                    <div className="flex items-center bg-purple-500/20 rounded-full px-3 py-1">
                      <LockClosedIcon className="w-4 h-4 mr-1" />
                      <span className="text-purple-300 text-xs font-semibold">BLIND</span>
              </div>
            </div>

                  <p className="text-gray-300 mb-4">{listing.game_key.replace('_', ' ').toUpperCase()}</p>
                  
                  {/* Entry Fee */}
                  <div className="rounded-2xl p-4 mb-4 bg-gradient-to-r from-purple-500 to-pink-500">
                    <div className="text-center">
                      <p className="text-purple-100 text-sm font-medium mb-1">ENTRY FEE</p>
                      <p className="text-2xl font-bold text-white">{listing.entry_cost_tokens} tokens</p>
              </div>
                  </div>
                  
                  {/* Players Required */}
                  <div className="rounded-2xl p-4 mb-4 bg-gradient-to-r from-blue-500 to-cyan-500">
                    <div className="text-center">
                      <p className="text-blue-100 text-sm font-medium mb-1">PLAYERS REQUIRED</p>
                      <p className="text-2xl font-bold text-white">{listing.required_players}</p>
                  </div>
                  </div>
                </div>
                
                {/* Blind Scoreboard Component */}
                <BlindScoreboard
                  listing={listing}
                  onGameStart={(matchId) => {
                    console.log('🎮 Blind game starting for match:', matchId);
                    // Handle game start
                  }}
                  onScoreSubmit={(matchId, score) => {
                    console.log('📊 Blind score submitted:', { matchId, score });
                    // Handle score submission
                  }}
                />
              </div>
            ))}
                  </div>
                </div>
                
        {/* Hot Sell Listings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {hotSellListings.map((listing) => {
            const listingParticipants = participants[listing.id] || [];
            const prizeDistribution = calculateTournamentPayouts({ title: listing.title, prize_pool: listing.prize_pool } as FixedGameConfig);
            const isJoined = listingParticipants.some(p => p.user_id === user?.id);
            const canJoin = userTokens >= listing.entry_fee && !isJoined && listingParticipants.length < listing.max_participants;
            
            // Skip rendering if payout calculation failed
            if (!prizeDistribution) {
              console.warn('Skipping listing due to payout calculation failure:', listing.title);
              return null;
            }
            
            return (
              <div key={listing.id} className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                {/* Tournament Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">{listing.title}</h2>
                    <div className="flex items-center bg-red-500/20 rounded-full px-4 py-2">
                      <FireIcon className="w-5 h-5 text-red-400 mr-2" />
                      <span className="text-red-300 font-semibold">HOT</span>
              </div>
                  </div>
                  
                  <p className="text-gray-300 mb-4">{listing.description}</p>
                  
                  {/* Prize Pool */}
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-6 mb-6">
                    <div className="text-center">
                      <p className="text-yellow-100 text-sm font-medium mb-2">TOTAL PRIZE POOL</p>
                      <p className="text-4xl font-bold text-white">{formatPrizeAmount(listing.prize_pool)}</p>
                      <p className="text-yellow-100 text-sm mt-2">(15% fee deducted from prizes)</p>
                </div>
              </div>
            </div>

                {/* Prize Distribution */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <TrophyIcon className="w-5 h-5 mr-2 text-yellow-400" />
                    Prize Distribution
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">1</span>
              </div>
                        <span className="text-white font-medium">1st Place</span>
                      </div>
                      <span className="text-yellow-400 font-bold text-lg">{formatPrizeAmount(prizeDistribution.first)}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">2</span>
                        </div>
                        <span className="text-white font-medium">2nd Place</span>
                      </div>
                      <span className="text-gray-300 font-bold text-lg">{formatPrizeAmount(prizeDistribution.second)}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">3</span>
                        </div>
                        <span className="text-white font-medium">3rd Place</span>
                      </div>
                      <span className="text-orange-400 font-bold text-lg">{formatPrizeAmount(prizeDistribution.third)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Tournament Info */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BanknotesIcon className="w-5 h-5 text-green-400 mr-2" />
                      <span className="text-gray-300">Entry Fee</span>
                  </div>
                    <span className="text-white font-semibold">{listing.entry_fee} tokens</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UsersIcon className="w-5 h-5 text-blue-400 mr-2" />
                      <span className="text-gray-300">Participants</span>
            </div>
                    <span className="text-white font-semibold">{listingParticipants.length}/{listing.max_participants}</span>
                </div>
                
                  {/* Progress Bar for Original Hot Sell Listings */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-300 mb-2">
                      <span>Participants Progress</span>
                      <span>{listingParticipants.length} / {listing.max_participants} players</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className="h-3 rounded-full transition-all duration-300 bg-gradient-to-r from-yellow-500 to-orange-500" 
                        style={{ 
                          width: `${Math.min(100, (listingParticipants.length / listing.max_participants) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Target: {listing.max_participants} players</span>
                      <span>Remaining: {Math.max(0, listing.max_participants - listingParticipants.length)} players</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <StarIcon className="w-5 h-5 text-purple-400 mr-2" />
                      <span className="text-gray-300">Game Type</span>
                    </div>
                    <span className="text-white font-semibold capitalize">{listing.game_type.replace('-', ' ')}</span>
                  </div>
                </div>
                
                {/* Scoreboard Section */}
                <div className="mt-6 mb-4">
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <button
                      onClick={() => {
                        const scoreboardElement = document.getElementById(`listing-scoreboard-${listing.id}`);
                        if (scoreboardElement) {
                          scoreboardElement.classList.toggle('hidden');
                        }
                      }}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <h4 className="text-sm font-semibold text-white flex items-center">
                        <TrophyIcon className="w-4 h-4 mr-2 text-yellow-400" />
                        Live Scoreboard
                      </h4>
                      <span className="text-gray-400 text-xs">Click to expand</span>
                </button>
                
                    <div id={`listing-scoreboard-${listing.id}`} className="hidden mt-3">
                      {listingParticipants.length > 0 ? (
                        <div className="space-y-2">
                          {/* Show locked message for users who haven't played */}
                          {!isJoined && (
                            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center">
                                <LockClosedIcon className="w-4 h-4 mr-2 text-yellow-400" />
                                <span className="text-yellow-300 text-sm font-medium">
                                  Join the tournament to see live scores!
                                </span>
                </div>
              </div>
                          )}
                          
                          {/* Show scores for users who have played */}
                          {isJoined && (
                            <div className="space-y-2">
                              <div className="text-center text-gray-400 text-xs mb-2">
                                <UsersIcon className="w-4 h-4 inline mr-1" />
                                {listingParticipants.length} players • Tournament active
            </div>

                              {/* Placeholder for actual scores - will be populated after game completion */}
                              <div className="bg-white/5 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mr-2">
                                      <span className="text-white font-bold text-xs">1</span>
              </div>
                                    <span className="text-white text-sm">Your Score</span>
                                  </div>
                                  <span className="text-yellow-400 font-bold text-sm">--</span>
                                </div>
                              </div>
                              
                              <div className="text-center text-gray-500 text-xs">
                                Scores will appear after game completion
                  </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-gray-400 text-sm">
                          No players yet. Be the first to join!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  {!isAuthenticated ? (
                    <div className="bg-gray-600 rounded-xl p-4">
                      <p className="text-gray-300 mb-2">Please log in to join tournaments</p>
                    </div>
                  ) : isJoined ? (
                    <div className="space-y-3">
                      <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
                        <div className="flex items-center justify-center">
                          <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
                          <span className="text-green-300 font-semibold">You're in this tournament!</span>
                  </div>
                </div>
                
                      {/* Play Game Button */}
                      <button
                        onClick={() => startGame(listing)}
                        className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        <div className="flex items-center justify-center">
                          <PlayIcon className="w-5 h-5 mr-2" />
                          PLAY GAME
                        </div>
                </button>
                
                      {/* View Scoreboard Button */}
                      <button
                        onClick={() => viewScoreboard(listing)}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        <div className="flex items-center justify-center">
                          <EyeIcon className="w-5 h-5 mr-2" />
                          VIEW SCOREBOARD
                </div>
                      </button>
              </div>
                  ) : !canJoin ? (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                      <p className="text-red-300">
                        {userTokens < listing.entry_fee 
                          ? `You need ${listing.entry_fee} tokens to join`
                          : 'Tournament is full'
                        }
                      </p>
            </div>
                  ) : (
                    <button
                      onClick={() => joinHotSellListing(listing)}
                      disabled={joiningListing === listing.id}
                      className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joiningListing === listing.id ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Joining...
          </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <FireIcon className="w-5 h-5 mr-2" />
                          JOIN TOURNAMENT - {listing.entry_fee} TOKENS
                        </div>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>

        {/* Create Tournament Button */}
        {isAuthenticated && (
          <div className="mt-12 text-center">
            <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
              <div className="flex items-center">
                <TrophyIcon className="w-6 h-6 mr-2" />
                Create Your Own Tournament
          </div>
            </button>
        </div>
        )}
      </div>
    </div>
  );
}