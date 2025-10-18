import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Updating prize pools...');
    
    // Update the $100 Daily Hot Sell to $150 and change entry fee to 2 tokens
    const { data, error } = await supabase
      .from('fixed_games_config')
      .update({ 
        prize_pool: 150,
        entry_fee: 2
      })
      .eq('title', '$100 Daily Hot Sell')
      .eq('tournament_type', 'hot_sell');

    if (error) {
      console.error('❌ Error updating prize pool:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Prize pool updated successfully');
    
    // Verify the update
    const { data: updatedConfig, error: verifyError } = await supabase
      .from('fixed_games_config')
      .select('id, title, prize_pool, max_participants, entry_fee')
      .eq('tournament_type', 'hot_sell')
      .order('prize_pool', { ascending: true });

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return NextResponse.json({ error: verifyError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Prize pools updated successfully',
      configs: updatedConfig
    });

  } catch (error) {
    console.error('❌ Exception updating prize pools:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
