'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, ChevronUp, HelpCircle, Star, Shield, CreditCard, Trophy, Gamepad2, Users, Zap } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  popular?: boolean;
}

const faqData: FAQItem[] = [
  // Getting Started
  {
    id: 'what-is-dropdollar',
    question: 'What is DropDollar?',
    answer: 'DropDollar is a revolutionary skill-based gaming marketplace where players compete in skill-based games to win real prizes. Unlike luck-based games, your success depends entirely on your gaming skills and reaction time.',
    category: 'Getting Started',
    popular: true
  },
  {
    id: 'how-to-play',
    question: 'How do I start playing games?',
    answer: 'Simply sign up for a free account, choose a game from our selection (Multi-Target Reaction, Falling Object Catch, Color Sequence Memory, etc.), and start practicing! You get 3 free attempts daily for each game.',
    category: 'Getting Started',
    popular: true
  },
  {
    id: 'free-to-play',
    question: 'Is DropDollar free to play?',
    answer: 'Yes! You get 3 free attempts daily for each game. You can practice and improve your skills without spending anything. Entry fees only apply when you want to compete for real prizes.',
    category: 'Getting Started'
  },

  // Games & Tournaments
  {
    id: 'available-games',
    question: 'What games are available?',
    answer: 'We offer 6 skill-based games: Multi-Target Reaction, Falling Object Catch, Color Sequence Memory, Laser Dodge EXTREME, QuickClick Challenge, and Sword Slash. Each game tests different skills like reaction time, memory, and precision.',
    category: 'Games & Tournaments',
    popular: true
  },
  {
    id: 'tournament-types',
    question: 'What types of tournaments are there?',
    answer: 'We offer both 1v1 skill matches ($1-$25 entry fees) and large tournaments ($100-$500 prize pools). All tournaments are skill-based with fair matching systems.',
    category: 'Games & Tournaments'
  },
  {
    id: 'skill-matching',
    question: 'How does skill matching work?',
    answer: 'We use an ELO rating system to match players of similar skill levels. This ensures fair competition and gives everyone a chance to win based on their abilities.',
    category: 'Games & Tournaments'
  },
  {
    id: 'tournament-rules',
    question: 'What are the tournament rules?',
    answer: 'Each tournament has specific rules: 1 submission only per player, weekly limits to prevent spam, and all players get the same RNG seed for fair competition. Platform fee is 15% of the prize pool.',
    category: 'Games & Tournaments'
  },

  // Payments & Tokens
  {
    id: 'how-to-buy-tokens',
    question: 'How do I buy tokens?',
    answer: 'You can purchase tokens using credit cards, Apple Pay, PayPal, or cryptocurrency (ETH/Bitcoin). Tokens are used for entry fees and can be converted to cash prizes.',
    category: 'Payments & Tokens',
    popular: true
  },
  {
    id: 'token-prices',
    question: 'How much do tokens cost?',
    answer: 'Token prices are dynamic and based on market conditions. Currently, tokens are approximately $1 each, but prices may fluctuate based on demand and platform economics.',
    category: 'Payments & Tokens'
  },
  {
    id: 'payment-methods',
    question: 'What payment methods do you accept?',
    answer: 'We accept major credit cards (Visa, MasterCard, American Express), Apple Pay, Google Pay, PayPal, Ethereum (ETH), and Bitcoin (BTC). All payments are processed securely.',
    category: 'Payments & Tokens'
  },
  {
    id: 'withdraw-winnings',
    question: 'How do I withdraw my winnings?',
    answer: 'Winnings are automatically credited to your account. You can withdraw via bank transfer, PayPal, or cryptocurrency. Minimum withdrawal is $10, and processing takes 1-3 business days.',
    category: 'Payments & Tokens'
  },

  // Prizes & Rewards
  {
    id: 'prize-types',
    question: 'What kinds of prizes can I win?',
    answer: 'You can win cash prizes ranging from $1 to $35,000, electronics (iPhones, MacBooks, AirPods), gift cards, and exclusive gaming merchandise. All prizes are real and delivered to winners.',
    category: 'Prizes & Rewards',
    popular: true
  },
  {
    id: 'prize-delivery',
    question: 'How are prizes delivered?',
    answer: 'Cash prizes are transferred directly to your account. Physical prizes are shipped to your verified address within 5-7 business days. Digital prizes (gift cards) are emailed instantly.',
    category: 'Prizes & Rewards'
  },
  {
    id: 'biggest-win',
    question: 'What\'s the biggest win ever?',
    answer: 'Our biggest single win was $35,000! A player won this in a high-stakes tournament by demonstrating exceptional skill in Multi-Target Reaction. We regularly feature big tournaments with substantial prizes.',
    category: 'Prizes & Rewards'
  },

  // Account & Security
  {
    id: 'account-security',
    question: 'Is my account secure?',
    answer: 'Yes! We use bank-level encryption, two-factor authentication, and secure payment processing. Your personal information and funds are protected with industry-standard security measures.',
    category: 'Account & Security',
    popular: true
  },
  {
    id: 'age-requirements',
    question: 'What are the age requirements?',
    answer: 'You must be at least 18 years old to create an account and participate in paid tournaments. Players under 18 can still practice games for free but cannot win cash prizes.',
    category: 'Account & Security'
  },
  {
    id: 'account-limits',
    question: 'Are there account limits?',
    answer: 'New accounts have a $100 daily spending limit for the first week. After verification, limits increase to $1,000 daily. These limits help prevent fraud and ensure responsible gaming.',
    category: 'Account & Security'
  },

  // Technical Support
  {
    id: 'game-lag',
    question: 'What if I experience lag during a game?',
    answer: 'If you experience technical issues during a paid tournament, contact support immediately. We have systems to detect and compensate for technical problems that affect gameplay.',
    category: 'Technical Support'
  },
  {
    id: 'mobile-support',
    question: 'Can I play on mobile devices?',
    answer: 'Yes! DropDollar is fully optimized for mobile devices. You can play all games on iOS and Android devices through your web browser or our mobile app.',
    category: 'Technical Support'
  },
  {
    id: 'browser-requirements',
    question: 'What browsers are supported?',
    answer: 'We support Chrome, Firefox, Safari, and Edge browsers. For the best experience, we recommend using the latest version of Chrome or Safari with JavaScript enabled.',
    category: 'Technical Support'
  },

  // Platform & Community
  {
    id: 'platform-fees',
    question: 'What are the platform fees?',
    answer: 'We charge a 15% platform fee on tournament entry fees. This fee covers platform maintenance, prize distribution, and customer support. Winners receive 85% of the total prize pool.',
    category: 'Platform & Community'
  },
  {
    id: 'community-features',
    question: 'Are there community features?',
    answer: 'Yes! You can view leaderboards, share victory stories, follow top players, and participate in community tournaments. We also have a Discord server for players to connect.',
    category: 'Platform & Community'
  },
  {
    id: 'victory-stories',
    question: 'How do I share my victory story?',
    answer: 'After winning a tournament, go to your dashboard and use the "Share Your Victory Story" form. Describe your win, the game you played, and your experience. Stories are reviewed before appearing on our testimonials page.',
    category: 'Platform & Community',
    popular: true
  },

  // Legal & Compliance
  {
    id: 'legal-compliance',
    question: 'Is DropDollar legal?',
    answer: 'Yes, DropDollar operates legally in all supported jurisdictions. We comply with all applicable gaming and financial regulations. Skill-based gaming is legal in most US states and many countries worldwide.',
    category: 'Legal & Compliance'
  },
  {
    id: 'responsible-gaming',
    question: 'Do you promote responsible gaming?',
    answer: 'Absolutely! We have built-in spending limits, cooling-off periods, and self-exclusion options. We also provide resources for players who may need help with gaming-related issues.',
    category: 'Legal & Compliance'
  }
];

