'use client';

import React, { useState } from 'react';
import WebLayout from '@/components/layout/WebLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Trophy,
  Droplets,
  TrendingUp,
  Gamepad2,
  CrystalBall
} from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  popular?: boolean;
}

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const faqItems: FAQItem[] = [
    // General Questions
    {
      id: '1',
      question: 'What is Drop Dollar?',
      answer: 'Drop Dollar is a comprehensive crypto market analysis and trading platform that combines real-time market data, competitive trading games, and educational resources. We help users learn about cryptocurrency trading through interactive games and provide tools for market analysis.',
      category: 'general',
      popular: true
    },
    {
      id: '2',
      question: 'How do I get started?',
      answer: 'Getting started is easy! Simply sign up for a free account, complete the verification process, and you can immediately start using our crypto analysis tools and participating in trading games. No initial deposit is required to begin.',
      category: 'general',
      popular: true
    },
    {
      id: '3',
      question: 'Is Drop Dollar free to use?',
      answer: 'Yes! Drop Dollar offers a free tier that includes access to basic crypto analysis, trading games, and educational content. We also offer premium features for advanced users who want more detailed analysis and exclusive tournaments.',
      category: 'general'
    },

    // Trading Games
    {
      id: '4',
      question: 'How do the trading games work?',
      answer: 'Our trading games simulate real crypto trading with virtual money. You start with $10,000 virtual USD and can trade various cryptocurrencies using real market data. The goal is to maximize your portfolio value within the time limit.',
      category: 'trading',
      popular: true
    },
    {
      id: '5',
      question: 'What cryptocurrencies can I trade in the games?',
      answer: 'You can trade all major cryptocurrencies including Bitcoin (BTC), Ethereum (ETH), Solana (SOL), Cardano (ADA), and many others. We use real-time market data to ensure accurate pricing and realistic trading conditions.',
      category: 'trading'
    },
    {
      id: '6',
      question: 'How long do trading games last?',
      answer: 'Trading games typically last 5 minutes for quick games, but we also offer longer tournaments that can last several days or weeks. Each game clearly displays the duration before you start.',
      category: 'trading'
    },

    // Drop Coin
    {
      id: '7',
      question: 'What is Drop Coin?',
      answer: 'Drop Coin is our revolutionary cryptocurrency token that automatically appreciates in value as more people hold it and use it. The price increases by 0.1% for each new holder and 0.01% for each transaction, creating a unique appreciation mechanism.',
      category: 'tokens',
      popular: true
    },
    {
      id: '8',
      question: 'How do I buy Drop Coin tokens?',
      answer: 'You can buy Drop Coin tokens using credit/debit cards, Apple Pay, Ethereum (ETH), or Bitcoin (BTC). Simply visit the token purchase page, select your payment method, enter the amount you want to buy, and complete the transaction.',
      category: 'tokens'
    },
    {
      id: '9',
      question: 'Where are my Drop Coin tokens stored?',
      answer: 'Your Drop Coin tokens are stored in your secure wallet on our platform. You can view your balance, transaction history, and manage your tokens through your account dashboard. We use industry-standard security measures to protect your assets.',
      category: 'tokens'
    },

    // Tournaments
    {
      id: '10',
      question: 'How do tournaments work?',
      answer: 'Tournaments are competitive events where traders compete for prizes. You pay an entry fee, participate in trading or prediction challenges, and winners receive prizes from the prize pool. Tournaments can be trading-based, prediction-based, or mixed format.',
      category: 'tournaments',
      popular: true
    },
    {
      id: '11',
      question: 'What are the tournament prizes?',
      answer: 'Tournament prizes vary depending on the event. They can range from $100 for smaller tournaments to $50,000+ for major championships. Prizes are typically paid out in USD or cryptocurrency, and winners are announced publicly.',
      category: 'tournaments'
    },
    {
      id: '12',
      question: 'How do I join a tournament?',
      answer: 'To join a tournament, simply browse the available tournaments, select one you want to participate in, pay the entry fee, and wait for the tournament to begin. You\'ll receive notifications about start times and updates.',
      category: 'tournaments'
    },

    // Account & Security
    {
      id: '13',
      question: 'How do I create an account?',
      answer: 'Creating an account is simple! Click the "Sign Up" button, fill in your details including name, email, and password, agree to our terms of service, and verify your email address. The entire process takes just a few minutes.',
      category: 'account'
    },
    {
      id: '14',
      question: 'Is my personal information secure?',
      answer: 'Yes, we take security very seriously. We use industry-standard encryption to protect your personal information and trading data. We never share your information with third parties without your consent.',
      category: 'account',
      popular: true
    },
    {
      id: '15',
      question: 'Can I change my password?',
      answer: 'Yes, you can change your password at any time through your account settings. We recommend using a strong password with a combination of letters, numbers, and special characters.',
      category: 'account'
    },

    // Technical Support
    {
      id: '16',
      question: 'What if I forget my password?',
      answer: 'If you forget your password, click the "Forgot Password" link on the sign-in page. Enter your email address, and we\'ll send you a secure link to reset your password.',
      category: 'support'
    },
    {
      id: '17',
      question: 'How do I contact customer support?',
      answer: 'You can contact our customer support team through the contact form on our website, email us directly, or use the live chat feature. We typically respond within 24 hours.',
      category: 'support',
      popular: true
    },
    {
      id: '18',
      question: 'What browsers are supported?',
      answer: 'Drop Dollar works on all modern browsers including Chrome, Firefox, Safari, and Edge. We recommend using the latest version of your browser for the best experience.',
      category: 'support'
    },

    // Mobile & App
    {
      id: '19',
      question: 'Is there a mobile app?',
      answer: 'Yes! We have a native iOS app available in the App Store, and our website is fully optimized for mobile browsers. You can access all features on your mobile device.',
      category: 'mobile',
      popular: true
    },
    {
      id: '20',
      question: 'Can I use Drop Dollar on my phone?',
      answer: 'Absolutely! Our website is fully responsive and works great on mobile devices. You can trade, participate in games, and manage your account from your smartphone or tablet.',
      category: 'mobile'
    },

    // Payments & Billing
    {
      id: '21',
      question: 'What payment methods do you accept?',
      answer: 'We accept credit/debit cards (Visa, Mastercard, American Express), Apple Pay, Ethereum (ETH), and Bitcoin (BTC) for purchasing Drop Coin tokens and tournament entries.',
      category: 'payments'
    },
    {
      id: '22',
      question: 'Are there any fees?',
      answer: 'We charge minimal fees for certain transactions like token purchases and tournament entries. These fees are clearly displayed before you complete any transaction. Most platform features are free to use.',
      category: 'payments'
    },
    {
      id: '23',
      question: 'How do I withdraw my winnings?',
      answer: 'Tournament winnings can be withdrawn through your account dashboard. We support withdrawals via bank transfer, PayPal, or cryptocurrency. Processing times vary depending on the method chosen.',
      category: 'payments'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Questions', count: faqItems.length },
    { id: 'general', name: 'General', count: faqItems.filter(item => item.category === 'general').length },
    { id: 'trading', name: 'Trading Games', count: faqItems.filter(item => item.category === 'trading').length },
    { id: 'tokens', name: 'Drop Coin', count: faqItems.filter(item => item.category === 'tokens').length },
    { id: 'tournaments', name: 'Tournaments', count: faqItems.filter(item => item.category === 'tournaments').length },
    { id: 'account', name: 'Account & Security', count: faqItems.filter(item => item.category === 'account').length },
    { id: 'support', name: 'Support', count: faqItems.filter(item => item.category === 'support').length },
    { id: 'mobile', name: 'Mobile & App', count: faqItems.filter(item => item.category === 'mobile').length },
    { id: 'payments', name: 'Payments', count: faqItems.filter(item => item.category === 'payments').length }
  ];

  const filteredItems = faqItems.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const popularItems = faqItems.filter(item => item.popular);

  return (
    <WebLayout currentPage="faq">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">
                ❓ FAQ
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8">
                Frequently Asked Questions
              </p>
              
              {/* Search Bar */}
              <div className="max-w-md mx-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search FAQ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-3 text-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Category Filter */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-2"
                >
                  {category.name}
                  <Badge variant="secondary" className="ml-1">
                    {category.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* Popular Questions */}
          {selectedCategory === 'all' && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">⭐ Popular Questions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {popularItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        {item.question}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">{item.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* FAQ Items */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {selectedCategory === 'all' ? 'All Questions' : categories.find(c => c.id === selectedCategory)?.name}
            </h2>
            
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
                <p className="text-gray-600">Try adjusting your search or category filter</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-0 h-auto text-left"
                        onClick={() => toggleExpanded(item.id)}
                      >
                        <div className="flex items-center gap-3">
                          {item.popular && <Star className="h-4 w-4 text-yellow-500" />}
                          <span className="font-semibold text-lg">{item.question}</span>
                        </div>
                        {expandedItems.has(item.id) ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </Button>
                    </CardHeader>
                    {expandedItems.has(item.id) && (
                      <CardContent className="pt-0">
                        <div className="border-t pt-4">
                          <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Contact Support */}
          <div className="mt-12">
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">Still have questions?</CardTitle>
                <CardDescription className="text-blue-800">
                  Can't find what you're looking for? Our support team is here to help!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-12">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Live Chat
                  </Button>
                  <Button variant="outline" className="h-12">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Support
                  </Button>
                  <Button variant="outline" className="h-12">
                    <Phone className="mr-2 h-4 w-4" />
                    Call Support
                  </Button>
                </div>
                <div className="mt-4 text-sm text-blue-800">
                  <p>📧 Email: support@dropdollar.com</p>
                  <p>📞 Phone: 1-800-DROP-DOLLAR</p>
                  <p>⏰ Hours: 24/7 Support Available</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </WebLayout>
  );
}
