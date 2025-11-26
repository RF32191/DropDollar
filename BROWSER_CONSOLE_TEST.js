/**
 * COMPLETE AUDIT SYSTEM TEST
 * 
 * Copy this ENTIRE file and paste into browser console (F12)
 * while on https://www.drop-dollar.com
 * 
 * This will test everything and tell you exactly what's wrong
 */

(async function completeAuditTest() {
  console.clear();
  console.log('========================================');
  console.log('🔍 COMPLETE AUDIT SYSTEM DIAGNOSTIC');
  console.log('========================================');
  console.log('');
  
  let allPassed = true;
  
  try {
    // TEST 1: Check if we're on the right site
    console.log('TEST 1: Checking website...');
    if (!window.location.hostname.includes('drop-dollar.com') && !window.location.hostname.includes('localhost')) {
      console.error('❌ FAIL: Not on drop-dollar.com');
      console.log('→ Go to https://www.drop-dollar.com first');
      return;
    }
    console.log('✅ PASS: On correct website');
    console.log('');
    
    // TEST 2: Check if Supabase is available
    console.log('TEST 2: Checking Supabase client...');
    
    // Try to import createClientComponentClient
    let supabase;
    try {
      const module = await import('@supabase/auth-helpers-nextjs');
      const { createClientComponentClient } = module;
      supabase = createClientComponentClient();
      console.log('✅ PASS: Supabase client created');
    } catch (e) {
      console.error('❌ FAIL: Could not create Supabase client');
      console.error('Error:', e.message);
      allPassed = false;
    }
    console.log('');
    
    if (!supabase) {
      console.error('Cannot continue without Supabase client');
      return;
    }
    
    // TEST 3: Check authentication
    console.log('TEST 3: Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ FAIL: Not authenticated');
      console.log('Error:', authError?.message || 'No user found');
      console.log('→ Please log in first');
      allPassed = false;
      console.log('');
    } else {
      console.log('✅ PASS: Authenticated as:', user.email);
      console.log('   User ID:', user.id);
      console.log('');
    }
    
    // TEST 4: Check if function exists by calling it
    console.log('TEST 4: Testing frontend_log_game_completion function...');
    console.log('→ Attempting to log a test game...');
    
    const { data: result, error: rpcError } = await supabase.rpc('frontend_log_game_completion', {
      p_game_type: 'browser_console_test',
      p_game_mode: 'practice',
      p_score: 777,
      p_accuracy: 77.7,
      p_reaction_time: 0.77,
      p_duration_seconds: 77,
      p_additional_data: JSON.stringify({ test_time: new Date().toISOString() })
    });
    
    if (rpcError) {
      console.error('❌ FAIL: Function call failed');
      console.error('Error:', rpcError);
      console.log('');
      console.log('📋 Error Details:');
      console.log('  Message:', rpcError.message);
      console.log('  Code:', rpcError.code);
      console.log('  Hint:', rpcError.hint);
      console.log('');
      
      if (rpcError.message?.includes('does not exist') || rpcError.code === '42883') {
        console.error('🚨 FUNCTION DOES NOT EXIST IN DATABASE!');
        console.log('');
        console.log('🔧 TO FIX:');
        console.log('  1. Go to Supabase Dashboard');
        console.log('  2. SQL Editor → New query');
        console.log('  3. Open file: DEPLOY_AUDIT_FINAL_FIX.sql');
        console.log('  4. Copy ALL and paste');
        console.log('  5. Click RUN');
        console.log('  6. Wait for success message');
      }
      
      allPassed = false;
    } else {
      console.log('✅ PASS: Function call successful!');
      console.log('');
      console.log('📊 Result:');
      console.log('  Success:', result.success);
      console.log('  Audit ID:', result.audit_id);
      console.log('  Cheat Score:', result.cheat_score);
      console.log('  Score Rating:', result.score_rating);
      console.log('');
    }
    
    // TEST 5: Check if we can read from audit table
    console.log('TEST 5: Checking if audit logs are readable...');
    const { data: logs, error: readError } = await supabase
      .from('game_audit_log')
      .select('id, game_type, score, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (readError) {
      console.error('❌ FAIL: Cannot read audit logs');
      console.error('Error:', readError.message);
      console.log('→ This might be an RLS (Row Level Security) issue');
      allPassed = false;
    } else {
      console.log('✅ PASS: Can read audit logs');
      console.log('');
      console.log('📊 Recent audit logs in database:');
      if (logs && logs.length > 0) {
        logs.forEach((log, i) => {
          console.log(`  ${i+1}. ${log.game_type} (score: ${log.score}) - ${new Date(log.created_at).toLocaleString()}`);
        });
        
        // Check if our test log is there
        const hasTestLog = logs.some(log => log.game_type === 'browser_console_test');
        if (hasTestLog) {
          console.log('');
          console.log('✅ Our test log (browser_console_test) is in the database!');
        }
      } else {
        console.log('  (No logs found - database is empty)');
      }
      console.log('');
    }
    
    // TEST 6: Check if gameAudit module is available
    console.log('TEST 6: Checking if logGameCompletion is available...');
    try {
      const gameAuditModule = await import('/src/lib/gameAudit.ts');
      console.log('✅ PASS: gameAudit module exists');
      console.log('  Exports:', Object.keys(gameAuditModule));
      console.log('');
    } catch (e) {
      console.error('❌ FAIL: Cannot import gameAudit module');
      console.error('Error:', e.message);
      console.log('→ Module might not be built correctly');
      allPassed = false;
      console.log('');
    }
    
    // SUMMARY
    console.log('');
    console.log('========================================');
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('========================================');
      console.log('');
      console.log('🎯 NEXT STEPS:');
      console.log('  1. Go to Admin Dashboard → Audit Logs tab');
      console.log('  2. Refresh the page (Cmd+R or Ctrl+R)');
      console.log('  3. You should see: "browser_console_test" (score: 777)');
      console.log('');
      console.log('  If you see it → System is working! 🎉');
      console.log('  If you DON\'T see it → RLS might be blocking access');
      console.log('');
      console.log('  4. Now play a real game:');
      console.log('     - Go to /games/practice');
      console.log('     - Keep console open (F12)');
      console.log('     - Play Quick Click');
      console.log('     - Watch for audit messages');
      console.log('');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('========================================');
      console.log('');
      console.log('🔧 WHAT TO FIX:');
      console.log('');
      console.log('If function does not exist:');
      console.log('  → Run DEPLOY_AUDIT_FINAL_FIX.sql in Supabase');
      console.log('');
      console.log('If not authenticated:');
      console.log('  → Log in as rf32191@gmail.com');
      console.log('');
      console.log('If cannot read logs:');
      console.log('  → RLS policy issue, run this SQL:');
      console.log('');
      console.log('  ALTER TABLE game_audit_log ENABLE ROW LEVEL SECURITY;');
      console.log('  CREATE POLICY "Admin can view all" ON game_audit_log');
      console.log('    FOR SELECT USING (');
      console.log('      auth.uid() IN (');
      console.log('        SELECT id FROM auth.users WHERE email = \'rf32191@gmail.com\'');
      console.log('      )');
      console.log('    );');
      console.log('');
    }
    
  } catch (err) {
    console.error('');
    console.error('========================================');
    console.error('❌ UNEXPECTED ERROR');
    console.error('========================================');
    console.error('');
    console.error('Error:', err);
    console.error('');
    console.error('Stack:', err.stack);
    console.error('');
    console.error('🔧 This might mean:');
    console.error('  1. Site not fully loaded - wait and try again');
    console.error('  2. Browser extension blocking - try incognito mode');
    console.error('  3. Code not deployed - check Vercel dashboard');
  }
})();

