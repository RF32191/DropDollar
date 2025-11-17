'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
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
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const addDebug = (msg: string) => {
    setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`]);
    console.log(msg);
  };

  const scrollToBottom = (smooth = true) => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  };

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
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
    if (!user) return;
    
    try {
      // Get all conversations where user is a participant
      const { data: userParticipations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (partError) throw partError;

      if (!userParticipations || userParticipations.length === 0) {
        setConversations([]);
        return;
      }

      const conversationIds = userParticipations.map(p => p.conversation_id);

      // Get conversation details
      const { data: convs, error: convsError } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          conversation_type,
          listing_id,
          created_at,
          last_message_at
        `)
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });

      if (convsError) throw convsError;

      // Get last message for each conversation
      const convsWithDetails = await Promise.all(
        (convs || []).map(async (conv) => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('message_text')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            last_message: lastMsg?.message_text || 'No messages yet',
            unread_count: 0 // Can be enhanced later
          };
        })
      );

      setConversations(convsWithDetails);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
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
        .select('id, username')
        .ilike('username', `%${username}%`)
        .neq('id', user?.id)
        .not('username', 'is', null)
        .limit(5);

      if (error) throw error;
      // Filter out any results without usernames
      const filteredData = (data || []).filter(u => u.username && u.username.trim() !== '');
      setSearchResults(filteredData);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
  };

  const startConversation = async (otherUser: any) => {
    if (!user) {
      alert('Please log in to start a conversation');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Starting conversation with:', otherUser.username);
      console.log('User ID:', user.id);
      console.log('Other User ID:', otherUser.id);
      
      // Generate conversation title
      const conversationTitle = `Chat with ${otherUser.username}`;
      
      // Try direct table manipulation instead of RPC (more reliable)
      console.log('Attempting direct conversation creation...');
      
      // First, check if conversation exists
      const { data: existingConvs, error: checkError } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          conversation_participants!inner(user_id)
        `)
        .eq('conversation_type', 'direct');

      console.log('Existing conversations check:', existingConvs, checkError);

      let conversationId: string | null = null;

      // Find conversation between these two users
      if (existingConvs && !checkError) {
        for (const conv of existingConvs) {
          const participants = conv.conversation_participants.map((p: any) => p.user_id);
          if (
            participants.length === 2 &&
            participants.includes(user.id) &&
            participants.includes(otherUser.id)
          ) {
            conversationId = conv.id;
            console.log('Found existing conversation:', conversationId);
            break;
          }
        }
      }

      // If no existing conversation, create one
      if (!conversationId) {
        console.log('Creating new conversation...');
        
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            title: conversationTitle,
            conversation_type: 'direct',
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_message_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          throw createError;
        }

        conversationId = newConv.id;
        console.log('Created conversation:', conversationId);

        // Add both participants
        const { error: participantsError } = await supabase
          .from('conversation_participants')
          .insert([
            {
              conversation_id: conversationId,
              user_id: user.id,
              role: 'owner',
              joined_at: new Date().toISOString(),
              is_active: true
            },
            {
              conversation_id: conversationId,
              user_id: otherUser.id,
              role: 'member',
              joined_at: new Date().toISOString(),
              is_active: true
            }
          ]);

        if (participantsError) {
          console.error('Error adding participants:', participantsError);
          throw participantsError;
        }

        console.log('Added participants');
      }

      // Reload conversations
      await loadConversations();
      
      // Get the conversation details directly
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) {
        console.error('Error loading conversation:', convError);
        throw convError;
      }

      console.log('Found conversation:', convData);
      
      if (convData) {
        setActiveConversation(convData);
        loadMessages(convData.id);
      } else {
        console.error('Could not find conversation after creation');
      }

      setSearchUsername('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start conversation: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      addDebug(`📥 Loading messages for conversation ${conversationId.substring(0, 8)}...`);
      
      // Load messages without join (no foreign key needed)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        addDebug(`❌ Load error: ${error.message}`);
        throw error;
      }

      addDebug(`📨 Loaded ${data?.length || 0} messages from DB`);

      // Get unique sender IDs
      const senderIds = [...new Set(data?.map((msg: any) => msg.sender_id) || [])];
      
      // Load usernames separately
      const { data: usersData } = await supabase
        .from('users')
        .select('id, username, email')
        .in('id', senderIds);

      // Create username lookup
      const usernameLookup: Record<string, string> = {};
      (usersData || []).forEach((u: any) => {
        usernameLookup[u.id] = u.username || u.email?.split('@')[0] || 'User';
      });

      addDebug(`👤 Loaded ${Object.keys(usernameLookup).length} usernames`);

      // Format messages for display
      const formattedMessages = (data || []).map((msg: any) => ({
        ...msg,
        sender_username: usernameLookup[msg.sender_id] || 'Unknown'
      }));

      setMessages(formattedMessages);
      addDebug(`✅ Set ${formattedMessages.length} messages to state!`);
      
      // Only scroll on first load or when user is at bottom
      setTimeout(() => scrollToBottom(false), 50);
    } catch (error) {
      console.error('Error loading messages:', error);
      addDebug(`❌ Failed to load: ${(error as Error).message}`);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || isSending || !user) {
      addDebug(`❌ Cannot send: message=${!!newMessage.trim()}, conv=${!!activeConversation}, sending=${isSending}, user=${!!user}`);
      return;
    }

    setShouldAutoScroll(true); // Enable auto-scroll when sending
    setIsSending(true);
    addDebug(`📤 Sending: "${newMessage.trim()}"`);

    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversation.id,
          sender_id: user.id,
          message_text: newMessage.trim(),
          message_type: 'text',
          metadata: {},
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        addDebug(`❌ Insert error: ${error.message}`);
        throw error;
      }

      addDebug(`✅ Message inserted! ID: ${data[0]?.id}`);

      // Update conversation last_message_at
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', activeConversation.id);

      if (updateError) {
        addDebug(`⚠️ Conversation update error: ${updateError.message}`);
      }

      setNewMessage('');
      
      // Reload messages and conversations
      addDebug(`🔄 Reloading messages...`);
      await Promise.all([
        loadMessages(activeConversation.id),
        loadConversations()
      ]);
      
      // Scroll to bottom after sending
      setTimeout(() => scrollToBottom(true), 100);
      
      addDebug(`✅ Message sent successfully!`);
    } catch (error) {
      addDebug(`❌ FAILED: ${(error as Error).message}`);
      alert('Failed to send message: ' + (error as Error).message);
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
      // Disable auto-scroll during polling to prevent jumping
      const interval = setInterval(() => {
        setShouldAutoScroll(false);
        loadMessages(activeConversation.id);
      }, 3000);
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
              placeholder="Search by username..."
              className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
            />
            {searchUsername && (
              <button onClick={() => { setSearchUsername(''); setSearchResults([]); }}>
                <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-white" />
              </button>
            )}
          </div>

          {searchResults.length > 0 && !isLoading && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => startConversation(result)}
                  disabled={isLoading}
                  className="w-full text-left px-4 py-3 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-b border-gray-700 last:border-b-0 flex items-center"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                    {result.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{result.username}</p>
                    <p className="text-xs text-gray-400">Click to message</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {isLoading && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 p-4">
              <div className="flex items-center justify-center text-gray-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                <span>Starting conversation...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Layout - Like iMessage/WhatsApp */}
      <div className="flex h-[600px]">
        {/* LEFT SIDE - Conversation List */}
        <div className="w-1/3 border-r border-gray-700 overflow-y-auto bg-gray-800/50">
          {/* Conversations Header */}
          <div className="p-3 border-b border-gray-700 bg-gray-800">
            <h3 className="text-sm font-bold text-white">MESSAGES</h3>
          </div>

          {/* Conversation List */}
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-3 text-gray-600" />
              <p className="text-sm font-semibold">No messages yet</p>
              <p className="text-xs mt-1">Search for a user above to start chatting!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConversation(conv);
                    setShouldAutoScroll(true); // Enable auto-scroll when opening conversation
                    loadMessages(conv.id);
                  }}
                  className={`w-full text-left p-4 hover:bg-gray-700/50 transition-colors ${
                    activeConversation?.id === conv.id ? 'bg-gray-700 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">
                        {conv.title?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    
                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-white text-sm truncate">
                          {conv.title || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatTime(conv.last_message_at)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400 truncate pr-2">
                          {conv.last_message || 'Start chatting...'}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT SIDE - Chat Window */}
        <div className="flex-1 flex flex-col bg-gray-900">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-700 bg-gray-800 flex items-center space-x-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <span className="text-white font-bold">
                    {activeConversation.title?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                {/* Name & Status */}
                <div>
                  <h3 className="font-bold text-white">{activeConversation.title || 'Conversation'}</h3>
                  <p className="text-xs text-gray-400">
                    {activeConversation.conversation_type === 'direct' ? 'Direct Message' : 'Group Chat'}
                  </p>
                </div>
              </div>

              {/* Messages Area */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-900 to-gray-800 scroll-smooth"
                style={{ maxHeight: '450px' }}
              >
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <ChatBubbleLeftRightIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                    <p className="font-semibold">No messages yet</p>
                    <p className="text-xs mt-1">Send a message to start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwnMessage = message.sender_id === user?.id;
                    const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} items-end space-x-2`}
                      >
                        {/* Other user avatar */}
                        {!isOwnMessage && showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                              {message.sender_username?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                        {!isOwnMessage && !showAvatar && <div className="w-8" />}
                        
                        {/* Message Bubble */}
                        <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          {!isOwnMessage && showAvatar && (
                            <p className="text-xs font-semibold mb-1 text-gray-400 ml-2">
                              {message.sender_username || 'Unknown'}
                            </p>
                          )}
                          <div
                            className={`px-4 py-2 ${
                              isOwnMessage
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-3xl rounded-br-md shadow-lg shadow-cyan-500/50'
                                : message.message_type === 'system'
                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-2xl'
                                : 'bg-transparent text-gray-200 rounded-bl-md'
                            }`}
                          >
                            <p className={`text-sm whitespace-pre-wrap break-words ${
                              isOwnMessage ? 'font-medium' : ''
                            }`}>
                              {message.message_text}
                            </p>
                            <p className={`text-xs mt-1 ${
                              isOwnMessage ? 'text-cyan-100' : 'text-gray-500'
                            }`}>
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-700 bg-gray-800">
                {/* Debug Info Panel */}
                {debugInfo.length > 0 && (
                  <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-yellow-300">🔍 DEBUG INFO:</p>
                      <button
                        onClick={() => {
                          addDebug(`📊 Current state: ${messages.length} messages in memory`);
                          if (activeConversation) {
                            loadMessages(activeConversation.id);
                          }
                        }}
                        className="text-xs bg-yellow-500/20 hover:bg-yellow-500/30 px-2 py-1 rounded text-yellow-200"
                      >
                        🔄 Reload
                      </button>
                    </div>
                    {debugInfo.map((info, i) => (
                      <p key={i} className="text-xs text-yellow-200 font-mono">{info}</p>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-700 text-white rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800 placeholder-gray-400 transition-all"
                    disabled={isSending}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isSending}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-full p-3 transition-all shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70 flex items-center justify-center"
                    title="Send message"
                  >
                    {isSending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <PaperAirplaneIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Press Enter to send • Debug info shows above if issues occur
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 bg-gradient-to-b from-gray-900 to-gray-800">
              <div className="text-center">
                <ChatBubbleLeftRightIcon className="h-20 w-20 mx-auto mb-4 text-gray-600" />
                <p className="text-lg font-semibold mb-2 text-white">Welcome to Messages</p>
                <p className="text-sm text-gray-400">Select a conversation from the left</p>
                <p className="text-sm text-gray-500 mt-1">or search for a user to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
