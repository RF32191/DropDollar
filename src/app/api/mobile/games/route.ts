import { NextRequest, NextResponse } from 'next/server';

// Mock game data matching your website games
const availableGames = [
  {
    id: 'multi-target',
    name: 'Multi-Target Reaction',
    description: 'Click the correct highlighted target among multiple shapes',
    difficulty: 'Easy',
    avgTime: '60s',
    skills: ['Visual Processing', 'Speed', 'Accuracy'],
    icon: 'target',
    color: 'blue',
    isActive: true,
    playCount: 1247,
    avgScore: 850,
    topScore: 2340
  },
  {
    id: 'falling-objects',
    name: 'Falling Object Catch',
    description: 'Catch objects with realistic physics and bouncing',
    difficulty: 'Medium',
    avgTime: '60s',
    skills: ['Coordination', 'Physics', 'Prediction'],
    icon: 'drop',
    color: 'purple',
    isActive: true,
    playCount: 892,
    avgScore: 1200,
    topScore: 3450
  },
  {
    id: 'color-sequence',
    name: 'Color Sequence Memory',
    description: 'Remember color sequences with unique audio cues',
    difficulty: 'Medium',
    avgTime: '90s',
    skills: ['Audio-Visual Memory', 'Sequential Processing', 'Multi-Sensory'],
    icon: 'brain',
    color: 'pink',
    isActive: true,
    playCount: 634,
    avgScore: 950,
    topScore: 2890
  }
];

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      data: availableGames,
      timestamp: new Date().toISOString()
    });

    // Enable CORS for mobile app
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameType, score, accuracy, reactionTime, userId } = body;

    // Mock score submission - replace with actual database logic
    const gameResult = {
      id: Date.now().toString(),
      gameType,
      score,
      accuracy,
      reactionTime,
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      rank: Math.floor(Math.random() * 100) + 1, // Mock rank
      isNewRecord: score > 2000 // Mock personal record check
    };

    const response = NextResponse.json({
      success: true,
      data: gameResult,
      message: gameResult.isNewRecord ? 'New personal record!' : 'Score submitted successfully'
    });

    // Enable CORS for mobile app
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to submit score' },
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



