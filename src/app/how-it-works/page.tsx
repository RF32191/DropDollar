// Using inline header/footer to avoid component issues
import Link from 'next/link';
import UserMenu from '@/components/navigation/UserMenu';
import { 
  CurrencyDollarIcon, 
  ClockIcon, 
  TrophyIcon, 
  UserGroupIcon,
  ShieldCheckIcon,
  EyeSlashIcon,
  FireIcon,
  PuzzlePieceIcon,
  CursorArrowRaysIcon,
  MusicalNoteIcon,
  DevicePhoneMobileIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* FIXED Gaming-Inspired Header */}
      <header className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-700 dark:via-cyan-700 dark:to-teal-700 shadow-2xl border-b-4 border-blue-600 dark:border-blue-500">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo Section */}
            <Link href="/" className="flex items-center group">
              <div className="bg-gradient-to-br from-blue-300 to-teal-500 dark:from-blue-400 dark:to-teal-600 p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 mr-4">
                <img
                  src="/DropCoin.png"
                  alt="DropDollar Logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-white to-blue-100 dark:from-blue-100 dark:to-white bg-clip-text text-transparent group-hover:from-blue-100 group-hover:to-white transition-all duration-300">
                DropDollar
              </div>
            </Link>

            {/* FIXED Navigation - Better Centered */}
            <nav className="flex-1 mx-4">
              <div className="flex items-center justify-center space-x-4">
                <Link href="/listings" className="text-blue-100 dark:text-blue-200 hover:text-white dark:hover:text-blue-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-blue-600/30">Browse</Link>
                <Link href="/categories" className="text-blue-100 dark:text-blue-200 hover:text-white dark:hover:text-blue-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-blue-600/30">Categories</Link>
                <Link href="/games" className="text-blue-100 dark:text-blue-200 hover:text-white dark:hover:text-blue-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-blue-600/30">🎮 Games</Link>
                <Link href="/levels" className="text-blue-100 dark:text-blue-200 hover:text-white dark:hover:text-blue-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-blue-600/30">⭐ Levels</Link>
                <Link href="/tournaments" className="text-blue-100 dark:text-blue-200 hover:text-white dark:hover:text-blue-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-blue-600/30">🏆 Tournaments</Link>
                
                {/* Active How It Works Link */}
                <div className="bg-gradient-to-r from-blue-300 to-cyan-400 dark:from-blue-400 dark:to-cyan-500 px-4 py-2 rounded-xl shadow-lg">
                  <Link href="/how-it-works" className="text-blue-900 dark:text-blue-800 hover:text-blue-800 dark:hover:text-blue-700 font-bold transition-colors text-sm">📖 How It Works</Link>
                </div>
                
                <Link href="/hot-sell" className="text-blue-100 dark:text-blue-200 hover:text-white dark:hover:text-blue-100 font-medium transition-colors text-sm px-3 py-2 rounded-lg hover:bg-blue-600/30">🔥 Hot Sell</Link>
              </div>
            </nav>

            {/* User Actions */}
            <UserMenu variant="default" />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            📖 How DropDollar Works
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Win real products by playing skill-based games. Fair, transparent, and exciting!
          </p>
        </div>

        {/* Quick Overview */}
        <div className="mb-16 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            🎯 Simple 3-Step Process
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white font-bold">1</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Choose Your Item</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Browse listings and find something you want to win
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white font-bold">2</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Play the Game</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Pay $0.20 to play the assigned skill-based game
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white font-bold">3</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Win & Receive</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Get the highest score to win the item delivered to you
              </p>
            </div>
          </div>
        </div>

        {/* How Competition Works */}
        <div className="mb-16 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            ⏰ Competition Timeline
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-6">
                <ClockIcon className="h-8 w-8 text-blue-600 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Entry Period</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Players can enter the competition by paying $0.20 per attempt. Each listing shows which game you'll play.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mt-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                    💡 Entry cost is now just $0.20 (was $1)
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <div className="bg-green-100 dark:bg-green-900/30 rounded-xl p-6">
                <TrophyIcon className="h-8 w-8 text-green-600 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Competition End</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  When the target price is reached, the competition ends. The player with the highest score wins the item!
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mt-4">
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                    🏆 Pure skill determines winner
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The 6 Current Games */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            🎮 The 6 Skill-Based Games
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Multi-Target Reaction */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="bg-green-100 dark:bg-green-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <CursorArrowRaysIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">🎯 Multi-Target Reaction</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                Click all highlighted targets as quickly as possible. Speed and accuracy determine your score with decimal precision.
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-green-600 font-medium">Medium Difficulty</span>
                <span className="text-gray-500 dark:text-gray-400">Timed rounds</span>
              </div>
            </div>

            {/* Falling Object Catch */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="bg-red-100 dark:bg-red-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <DevicePhoneMobileIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">💰 Falling Object Catch</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                Catch coins and dollars with your cash case using realistic physics. Objects bounce and drift unpredictably!
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-orange-600 font-medium">Medium Difficulty</span>
                <span className="text-gray-500 dark:text-gray-400">Timed rounds</span>
              </div>
            </div>

            {/* Color Sequence Memory */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="bg-pink-100 dark:bg-pink-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <PuzzlePieceIcon className="h-6 w-6 text-pink-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">🌈 Color Sequence Memory</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                Watch colors flash with unique sounds, then repeat the sequence. Speed-based scoring with audio cues!
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-pink-600 font-medium">Hard Difficulty</span>
                <span className="text-gray-500 dark:text-gray-400">Progressive rounds</span>
              </div>
            </div>

            {/* Laser Dodge EXTREME */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="bg-orange-100 dark:bg-orange-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <FireIcon className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">🔥 Laser Dodge EXTREME</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                Pilot your ship through full-screen laser grids. Blue lasers are safe but turn deadly red - risk vs reward!
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-red-600 font-medium">Extreme Difficulty</span>
                <span className="text-gray-500 dark:text-gray-400">Survival mode</span>
              </div>
            </div>

            {/* QuickClick Challenge */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">⚡ QuickClick Challenge</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                Lightning-fast reaction test! Click instantly when the screen flashes green, plus accuracy bonus round.
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-blue-600 font-medium">Easy-Medium</span>
                <span className="text-gray-500 dark:text-gray-400">4 rounds</span>
              </div>
            </div>

            {/* Sword Slash */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <span className="text-purple-600 text-xl font-bold">⚔️</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">⚔️ Sword Slash</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                Destroy red attacks with precise sword slashes. Progressive difficulty with accuracy bonuses for center hits.
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-purple-600 font-medium">Medium-Hard</span>
                <span className="text-gray-500 dark:text-gray-400">Progressive waves</span>
              </div>
            </div>
          </div>

          {/* Game Features */}
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">🎮 Enhanced Game Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-gray-700 dark:text-gray-300">5-second countdown with audio cues</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Decimal scoring for precise rankings</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Rich audio effects for gameplay</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Private score tracking</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Mobile-friendly touch controls</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Fair RNG system for competition</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Progressive difficulty scaling</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Visual feedback and animations</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Custom cursors and game assets</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gaming Rules */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            📋 Gaming Rules & Limits
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-8 border border-red-200 dark:border-red-800">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl text-white">🏆</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Win Limits</h3>
              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  <span>Maximum <strong>3 wins per day</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  <span>After 3 wins, you're <strong>locked out</strong> for the day</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  <span>Prevents excessive winning by single users</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  <span>Resets at midnight (your timezone)</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-8 border border-green-200 dark:border-green-800">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl text-white">📊</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Daily Participation</h3>
              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Maximum <strong>10 listings per day</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Can enter up to 3 times per listing</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Maximum daily spend: <strong>$6</strong> (10 × 3 × $0.20)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Encourages responsible gaming</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <span className="text-yellow-600 text-2xl">⚠️</span>
              <div>
                <h4 className="font-bold text-yellow-800 dark:text-yellow-200 mb-2">Important Gaming Rules</h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• All limits reset daily at midnight in your timezone</li>
                  <li>• Win limits apply regardless of prize value</li>
                  <li>• Once you reach 3 wins, you cannot participate in any more competitions that day</li>
                  <li>• Listing participation limit is separate from win limit</li>
                  <li>• These rules are automatically enforced by the platform</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <span className="text-green-600 text-2xl">✅</span>
              <div>
                <h4 className="font-bold text-green-800 dark:text-green-200 mb-2">Original & Legal Game Design</h4>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li>• All 6 games are completely original creations by DropDollar</li>
                  <li>• No copyrighted material or trademarked game mechanics used</li>
                  <li>• Games designed specifically for skill-based competition</li>
                  <li>• Advanced bot-protection through randomization and human cognition</li>
                  <li>• Mobile-optimized with touch controls for accessibility</li>
                  <li>• Legally compliant with gaming and intellectual property laws</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Real Example */}
        <div className="mb-16 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">
            📱 Real Example: iPhone Competition
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Competition Setup</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Item:</span>
                  <span className="font-bold text-gray-900 dark:text-white">iPhone 15 Pro - 256GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Base Price:</span>
                  <span className="font-bold text-gray-900 dark:text-white">$999</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Entry Cost:</span>
                  <span className="font-bold text-green-600">$0.20 per person</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Game Selection:</span>
                  <span className="font-bold text-blue-600">Multi-Target Reaction</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Target Entries:</span>
                  <span className="font-bold text-purple-600">4,995 entries needed</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">How Winner is Determined</h3>
              <div className="space-y-3 text-gray-600 dark:text-gray-300">
                <p>• 4,995 people each pay $0.20 to play Multi-Target Reaction</p>
                <p>• Each player gets their score recorded with decimal precision</p>
                <p>• Player with the highest score wins the iPhone</p>
                <p>• Winner receives the iPhone shipped to their address</p>
                <p>• Seller receives $999 (the base price)</p>
              </div>
              
              <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2">💰 Financial Breakdown</h4>
                <div className="text-sm space-y-1 text-blue-700 dark:text-blue-300">
                  <div>Total collected: 4,995 × $0.20 = <strong>$999</strong></div>
                  <div>Seller receives: <strong>$879.12</strong> (88%)</div>
                  <div>Platform fee: <strong>$119.88</strong> (12%)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Game Selection */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            🎲 How Games Are Selected
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center mb-4">
                <PuzzlePieceIcon className="h-8 w-8 text-blue-600 mr-3" />
                <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">Regular Listings</h3>
              </div>
              <ul className="space-y-2 text-blue-800 dark:text-blue-200">
                <li>• <strong>Sellers choose their preferred game</strong></li>
                <li>• Game is displayed on the listing</li>
                <li>• Players know what game they'll play</li>
                <li>• Allows sellers to pick games they think suit their item</li>
                <li>• Creates strategic listing decisions</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-6 border-2 border-purple-200 dark:border-purple-800">
              <div className="flex items-center mb-4">
                <TrophyIcon className="h-8 w-8 text-purple-600 mr-3" />
                <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100">Cash Tournaments</h3>
              </div>
              <ul className="space-y-2 text-purple-800 dark:text-purple-200">
                <li>• <strong>Games rotate daily</strong></li>
                <li>• Ensures complete fairness</li>
                <li>• No advantage from game selection</li>
                <li>• Pure skill-based competition</li>
                <li>• Game is clearly displayed before entry</li>
              </ul>
            </div>
          </div>
        </div>

        {/* DropPoints Level System */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            ⭐ DropPoints Level System
          </h2>
          
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-8 mb-8">
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-white">🎮</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Level Up Your Gaming Journey!</h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Every game you play earns you DropPoints, allowing you to level up from Rookie to the ultimate DropGod status!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Earn Points</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Get 10-25 DropPoints per game based on your score and performance
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📈</span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Level Up</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Progress through 100 levels with unique badges, rewards, and prestige
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🛍️</span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Spend Points</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Use points in the upcoming Points Store for cosmetics and boosts
                </p>
              </div>
            </div>
          </div>

          {/* Level Tiers Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Rookie Division */}
            <div className="bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-xl p-6 border-2 border-green-200 dark:border-green-700">
              <div className="flex items-center mb-4">
                <div className="bg-green-500 w-12 h-12 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-xl font-bold">🎮</span>
                </div>
                <div>
                  <h4 className="font-bold text-green-800 dark:text-green-200">ROOKIE DIVISION</h4>
                  <p className="text-sm text-green-600 dark:text-green-400">Levels 1-10</p>
                </div>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Pokemon Badge inspired design. Start your journey with classic gaming aesthetics and simple progression.
              </p>
            </div>

            {/* Spartan Ranks */}
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-700">
              <div className="flex items-center mb-4">
                <div className="bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-xl font-bold">⚔️</span>
                </div>
                <div>
                  <h4 className="font-bold text-blue-800 dark:text-blue-200">SPARTAN RANKS</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Levels 11-25</p>
                </div>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Halo inspired military ranks with structured progression and honor guard aesthetics.
              </p>
            </div>

            {/* Prestige Tier */}
            <div className="bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl p-6 border-2 border-orange-200 dark:border-orange-700">
              <div className="flex items-center mb-4">
                <div className="bg-orange-500 w-12 h-12 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-xl font-bold">🔥</span>
                </div>
                <div>
                  <h4 className="font-bold text-orange-800 dark:text-orange-200">PRESTIGE TIER</h4>
                  <p className="text-sm text-orange-600 dark:text-orange-400">Levels 26-50</p>
                </div>
              </div>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Call of Duty style prestige with animated effects and prestige stars for elite players.
              </p>
            </div>

            {/* Master Chief */}
            <div className="bg-gradient-to-br from-purple-100 to-fuchsia-100 dark:from-purple-900/30 dark:to-fuchsia-900/30 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-700">
              <div className="flex items-center mb-4">
                <div className="bg-purple-500 w-12 h-12 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-xl font-bold">👑</span>
                </div>
                <div>
                  <h4 className="font-bold text-purple-800 dark:text-purple-200">MASTER CHIEF</h4>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Levels 51-75</p>
                </div>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Elite warrior status with enhanced visual effects and Master Chief inspired design.
              </p>
            </div>

            {/* Legendary */}
            <div className="bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-xl p-6 border-2 border-yellow-200 dark:border-yellow-700">
              <div className="flex items-center mb-4">
                <div className="bg-yellow-500 w-12 h-12 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-xl font-bold">⭐</span>
                </div>
                <div>
                  <h4 className="font-bold text-yellow-800 dark:text-yellow-200">LEGENDARY</h4>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">Levels 76-90</p>
                </div>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Mythic ascension with golden themes and transcendent visual effects for legendary players.
              </p>
            </div>

            {/* God Tier */}
            <div className="bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 rounded-xl p-6 border-2 border-pink-200 dark:border-pink-700">
              <div className="flex items-center mb-4">
                <div className="bg-gradient-to-r from-pink-500 to-purple-500 w-12 h-12 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-xl font-bold">🌟</span>
                </div>
                <div>
                  <h4 className="font-bold text-pink-800 dark:text-pink-200">GOD TIER</h4>
                  <p className="text-sm text-pink-600 dark:text-pink-400">Levels 91-100</p>
                </div>
              </div>
              <p className="text-sm text-pink-700 dark:text-pink-300">
                Ultimate prestige with rainbow effects for Level 100 DropGod - the pinnacle of achievement!
              </p>
            </div>
          </div>

          {/* Level Progression Details */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-6">🎯 Level Progression Path</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-4">Key Milestones</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="font-medium text-gray-900 dark:text-white">Level 10 - Talented</span>
                    <span className="text-green-600 font-bold">1,000 games</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="font-medium text-gray-900 dark:text-white">Level 25 - Ascended</span>
                    <span className="text-blue-600 font-bold">6,250 games</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span className="font-medium text-gray-900 dark:text-white">Level 50 - Flawless</span>
                    <span className="text-purple-600 font-bold">25,000 games</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-lg border border-pink-200 dark:border-pink-700">
                    <span className="font-medium text-gray-900 dark:text-white">Level 100 - DropGod</span>
                    <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent font-bold">100,000 games</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-4">Rewards System</h4>
                <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2">•</span>
                    <span><strong>Spendable Points:</strong> 50% of earned points for the Points Store</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span><strong>Tokens:</strong> Level × 10 tokens per level up</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Badges:</strong> Unique rank badges for each level</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-500 mr-2">•</span>
                    <span><strong>Prestige Effects:</strong> Visual animations and special styling</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-500 mr-2">•</span>
                    <span><strong>Leaderboard Status:</strong> Global rankings and recognition</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link 
                href="/levels" 
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <span className="mr-2">⭐</span>
                Explore All 100 Levels
                <span className="ml-2">🎮</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Anti-Bot Protection */}
        <div className="mb-16 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-8">
          <div className="text-center">
            <ShieldCheckIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              🛡️ Anti-Bot Protection
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              All games are designed with human-specific challenges that make automated play nearly impossible
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎲</span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Randomization</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Unpredictable timing, patterns, and physics prevent scripted responses
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Memory Tests</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Working memory and cognitive flexibility required for success
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Human Reflexes</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Reaction times and adaptability that only humans can achieve
              </p>
            </div>
          </div>
        </div>

        {/* Seller Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            💼 For Sellers
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">How Sellers Benefit</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Get 88% of the base price when target is reached
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  No risk - item only sells if base price met
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Choose which game players will play
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Platform handles all payment processing
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Seller Requirements</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Must apply and be approved as a seller
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Provide accurate item descriptions and photos
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Ship items within 48 hours of competition end
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Maintain good seller rating and reviews
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src="/DropCoin.png" alt="DropDollar" className="w-8 h-8" />
                <span className="text-xl font-bold">DropDollar</span>
              </div>
              <p className="text-gray-400 text-sm">
                Win real products through skill-based gaming competitions.
              </p>
            </div>
            
            <div>
              <h3 className="font-bold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/games" className="hover:text-white transition-colors">Games</Link></li>
                <li><Link href="/tournaments" className="hover:text-white transition-colors">Tournaments</Link></li>
                <li><Link href="/hot-sell" className="hover:text-white transition-colors">Hot Sell</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold mb-4">Account</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><Link href="/auth/register" className="hover:text-white transition-colors">Sign Up</Link></li>
                <li><Link href="/seller/apply" className="hover:text-white transition-colors">Become a Seller</Link></li>
                <li><Link href="/settings" className="hover:text-white transition-colors">Settings</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 DropDollar. All rights reserved. Don't drop out, drop a dollar.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}