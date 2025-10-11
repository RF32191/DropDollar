'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/navigation/Navigation';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import PageLayout from '@/components/layout/PageLayout';
import GameCard from '@/components/ui/GameCard';
import { useGlobalLocation } from '@/hooks/useGlobalLocation';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
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
  },
  {
    id: 'books',
    name: 'Books & Media',
    description: 'Books, movies, music, games, and educational materials',
    icon: BookOpenIcon,
    color: 'indigo',
    count: 234,
    hotCount: 5,
    featured: [
      'Best Seller Books',
      'Vintage Records',
      'Board Games',
      'Educational Courses',
      'Digital Media'
    ]
  },
  {
    id: 'music',
    name: 'Music & Instruments',
    description: 'Musical instruments, audio equipment, and music accessories',
    icon: MusicalNoteIcon,
    color: 'yellow',
    count: 345,
    hotCount: 9,
    featured: [
      'Electric Guitar',
      'Piano Keyboard',
      'Studio Monitors',
      'DJ Equipment',
      'Music Software'
    ]
  },
  {
    id: 'art',
    name: 'Art & Crafts',
    description: 'Paintings, sculptures, handmade crafts, and art supplies',
    icon: PaintBrushIcon,
    color: 'pink',
    count: 178,
    hotCount: 7,
    featured: [
      'Original Paintings',
      'Handmade Pottery',
      'Art Supplies',
      'Craft Materials',
      'Digital Art'
    ]
  },
  {
    id: 'photography',
    name: 'Photography',
    description: 'Cameras, lenses, lighting equipment, and photography accessories',
    icon: CameraIcon,
    color: 'gray',
    count: 267,
    hotCount: 11,
    featured: [
      'DSLR Cameras',
      'Professional Lenses',
      'Lighting Kits',
      'Tripods',
      'Memory Cards'
    ]
  },
  {
    id: 'tools',
    name: 'Tools & Equipment',
    description: 'Power tools, hand tools, workshop equipment, and professional gear',
    icon: WrenchScrewdriverIcon,
    color: 'blue',
    count: 445,
    hotCount: 14,
    featured: [
      'Power Drills',
      'Tool Sets',
      'Workshop Equipment',
      'Safety Gear',
      'Professional Tools'
    ]
  },
  {
    id: 'dropafund',
    name: 'DropAFund',
    description: 'Community-funded competitions with multiple winners and flexible rewards',
    icon: FireIcon,
    color: 'red',
    count: 89,
    hotCount: 12,
    featured: [
      'Community Campaigns',
      'Skill Competitions',
      'Group Challenges',
      'Flexible Rewards',
      'Multiple Winners'
    ]
  }
];

export default function CategoriesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const globalLocation = useGlobalLocation();
  
  // 10-minute inactivity timeout
  useInactivityTimeout({
    timeout: 10 * 60 * 1000, // 10 minutes
    onTimeout: () => {
      console.log('🕐 Categories page timeout - reloading for fresh content');
      window.location.reload();
    },
    enabled: true
  });

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Clean Navigation */}
      <CleanNavigation variant="gradient" currentPage="/categories" />

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-white mb-2">12</div>
                <div className="text-purple-200 text-sm">Categories</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-2">5,541</div>
                <div className="text-purple-200 text-sm">Total Items</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-2">150</div>
                <div className="text-purple-200 text-sm">Hot Items</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-2">89</div>
                <div className="text-purple-200 text-sm">Active Games</div>
              </div>
            </div>
          </GameCard>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Link
                  key={category.id}
                  href={`/categories/${category.id}`}
                  className="group"
                >
                  <GameCard hover className="h-full">
                    <div className="text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 ${
                        category.color === 'blue' ? 'bg-blue-500' :
                        category.color === 'pink' ? 'bg-pink-500' :
                        category.color === 'red' ? 'bg-red-500' :
                        category.color === 'green' ? 'bg-green-500' :
                        category.color === 'purple' ? 'bg-purple-500' :
                        category.color === 'yellow' ? 'bg-yellow-500' :
                        category.color === 'orange' ? 'bg-orange-500' :
                        category.color === 'indigo' ? 'bg-indigo-500' :
                        category.color === 'gray' ? 'bg-gray-500' :
                        'bg-gray-500'
                      }`}>
                        <IconComponent className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {category.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                        {category.description}
                      </p>
                      <div className="flex justify-center space-x-4 text-sm">
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                          {category.count} items
                        </span>
                        <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-3 py-1 rounded-full">
                          {category.hotCount} hot
                        </span>
                      </div>
                    </div>
                  </GameCard>
                </Link>
              );
            })}
          </div>

          {/* Featured Items Preview */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">
              Featured Items by Category
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.slice(0, 6).map((category) => (
                <GameCard key={category.id} className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {category.name}
                  </h3>
                  <ul className="space-y-2">
                    {category.featured.slice(0, 3).map((item, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/categories/${category.id}`}
                    className="mt-4 inline-block text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium"
                  >
                    View all {category.count} items →
                  </Link>
                </GameCard>
              ))}
            </div>
          </div>
        </div>
      </PageLayout>
    </div>
  );
}