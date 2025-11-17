'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  ChatBubbleLeftRightIcon, 
  PaperAirplaneIcon,
  UserCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Conversation {
  id: string;
  title: string;
  conversation_type: string;
  listing_id: string | null;
  listing_title: string | null;
  other_user_id: string | null;
  other_username: string | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  created_at: string;
}

interface Message {
  id: string;
  sender_id: string;
  sender_username: string;
  message_text: string;
  message_type: string;
  metadata: any;
  is_edited: boolean;
  created_at: string;
}

export default function MessagingHub() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClientComponentClient();

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    loadUser();
  }, []);

  // Load conversations
  const loadConversations = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_conversations');
      
      if (error) {
        // If function doesn't exist yet, show friendly message
        if (error.message?.includes('Could not find the function') || error.message?.includes('does not exist')) {
          console.warn('⚠️ Messaging system not set up yet. Please run SQL files.');
          setSetupRequired(true);
          setIsLoading(false);
          return;
        }
        console.error('Error loading conversations:', error);
        setIsLoading(false);
        return;
      }
      
      console.log('📬 Loaded conversations:', data);
      setConversations(data || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadConversations();
      
      // Poll for new messages every 5 seconds
      const interval = setInterval(loadConversations, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Load messages for selected conversation
  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_conversation_messages', {
        conversation_id_param: conversationId,
        limit_param: 100,
        offset_param: 0
      });
      
      if (error) {
        if (error.message?.includes('Could not find the function') || error.message?.includes('does not exist')) {
          console.warn('⚠️ Message functions not set up yet');
          return;
        }
        console.error('Error loading messages:', error);
        return;
      }
      
      console.log('💬 Loaded messages:', data);
      setMessages(data || []);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      
      // Poll for new messages in conversation every 3 seconds
      const interval = setInterval(() => loadMessages(selectedConversation.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;
    
    setIsSending(true);
    
    try {
      const { data, error } = await supabase.rpc('send_message', {
        conversation_id_param: selectedConversation.id,
        message_text_param: newMessage.trim(),
        message_type_param: 'text',
        metadata_param: {}
      });
      
      if (error) {
        console.error('Error sending message:', error);
        if (error.message?.includes('Could not find the function') || error.message?.includes('does not exist')) {
          alert('Messaging system not set up yet. Please run the SQL setup files.');
        } else {
          alert('Failed to send message: ' + error.message);
        }
        return;
      }
      
      console.log('✅ Message sent:', data);
      setNewMessage('');
      
      // Reload messages
      await loadMessages(selectedConversation.id);
      await loadConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Handle enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format timestamp
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

  if (setupRequired) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="max-w-2xl bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-8">
          <div className="text-center">
            <ChatBubbleLeftRightIcon className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
            <h3 className="text-xl font-bold text-white mb-2">
              ⚠️ Messaging System Setup Required
            </h3>
            <p className="text-gray-300 mb-4">
              The new messaging system needs to be set up in your database.
            </p>
            <div className="bg-gray-800 rounded-xl p-4 text-left space-y-2 mb-4">
              <p className="text-sm text-gray-300 font-semibold">Run these SQL files in order:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400">
                <li>CREATE_MESSAGING_SYSTEM.sql</li>
                <li>FIX_ANONYMOUS_USERNAMES.sql</li>
                <li>INTEGRATE_MARKETPLACE_MESSAGING.sql</li>
              </ol>
            </div>
            <p className="text-xs text-gray-400">
              Check the MESSAGING_SETUP_GUIDE.md for detailed instructions
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] bg-gray-900 rounded-2xl overflow-hidden border border-gray-700">
      {/* Conversations List (Left Side) */}
      <div className="w-1/3 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-400 mr-2" />
            <h2 className="text-lg font-bold text-white">Messages</h2>
            {conversations.length > 0 && (
              <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {conversations.reduce((sum, c) => sum + c.unread_count, 0)}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-2 text-gray-600" />
              <p>No messages yet</p>
              <p className="text-xs mt-1">Win a marketplace item to start chatting!</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 border-b border-gray-800 cursor-pointer transition-colors ${
                  selectedConversation?.id === conv.id
                    ? 'bg-blue-500/20 border-l-4 border-l-blue-500'
                    : 'hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center flex-1 min-w-0">
                    <UserCircleIcon className="h-8 w-8 text-gray-400 mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm truncate">
                        {conv.title}
                      </h3>
                      {conv.conversation_type === 'marketplace' && conv.listing_title && (
                        <p className="text-xs text-gray-400 truncate">
                          📦 {conv.listing_title}
                        </p>
                      )}
                    </div>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {conv.last_message || 'No messages yet'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatTime(conv.last_message_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Messages Area (Right Side) */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white">
                  {selectedConversation.title}
                </h3>
                {selectedConversation.conversation_type === 'marketplace' && (
                  <p className="text-xs text-gray-400">
                    📦 {selectedConversation.listing_title}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedConversation(null)}
                className="lg:hidden text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-2 text-gray-600" />
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

            {/* Message Input */}
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
                  onClick={handleSendMessage}
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
              <p className="text-sm">Choose a conversation from the left to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

