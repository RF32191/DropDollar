'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  ChatBubbleLeftRightIcon, 
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function SimpleMessagesPlaceholder() {
  const [user, setUser] = useState<any>(null);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        loadConversations();
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_conversations');
      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const searchUsers = async (username: string) => {
    if (!username.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email')
        .or(`username.ilike.%${username}%,email.ilike.%${username}%`)
        .neq('id', user?.id)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
  };

  const startConversation = async (otherUser: any) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        participant_ids: [user.id, otherUser.id],
        conversation_type_param: 'direct',
        listing_id_param: null,
        title_param: null
      });

      if (error) throw error;

      await loadConversations();
      const convs = await supabase.rpc('get_user_conversations');
      const newConv = convs.data?.find((c: any) => c.id === data);
      if (newConv) {
        setActiveConversation(newConv);
        loadMessages(newConv.id);
      }

      setSearchUsername('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_conversation_messages', {
        conversation_id_param: conversationId,
        limit_param: 100,
        offset_param: 0
      });

      if (error) throw error;
      setMessages(data || []);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase.rpc('send_message', {
        conversation_id_param: activeConversation.id,
        message_text_param: newMessage.trim(),
        message_type_param: 'text',
        metadata_param: {}
      });

      if (error) throw error;

      setNewMessage('');
      await loadMessages(activeConversation.id);
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  useEffect(() => {
    if (activeConversation) {
      const interval = setInterval(() => loadMessages(activeConversation.id), 3000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation]);

  useEffect(() => {
    if (user) {
      const interval = setInterval(loadConversations, 5000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-gray-400">
          <ChatBubbleLeftRightIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
          <p>Please log in to use messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-400 mr-2" />
            <h2 className="text-lg font-bold text-white">Direct Messages</h2>
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center bg-gray-700 rounded-lg px-3 py-2">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-2" />
            <input
              type="text"
              value={searchUsername}
              onChange={(e) => {
                setSearchUsername(e.target.value);
                searchUsers(e.target.value);
              }}
              placeholder="Search users by username..."
              className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
            />
            {searchUsername && (
              <button onClick={() => { setSearchUsername(''); setSearchResults([]); }}>
                <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-white" />
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => startConversation(result)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                >
                  <p className="text-white font-semibold">{result.username || result.email}</p>
                  {result.username && <p className="text-xs text-gray-400">{result.email}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex h-[500px]">
        <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Search for users above to start chatting!</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setActiveConversation(conv);
                  loadMessages(conv.id);
                }}
                className={`w-full text-left p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                  activeConversation?.id === conv.id ? 'bg-blue-500/20 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-white text-sm truncate">
                    {conv.title}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full ml-2">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">{conv.last_message || 'No messages yet'}</p>
                <p className="text-xs text-gray-500 mt-1">{formatTime(conv.last_message_at)}</p>
              </button>
            ))
          )}
        </div>

        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              <div className="p-4 border-b border-gray-700 bg-gray-800">
                <h3 className="font-bold text-white">{activeConversation.title}</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <p>No messages yet</p>
                    <p className="text-xs mt-1">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? 'bg-blue-500 text-white'
                              : message.message_type === 'system'
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              : 'bg-gray-700 text-white'
                          }`}
                        >
                          {!isOwnMessage && (
                            <p className="text-xs font-semibold mb-1 text-gray-300">
                              {message.sender_username}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.message_text}
                          </p>
                          <p className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-blue-200' : 'text-gray-400'
                          }`}>
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-700 bg-gray-800">
                <div className="flex items-end space-x-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-700 text-white rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={1}
                    disabled={isSending}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isSending}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl p-3 transition-colors"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <ChatBubbleLeftRightIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <p className="text-lg font-semibold mb-2">Select a conversation</p>
                <p className="text-sm">Or search for users above to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
