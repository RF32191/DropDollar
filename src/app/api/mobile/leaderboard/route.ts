import { NextRequest, NextResponse } from 'next/server';

// Mock leaderboard data - replace with actual database
const mockLeaderboard = [
  {
    id: '1',
    username: 'CryptoKing',
    score: 15750.50,
    rank: 1,
    avatar: '👑',
    gamesPlayed: 47,
    winRate: 78.5,
    totalProfit: 5750.50,
    lastActive: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    gameType: 'trading',
    achievements: ['First Place', 'High Roller', 'Consistent Winner']
  },
  {
    id: '2',
    username: 'DropMaster',
    score: 14250.25,
    rank: 2,
    avatar: '💧',
    gamesPlayed: 52,
    winRate: 73.1,
    totalProfit: 4250.25,
    lastActive: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    gameType: 'prediction',
    achievements: ['DropCoin Expert', 'Prediction Master']
  },
  {
    id: '3',
    username: 'TradeWizard',
    score: 12890.75,
    rank: 3,
    avatar: '🧙‍♂️',
    gamesPlayed: 38,
    winRate: 81.6,
    totalProfit: 2890.75,
    lastActive: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    gameType: 'trading',
    achievements: ['Trading Expert', 'Quick Learner']
  },
  {
    id: '4',
    username: 'PredictorPro',
    score: 11500.00,
    rank: 4,
    avatar: '🔮',
    gamesPlayed: 41,
    winRate: 70.7,
    totalProfit: 1500.00,
    lastActive: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
    gameType: 'prediction',
    achievements: ['Future Sight', 'Consistent Player']
  },
  {
    id: '5',
    username: 'MobileTrader',
    score: 10250.30,
    rank: 5,
    avatar: '📱',
    gamesPlayed: 29,
    winRate: 75.9,
    totalProfit: 250.30,
    lastActive: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    gameType: 'trading',
    achievements: ['Mobile Master', 'Rising Star']
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType');
    const limit = parseInt(searchParams.get('limit') || '10');

    let filteredLeaderboard = mockLeaderboard;
    
    // Filter by game type if specified
    if (gameType && gameType !== 'all') {
      filteredLeaderboard = mockLeaderboard.filter(entry => entry.gameType === gameType);
    }

    // Limit results
    filteredLeaderboard = filteredLeaderboard.slice(0, limit);

    const response = NextResponse.json({
      success: true,
      data: filteredLeaderboard,
      total: mockLeaderboard.length,
      gameType: gameType || 'all',
      timestamp: new Date().toISOString()
    });

    // Enable CORS for mobile app
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}



