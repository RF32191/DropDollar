'use client';

import React, { useState, useEffect } from 'react';
import WebLayout from '@/components/layout/WebLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Clock, 
  Users, 
  DollarSign, 
  Calendar,
  Star,
  Award,
  Timer,
  Play,
  Pause,
  Settings,
  Share2,
  Bell
} from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  type: 'trading' | 'prediction' | 'mixed';
  status: 'upcoming' | 'active' | 'completed';
  prizePool: number;
  participants: number;
  maxParticipants: number;
  startDate: Date;
  endDate: Date;
  entryFee: number;
  description: string;
  rules: string[];
  leaderboard: Array<{
    rank: number;
    username: string;
    score: number;
    prize: number;
  }>;
}

export default function TournamentPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [activeTab, setActiveTab] = useState('upcoming');

  // Mock data for tournaments
  useEffect(() => {
    const mockTournaments: Tournament[] = [
      {
        id: '1',
        name: 'Crypto Masters Championship',
        type: 'trading',
        status: 'active',
        prizePool: 50000,
        participants: 1247,
        maxParticipants: 2000,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-22'),
        entryFee: 25,
        description: 'The ultimate crypto trading championship. Compete with the best traders worldwide for a chance to win the grand prize.',
        rules: [
          'Starting balance: $10,000 virtual USD',
          'Trading period: 7 days',
          'No leverage allowed',
          'Maximum 10 trades per day',
          'Winner determined by highest portfolio value'
        ],
        leaderboard: [
          { rank: 1, username: 'CryptoKing2024', score: 15678.50, prize: 25000 },
          { rank: 2, username: 'TradingPro', score: 14234.75, prize: 15000 },
          { rank: 3, username: 'BitcoinBull', score: 13891.25, prize: 10000 }
        ]
      },
      {
        id: '2',
        name: 'Prediction Masters',
        type: 'prediction',
        status: 'upcoming',
        prizePool: 25000,
        participants: 0,
        maxParticipants: 1000,
        startDate: new Date('2024-01-25'),
        endDate: new Date('2024-01-30'),
        entryFee: 15,
        description: 'Test your prediction skills in this 5-day prediction tournament.',
        rules: [
          'Predict price movements for 5 cryptocurrencies',
          '5 predictions per day',
          'Points awarded for accuracy',
          'Bonus points for consecutive correct predictions'
        ],
        leaderboard: []
      },
      {
        id: '3',
        name: 'Mixed Challenge',
        type: 'mixed',
        status: 'completed',
        prizePool: 10000,
        participants: 500,
        maxParticipants: 500,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-08'),
        entryFee: 10,
        description: 'Combined trading and prediction tournament.',
        rules: [
          '50% trading performance',
          '50% prediction accuracy',
          'Combined score determines winner'
        ],
        leaderboard: [
          { rank: 1, username: 'MixedMaster', score: 95.5, prize: 5000 },
          { rank: 2, username: 'AllRounder', score: 92.3, prize: 3000 },
          { rank: 3, username: 'DualThreat', score: 89.7, prize: 2000 }
        ]
      }
    ];
    setTournaments(mockTournaments);
  }, []);

  const filteredTournaments = tournaments.filter(t => {
    if (activeTab === 'upcoming') return t.status === 'upcoming';
    if (activeTab === 'active') return t.status === 'active';
    if (activeTab === 'completed') return t.status === 'completed';
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trading': return <DollarSign className="h-4 w-4" />;
      case 'prediction': return <Star className="h-4 w-4" />;
      case 'mixed': return <Award className="h-4 w-4" />;
      default: return <Trophy className="h-4 w-4" />;
    }
  };

  return (
    <WebLayout currentPage="tournaments">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">
                🏆 Tournaments
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8">
                Compete with the best traders and win amazing prizes
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
                  <Play className="mr-2 h-5 w-5" />
                  Join Tournament
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-blue-600">
                  <Settings className="mr-2 h-5 w-5" />
                  Create Tournament
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-blue-600"
                  onClick={() => window.location.href = '/testimonials'}
                >
                  <Star className="mr-2 h-5 w-5" />
                  Victory Stories
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tournament Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="upcoming" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Upcoming</span>
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Active</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Completed</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-6">
          {/* Tournament Grid - Mobile Optimized */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredTournaments.map((tournament) => (
                  <Card 
                    key={tournament.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedTournament(tournament)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(tournament.type)}
                          <CardTitle className="text-lg">{tournament.name}</CardTitle>
                        </div>
                        <Badge className={getStatusColor(tournament.status)}>
                          {tournament.status}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {tournament.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4">
                      {/* Prize Pool */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Prize Pool</span>
                        <span className="text-base sm:text-lg font-bold text-green-600">
                          {formatCurrency(tournament.prizePool)}
                        </span>
                      </div>

                      {/* Participants */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Participants</span>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                          <span className="text-xs sm:text-sm font-medium">
                            {tournament.participants.toLocaleString()} / {tournament.maxParticipants.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1 sm:space-y-2">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span>Progress</span>
                          <span>{Math.round((tournament.participants / tournament.maxParticipants) * 100)}%</span>
                        </div>
                        <Progress 
                          value={(tournament.participants / tournament.maxParticipants) * 100} 
                          className="h-1.5 sm:h-2"
                        />
                      </div>

                      {/* Entry Fee */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Entry Fee</span>
                        <span className="text-sm sm:text-base font-bold text-blue-600">
                          {formatCurrency(tournament.entryFee)}
                        </span>
                      </div>

                      {/* Dates - Mobile Optimized */}
                      <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                          <span className="truncate">Starts: {formatDate(tournament.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Timer className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                          <span className="truncate">Ends: {formatDate(tournament.endDate)}</span>
                        </div>
                      </div>

                      {/* Action Button - Mobile Optimized */}
                      <Button 
                        className="w-full h-10 sm:h-12 text-sm sm:text-base" 
                        variant={tournament.status === 'active' ? 'default' : 'outline'}
                        disabled={tournament.status === 'completed'}
                      >
                        {tournament.status === 'upcoming' && 'Register'}
                        {tournament.status === 'active' && 'Join Now'}
                        {tournament.status === 'completed' && 'View Results'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Empty State */}
              {filteredTournaments.length === 0 && (
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tournaments found</h3>
                  <p className="text-gray-600 mb-6">
                    {activeTab === 'upcoming' && 'No upcoming tournaments at the moment.'}
                    {activeTab === 'active' && 'No active tournaments right now.'}
                    {activeTab === 'completed' && 'No completed tournaments to show.'}
                  </p>
                  <Button>
                    <Bell className="mr-2 h-4 w-4" />
                    Get Notified
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Tournament Detail Modal */}
        {selectedTournament && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{selectedTournament.name}</h2>
                    <Badge className={getStatusColor(selectedTournament.status)}>
                      {selectedTournament.status}
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedTournament(null)}
                  >
                    ✕
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-gray-600">{selectedTournament.description}</p>
                  </div>

                  {/* Rules */}
                  <div>
                    <h3 className="font-semibold mb-2">Rules</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      {selectedTournament.rules.map((rule, index) => (
                        <li key={index}>{rule}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Leaderboard */}
                  {selectedTournament.leaderboard.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-4">Leaderboard</h3>
                      <div className="space-y-2">
                        {selectedTournament.leaderboard.map((entry) => (
                          <div key={entry.rank} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-lg">#{entry.rank}</span>
                              <span className="font-medium">{entry.username}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{entry.score.toLocaleString()}</div>
                              <div className="text-sm text-green-600">{formatCurrency(entry.prize)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <Button className="flex-1">
                      {selectedTournament.status === 'upcoming' && 'Register Now'}
                      {selectedTournament.status === 'active' && 'Join Tournament'}
                      {selectedTournament.status === 'completed' && 'View Full Results'}
                    </Button>
                    <Button variant="outline">
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </WebLayout>
  );
}
