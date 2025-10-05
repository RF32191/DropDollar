import { NextRequest, NextResponse } from 'next/server';

// Mock DropCoin stats - replace with actual blockchain data
const mockDropCoinStats = {
  currentPriceUSD: 1.23,
  currentPriceETH: 0.000456,
  holderCount: 1247,
  totalSupply: 10000000,
  circulatingSupply: 2500000,
  marketCap: 3075000,
  volume24h: 156000,
  transactions24h: 89,
  priceChange24h: 15.67,
  priceChangePercent24h: 14.6,
  allTimeHigh: 2.45,
  allTimeLow: 0.12,
  liquidityPool: 450000,
  burnedTokens: 125000,
  stakingRewards: 8.5,
  nextPriceIncrease: 1500, // holders needed for next price bump
  contractAddress: '0x742d35Cc6634C0532925a3b8D4C2C3c8b4C4C4C4',
  network: 'Ethereum',
  verified: true
};

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      data: mockDropCoinStats,
      timestamp: new Date().toISOString()
    });

    // Enable CORS for mobile app
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch DropCoin stats' },
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



