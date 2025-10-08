'use client';

import React, { useState } from 'react';
import WebLayout from '@/components/layout/WebLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
  TrendingUp,
  Gamepad2,
  CrystalBall,
  Droplets,
  Trophy,
  User,
  ShoppingCart,
  Newspaper,
  BookOpen,
  Code,
  Users,
  Settings,
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  Clock,
  ExternalLink,
  Star,
  Award,
  Zap,
  Shield,
  Globe,
  Download,
  Share2,
  Bell,
  Heart,
  Bookmark
} from 'lucide-react';

interface NavigationItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  category: string;
  featured?: boolean;
  new?: boolean;
  popular?: boolean;
}

export default function NavigationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const navigationItems: NavigationItem[] = [
    // Trading & Analysis
    {
      id: 'crypto-analysis',
      title: 'Crypto Analysis',
      description: 'Real-time market analysis and insights',
      href: '/analysis',
      icon: <TrendingUp className="h-5 w-5" />,
      category: 'trading',
      featured: true,
      popular: true
    },
    {
      id: 'trading-game',
      title: 'Trading Game',
      description: 'Compete in virtual trading simulations',
      href: '/trading-game',
      icon: <Gamepad2 className="h-5 w-5" />,
      category: 'trading',
      featured: true,
      popular: true
    },
    {
      id: 'prediction-game',
      title: 'Prediction Game',
      description: 'Test your price prediction skills',
      href: '/prediction-game',
      icon: <CrystalBall className="h-5 w-5" />,
      category: 'trading',
      popular: true
    },
    {
      id: 'leaderboard',
      title: 'Leaderboard',
      description: 'Global rankings and competition',
      href: '/leaderboard',
      icon: <Trophy className="h-5 w-5" />,
      category: 'trading',
      popular: true
    },

    // Drop Coin & Tokens
    {
      id: 'drop-coin',
      title: 'Drop Coin',
      description: 'Revolutionary appreciation token',
      href: '/drop-coin',
      icon: <Droplets className="h-5 w-5" />,
      category: 'tokens',
      featured: true,
      new: true
    },
    {
      id: 'token-purchase',
      title: 'Buy Tokens',
      description: 'Purchase Drop Coin tokens',
      href: '/token-purchase',
      icon: <ShoppingCart className="h-5 w-5" />,
      category: 'tokens',
      featured: true
    },
    {
      id: 'wallet',
      title: 'Wallet',
      description: 'Manage your crypto assets',
      href: '/wallet',
      icon: <Shield className="h-5 w-5" />,
      category: 'tokens'
    },

    // Tournaments & Events
    {
      id: 'tournaments',
      title: 'Tournaments',
      description: 'Join competitive tournaments',
      href: '/tournaments',
      icon: <Award className="h-5 w-5" />,
      category: 'events',
      featured: true,
      new: true
    },
    {
      id: 'events',
      title: 'Events',
      description: 'Upcoming crypto events',
      href: '/events',
      icon: <Calendar className="h-5 w-5" />,
      category: 'events'
    },
    {
      id: 'competitions',
      title: 'Competitions',
      description: 'Special trading competitions',
      href: '/competitions',
      icon: <Star className="h-5 w-5" />,
      category: 'events'
    },

    // Education & News
    {
      id: 'education',
      title: 'Education',
      description: 'Learn about cryptocurrency',
      href: '/education',
      icon: <BookOpen className="h-5 w-5" />,
      category: 'learn',
      popular: true
    },
    {
      id: 'news',
      title: 'Crypto News',
      description: 'Latest cryptocurrency news',
      href: '/news',
      icon: <Newspaper className="h-5 w-5" />,
      category: 'learn',
      popular: true
    },
    {
      id: 'tutorials',
      title: 'Tutorials',
      description: 'Step-by-step trading guides',
      href: '/tutorials',
      icon: <BookOpen className="h-5 w-5" />,
      category: 'learn'
    },
    {
      id: 'glossary',
      title: 'Glossary',
      description: 'Crypto terms and definitions',
      href: '/glossary',
      icon: <BookOpen className="h-5 w-5" />,
      category: 'learn'
    },

    // Community & Social
    {
      id: 'community',
      title: 'Community',
      description: 'Connect with other traders',
      href: '/community',
      icon: <Users className="h-5 w-5" />,
      category: 'social',
      popular: true
    },
    {
      id: 'forums',
      title: 'Forums',
      description: 'Discussion boards and Q&A',
      href: '/forums',
      icon: <Users className="h-5 w-5" />,
      category: 'social'
    },
    {
      id: 'chat',
      title: 'Live Chat',
      description: 'Real-time community chat',
      href: '/chat',
      icon: <MessageCircle className="h-5 w-5" />,
      category: 'social'
    },

    // Account & Settings
    {
      id: 'profile',
      title: 'Profile',
      description: 'Manage your account',
      href: '/profile',
      icon: <User className="h-5 w-5" />,
      category: 'account'
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Account preferences',
      href: '/settings',
      icon: <Settings className="h-5 w-5" />,
      category: 'account'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Manage your alerts',
      href: '/notifications',
      icon: <Bell className="h-5 w-5" />,
      category: 'account'
    },

    // Support & Help
    {
      id: 'faq',
      title: 'FAQ',
      description: 'Frequently asked questions',
      href: '/faq',
      icon: <HelpCircle className="h-5 w-5" />,
      category: 'support',
      popular: true,
      new: true
    },
    {
      id: 'help',
      title: 'Help Center',
      description: 'Get help and support',
      href: '/help',
      icon: <HelpCircle className="h-5 w-5" />,
      category: 'support',
      popular: true
    },
    {
      id: 'contact',
      title: 'Contact Us',
      description: 'Get in touch with our team',
      href: '/contact',
      icon: <Mail className="h-5 w-5" />,
      category: 'support'
    },
    {
      id: 'faq',
      title: 'FAQ',
      description: 'Frequently asked questions',
      href: '/faq',
      icon: <HelpCircle className="h-5 w-5" />,
      category: 'support'
    },

    // Developer & API
    {
      id: 'api-docs',
      title: 'API Documentation',
      description: 'Developer API reference',
      href: '/api-docs',
      icon: <Code className="h-5 w-5" />,
      category: 'developer'
    },
    {
      id: 'sdk',
      title: 'SDK & Libraries',
      description: 'Software development kits',
      href: '/sdk',
      icon: <Download className="h-5 w-5" />,
      category: 'developer'
    },
    {
      id: 'webhooks',
      title: 'Webhooks',
      description: 'Real-time data integration',
      href: '/webhooks',
      icon: <Zap className="h-5 w-5" />,
      category: 'developer'
    },

    // Legal & Info
    {
      id: 'privacy',
      title: 'Privacy Policy',
      description: 'How we protect your data',
      href: '/privacy',
      icon: <Shield className="h-5 w-5" />,
      category: 'legal'
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      description: 'Platform terms and conditions',
      href: '/terms',
      icon: <FileText className="h-5 w-5" />,
      category: 'legal'
    },
    {
      id: 'about',
      title: 'About Us',
      description: 'Learn about Drop Dollar',
      href: '/about',
      icon: <Globe className="h-5 w-5" />,
      category: 'info'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Pages', count: navigationItems.length },
    { id: 'trading', name: 'Trading & Analysis', count: navigationItems.filter(item => item.category === 'trading').length },
    { id: 'tokens', name: 'Tokens & Wallet', count: navigationItems.filter(item => item.category === 'tokens').length },
    { id: 'events', name: 'Tournaments & Events', count: navigationItems.filter(item => item.category === 'events').length },
    { id: 'learn', name: 'Education & News', count: navigationItems.filter(item => item.category === 'learn').length },
    { id: 'social', name: 'Community', count: navigationItems.filter(item => item.category === 'social').length },
    { id: 'account', name: 'Account & Settings', count: navigationItems.filter(item => item.category === 'account').length },
    { id: 'support', name: 'Support & Help', count: navigationItems.filter(item => item.category === 'support').length },
    { id: 'developer', name: 'Developer', count: navigationItems.filter(item => item.category === 'developer').length },
    { id: 'legal', name: 'Legal & Info', count: navigationItems.filter(item => item.category === 'legal' || item.category === 'info').length }
  ];

  const filteredItems = navigationItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredItems = navigationItems.filter(item => item.featured);
  const popularItems = navigationItems.filter(item => item.popular);
  const newItems = navigationItems.filter(item => item.new);

  return (
    <WebLayout currentPage="navigation">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">
                🗺️ Site Navigation
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8">
                Find all the pages and features you need
              </p>
              
              {/* Search Bar */}
              <div className="max-w-md mx-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search pages and features..."
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

          {/* Featured Section */}
          {selectedCategory === 'all' && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">⭐ Featured Pages</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                            {item.icon}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{item.title}</CardTitle>
                            <CardDescription>{item.description}</CardDescription>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full" variant="outline">
                        Visit Page
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All Pages Grid */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {selectedCategory === 'all' ? 'All Pages' : categories.find(c => c.id === selectedCategory)?.name}
            </h2>
            
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pages found</h3>
                <p className="text-gray-600">Try adjusting your search or category filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                            {item.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{item.title}</CardTitle>
                              {item.new && <Badge variant="default" className="text-xs">New</Badge>}
                              {item.popular && <Badge variant="secondary" className="text-xs">Popular</Badge>}
                            </div>
                            <CardDescription className="text-sm">{item.description}</CardDescription>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full" variant="outline">
                        Visit Page
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{navigationItems.length}</div>
                  <div className="text-sm text-gray-600">Total Pages</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{featuredItems.length}</div>
                  <div className="text-sm text-gray-600">Featured</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{popularItems.length}</div>
                  <div className="text-sm text-gray-600">Popular</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{newItems.length}</div>
                  <div className="text-sm text-gray-600">New</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </WebLayout>
  );
}
