'use client';

import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import AdBanner from '@/components/ads/AdBanner';
import { 
  TrophyIcon, 
  UsersIcon,
  FireIcon,
  BanknotesIcon,
  StarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

export default function TournamentsPage() {
  const tournamentTypes = [
    {
      id: '1v1',
      title: '1v1 Tournaments',
      description: 'Head-to-head skill battles with winner-takes-all prizes',
      icon: TrophyIcon,
      href: '/tournaments/1v1',
      color: 'from-blue-500 to-purple-500',
      features: ['Skill-based matchmaking', 'Winner takes all', 'Quick matches', 'ELO rating system'],
      example: '2 players, 1 token entry each = 2 token prize pool'
    },
    {
      id: 'winner-takes-all',
      title: 'Winner Takes It All',
      description: 'Unlimited player tournaments where the winner takes the entire prize pool',
      icon: UsersIcon,
      href: '/winner-takes-all',
      color: 'from-green-500 to-teal-500',
      features: ['Winner takes all', 'Unlimited players', 'Growing prize pools', 'Base price triggers'],
      example: 'Unlimited players, 1 token entry each = growing prize pool'
    },
    {
      id: 'hot-sell',
      title: 'Hot Sell',
      description: 'Massive cash prize tournaments with real money payouts',
      icon: FireIcon,
      href: '/hot-sell',
      color: 'from-red-500 to-orange-500',
      features: ['Real money prizes', 'Big prize pools', 'Professional tournaments', 'Cash payouts'],
      example: '$50,000 prize pool with 1st, 2nd, 3rd place winners'
    },
    {
      id: 'listings',
      title: 'Physical Listings',
      description: 'Win real physical items and connect with sellers',
      icon: BanknotesIcon,
      href: '/listings',
      color: 'from-purple-500 to-pink-500',
      features: ['Physical prizes', 'Seller connections', 'Item verification', 'Shipping included'],
      example: 'Win a PlayStation 5, iPhone, or other physical items'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/5 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>
      
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Ad Banner */}
        <AdBanner pageLocation="tournaments" position="top" maxAds={1} />
        
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center mb-6">
            <TrophyIcon className="w-16 h-16 text-yellow-500 mr-4 animate-pulse" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              TOURNAMENTS
            </h1>
          </div>
          <p className="text-2xl text-gray-300 mb-4">Choose Your Competition Style</p>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            From intense 1v1 battles to massive cash prize tournaments, find the perfect competition for your skill level and budget.
          </p>
        </div>

        {/* Tournament Types Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {tournamentTypes.map((tournament, index) => (
            <Link
              key={tournament.id}
              href={tournament.href}
              className="group bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`w-16 h-16 bg-gradient-to-r ${tournament.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                  <tournament.icon className="w-8 h-8 text-white" />
                </div>
                <ArrowRightIcon className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors duration-300" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-yellow-300 transition-colors duration-300">
                {tournament.title}
              </h2>
              
              <p className="text-gray-300 mb-6 text-lg leading-relaxed">
                {tournament.description}
              </p>
              
              {/* Features */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">Key Features</h3>
                <div className="grid grid-cols-2 gap-2">
                  {tournament.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center">
                      <StarIcon className="w-4 h-4 text-yellow-400 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Example */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Example</h4>
                <p className="text-sm text-gray-300">{tournament.example}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 text-center">
            <TrophyIcon className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
            <p className="text-2xl font-bold text-white">1v1</p>
            <p className="text-gray-400 text-sm">Head-to-Head</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 text-center">
            <UsersIcon className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <p className="text-2xl font-bold text-white">Winner</p>
            <p className="text-gray-400 text-sm">Takes All</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 text-center">
            <FireIcon className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-2xl font-bold text-white">Hot Sell</p>
            <p className="text-gray-400 text-sm">Cash Prizes</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 text-center">
            <BanknotesIcon className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <p className="text-2xl font-bold text-white">Listings</p>
            <p className="text-gray-400 text-sm">Physical Items</p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Compete?</h2>
          <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
            Join thousands of players competing for tokens, cash prizes, and physical items. 
            Start with practice games to build your skills, then enter tournaments to win big!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/games"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center">
                <StarIcon className="w-5 h-5 mr-2" />
                Practice Games
              </div>
            </Link>
            <Link
              href="/buy-tokens"
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center">
                <BanknotesIcon className="w-5 h-5 mr-2" />
                Buy Tokens
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}