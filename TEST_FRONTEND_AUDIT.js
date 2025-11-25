/**
 * TEST FRONTEND AUDIT LOGGING
 * 
 * Copy this entire script and paste into browser console (F12)
 * while on https://www.drop-dollar.com
 * 
 * This will test if the frontend can log games to the audit system
 */

(async function testAuditSystem() {
  console.log('🧪 Starting Audit System Test...');
  console.log('');
  
  try {
    // Import Supabase client
    const { createClient } = window.supabase || {};
    
    if (!createClient) {
      console.error('❌ Supabase not loaded on this page');
      console.log('→ Make sure you\'re on https://www.drop-dollar.com');
      return;
    }
    
    console.log('✅ Supabase loaded');
    
    // Create client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    console.log('');
    console.log('📡 Testing connection...');
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Not authenticated');
      console.log('→ Please log in first');
      return;
    }
    
    console.log('✅ Authenticated as:', user.email);
    console.log('');
    
    // Test calling the audit function
    console.log('🎮 Testing frontend_log_game_completion function...');
    console.log('');
    
    const { data: result, error } = await supabase.rpc('frontend_log_game_completion', {
      p_game_type: 'test_game_frontend',
      p_game_mode: 'practice',
      p_score: 12345,
      p_accuracy: 95.5,
      p_reaction_time: 0.25,
      p_duration_seconds: 60,
      p_additional_data: JSON.stringify({ test: true })
    });
    
    if (error) {
      console.error('❌ Function call FAILED');
      console.error('Error:', error);
      console.log('');
      console.log('📋 Error Details:');
      console.log('  Message:', error.message);
      console.log('  Code:', error.code);
      console.log('  Hint:', error.hint);
      console.log('');
      
      if (error.message?.includes('does not exist') || error.code === '42883') {
        console.error('🚨 FUNCTION DOES NOT EXIST!');
        console.log('');
        console.log('🔧 TO FIX:');
        console.log('  1. Go to Supabase Dashboard');
        console.log('  2. SQL Editor → New query');
        console.log('  3. Copy/paste DEPLOY_AUDIT_FINAL_FIX.sql');
        console.log('  4. Click RUN');
      }
      
      return;
    }
    
    console.log('✅ Function call SUCCESSFUL!');
    console.log('');
    console.log('📊 Result:', result);
    console.log('  Success:', result.success);
    console.log('  Audit ID:', result.audit_id);
    console.log('  Cheat Score:', result.cheat_score);
    console.log('  Score Rating:', result.score_rating);
    console.log('');
    
    // Try to fetch the record we just created
    console.log('🔍 Verifying record was created...');
    
    const { data: records, error: fetchError } = await supabase
      .from('game_audit_log')
      .select('*')
      .eq('id', result.audit_id)
      .single();
    
    if (fetchError) {
      console.error('❌ Could not fetch record:', fetchError.message);
      console.log('→ Record was created but RLS might be blocking read access');
    } else {
      console.log('✅ Record exists in database!');
      console.log('');
      console.log('📄 Record details:');
      console.log('  Username:', records.username);
      console.log('  Game:', records.game_type);
      console.log('  Score:', records.score);
      console.log('  Rating:', records.score_rating);
      console.log('  Threat Level:', records.threat_level);
    }
    
    console.log('');
    console.log('========================================');
    console.log('✅ TEST COMPLETE - AUDIT SYSTEM WORKS!');
    console.log('========================================');
    console.log('');
    console.log('🎯 NEXT STEPS:');
    console.log('  1. Go to Admin Dashboard → Audit Logs tab');
    console.log('  2. You should see: test_game_frontend');
    console.log('  3. Play a real game and it will be logged!');
    console.log('');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    console.log('');
    console.log('🔧 Make sure:');
    console.log('  1. You\'re on https://www.drop-dollar.com');
    console.log('  2. You\'re logged in');
    console.log('  3. You ran DEPLOY_AUDIT_FINAL_FIX.sql in Supabase');
  }
})();

