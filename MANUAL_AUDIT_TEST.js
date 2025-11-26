/**
 * MANUAL AUDIT TEST
 * 
 * This will test the audit system DIRECTLY without waiting for deployment
 * 
 * Copy this ENTIRE script and paste into console on https://www.drop-dollar.com
 */

(async function manualAuditTest() {
  console.log('🧪 Testing Audit System Manually...');
  console.log('');
  
  try {
    // Create Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    
    // Get Supabase URL and key from page
    const supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with your actual URL
    const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your actual key
    
    console.log('⚠️  WAIT! You need to edit this script first!');
    console.log('');
    console.log('Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY with your actual values');
    console.log('You can find these in your Supabase project settings');
    console.log('');
    console.log('OR use this simpler version:');
    console.log('');
    console.log('// PASTE THIS INSTEAD:');
    console.log('(async () => {');
    console.log('  const module = await import("@supabase/auth-helpers-nextjs");');
    console.log('  const supabase = module.createClientComponentClient();');
    console.log('  const { data, error } = await supabase.rpc("frontend_log_game_completion", {');
    console.log('    p_game_type: "manual_console_test",');
    console.log('    p_game_mode: "practice",');
    console.log('    p_score: 555,');
    console.log('    p_accuracy: 55.5,');
    console.log('    p_reaction_time: null,');
    console.log('    p_duration_seconds: 60,');
    console.log('    p_additional_data: null');
    console.log('  });');
    console.log('  if (error) console.error("❌ Error:", error);');
    console.log('  else console.log("✅ Success:", data);');
    console.log('})();');
    
  } catch (err) {
    console.error('Error:', err);
  }
})();

