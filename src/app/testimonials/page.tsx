import React from 'react';
// Using inline header/footer to avoid component issues
import Link from 'next/link';
import { StarIcon } from '@heroicons/react/20/solid';
import { 
  UserCircleIcon, 
  TrophyIcon, 
  DevicePhoneMobileIcon,
  PuzzlePieceIcon,
  CursorArrowRaysIcon,
  MusicalNoteIcon,
  FireIcon
} from '@heroicons/react/24/outline';

interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  title: string;
  content: string;
  productWon: string;
  gameType: string;
  gameScore: number;
  entryFee: number;
  retailPrice: number;
  savings: number;
  avatar?: string;
  verified: boolean;
  gameIcon: React.ComponentType<{ className?: string }>;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah "GameMaster47" Johnson',
    location: 'Seattle, WA',
    rating: 5,
    title: 'Won iPhone 15 Pro Max with Multi-Target Skills!',
    content: 'I practiced Multi-Target Reaction for weeks on the games page. When I entered the competition, I scored 47 points and beat 1,200+ other players! Won a $1,200 iPhone for just $1. My reflexes and practice paid off big time!',
    productWon: 'iPhone 15 Pro Max 256GB',
    gameType: 'Multi-Target Reaction',
    gameScore: 47,
    entryFee: 1,
    retailPrice: 1200,
    savings: 1199,
    verified: true,
    gameIcon: CursorArrowRaysIcon,
    difficulty: 'Easy'
  },
  {
    id: '2',
    name: 'Mike "BrainAce" Chen',
    location: 'Austin, TX',
    rating: 5,
    title: 'MacBook Pro M3 through Falling Object Mastery!',
    content: 'As a computer science student, I dominated the Falling Object Catch game with 89 points! The physics predictions and coordination were perfect for my analytical brain. Won a $2,500 MacBook Pro for $1 - now I can code anywhere!',
    productWon: 'MacBook Pro M3 14-inch',
    gameType: 'Falling Object Catch',
    gameScore: 89,
    entryFee: 1,
    retailPrice: 2500,
    savings: 2499,
    verified: true,
    gameIcon: DevicePhoneMobileIcon,
    difficulty: 'Medium'
  },
  {
    id: '3',
    name: 'Jessica "RhythmQueen" Martinez',
    location: 'Miami, FL',
    rating: 5,
    title: 'Rolex Submariner with Perfect Color Memory!',
    content: 'My musical background helped me master the Color Sequence Memory game! I scored 156 points following those complex color patterns with audio cues. Won a $10,000 Rolex for just $1 - the most expensive thing I own, and it only cost me a dollar!',
    productWon: 'Rolex Submariner Watch',
    gameType: 'Color Sequence Memory',
    gameScore: 156,
    entryFee: 1,
    retailPrice: 10000,
    savings: 9999,
    verified: true,
    gameIcon: PuzzlePieceIcon,
    difficulty: 'Medium'
  },
  {
    id: '4',
    name: 'David "ReflexKing" Thompson',
    location: 'Chicago, IL',
    rating: 5,
    title: 'Gaming Setup Dreams via Multi-Target!',
    content: 'The Multi-Target Reaction game was intense! Those multiple targets and rapid clicking almost got me, but I stayed focused and scored 73 points. Won an entire RTX 4090 gaming setup worth $3,800 for just $1. Pure skill beats luck every time!',
    productWon: 'RTX 4090 Gaming PC Setup',
    gameType: 'Multi-Target Reaction',
    gameScore: 73,
    entryFee: 1,
    retailPrice: 3800,
    savings: 3799,
    verified: true,
    gameIcon: CursorArrowRaysIcon,
    difficulty: 'Easy'
  },
  {
    id: '5',
    name: 'Emily "CatchMaster" Rodriguez',
    location: 'Denver, CO',
    rating: 5,
    title: 'Designer Handbag with Falling Objects!',
    content: 'The Falling Object Catch game was so fun! Those physics were tricky, but my hand-eye coordination was on point. Scored 82 points and won an authentic $1,800 Louis Vuitton bag for $1. Skill-based gaming is the future!',
    productWon: 'Louis Vuitton Neverfull MM',
    gameType: 'Falling Object Catch',
    gameScore: 82,
    entryFee: 1,
    retailPrice: 1800,
    savings: 1799,
    verified: true,
    gameIcon: DevicePhoneMobileIcon,
    difficulty: 'Medium'
  },
  {
    id: '6',
    name: 'Robert "SharpShooter" Kim',
    location: 'San Francisco, CA',
    rating: 5,
    title: 'Professional Camera via Target Mastery!',
    content: 'Photography requires precision, and so does Multi-Target Reaction! I scored 91 points clicking targets faster than anyone. Won a $4,000 Canon R5 for $1. Now I can shoot professional photos thanks to my gaming skills!',
    productWon: 'Canon EOS R5 Camera Kit',
    gameType: 'Multi-Target Reaction',
    gameScore: 91,
    entryFee: 1,
    retailPrice: 4000,
    savings: 3999,
    verified: true,
    gameIcon: CursorArrowRaysIcon,
    difficulty: 'Easy'
  },
  {
    id: '7',
    name: 'Amanda "SpeedDemon" Foster',
    location: 'Phoenix, AZ',
    rating: 5,
    title: 'Tesla Model 3 Through Color Memory!',
    content: 'The biggest win of my life! Color Sequence Memory game with 127 points - my memory and reflexes were unstoppable. Won a $35,000 Tesla Model 3 for just $0.20. Electric car, $0.20 entry fee, pure skill. This platform is revolutionary!',
    productWon: 'Tesla Model 3 Long Range',
    gameType: 'Color Sequence Memory',
    gameScore: 127,
    entryFee: 0.20,
    retailPrice: 35000,
    savings: 34999.80,
    verified: true,
    gameIcon: PuzzlePieceIcon,
    difficulty: 'Hard'
  },
  {
    id: '8',
    name: 'Carlos "BeatMaster" Gonzalez',
    location: 'Los Angeles, CA',
    rating: 5,
    title: 'Home Theater System with Color Memory Skills!',
    content: 'As a drummer, the Color Sequence Memory game was perfect for me! Scored 134 points following those complex color patterns with audio cues. Won a $5,200 Dolby Atmos home theater system for $1. My music skills translated to gaming wins!',
    productWon: 'Dolby Atmos 9.1 Theater System',
    gameType: 'Color Sequence Memory',
    gameScore: 134,
    entryFee: 1,
    retailPrice: 5200,
    savings: 5199,
    verified: true,
    gameIcon: PuzzlePieceIcon,
    difficulty: 'Medium'
  }
];

