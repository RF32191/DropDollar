'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import UserMenu from '@/components/navigation/UserMenu';
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

// Force dynamic rendering to prevent build timeouts
export const dynamic = 'force-dynamic';

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
      'Dyson Vacuum',
      'KitchenAid Mixer',
      'Outdoor Furniture Set',
      'Smart Home Hub',
      'Garden Tools'
    ]
  },
  {
    id: 'sports',
    name: 'Sports & Fitness',
    description: 'Athletic equipment, fitness gear, outdoor gear, and sports memorabilia',
    icon: TrophyIcon,
    color: 'orange',
    count: 523,
    hotCount: 15,
    featured: [
      'Peloton Bike',
      'Nike Air Max',
      'Golf Clubs Set',
      'Yoga Mat Pro',
      'Basketball Hoop'
    ]
  },
  {
    id: 'collectibles',
    name: 'Collectibles',
    description: 'Trading cards, antiques, art, coins, and rare collectible items',
    icon: HeartIcon,
    color: 'purple',
    count: 789,
    hotCount: 31,
    featured: [
      'Pokemon Cards',
      'Vintage Watches',
      'Art Prints',
      'Comic Books',
      'Rare Coins'
    ]
  }
];

export default function CategoriesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Flashy Header */}
      <header className="bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 shadow-2xl border-b-4 border-amber-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Flashy Logo */}
            <Link href="/" className="flex items-center space-x-4 group">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                <img 
                  src="/DropCoin.png" 
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold text-white drop-shadow-lg">DropDollar</span>
                <span className="text-sm text-yellow-200 font-bold tracking-wider animate-pulse">
                  ⚡ PROFESSIONAL GAMING MARKETPLACE ⚡
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-8">
              <Link href="/listings" className="text-white hover:text-yellow-300 font-bold text-lg transition-all duration-300 hover:scale-105">Browse</Link>
              <Link href="/games" className="text-purple-300 hover:text-purple-200 font-bold text-lg transition-all duration-300 hover:scale-105">🎮 Games</Link>
              <Link href="/tournaments" className="text-yellow-300 hover:text-yellow-200 font-bold text-lg transition-all duration-300 hover:scale-105">🏆 Tournaments</Link>
              <Link href="/hot-sell" className="text-red-300 hover:text-red-200 font-bold text-lg transition-all duration-300 hover:scale-105">🔥 Hot Sell</Link>
              <div className="ml-4 pl-4 border-l border-yellow-400">
                <UserMenu variant="dark" />
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent animate-pulse">
              Gaming Categories
            </span>
          </h1>
          <p className="text-xl text-white mb-8 max-w-4xl mx-auto">
            Discover skill-based competitions across all your favorite categories. From electronics to collectibles - every category has transparent games to master!
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-gradient-to-r from-slate-800 to-gray-800 p-6 rounded-2xl border-2 border-slate-600 shadow-2xl">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-gray-700 text-white placeholder-gray-400 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-gradient-to-r from-blue-800 to-purple-800 p-8 rounded-2xl border-2 border-blue-400 shadow-2xl mb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">6</div>
              <div className="text-blue-200 text-lg">Categories</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">4,541</div>
              <div className="text-blue-200 text-lg">Total Items</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">107</div>
              <div className="text-blue-200 text-lg">Hot Items</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">89</div>
              <div className="text-blue-200 text-lg">Active Games</div>
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
                className="group bg-gradient-to-br from-slate-800 to-gray-800 p-8 rounded-2xl border-2 border-slate-600 hover:border-blue-400 transition-all duration-300 hover:scale-105 shadow-2xl"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-gray-300 mb-4 text-sm">
                    {category.description}
                  </p>
                  <div className="flex justify-center space-x-4 text-sm">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full">
                      {category.count} items
                    </span>
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full">
                      {category.hotCount} hot
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Featured Items Preview */}
        <div className="mt-16">
          <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-center mb-8">
            Featured Items by Category
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.slice(0, 6).map((category) => (
              <div key={category.id} className="bg-gradient-to-br from-slate-800 to-gray-800 p-6 rounded-2xl border-2 border-slate-600 shadow-2xl">
                <h3 className="text-xl font-semibold text-white mb-4">
                  {category.name}
                </h3>
                <ul className="space-y-2">
                  {category.featured.slice(0, 3).map((item, index) => (
                    <li key={index} className="text-sm text-gray-300 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/categories/${category.id}`}
                  className="mt-4 inline-block text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                >
                  View all {category.count} items →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}