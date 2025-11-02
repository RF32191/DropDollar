import { NextRequest, NextResponse } from 'next/server';
import { GameTokenService } from '@/lib/crypto/gameTokens';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { gameType, listingId, entryNumber } = body;
    
    // Validate required fields
    if (!gameType) {
      return NextResponse.json(
        { error: 'Missing gameType' },
        { status: 400 }
      );
    }
    
    console.log('📝 Creating game session:', {
      userId: user.id,
      gameType,
      listingId,
      entryNumber
    });
    
    // Generate secure token with cryptographic signature
    const { token, payload } = GameTokenService.generateToken(
      user.id,
      gameType,
      listingId,
      entryNumber
    );
    
    // Generate token hash for database storage
    const tokenHash = GameTokenService.generateTokenHash(token);
    
    // Store session in database
    const { error: dbError } = await supabase
      .from('game_sessions')
      .insert({
        session_id: payload.sessionId,
        user_id: user.id,
        game_type: gameType,
        listing_id: listingId || null,
        entry_number: entryNumber || null,
        rng_seed: payload.rngSeed,
        token_hash: tokenHash,
        status: 'active',
        created_at: new Date().toISOString(),
        expires_at: new Date(payload.expiresAt).toISOString()
      });
    
    if (dbError) {
      console.error('❌ Database error creating session:', dbError);
      return NextResponse.json(
        { error: 'Failed to create game session' },
        { status: 500 }
      );
    }
    
    console.log('✅ Game session created successfully:', payload.sessionId);
    
    return NextResponse.json({
      success: true,
      session: {
        sessionId: payload.sessionId,
        token,
        rngSeed: payload.rngSeed,
        expiresAt: payload.expiresAt,
        gameType: payload.gameType
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating game session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 });
}

