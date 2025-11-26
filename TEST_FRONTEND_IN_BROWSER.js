/**
 * BROWSER CONSOLE TEST - Paste this ENTIRE script into browser console
 * 
 * This will test if:
 * 1. The gameAudit module is loaded
 * 2. The logGameCompletion function exists
 * 3. The function can be called
 * 4. The backend responds
 * 
 * Run on: https://www.drop-dollar.com/games/practice
 */

(async function testAuditSystem() {
  console.log('');
  console.log('========================================');
  console.log('🧪 TESTING AUDIT SYSTEM');
  console.log('========================================');
  console.log('');
  
  // Test 1: Check if we're authenticated
  console.log('Test 1: Checking authentication...');
  try {
    const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs');
    const supabase = createClientComponentClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Auth error:', error);
      return;
    }
    
    if (!user) {
      console.error('❌ Not logged in!');
      console.log('👉 Please log in as rf32191@gmail.com and try again');
      return;
    }
    
    console.log('✅ Authenticated as:', user.email);
    console.log('');
    
    // Test 2: Call the audit function directly
    console.log('Test 2: Calling audit function directly...');
    console.log('📡 Calling frontend_log_game_completion...');
    
    const { data: result, error: rpcError } = await supabase.rpc('frontend_log_game_completion', {
      p_game_type: 'browser_console_test',
      p_game_mode: 'practice',
      p_score: 777,
      p_accuracy: 77.7,
      p_reaction_time: 0.77,
      p_duration_seconds: 77,
      p_additional_data: JSON.stringify({ test: 'browser_console', timestamp: Date.now() })
    });
    
    if (rpcError) {
      console.error('❌ RPC Error:', rpcError);
      console.error('📋 Error details:', {
        message: rpcError.message,
        code: rpcError.code,
        hint: rpcError.hint
      });
      
      if (rpcError.code === '42883') {
        console.error('');
        console.error('🚨 FUNCTION DOES NOT EXIST!');
        console.error('📦 You need to run: DEPLOY_AUDIT_FINAL_FIX.sql');
        console.error('🔗 Go to Supabase Dashboard → SQL Editor');
        console.error('');
      } else if (rpcError.code === '42501') {
        console.error('');
        console.error('🚨 PERMISSION DENIED!');
        console.error('📦 RLS might be blocking access');
        console.error('🔗 Run: FIX_RLS_NO_DEADLOCK.sql');
        console.error('');
      } else {
        console.error('');
        console.error('🚨 UNKNOWN ERROR!');
        console.error('📋 Send this error to the developer');
        console.error('');
      }
      return;
    }
    
    console.log('✅ Function called successfully!');
    console.log('📊 Result:', result);
    console.log('');
    
    // Test 3: Verify it was inserted
    console.log('Test 3: Checking if audit log was created...');
    const { data: auditLogs, error: queryError } = await supabase
      .from('game_audit_log')
      .select('*')
      .eq('game_type', 'browser_console_test')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (queryError) {
      console.error('❌ Query error:', queryError);
      return;
    }
    
    if (!auditLogs || auditLogs.length === 0) {
      console.warn('⚠️  No audit log found!');
      console.log('The function succeeded but no record was created.');
      console.log('This might be an RLS issue.');
      return;
    }
    
    console.log('✅ Audit log created!');
    console.log('📊 Log details:', auditLogs[0]);
    console.log('');
    
    // Test 4: Check if gameAudit module can be imported
    console.log('Test 4: Checking if gameAudit module is deployed...');
    try {
      const gameAuditModule = await import('/src/lib/gameAudit.ts');
      console.log('✅ gameAudit module found!');
      console.log('📦 Exported functions:', Object.keys(gameAuditModule));
      
      if (gameAuditModule.logGameCompletion) {
        console.log('✅ logGameCompletion function exists!');
        
        // Test 5: Call via the module
        console.log('');
        console.log('Test 5: Calling via gameAudit module...');
        const moduleResult = await gameAuditModule.logGameCompletion({
          gameType: 'module_test',
          gameMode: 'practice',
          score: 555,
          accuracy: 55.5,
          reactionTime: 0.55,
          durationSeconds: 55
        });
        
        console.log('✅ Module call result:', moduleResult);
      } else {
        console.warn('⚠️  logGameCompletion not found in module');
      }
    } catch (moduleError) {
      console.warn('⚠️  Could not import gameAudit module:', moduleError.message);
      console.log('This might be normal if using a bundler.');
      console.log('The direct RPC call worked, so audit system is functional.');
    }
    
    console.log('');
    console.log('========================================');
    console.log('🎯 TEST COMPLETE!');
    console.log('========================================');
    console.log('');
    console.log('Summary:');
    console.log('✅ Authentication: Working');
    console.log('✅ Backend function: Working');
    console.log('✅ Database insert: Working');
    console.log('');
    console.log('👉 Now go to Admin Dashboard → Audit Logs');
    console.log('👉 You should see:');
    console.log('   - browser_console_test (score 777)');
    console.log('   - module_test (score 555) if module loaded');
    console.log('');
    console.log('If you see these, the audit system is WORKING!');
    console.log('If games still don\'t log, the issue is in game components.');
    console.log('');
    
  } catch (err) {
    console.error('❌ Test failed:', err);
    console.error('Full error:', err);
  }
})();

