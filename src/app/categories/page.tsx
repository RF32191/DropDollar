'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  ClockIcon
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
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      pink: 'bg-pink-50 border-pink-200 text-pink-800',
      red: 'bg-red-50 border-red-200 text-red-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      teal: 'bg-teal-50 border-teal-200 text-teal-800',
      gray: 'bg-gray-50 border-gray-200 text-gray-800',
      cyan: 'bg-cyan-50 border-cyan-200 text-cyan-800',
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const getIconColorClasses = (color: string) => {
    const colorMap = {
      blue: 'text-blue-600 bg-blue-100',
      pink: 'text-pink-600 bg-pink-100',
      red: 'text-red-600 bg-red-100',
      green: 'text-green-600 bg-green-100',
      orange: 'text-orange-600 bg-orange-100',
      purple: 'text-purple-600 bg-purple-100',
      indigo: 'text-indigo-600 bg-indigo-100',
      yellow: 'text-yellow-600 bg-yellow-100',
      teal: 'text-teal-600 bg-teal-100',
      gray: 'text-gray-600 bg-gray-100',
      cyan: 'text-cyan-600 bg-cyan-100',
      emerald: 'text-emerald-600 bg-emerald-100'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Simple Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="w-10 h-10 mr-3">
                <img
                  src="/DropCoin.png"
                  alt="Dollar Drop Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white transition-colors">Dollar Drop</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/listings" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">Browse</Link>
              <Link href="/categories" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">Categories</Link>
              <Link href="/games" className="text-purple-600 dark:text-green-400 hover:text-purple-700 dark:hover:text-green-300 font-bold transition-colors">🎮 Games</Link>
              <Link href="/hot-sell" className="text-red-600 dark:text-green-400 hover:text-red-700 dark:hover:text-green-300 font-bold transition-colors">🔥 Hot Sell</Link>
              <Link href="/how-it-works" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">How It Works</Link>
              <Link href="/buy-tokens" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">💰 Buy Tokens</Link>
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700 transition-colors">
                <Link href="/wallet" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">👛 Wallet</Link>
                <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors">⚙️ Settings</Link>
                <Link href="/auth/login" className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors">Sign In</Link>
                <Link href="/auth/register" className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sign Up</Link>
                <Link href="/seller/apply" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sell</Link>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎯 Browse Gaming Categories
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover skill-based gaming competitions across all your favorite categories. 
            From electronics to collectibles - every category has mystery games to master!
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
            />
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-white rounded-2xl p-6 mb-12 shadow-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {categories.reduce((sum, cat) => sum + cat.count, 0).toLocaleString()}
              </div>
              <div className="text-gray-600 font-medium">Total Competitions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {categories.reduce((sum, cat) => sum + cat.hotCount, 0)}
              </div>
              <div className="text-gray-600 font-medium">🔥 Hot Sell Active</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">12</div>
              <div className="text-gray-600 font-medium">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">5</div>
              <div className="text-gray-600 font-medium">Skill Games</div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCategories.map((category) => {
            const IconComponent = category.icon;
            
            return (
              <Link
                key={category.id}
                href={`/categories/${category.id}`}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-200 group hover:-translate-y-1"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getIconColorClasses(category.color)}`}>
                    <IconComponent className="h-8 w-8" />
                  </div>
                  {category.hotCount > 0 && (
                    <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-bold flex items-center">
                      <FireIcon className="h-4 w-4 mr-1" />
                      {category.hotCount} Hot
                    </div>
                  )}
                </div>

                {/* Category Info */}
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                  {category.name}
                </h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  {category.description}
                </p>

                {/* Stats */}
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center text-gray-500">
                    <TrophyIcon className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">{category.count.toLocaleString()} competitions</span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">$1 entry</span>
                  </div>
                </div>

                {/* Featured Items */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 mb-2">🎯 Popular Items:</div>
                  <div className="flex flex-wrap gap-2">
                    {category.featured.slice(0, 3).map((item, index) => (
                      <span
                        key={index}
                        className={`text-xs px-2 py-1 rounded-full border ${getColorClasses(category.color)}`}
                      >
                        {item}
                      </span>
                    ))}
                    {category.featured.length > 3 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        +{category.featured.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Browse Button */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="text-green-600 font-bold text-sm group-hover:text-green-700 flex items-center">
                    Browse {category.name}
                    <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🎮 Ready to Start Gaming?
            </h2>
            <p className="text-gray-600 mb-6">
              Every category features mystery skill-based games. Practice first, then compete for real prizes!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/games" 
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                🎯 Practice Games
              </Link>
              <Link 
                href="/hot-sell" 
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                🔥 Hot Competitions
              </Link>
              <Link 
                href="/listings" 
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                🏆 Browse All
              </Link>
            </div>
          </div>
        </div>

        {/* Gaming Info */}
        <div className="mt-12 bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              🎯 How Category Gaming Works
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">$1 Entry</h4>
              <p className="text-gray-600 text-sm">Every competition in every category costs just $1 to enter. Fair gaming for everyone!</p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎲</span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Mystery Games</h4>
              <p className="text-gray-600 text-sm">Each item has a randomly assigned skill game. No one knows which until they enter!</p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrophyIcon className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Skill Wins</h4>
              <p className="text-gray-600 text-sm">Highest score wins the prize! Pure skill determines the winner in every category.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2024 Dollar Drop - Revolutionary Skill-Based Gaming Marketplace</p>
          <div className="mt-4 flex justify-center space-x-6">
            <Link href="/how-it-works" className="text-gray-400 hover:text-white">How It Works</Link>
            <Link href="/games" className="text-gray-400 hover:text-white">Practice Games</Link>
            <Link href="/categories" className="text-gray-400 hover:text-white">Categories</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}