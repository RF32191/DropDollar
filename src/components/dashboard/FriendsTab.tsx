'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  UserGroupIcon, 
  UserPlusIcon, 
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  TrophyIcon,
  ChartBarIcon,
  UserIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Friend {
  friendship_id: string;
  friend_user_id: string;
  friend_username: string;
  friend_avatar: string | null;
  status: string;
  since: string;
}

interface PendingRequest {
  request_id: string;
  sender_id: string;
  sender_username: string;
  sender_avatar: string | null;
  sent_at: string;
}

interface SearchResult {
  user_id: string;
  username: string;
  avatar_url: string | null;
  friendship_status: string;
}

export default function FriendsTab() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSection, setActiveSection] = useState<'friends' | 'requests' | 'search'>('friends');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Load friends and pending requests
  const loadFriendsData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      // Load friends list
      const { data: friendsData, error: friendsError } = await supabase.rpc('get_friends_list');
      if (!friendsError && friendsData) {
        setFriends(friendsData);
      }
      
      // Load pending requests
      const { data: requestsData, error: requestsError } = await supabase.rpc('get_pending_friend_requests');
      if (!requestsError && requestsData) {
        setPendingRequests(requestsData);
      }
    } catch (error) {
      console.error('Error loading friends data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFriendsData();
  }, [loadFriendsData]);

  // Load all users when search section is opened
  const loadAllUsers = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsSearching(true);
      const { data, error } = await supabase.rpc('get_all_users_for_friends', { p_limit: 50 });
      
      if (!error && data) {
        console.log('Loaded all users:', data);
        setSearchResults(data);
      } else {
        console.error('Error loading users:', error);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsSearching(false);
    }
  }, [user?.id]);

  // Load users when search section becomes active
  useEffect(() => {
    if (activeSection === 'search' && searchQuery.length === 0) {
      loadAllUsers();
    }
  }, [activeSection, loadAllUsers, searchQuery]);

  // Search users - searches immediately as you type!
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    // If empty, show all users
    if (!query || query.trim().length === 0) {
      loadAllUsers();
      return;
    }
    
    // Search even with 1 character - e.g., "r" shows "Ryan", "Robert", etc.
    try {
      setIsSearching(true);
      const { data, error } = await supabase.rpc('search_users_for_friends', { search_query: query.trim() });
      
      if (!error && data) {
        console.log(`🔍 Search "${query}" found ${data.length} users:`, data);
        setSearchResults(data);
      } else {
        console.error('Search error:', error);
        // Fallback: try direct query if RPC fails (without avatar_url which may not exist)
        const { data: fallbackData } = await supabase
          .from('users')
          .select('id, username, email')
          .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
          .neq('id', user?.id || '')
          .limit(50);
        
        if (fallbackData) {
          const mapped = fallbackData.map(u => ({
            user_id: u.id,
            username: u.username || u.email?.split('@')[0] || 'User',
            avatar_url: null,  // Avatar column may not exist in production
            friendship_status: 'none'
          }));
          setSearchResults(mapped);
        }
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Send friend request
  const sendFriendRequest = async (targetUserId: string) => {
    if (!user?.id) return;
    
    try {
      setActionInProgress(targetUserId);
      const { data, error } = await supabase.rpc('send_friend_request', { target_user_id: targetUserId });
      
      if (error) {
        alert('Failed to send request: ' + error.message);
        return;
      }
      
      if (data?.success) {
        alert('Friend request sent! 🎉');
        handleSearch(searchQuery); // Refresh search results
      } else {
        alert(data?.message || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setActionInProgress(null);
    }
  };

  // Accept friend request
  const acceptRequest = async (requestId: string) => {
    try {
      setActionInProgress(requestId);
      const { data, error } = await supabase.rpc('accept_friend_request', { request_id: requestId });
      
      if (error) {
        alert('Failed to accept: ' + error.message);
        return;
      }
      
      if (data?.success) {
        loadFriendsData(); // Refresh lists
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    } finally {
      setActionInProgress(null);
    }
  };

  // Decline/Remove friend
  const removeFriend = async (friendshipId: string, isRequest: boolean = false) => {
    const confirmMsg = isRequest ? 'Decline this friend request?' : 'Remove this friend?';
    if (!confirm(confirmMsg)) return;
    
    try {
      setActionInProgress(friendshipId);
      const { data, error } = await supabase.rpc('remove_friend', { friendship_id: friendshipId });
      
      if (error) {
        alert('Failed: ' + error.message);
        return;
      }
      
      if (data?.success) {
        loadFriendsData(); // Refresh lists
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    } finally {
      setActionInProgress(null);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center">
          <UserGroupIcon className="w-6 h-6 sm:w-7 sm:h-7 mr-2 text-purple-400" />
          Friends
          {friends.length > 0 && (
            <span className="ml-2 text-sm bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
              {friends.length}
            </span>
          )}
        </h2>
        
        {/* Leaderboard Link */}
        <Link 
          href="/friends-leaderboard"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-yellow-500/25"
        >
          <TrophyIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Friends Leaderboard</span>
          <span className="sm:hidden">Leaderboard</span>
        </Link>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
        {[
          { id: 'friends', label: 'My Friends', count: friends.length, icon: UserGroupIcon },
          { id: 'requests', label: 'Requests', count: pendingRequests.length, icon: UserPlusIcon },
          { id: 'search', label: 'Find Friends', icon: MagnifyingGlassIcon }
        ].map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id as any)}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeSection === section.id
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <section.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{section.label}</span>
            {section.count !== undefined && section.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeSection === section.id 
                  ? 'bg-white/20' 
                  : section.id === 'requests' ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10'
              }`}>
                {section.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Friends List */}
      {activeSection === 'friends' && (
        <div className="space-y-3">
          {friends.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl">
              <UserGroupIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Friends Yet</h3>
              <p className="text-gray-400 mb-4">Find and add friends to compete together!</p>
              <button 
                onClick={() => setActiveSection('search')}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-all"
              >
                Find Friends
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {friends.map((friend) => (
                <div 
                  key={friend.friendship_id}
                  className="bg-gradient-to-r from-white/5 to-white/10 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                      {friend.friend_avatar ? (
                        <img src={friend.friend_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        friend.friend_username?.charAt(0)?.toUpperCase() || '?'
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{friend.friend_username}</p>
                      <p className="text-xs text-gray-400">Friends since {formatDate(friend.since)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/friends-leaderboard?user=${friend.friend_user_id}`}
                      className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-all"
                      title="View scores"
                    >
                      <ChartBarIcon className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => removeFriend(friend.friendship_id)}
                      disabled={actionInProgress === friend.friendship_id}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all disabled:opacity-50"
                      title="Remove friend"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending Requests */}
      {activeSection === 'requests' && (
        <div className="space-y-3">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl">
              <UserPlusIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Pending Requests</h3>
              <p className="text-gray-400">Friend requests will appear here</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {pendingRequests.map((request) => (
                <div 
                  key={request.request_id}
                  className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      {request.sender_avatar ? (
                        <img src={request.sender_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        request.sender_username?.charAt(0)?.toUpperCase() || '?'
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{request.sender_username}</p>
                      <p className="text-xs text-gray-400">Sent {formatDate(request.sent_at)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => acceptRequest(request.request_id)}
                      disabled={actionInProgress === request.request_id}
                      className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all disabled:opacity-50"
                      title="Accept"
                    >
                      <CheckIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => removeFriend(request.request_id, true)}
                      disabled={actionInProgress === request.request_id}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all disabled:opacity-50"
                      title="Decline"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Users */}
      {activeSection === 'search' && (
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="🔍 Type any letter to search users... (e.g., 'ry' for Ryan)"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              autoComplete="off"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
              </div>
            )}
          </div>

          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">
              {searchQuery.length > 0 ? (
                <>Showing users matching "<span className="text-purple-400">{searchQuery}</span>"</>
              ) : (
                'All Players'
              )}
            </h3>
            <span className="text-xs text-gray-500">{searchResults.length} found</span>
          </div>

          {/* Results (always show) */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searchResults.length === 0 && !isSearching ? (
              <div className="text-center py-8 text-gray-400">
                {searchQuery.length > 0 
                  ? `No users found matching "${searchQuery}" - try a different name`
                  : 'No users found yet. Invite friends to join!'}
              </div>
            ) : (
              searchResults.map((result) => (
                <div 
                  key={result.user_id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                      {result.avatar_url ? (
                        <img src={result.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        result.username?.charAt(0)?.toUpperCase() || '?'
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{result.username || 'Unknown User'}</p>
                      <p className="text-xs text-gray-500">Click to add as friend</p>
                    </div>
                  </div>
                  
                  {result.friendship_status === 'accepted' ? (
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                      ✓ Friends
                    </span>
                  ) : result.friendship_status === 'pending' ? (
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium">
                      ⏳ Pending
                    </span>
                  ) : (
                    <button
                      onClick={() => sendFriendRequest(result.user_id)}
                      disabled={actionInProgress === result.user_id}
                      className="flex items-center gap-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-sm transition-all disabled:opacity-50"
                    >
                      <UserPlusIcon className="w-4 h-4" />
                      Add
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Tip */}
          {searchQuery.length === 0 && searchResults.length > 0 && (
            <div className="text-center py-2 text-gray-500 text-xs bg-white/5 rounded-lg p-2">
              💡 <strong>Tip:</strong> Type any letter to instantly filter users (e.g., "ry" → Ryan, "jo" → John)
            </div>
          )}

          {searchQuery.length === 0 && searchResults.length === 0 && !isSearching && (
            <div className="text-center py-12 bg-white/5 rounded-xl">
              <MagnifyingGlassIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Find Players</h3>
              <p className="text-gray-400">Search by username or email to add friends</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

