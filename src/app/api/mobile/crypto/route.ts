import { NextRequest, NextResponse } from 'next/server';

// Mock crypto data - replace with your actual data source
const mockCryptoData = [
  {
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 43250.50,
    change24h: 2.45,
    volume: 28500000000,
    marketCap: 847000000000,
    rsi: 65.2,
    macd: 0.0234,
    stochastic: 72.8,
    signalScore: 7.5,
    volatility: 3.2,
    weeklyGrowth: '+5.2%',
    monthlyGrowth: '+12.8%',
    riskLevel: 'Medium',
    source: 'CoinGecko',
    expected5mPrice: 43280.75,
    recommendation: 'BUY'
  },
  {
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    price: 2650.25,
    change24h: -1.23,
    volume: 15200000000,
    marketCap: 318000000000,
    rsi: 58.7,
    macd: -0.0156,
    stochastic: 45.3,
    signalScore: 6.2,
    volatility: 4.1,
    weeklyGrowth: '-2.1%',
    monthlyGrowth: '+8.4%',
    riskLevel: 'Medium',
    source: 'CoinGecko',
    expected5mPrice: 2645.80,
    recommendation: 'HOLD'
  },
  {
    id: 'dropcoin',
    symbol: 'DROP',
    name: 'DropCoin',
    price: 1.23,
    change24h: 15.67,
    volume: 2500000,
    marketCap: 12300000,
    rsi: 78.9,
    macd: 0.0089,
    stochastic: 85.2,
    signalScore: 8.9,
    volatility: 12.5,
    weeklyGrowth: '+45.2%',
    monthlyGrowth: '+156.8%',
    riskLevel: 'High',
    source: 'DropCoin Oracle',
    expected5mPrice: 1.25,
    recommendation: 'STRONG_BUY'
  }
];

export async function GET(request: NextRequest) {
  try {
    // Add CORS headers for iPhone app
    const response = NextResponse.json({
      success: true,
      data: mockCryptoData,
      timestamp: new Date().toISOString()
    });

    // Enable CORS for mobile app
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch crypto data' },
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


