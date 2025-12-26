'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface LobbyPlayer {
  id: string;
  username: string;
  color: number;
  isReady: boolean;
  isHost: boolean;
  joinedAt: number;
}

export interface MultiplayerState {
  lobbyId: string | null;
  players: LobbyPlayer[];
  isHost: boolean;
  isReady: boolean;
  gameStarted: boolean;
  countdown: number | null;
  error: string | null;
}

export interface PlayerUpdate {
  id: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  hearts: number;
  score: number;
  isAlive: boolean;
  action?: 'shoot' | 'jump' | 'hit';
  targetX?: number;
  targetZ?: number;
}

const PLAYER_COLORS = [0x00ffff, 0xff00ff, 0x00ff00, 0xffff00];
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const COUNTDOWN_SECONDS = 5;

export function useMultiplayerLobby(
  gameType: 'hex-arena' | 'laser-battle',
  userId: string | undefined,
  username: string | undefined
) {
  const [state, setState] = useState<MultiplayerState>({
    lobbyId: null,
    players: [],
    isHost: false,
    isReady: false,
    gameStarted: false,
    countdown: null,
    error: null
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const playerUpdatesRef = useRef<Map<string, PlayerUpdate>>(new Map());
  const onPlayerUpdateRef = useRef<((updates: Map<string, PlayerUpdate>) => void) | null>(null);
  const onGameStartRef = useRef<(() => void) | null>(null);
  const onPlayerActionRef = useRef<((playerId: string, action: string, data?: any) => void) | null>(null);

  // Find or create lobby
  const findLobby = useCallback(async () => {
    if (!userId || !username) {
      setState(prev => ({ ...prev, error: 'Must be logged in to play multiplayer' }));
      return;
    }

    try {
      // Look for existing lobbies with space
      const { data: existingLobbies } = await supabase
        .from('game_lobbies')
        .select('*')
        .eq('game_type', gameType)
        .eq('status', 'waiting')
        .lt('player_count', MAX_PLAYERS)
        .order('created_at', { ascending: true })
        .limit(1);

      let lobbyId: string;
      let isHost = false;

      if (existingLobbies && existingLobbies.length > 0) {
        // Join existing lobby
        lobbyId = existingLobbies[0].id;
        
        await supabase
          .from('game_lobbies')
          .update({ player_count: existingLobbies[0].player_count + 1 })
          .eq('id', lobbyId);
      } else {
        // Create new lobby
        const { data: newLobby, error } = await supabase
          .from('game_lobbies')
          .insert({
            game_type: gameType,
            host_id: userId,
            status: 'waiting',
            player_count: 1,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        lobbyId = newLobby.id;
        isHost = true;
      }

      // Subscribe to lobby channel
      const channel = supabase.channel(`lobby:${lobbyId}`, {
        config: {
          presence: { key: userId }
        }
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const players: LobbyPlayer[] = [];
          
          Object.entries(presenceState).forEach(([id, data]: [string, any]) => {
            if (data && data.length > 0) {
              players.push({
                id,
                username: data[0].username || 'Player',
                color: data[0].color || PLAYER_COLORS[players.length % PLAYER_COLORS.length],
                isReady: data[0].isReady || false,
                isHost: data[0].isHost || false,
                joinedAt: data[0].joinedAt || Date.now()
              });
            }
          });

          // Sort by join time
          players.sort((a, b) => a.joinedAt - b.joinedAt);

          // Assign colors based on order
          players.forEach((p, i) => {
            p.color = PLAYER_COLORS[i % PLAYER_COLORS.length];
          });

          setState(prev => ({ 
            ...prev, 
            players,
            isHost: players.length > 0 && players[0].id === userId
          }));
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('Player joined:', key);
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          console.log('Player left:', key);
        })
        .on('broadcast', { event: 'game_start' }, () => {
          setState(prev => ({ ...prev, gameStarted: true, countdown: null }));
          onGameStartRef.current?.();
        })
        .on('broadcast', { event: 'countdown' }, ({ payload }) => {
          setState(prev => ({ ...prev, countdown: payload.count }));
        })
        .on('broadcast', { event: 'player_update' }, ({ payload }) => {
          playerUpdatesRef.current.set(payload.id, payload);
          onPlayerUpdateRef.current?.(playerUpdatesRef.current);
        })
        .on('broadcast', { event: 'player_action' }, ({ payload }) => {
          onPlayerActionRef.current?.(payload.playerId, payload.action, payload.data);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              username: username || 'Player',
              color: PLAYER_COLORS[0],
              isReady: false,
              isHost,
              joinedAt: Date.now()
            });
          }
        });

      channelRef.current = channel;
      setState(prev => ({ 
        ...prev, 
        lobbyId, 
        isHost, 
        error: null 
      }));

    } catch (error: any) {
      console.error('Error finding/creating lobby:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to join lobby' 
      }));
    }
  }, [gameType, userId, username]);

  // Toggle ready state
  const toggleReady = useCallback(async () => {
    if (!channelRef.current || !userId) return;

    const newReadyState = !state.isReady;
    
    await channelRef.current.track({
      username: username || 'Player',
      color: state.players.find(p => p.id === userId)?.color || PLAYER_COLORS[0],
      isReady: newReadyState,
      isHost: state.isHost,
      joinedAt: state.players.find(p => p.id === userId)?.joinedAt || Date.now()
    });

    setState(prev => ({ ...prev, isReady: newReadyState }));
  }, [state.isReady, state.isHost, state.players, userId, username]);

  // Start game (host only)
  const startGame = useCallback(async () => {
    if (!channelRef.current || !state.isHost) return;

    const readyPlayers = state.players.filter(p => p.isReady || p.isHost);
    if (readyPlayers.length < MIN_PLAYERS) {
      setState(prev => ({ 
        ...prev, 
        error: `Need at least ${MIN_PLAYERS} players ready to start` 
      }));
      return;
    }

    // Start countdown
    let count = COUNTDOWN_SECONDS;
    
    countdownRef.current = setInterval(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'countdown',
        payload: { count }
      });

      setState(prev => ({ ...prev, countdown: count }));

      count--;
      
      if (count < 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
        
        channelRef.current?.send({
          type: 'broadcast',
          event: 'game_start',
          payload: {}
        });

        setState(prev => ({ ...prev, gameStarted: true, countdown: null }));
        onGameStartRef.current?.();

        // Update lobby status
        if (state.lobbyId) {
          supabase
            .from('game_lobbies')
            .update({ status: 'playing' })
            .eq('id', state.lobbyId);
        }
      }
    }, 1000);
  }, [state.isHost, state.players, state.lobbyId]);

  // Send player update
  const sendPlayerUpdate = useCallback((update: PlayerUpdate) => {
    if (!channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'player_update',
      payload: update
    });
  }, []);

  // Send player action
  const sendPlayerAction = useCallback((action: string, data?: any) => {
    if (!channelRef.current || !userId) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'player_action',
      payload: { playerId: userId, action, data }
    });
  }, [userId]);

  // Set callbacks
  const onPlayerUpdate = useCallback((callback: (updates: Map<string, PlayerUpdate>) => void) => {
    onPlayerUpdateRef.current = callback;
  }, []);

  const onGameStart = useCallback((callback: () => void) => {
    onGameStartRef.current = callback;
  }, []);

  const onPlayerAction = useCallback((callback: (playerId: string, action: string, data?: any) => void) => {
    onPlayerActionRef.current = callback;
  }, []);

  // Leave lobby
  const leaveLobby = useCallback(async () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    if (channelRef.current) {
      await channelRef.current.untrack();
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (state.lobbyId) {
      // Decrease player count
      await supabase.rpc('decrement_lobby_count', { lobby_id: state.lobbyId });
    }

    setState({
      lobbyId: null,
      players: [],
      isHost: false,
      isReady: false,
      gameStarted: false,
      countdown: null,
      error: null
    });
  }, [state.lobbyId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    ...state,
    findLobby,
    toggleReady,
    startGame,
    leaveLobby,
    sendPlayerUpdate,
    sendPlayerAction,
    onPlayerUpdate,
    onGameStart,
    onPlayerAction,
    getPlayerUpdates: () => playerUpdatesRef.current
  };
}

