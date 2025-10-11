import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/supabase/userService';

/**
 * Debug endpoint to check user data in Supabase
 * 
 * Usage: GET /api/debug/user-data?userId=YOUR_USER_ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    console.log('🔍 [Debug] Fetching data for user:', userId);

    // Fetch all user data
    const profile = await UserService.getUserProfile(userId);
    const transactions = await UserService.getUserTokenTransactions(userId);
    const purchases = await UserService.getUserPurchaseHistory(userId);
    const games = await UserService.getUserGameHistory(userId);

    const response = {
      userId,
      timestamp: new Date().toISOString(),
      profile: profile || null,
      transactions: {
        count: transactions.length,
        latest: transactions.slice(0, 5),
        totalPurchased: transactions
          .filter(t => t.type === 'purchase')
          .reduce((sum, t) => sum + t.amount, 0),
        totalSpent: transactions
          .filter(t => t.type === 'spend')
          .reduce((sum, t) => sum + t.amount, 0),
      },
      purchases: {
        count: purchases.length,
        latest: purchases.slice(0, 5),
        totalAmount: purchases
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + p.amount, 0),
      },
      games: {
        count: games.length,
        latest: games.slice(0, 5),
      },
      summary: {
        tokensInProfile: profile?.tokens || 0,
        tokensPurchased: transactions
          .filter(t => t.type === 'purchase')
          .reduce((sum, t) => sum + t.amount, 0),
        tokensSpent: transactions
          .filter(t => t.type === 'spend')
          .reduce((sum, t) => sum + t.amount, 0),
        expectedBalance: transactions
          .filter(t => t.type === 'purchase')
          .reduce((sum, t) => sum + t.amount, 0) - 
          transactions
          .filter(t => t.type === 'spend')
          .reduce((sum, t) => sum + t.amount, 0),
      }
    };

    console.log('✅ [Debug] User data fetched successfully');
    console.log('💰 [Debug] Tokens in profile:', profile?.tokens);
    console.log('📜 [Debug] Transaction count:', transactions.length);
    console.log('💳 [Debug] Purchase count:', purchases.length);

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('❌ [Debug] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

