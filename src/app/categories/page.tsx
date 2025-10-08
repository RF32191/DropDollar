'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/navigation/Navigation';
import PageLayout from '@/components/layout/PageLayout';
import GameCard from '@/components/ui/GameCard';
import {
  MagnifyingGlassIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
  HomeIcon,
  TruckIcon,
  HeartIcon,
  GlobeAltIcon,
  BookOpenIcon,
  MusicalNoteIcon,
  PaintBrushIcon,
  CameraIcon,
  WrenchScrewdriverIcon,
  FireIcon,
  TrophyIcon,
  CurrencyDollarIcon,
  ClockIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';

const categories = [
  {
    id: 'electronics',
    name: 'Electronics',
    description: 'Smartphones, laptops, cameras, gaming consoles, and tech gadgets',
    icon: DevicePhoneMobileIcon,
    color: 'blue',
    count: 1247,
    hotCount: 23,
    featured: [
      'iPhone 15 Pro Max',
      'MacBook Pro M3',
      'PlayStation 5',
      'Canon EOS R5',
      'Samsung 4K TV'
    ]
  },
  {
    id: 'fashion',
    name: 'Fashion & Accessories',
    description: 'Designer clothing, shoes, handbags, jewelry, and luxury accessories',
    icon: SparklesIcon,
    color: 'pink',
    count: 892,
    hotCount: 18,
    featured: [
      'Louis Vuitton Bags',
      'Nike Jordan Sneakers',
      'Chanel Perfume',
      'Rolex Watches',
      'Gucci Sunglasses'
    ]
  },
  {
    id: 'automotive',
    name: 'Automotive',
    description: 'Cars, motorcycles, parts, accessories, and automotive tools',
    icon: TruckIcon,
    color: 'red',
    count: 456,
    hotCount: 8,
    featured: [
      'Tesla Model 3',
      'BMW M3',
      'Harley Davidson',
      'Car Audio Systems',
      'Performance Parts'
    ]
  },
  {
    id: 'home',
    name: 'Home & Garden',
    description: 'Furniture, appliances, decor, tools, and garden equipment',
    icon: HomeIcon,
    color: 'green',
    count: 634,
    hotCount: 12,
    featured: [
      'Smart Home Systems',
      'Kitchen Appliances',
      'Outdoor Furniture',
      'Power Tools',
      'Garden Equipment'
    ]
  },
  {
    id: 'sports',
    name: 'Sports & Outdoors',
    description: 'Fitness equipment, outdoor gear, sports memorabilia, and athletic wear',
    icon: TrophyIcon,
    color: 'orange',
    count: 523,
    hotCount: 9,
    featured: [
      'Peloton Bikes',
      'Golf Clubs',
      'Camping Gear',
      'Gym Equipment',
      'Sports Cards'
    ]
  },
  {
    id: 'jewelry',
    name: 'Jewelry & Watches',
    description: 'Fine jewelry, luxury watches, precious metals, and collectible timepieces',
    icon: HeartIcon,
    color: 'purple',
    count: 378,
    hotCount: 15,
    featured: [
      'Rolex Submariner',
      'Diamond Rings',
      'Cartier Watches',
      'Gold Chains',
      'Vintage Jewelry'
    ]
  },
  {
    id: 'collectibles',
    name: 'Collectibles & Art',
    description: 'Trading cards, vintage items, artwork, antiques, and rare collectibles',
    icon: PaintBrushIcon,
    color: 'indigo',
    count: 789,
    hotCount: 21,
    featured: [
      'Pokemon Cards',
      'Comic Books',
      'Vintage Toys',
      'Original Artwork',
      'Rare Coins'
    ]
  },
  {
    id: 'books',
    name: 'Books & Media',
    description: 'Books, movies, music, games, and educational materials',
    icon: BookOpenIcon,
    color: 'yellow',
    count: 234,
    hotCount: 5,
    featured: [
      'First Edition Books',
      'Vinyl Records',
      'Blu-ray Collections',
      'Video Games',
      'Educational Courses'
    ]
  },
  {
    id: 'music',
    name: 'Musical Instruments',
    description: 'Guitars, keyboards, drums, audio equipment, and music accessories',
    icon: MusicalNoteIcon,
    color: 'teal',
    count: 167,
    hotCount: 4,
    featured: [
      'Gibson Guitars',
      'Yamaha Pianos',
      'DJ Equipment',
      'Studio Monitors',
      'Vintage Synthesizers'
    ]
  },
  {
    id: 'tools',
    name: 'Tools & Equipment',
    description: 'Professional tools, machinery, workshop equipment, and industrial supplies',
    icon: WrenchScrewdriverIcon,
    color: 'gray',
    count: 345,
    hotCount: 6,
    featured: [
      'Dewalt Power Tools',
      'Welding Equipment',
      '3D Printers',
      'Workshop Tools',
      'Measuring Instruments'
    ]
  },
  {
    id: 'travel',
    name: 'Travel & Luggage',
    description: 'Luggage, travel accessories, camping gear, and vacation essentials',
    icon: GlobeAltIcon,
    color: 'cyan',
    count: 198,
    hotCount: 3,
    featured: [
      'Samsonite Luggage',
      'Travel Backpacks',
      'Camera Bags',
      'Travel Electronics',
      'Outdoor Gear'
    ]
  },
  {
    id: 'photography',
    name: 'Photography & Video',
    description: 'Cameras, lenses, lighting equipment, and video production gear',
    icon: CameraIcon,
    color: 'emerald',
    count: 289,
    hotCount: 7,
    featured: [
      'Canon Cameras',
      'Sony Lenses',
      'Drone Equipment',
      'Studio Lighting',
      'Video Cameras'
    ]
  },
  {
    id: 'dropafund',
    name: 'DropAFund',
    description: 'Community-funded competitions with multiple winners and flexible rewards',
    icon: BeakerIcon,
    color: 'cyan',
    count: 42,
    hotCount: 15,
    featured: [
      'Multi-Winner Campaigns',
      'Charity Fundraisers',
      'Community Projects',
      'Skill Competitions',
      'Flexible Rewards'
    ]
  }
];

export default function CategoriesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300',
      pink: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-700 text-pink-800 dark:text-pink-300',
      red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300',
      green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300',
      orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-800 dark:text-orange-300',
      purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-800 dark:text-purple-300',
      indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300',
      teal: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700 text-teal-800 dark:text-teal-300',
      gray: 'bg-gray-50 dark:bg-gray-700/20 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-300',
      cyan: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-700 text-cyan-800 dark:text-cyan-300',
      emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const getIconColorClasses = (color: string) => {
    const colorMap = {
      blue: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
      pink: 'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30',
      red: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
      green: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
      orange: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
      purple: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
      indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
      yellow: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
      teal: 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30',
      gray: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/30',
      cyan: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30',
      emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <>
      {/* Purple Navigation Bar */}
      <header className="bg-gradient-to-r from-purple-800 via-purple-900 to-indigo-900 shadow-xl border-b border-purple-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                <img
                  src="/DropCoin.png"
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">DropDollar</h1>
                <p className="text-purple-200 text-sm">Gaming Categories</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link 
                href="/" 
                className="text-purple-200 hover:text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                🏠 Home
              </Link>
              <Link 
                href="/categories" 
                className="bg-purple-700/50 text-white px-4 py-2 rounded-lg font-bold shadow-lg border border-purple-600/50"
              >
                🎯 Categories
              </Link>
              <Link 
                href="/games" 
                className="text-purple-200 hover:text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                🎮 Games
              </Link>
              <Link 
                href="/hot-sell" 
                className="text-purple-200 hover:text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                🔥 Hot Sell
              </Link>
              <Link 
                href="/tournaments" 
                className="text-purple-200 hover:text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                🏆 Tournaments
              </Link>
              <Link 
                href="/categories/dropafund" 
                className="text-purple-200 hover:text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                💧 DropAFund
              </Link>
            </nav>

            {/* User Actions */}
            <Navigation variant="default" />

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button className="text-purple-200 hover:text-white p-2">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <PageLayout
        title="GAMING CATEGORIES"
        subtitle="Discover skill-based competitions across all your favorite categories. From electronics to collectibles - every category has transparent games to master!"
        icon="🎯"
        gradient="purple"
        className="py-16 bg-gray-50 dark:bg-gray-800 transition-colors"
      >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <GameCard className="p-6">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
              />
            </div>
          </GameCard>
        </div>

        {/* Stats Bar */}
        <GameCard className="mb-12" gradient>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {categories.reduce((sum, cat) => sum + cat.count, 0).toLocaleString()}
              </div>
              <div className="text-gray-600 dark:text-gray-300 font-medium">Total Competitions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {categories.reduce((sum, cat) => sum + cat.hotCount, 0)}
              </div>
              <div className="text-gray-600 dark:text-gray-300 font-medium">🔥 Hot Sell Active</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">13</div>
              <div className="text-gray-600 dark:text-gray-300 font-medium">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">3</div>
              <div className="text-gray-600 dark:text-gray-300 font-medium">Skill Games</div>
            </div>
          </div>
        </GameCard>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCategories.map((category) => {
            const IconComponent = category.icon;
            
            return (
              <Link key={category.id} href={`/categories/${category.id}`} className="group">
                <GameCard className="h-full" gradient>
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${getIconColorClasses(category.color)}`}>
                      <IconComponent className="h-8 w-8" />
                    </div>
                    {category.hotCount > 0 && (
                      <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-sm font-bold flex items-center transition-colors">
                        <FireIcon className="h-4 w-4 mr-1" />
                        {category.hotCount} Hot
                      </div>
                    )}
                  </div>

                  {/* Category Info */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed transition-colors">
                    {category.description}
                  </p>

                  {/* Stats */}
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 transition-colors">
                      <TrophyIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">{category.count.toLocaleString()} competitions</span>
                    </div>
                    <div className="flex items-center text-gray-500 dark:text-gray-400 transition-colors">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">$0.20 entry</span>
                    </div>
                  </div>

                  {/* Featured Items */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">🎯 Popular Items:</div>
                    <div className="flex flex-wrap gap-2">
                      {category.featured.slice(0, 3).map((item, index) => (
                        <span
                          key={index}
                          className={`text-xs px-2 py-1 rounded-full border transition-colors ${getColorClasses(category.color)}`}
                        >
                          {item}
                        </span>
                      ))}
                      {category.featured.length > 3 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 transition-colors">
                          +{category.featured.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Browse Button */}
                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 transition-colors">
                    <div className="text-purple-600 dark:text-purple-400 font-bold text-sm group-hover:text-purple-700 dark:group-hover:text-purple-300 flex items-center transition-colors">
                      Browse {category.name}
                      <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </GameCard>
              </Link>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16">
          <GameCard className="bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 text-white" padding="lg">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">
                🎮 Ready to Start Gaming?
              </h2>
              <p className="text-purple-100 mb-8 text-lg">
                Every category features transparent skill-based games. Practice first, then compete for real prizes!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/games" 
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold py-3 px-8 rounded-xl transition-all hover:scale-105 shadow-lg"
                >
                  🎯 Practice Games
                </Link>
                <Link 
                  href="/hot-sell" 
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold py-3 px-8 rounded-xl transition-all hover:scale-105 shadow-lg"
                >
                  🔥 Hot Competitions
                </Link>
                <Link 
                  href="/listings" 
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold py-3 px-8 rounded-xl transition-all hover:scale-105 shadow-lg"
                >
                  🏆 Browse All
                </Link>
              </div>
            </div>
          </GameCard>
        </div>

        {/* Gaming Info */}
        <div className="mt-12">
          <GameCard gradient padding="lg">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
                🎯 How Category Gaming Works
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                  <CurrencyDollarIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-lg transition-colors">$1 Entry</h4>
                <p className="text-gray-600 dark:text-gray-300 transition-colors">Every competition in every category costs just $1 to enter. Fair gaming for everyone!</p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                  <span className="text-3xl">🎯</span>
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-lg transition-colors">Transparent Games</h4>
                <p className="text-gray-600 dark:text-gray-300 transition-colors">Each item clearly shows which skill game you'll play. Choose your favorites and strategize!</p>
              </div>
              
              <div className="text-center">
                <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                  <TrophyIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-lg transition-colors">Skill Wins</h4>
                <p className="text-gray-600 dark:text-gray-300 transition-colors">Highest score wins the prize! Pure skill determines the winner in every category.</p>
              </div>
            </div>
          </GameCard>
        </div>
      </div>
    </PageLayout>
    </>
  );
}