const categories = [
  { id: 'all', name: 'All Questions', icon: HelpCircle },
  { id: 'Getting Started', name: 'Getting Started', icon: Zap },
  { id: 'Games & Tournaments', name: 'Games & Tournaments', icon: Gamepad2 },
  { id: 'Payments & Tokens', name: 'Payments & Tokens', icon: CreditCard },
  { id: 'Prizes & Rewards', name: 'Prizes & Rewards', icon: Trophy },
  { id: 'Account & Security', name: 'Account & Security', icon: Shield },
  { id: 'Technical Support', name: 'Technical Support', icon: Users },
  { id: 'Platform & Community', name: 'Platform & Community', icon: Star },
  { id: 'Legal & Compliance', name: 'Legal & Compliance', icon: Shield }
];

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const popularFAQs = faqData.filter(faq => faq.popular);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="w-10 h-10 mr-3">
                <img
                  src="/DropCoin.png"
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900">DropDollar</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/listings" className="text-gray-700 hover:text-green-600 font-medium">Browse</Link>
              <Link href="/categories" className="text-gray-700 hover:text-green-600 font-medium">Categories</Link>
              <Link href="/games" className="text-purple-600 hover:text-purple-700 font-bold">🎮 Games</Link>
              <Link href="/hot-sell" className="text-red-600 hover:text-red-700 font-bold">🔥 Hot Sell</Link>
              <Link href="/how-it-works" className="text-gray-700 hover:text-green-600 font-medium">How It Works</Link>
              <Link href="/buy-tokens" className="text-green-600 hover:text-green-700 font-bold">💰 Buy Tokens</Link>
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
                <Link href="/auth/login" className="text-gray-700 hover:text-green-600 font-medium">Sign In</Link>
                <Link href="/auth/register" className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sign Up</Link>
                <Link href="/seller/apply" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sell</Link>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <HelpCircle className="inline-block h-16 w-16 mr-4" />
              Frequently Asked Questions
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto mb-8">
              Everything you need to know about DropDollar's skill-based gaming platform
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search FAQs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-lg rounded-xl border-0 focus:ring-4 focus:ring-white/30 focus:outline-none text-gray-900"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Popular FAQs */}
        {selectedCategory === 'all' && searchTerm === '' && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              <Star className="inline-block h-8 w-8 mr-2 text-yellow-500" />
              Popular Questions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {popularFAQs.map((faq) => {
                const isExpanded = expandedItems.has(faq.id);
                return (
                  <div key={faq.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => toggleExpanded(faq.id)}
                      className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                    >
                      <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-6 pb-4">
                        <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Browse by Category</h3>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <IconComponent className="h-4 w-4 mr-2" />
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            {selectedCategory === 'all' ? 'All Questions' : `${selectedCategory} Questions`}
            {searchTerm && ` (${filteredFAQs.length} results)`}
          </h3>
          
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No questions found</h3>
              <p className="text-gray-600">Try adjusting your search terms or category filter.</p>
            </div>
          ) : (
            filteredFAQs.map((faq) => {
              const isExpanded = expandedItems.has(faq.id);
              return (
                <div key={faq.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleExpanded(faq.id)}
                    className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900 block mb-1">{faq.question}</span>
                      <span className="text-sm text-gray-500">{faq.category}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-6 pb-4 border-t border-gray-100">
                      <p className="text-gray-600 leading-relaxed pt-4">{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Contact Support */}
        <div className="mt-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">Still have questions?</h3>
          <p className="text-blue-100 mb-6">Our support team is here to help you 24/7</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Contact Support
            </Link>
            <Link
              href="/discord"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Join Discord
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2024 DropDollar - Revolutionary Skill-Based Gaming Marketplace</p>
          <div className="mt-4 flex justify-center space-x-6">
            <Link href="/how-it-works" className="text-gray-400 hover:text-white">How It Works</Link>
            <Link href="/games" className="text-gray-400 hover:text-white">Practice Games</Link>
            <Link href="/listings" className="text-gray-400 hover:text-white">Competitions</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
