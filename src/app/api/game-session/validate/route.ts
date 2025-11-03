import { NextRequest, NextResponse } from 'next/server';
import { GameTokenService } from '@/lib/crypto/gameTokens';
import { GameValidator } from '@/lib/gameValidator';
import { EmailService } from '@/lib/emailService';
import { createClient } from '@supabase/supabase-js';
import { GameSubmission } from '@/types/gameSession';

// Configure for Vercel Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const submission: GameSubmission = await request.json();
    const { sessionId, token, inputs, clientScore, clientAccuracy, duration, gameSpecificData } = submission;
    
    console.log('🔍 Validating game submission:', {
      sessionId,
      userId: user.id,
      inputCount: inputs?.length || 0,
      clientScore,
      duration
    });
    
    // Validate required fields
    if (!sessionId || !token || !inputs || typeof clientScore !== 'number' || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify cryptographic token
    const payload = GameTokenService.verifyToken(token);
    if (!payload) {
      console.error('❌ Invalid or expired token');
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Verify session ID matches token
    if (payload.sessionId !== sessionId) {
      console.error('❌ Session ID mismatch');
      return NextResponse.json(
        { error: 'Session ID mismatch' },
        { status: 401 }
      );
    }
    
    // Verify user owns this session
    if (payload.userId !== user.id) {
      console.error('❌ Session does not belong to user');
      return NextResponse.json(
        { error: 'Unauthorized - session does not belong to user' },
        { status: 403 }
      );
    }
    
    // Get session from database
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();
    
    if (sessionError || !session) {
      console.error('❌ Session not found:', sessionError);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Check session hasn't already been used
    if (session.status !== 'active') {
      console.error('❌ Session already used or invalid:', session.status);
      return NextResponse.json(
        { error: `Session is ${session.status}` },
        { status: 400 }
      );
    }
    
    // Validate game using server-side replay and anti-cheat
    const result = await GameValidator.validate(
      submission,
      payload.gameType,
      payload.rngSeed,
      payload.listingId,
      payload.entryNumber
    );
    
    if (!result.valid) {
      // Mark session as invalid
      await supabase
        .from('game_sessions')
        .update({
          status: 'invalid',
          invalid_reason: result.reason,
          client_score: clientScore,
          suspicion_score: result.suspicionScore,
          completed_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);
      
      console.error('❌ Game validation failed:', result.reason);
      
      // Log suspicious activity if detected
      if (result.suspicionScore && result.suspicionScore > 60) {
        await supabase.from('anti_cheat_logs').insert({
          user_id: user.id,
          session_id: sessionId,
          game_type: payload.gameType,
          suspicion_score: result.suspicionScore,
          reasons: result.suspicionReasons || [result.reason || 'Unknown'],
          client_score: clientScore,
          flagged_at: new Date().toISOString()
        }).catch(err => {
          console.error('Failed to log anti-cheat event:', err);
          // Don't fail validation if logging fails
        });
        
        // Send email notification to admin
        EmailService.sendSuspiciousActivityAlert({
          userId: user.id,
          userEmail: user.email,
          sessionId,
          gameType: payload.gameType,
          suspicionScore: result.suspicionScore,
          suspicionReasons: result.suspicionReasons || [result.reason || 'Unknown'],
          clientScore,
          serverScore: 0, // Rejected, no server score
          status: 'rejected',
          timestamp: new Date().toISOString()
        }).catch(err => {
          console.error('Failed to send email notification:', err);
          // Don't fail validation if email fails
        });
      }
      
      return NextResponse.json({
        valid: false,
        reason: result.reason,
        suspicionScore: result.suspicionScore
      }, { status: 400 });
    }
    
    // Score is valid! Save results
    const { error: saveError } = await supabase
      .from('game_sessions')
      .update({
        status: 'completed',
        server_score: result.serverScore,
        client_score: clientScore,
        accuracy: result.accuracy,
        avg_reaction_time: result.avgReactionTime,
        input_count: inputs.length,
        duration_ms: duration,
        suspicion_score: result.suspicionScore || 0,
        completed_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);
    
    if (saveError) {
      console.error('❌ Error saving validated score:', saveError);
      return NextResponse.json(
        { error: 'Failed to save score' },
        { status: 500 }
      );
    }
    
    // Also save to game_history table for leaderboards
    await supabase.from('game_history').insert({
      user_id: user.id,
      game_type: payload.gameType,
      score: result.serverScore,
      accuracy: result.accuracy,
      session_id: sessionId,
      is_validated: true,
      listing_id: payload.listingId,
      entry_number: payload.entryNumber,
      played_at: new Date().toISOString()
    }).catch(err => {
      console.error('Failed to save to game_history:', err);
      // Don't fail validation if history logging fails
    });
    
    console.log('✅ Game validated successfully:', {
      sessionId,
      serverScore: result.serverScore,
      clientScore,
      scoreDiff: Math.abs(result.serverScore - clientScore),
      suspicionScore: result.suspicionScore || 0
    });
    
    // Log suspicious activity if score is valid but suspicious
    if (result.suspicionScore && result.suspicionScore > 60) {
      console.warn('⚠️ Suspicious but valid game:', {
        sessionId,
        suspicionScore: result.suspicionScore,
        reasons: result.suspicionReasons
      });
      
      // Log to anti_cheat_logs table
      await supabase.from('anti_cheat_logs').insert({
        user_id: user.id,
        session_id: sessionId,
        game_type: payload.gameType,
        suspicion_score: result.suspicionScore,
        reasons: result.suspicionReasons || ['Suspicious patterns detected'],
        client_score: clientScore,
        flagged_at: new Date().toISOString()
      }).catch(err => {
        console.error('Failed to log anti-cheat event:', err);
      });
      
      // Send email notification to admin
      EmailService.sendSuspiciousActivityAlert({
        userId: user.id,
        userEmail: user.email,
        sessionId,
        gameType: payload.gameType,
        suspicionScore: result.suspicionScore,
        suspicionReasons: result.suspicionReasons || ['Suspicious patterns detected'],
        clientScore,
        serverScore: result.serverScore,
        status: 'accepted',
        timestamp: new Date().toISOString()
      }).catch(err => {
        console.error('Failed to send email notification:', err);
      });
    }
    
    return NextResponse.json({
      valid: true,
      serverScore: result.serverScore,
      accuracy: result.accuracy || 0,
      avgReactionTime: result.avgReactionTime || 0,
      suspicionScore: result.suspicionScore || 0,
      showWarning: result.suspicionScore && result.suspicionScore > 60 // Tell client to show warning
    });
    
  } catch (error) {
    console.error('❌ Error validating game:', error);
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