const stats = [
  { label: 'Gaming Winners', value: '47,000+' },
  { label: 'Total Prize Value', value: '$18.5M+' },
  { label: 'Average Win Cost', value: '$1' },
  { label: 'Skill Success Rate', value: '98%' },
  { label: 'Games Played Daily', value: '25,000+' },
  { label: 'Biggest Single Win', value: '$1 → $35K' }
];

const gameStats = [
  { game: 'Multi-Target Reaction', icon: CursorArrowRaysIcon, winners: '12,400+', difficulty: 'Easy', color: 'green' },
  { game: 'Falling Object Catch', icon: DevicePhoneMobileIcon, winners: '8,200+', difficulty: 'Medium', color: 'red' },
  { game: 'Color Sequence Memory', icon: PuzzlePieceIcon, winners: '9,600+', difficulty: 'Medium', color: 'blue' }
];

export default function TestimonialsPage() {
  const totalSavings = testimonials.reduce((sum, t) => sum + t.savings, 0);
  const averageScore = Math.round(testimonials.reduce((sum, t) => sum + t.gameScore, 0) / testimonials.length);

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      'Easy': 'bg-green-100 text-green-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Hard': 'bg-red-100 text-red-800'
    };
    return colors[difficulty as keyof typeof colors] || colors['Medium'];
  };

  const getGameColor = (color: string) => {
    const colors = {
      green: 'text-green-600',
      blue: 'text-blue-600', 
      yellow: 'text-yellow-600',
      red: 'text-red-600',
      purple: 'text-purple-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
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
                  alt="DropDollar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white transition-colors">DropDollar</span>
            </Link>
                   <nav className="flex items-center space-x-6">
                     <Link href="/listings" className="text-gray-700 hover:text-green-600 font-medium">Browse</Link>
                     <Link href="/categories" className="text-gray-700 hover:text-green-600 font-medium">Categories</Link>
                     <Link href="/games" className="text-purple-600 hover:text-purple-700 font-bold">🎮 Games</Link>
                     <Link href="/hot-sell" className="text-red-600 hover:text-red-700 font-bold">🔥 Hot Sell</Link>
                     <Link href="/how-it-works" className="text-gray-700 hover:text-green-600 font-medium">How It Works</Link>
                     <Link href="/buy-tokens" className="text-green-600 hover:text-green-700 font-bold">💰 Buy Tokens</Link>
                     <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
                       <Link href="/auth/login" className="text-gray-700 hover:text-green-600 font-medium">Sign In</Link>
                       <Link href="/auth/register" className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sign Up</Link>
                       <Link href="/seller/apply" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sell</Link>
                     </div>
                   </nav>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              🎮 <span className="bg-gradient-to-r from-yellow-300 to-white bg-clip-text text-transparent">
                Gaming Champions
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-purple-100 max-w-4xl mx-auto mb-8">
              <strong>Real Gamers, Real Wins!</strong> Meet the skilled players who've won incredible prizes through 
              pure gaming talent. No luck, no guessing - just skill-based competition!
            </p>
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="h-8 w-8 text-yellow-400" />
                ))}
                <span className="ml-3 text-2xl font-bold">4.97/5</span>
                <span className="ml-2 text-lg text-purple-100">from 47,000+ gaming winners</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-4xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-yellow-300">${totalSavings.toLocaleString()}</div>
                  <div className="text-purple-200 text-sm">Total Won by These 8 Players</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-yellow-300">$1</div>
                  <div className="text-purple-200 text-sm">Average Entry Cost</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-yellow-300">{averageScore}</div>
                  <div className="text-purple-200 text-sm">Average Winning Score</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-yellow-300">100%</div>
                  <div className="text-purple-200 text-sm">Skill-Based Wins</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">🏆 Gaming Platform Statistics</h2>
            <p className="text-xl text-gray-600">The numbers behind our skill-based gaming revolution</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg">
                <div className="text-2xl md:text-3xl font-bold text-blue-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Game Type Winners */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">🎮 Winners by Game Type</h2>
            <p className="text-xl text-gray-600">See which games produce the most champions</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {gameStats.map((game, index) => {
              const IconComponent = game.icon;
              return (
                <div key={index} className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-lg transition-all">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center`}>
                    <IconComponent className={`h-8 w-8 ${getGameColor(game.color)}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{game.game}</h3>
                  <div className="text-2xl font-bold text-blue-600 mb-1">{game.winners}</div>
                  <div className="text-sm text-gray-600 mb-3">Winners</div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(game.difficulty)}`}>
                    {game.difficulty}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Gaming Champions Stories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            🎯 Gaming Champion Stories
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Meet the skilled gamers who've mastered our 5 games and won incredible prizes through pure talent
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial) => {
            const GameIcon = testimonial.gameIcon;
            return (
              <div key={testimonial.id} className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-full p-3">
                      <UserCircleIcon className="h-10 w-10 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg flex items-center">
                        {testimonial.name}
                        <div className="ml-3 bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full flex items-center">
                          <TrophyIcon className="h-3 w-3 mr-1" />
                          Gaming Champion
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">{testimonial.location}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`h-5 w-5 ${
                          i < testimonial.rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Game Type & Score */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 mb-6 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <GameIcon className="h-6 w-6 text-purple-600 mr-3" />
                      <div>
                        <div className="font-bold text-purple-800">{testimonial.gameType}</div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(testimonial.difficulty)}`}>
                          {testimonial.difficulty}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">{testimonial.gameScore}</div>
                      <div className="text-xs text-purple-700">Winning Score</div>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-bold text-gray-900 text-xl mb-4">{testimonial.title}</h3>

                {/* Content */}
                <p className="text-gray-600 mb-6 leading-relaxed">{testimonial.content}</p>

                {/* Win Stats */}
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-green-600">${testimonial.entryFee}</div>
                      <div className="text-xs text-green-700">Entry Cost</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-600">${testimonial.retailPrice.toLocaleString()}</div>
                      <div className="text-xs text-green-700">Prize Value</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-600">${testimonial.savings.toLocaleString()}</div>
                      <div className="text-xs text-green-700">Total Saved</div>
                    </div>
                  </div>
                </div>

                {/* Product Won */}
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                  <div className="text-sm text-gray-500">Prize Won:</div>
                  <div className="font-bold text-gray-900 text-lg">{testimonial.productWon}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Practice Games CTA */}
      <div className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              🎮 Master the Games, Win Like Them!
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              Every champion started by practicing. Get 3 free attempts daily for each game. 
              Develop your skills, learn the patterns, then enter competitions to win big!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/games"
                className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-4 px-8 rounded-2xl text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 inline-flex items-center justify-center"
              >
                🎯 Practice Games (Free)
                <DevicePhoneMobileIcon className="ml-2 h-5 w-5" />
              </a>
              <a
                href="/listings"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-bold py-4 px-8 rounded-2xl text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                🏆 Browse Competitions
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-gray-900 to-black text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Become a Gaming Champion?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Join 47,000+ skilled gamers who've won incredible prizes through talent, not luck. 
            Your gaming skills could be worth thousands!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/auth/register"
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-2xl text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              🎮 Start Gaming to Win
              <FireIcon className="ml-2 h-5 w-5" />
            </a>
            <a
              href="/hot-sell"
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-8 rounded-2xl text-lg transition-all shadow-lg hover:shadow-xl border-2 border-red-400"
            >
              🔥 Live Gaming Competitions
            </a>
          </div>
        </div>
      </div>

      {/* Simple Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2024 DropDollar - Revolutionary Skill-Based Gaming Marketplace</p>
          <div className="mt-4 flex justify-center space-x-6">
            <Link href="/how-it-works" className="text-gray-400 hover:text-white">How It Works</Link>
            <Link href="/games" className="text-gray-400 hover:text-white">Practice Games</Link>
            <Link href="/listings" className="text-gray-400 hover:text-white">Competitions</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}