'use client';

import React, { useState } from 'react';
import ResponsiveNavigation, { MultiRowNavigation } from '@/components/ui/ResponsiveNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
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
  Phone
} from 'lucide-react';

export default function NavigationTestPage() {
  const [testMode, setTestMode] = useState<'standard' | 'multirow'>('standard');

  // Standard navigation items (6 items)
  const standardItems = [
    {
      id: 'analysis',
      label: 'Crypto Analysis',
      shortLabel: 'Analysis',
      href: '/analysis',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      id: 'trading-game',
      label: 'Trading Game',
      shortLabel: 'Trading',
      href: '/trading-game',
      icon: <Gamepad2 className="h-4 w-4" />
    },
    {
      id: 'prediction-game',
      label: 'Prediction Game',
      shortLabel: 'Predict',
      href: '/prediction-game',
      icon: <CrystalBall className="h-4 w-4" />
    },
    {
      id: 'drop-coin',
      label: 'Drop Coin',
      shortLabel: 'Drop',
      href: '/drop-coin',
      icon: <Droplets className="h-4 w-4" />
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      shortLabel: 'Board',
      href: '/leaderboard',
      icon: <Trophy className="h-4 w-4" />
    },
    {
      id: 'profile',
      label: 'Profile',
      shortLabel: 'Profile',
      href: '/profile',
      icon: <User className="h-4 w-4" />
    }
  ];

  // Extended navigation items (15 items) for multi-row testing
  const extendedItems = [
    ...standardItems,
    {
      id: 'tournaments',
      label: 'Tournaments',
      shortLabel: 'Events',
      href: '/tournaments',
      icon: <Trophy className="h-4 w-4" />
    },
    {
      id: 'marketplace',
      label: 'Marketplace',
      shortLabel: 'Shop',
      href: '/marketplace',
      icon: <ShoppingCart className="h-4 w-4" />
    },
    {
      id: 'news',
      label: 'Crypto News',
      shortLabel: 'News',
      href: '/news',
      icon: <Newspaper className="h-4 w-4" />
    },
    {
      id: 'education',
      label: 'Education',
      shortLabel: 'Learn',
      href: '/education',
      icon: <BookOpen className="h-4 w-4" />
    },
    {
      id: 'api',
      label: 'API Documentation',
      shortLabel: 'API',
      href: '/api-docs',
      icon: <Code className="h-4 w-4" />
    },
    {
      id: 'community',
      label: 'Community',
      shortLabel: 'Community',
      href: '/community',
      icon: <Users className="h-4 w-4" />
    },
    {
      id: 'settings',
      label: 'Settings',
      shortLabel: 'Settings',
      href: '/settings',
      icon: <Settings className="h-4 w-4" />
    },
    {
      id: 'help',
      label: 'Help Center',
      shortLabel: 'Help',
      href: '/help',
      icon: <HelpCircle className="h-4 w-4" />
    },
    {
      id: 'contact',
      label: 'Contact Us',
      shortLabel: 'Contact',
      href: '/contact',
      icon: <Mail className="h-4 w-4" />
    }
  ];

  const logo = (
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">DD</span>
      </div>
      <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Drop Dollar
      </span>
    </div>
  );

  const userMenu = (
    <div className="flex items-center space-x-2">
      <Button variant="ghost" size="sm">
        Sign In
      </Button>
      <Button size="sm">
        Get Started
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Test Controls */}
      <div className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Navigation Test Page</h1>
              <p className="text-gray-600">Test responsive navigation on different screen sizes</p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={testMode === 'standard' ? 'default' : 'outline'}
                onClick={() => setTestMode('standard')}
                size="sm"
              >
                Standard (6 items)
              </Button>
              <Button
                variant={testMode === 'multirow' ? 'default' : 'outline'}
                onClick={() => setTestMode('multirow')}
                size="sm"
              >
                Multi-Row (15 items)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Test */}
      {testMode === 'standard' ? (
        <ResponsiveNavigation
          items={standardItems}
          logo={logo}
          userMenu={userMenu}
          className="sticky top-0 z-50"
        />
      ) : (
        <MultiRowNavigation
          items={extendedItems}
          logo={logo}
          userMenu={userMenu}
          className="sticky top-0 z-50"
          maxItemsPerRow={6}
        />
      )}

      {/* Test Content */}
      <main className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Test Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>🧪 Navigation Testing Instructions</CardTitle>
                <CardDescription>
                  Test the responsive navigation system on different screen sizes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">📱 Mobile Testing (< 768px)</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Should show hamburger menu</li>
                    <li>• Tap menu to open slide-out navigation</li>
                    <li>• All items should be visible in mobile menu</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">📱 Tablet Testing (768px - 1024px)</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Should show horizontal navigation</li>
                    <li>• Items may use short labels</li>
                    <li>• "More" dropdown for overflow items</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">🖥️ Desktop Testing (> 1024px)</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Should show full horizontal navigation</li>
                    <li>• All items visible (standard mode)</li>
                    <li>• Multi-row layout (multi-row mode)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Current Test Mode */}
            <Card>
              <CardHeader>
                <CardTitle>🔧 Current Test Configuration</CardTitle>
                <CardDescription>
                  Active navigation mode and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Test Mode:</span>
                  <Badge variant={testMode === 'standard' ? 'default' : 'secondary'}>
                    {testMode === 'standard' ? 'Standard Navigation' : 'Multi-Row Navigation'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Navigation Items:</span>
                  <Badge variant="outline">
                    {testMode === 'standard' ? '6 items' : '15 items'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Max Items Per Row:</span>
                  <Badge variant="outline">
                    {testMode === 'multirow' ? '6 items' : 'N/A'}
                  </Badge>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">📊 Screen Size Detection</h4>
                  <div className="text-sm text-gray-600">
                    <p>Current screen size: <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                      {typeof window !== 'undefined' ? 
                        window.innerWidth < 768 ? 'Mobile' : 
                        window.innerWidth < 1024 ? 'Tablet' : 'Desktop' 
                        : 'Unknown'
                      }
                    </span></p>
                    <p className="mt-1">Width: <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                      {typeof window !== 'undefined' ? `${window.innerWidth}px` : 'Unknown'}
                    </span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Responsive Test Grid */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📱 Responsive Test Grid</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }, (_, i) => (
                <Card key={i} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Test Card {i + 1}</CardTitle>
                    <CardDescription>
                      This card demonstrates responsive grid layout
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Resize your browser window to see how the grid adapts to different screen sizes.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
