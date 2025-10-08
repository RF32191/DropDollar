'use client';

import React, { useState } from 'react';
import WebLayout from '@/components/layout/WebLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone,
  Tablet,
  Monitor,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Globe,
  Trophy,
  Droplets,
  User,
  ShoppingCart,
  Gamepad2,
  CrystalBall,
  TrendingUp
} from 'lucide-react';

export default function MobileTestPage() {
  const [currentDevice, setCurrentDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  const pages = [
    {
      id: 'home',
      title: 'Home Page',
      description: 'Main landing page with hero section',
      href: '/',
      icon: <Globe className="h-4 w-4" />,
      mobileOptimized: true,
      features: ['Responsive hero', 'Feature grid', 'Mobile navigation']
    },
    {
      id: 'tournaments',
      title: 'Tournaments',
      description: 'Tournament listings and management',
      href: '/tournaments',
      icon: <Trophy className="h-4 w-4" />,
      mobileOptimized: true,
      features: ['Card grid layout', 'Mobile tabs', 'Touch-friendly buttons']
    },
    {
      id: 'token-purchase',
      title: 'Token Purchase',
      description: 'Buy Drop Coin tokens',
      href: '/token-purchase',
      icon: <Droplets className="h-4 w-4" />,
      mobileOptimized: true,
      features: ['Mobile form', 'Payment methods', 'Responsive layout']
    },
    {
      id: 'signin',
      title: 'Sign In',
      description: 'User authentication',
      href: '/signin',
      icon: <User className="h-4 w-4" />,
      mobileOptimized: true,
      features: ['Mobile form', 'Touch inputs', 'Responsive design']
    },
    {
      id: 'signup',
      title: 'Sign Up',
      description: 'User registration',
      href: '/signup',
      icon: <User className="h-4 w-4" />,
      mobileOptimized: true,
      features: ['Mobile form', 'Validation', 'Touch-friendly']
    },
    {
      id: 'navigation',
      title: 'All Pages',
      description: 'Comprehensive navigation page',
      href: '/navigation',
      icon: <Globe className="h-4 w-4" />,
      mobileOptimized: true,
      features: ['Search functionality', 'Category filters', 'Mobile grid']
    }
  ];

  const deviceInfo = {
    mobile: {
      name: 'Mobile',
      icon: <Smartphone className="h-5 w-5" />,
      width: '375px',
      height: '667px',
      description: 'iPhone SE size'
    },
    tablet: {
      name: 'Tablet',
      icon: <Tablet className="h-5 w-5" />,
      width: '768px',
      height: '1024px',
      description: 'iPad size'
    },
    desktop: {
      name: 'Desktop',
      icon: <Monitor className="h-5 w-5" />,
      width: '1920px',
      height: '1080px',
      description: 'Desktop size'
    }
  };

  return (
    <WebLayout currentPage="mobile-test">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">
                📱 Mobile Testing Center
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8">
                Test all pages on different screen sizes
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Device Selector */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Device Testing</CardTitle>
                <CardDescription>
                  Select a device size to test responsive behavior
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(deviceInfo).map(([key, info]) => (
                    <Button
                      key={key}
                      variant={currentDevice === key ? 'default' : 'outline'}
                      onClick={() => setCurrentDevice(key as any)}
                      className="flex items-center gap-2"
                    >
                      {info.icon}
                      {info.name}
                    </Button>
                  ))}
                </div>
                
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {deviceInfo[currentDevice].icon}
                    <span className="font-semibold">{deviceInfo[currentDevice].name}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Size: {deviceInfo[currentDevice].width} × {deviceInfo[currentDevice].height}
                  </p>
                  <p className="text-sm text-gray-600">
                    {deviceInfo[currentDevice].description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Page Testing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.map((page) => (
              <Card key={page.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {page.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{page.title}</CardTitle>
                        <CardDescription>{page.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={page.mobileOptimized ? 'default' : 'secondary'}>
                      {page.mobileOptimized ? 'Optimized' : 'Needs Work'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Features */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Mobile Features:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {page.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Test Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(page.href, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Test Page
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        // Simulate mobile view
                        const viewport = document.querySelector('meta[name="viewport"]');
                        if (viewport) {
                          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
                        }
                        window.open(page.href, '_blank');
                      }}
                    >
                      <Smartphone className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Testing Instructions */}
          <div className="mt-12">
            <Card>
              <CardHeader>
                <CardTitle>🧪 Testing Instructions</CardTitle>
                <CardDescription>
                  How to test mobile responsiveness
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Mobile Testing
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• Use browser dev tools</li>
                      <li>• Set to mobile viewport</li>
                      <li>• Test touch interactions</li>
                      <li>• Check navigation rows</li>
                      <li>• Verify form usability</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Tablet className="h-4 w-4" />
                      Tablet Testing
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• Test landscape/portrait</li>
                      <li>• Check grid layouts</li>
                      <li>• Verify touch targets</li>
                      <li>• Test navigation overflow</li>
                      <li>• Check form layouts</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Desktop Testing
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• Test full navigation</li>
                      <li>• Check hover states</li>
                      <li>• Verify multi-column layouts</li>
                      <li>• Test keyboard navigation</li>
                      <li>• Check accessibility</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Quick Test Checklist</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium mb-2">Navigation</h5>
                      <ul className="space-y-1 text-blue-800">
                        <li>□ Mobile menu opens/closes</li>
                        <li>□ Row navigation scrolls</li>
                        <li>□ All links work</li>
                        <li>□ Touch targets are large enough</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Forms</h5>
                      <ul className="space-y-1 text-blue-800">
                        <li>□ Inputs are touch-friendly</li>
                        <li>□ Validation works</li>
                        <li>□ Submit buttons work</li>
                        <li>□ Error messages display</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Layout</h5>
                      <ul className="space-y-1 text-blue-800">
                        <li>□ Content fits screen</li>
                        <li>□ No horizontal scroll</li>
                        <li>□ Text is readable</li>
                        <li>□ Images scale properly</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Performance</h5>
                      <ul className="space-y-1 text-blue-800">
                        <li>□ Pages load quickly</li>
                        <li>□ Smooth scrolling</li>
                        <li>□ No layout shifts</li>
                        <li>□ Touch responses are fast</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </WebLayout>
  );
}
