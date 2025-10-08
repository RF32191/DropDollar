// Check what tables exist in the Supabase database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://evcmkemuczvfdyedvwcu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2Y21rZW11Y3p2ZmR5ZWR2d2N1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0NTE0OSwiZXhwIjoyMDc0NjIxMTQ5fQ.3o0iWQxPQWSqw3cLusAPboTQajsM7MBOBCYzH9wZX-k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('🔍 Checking Supabase Schema for project: evcmkemuczvfdyedvwcu');
  console.log('='.repeat(60));
  
  try {
    // Check what tables exist
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (error) {
      console.error('❌ Error checking tables:', error.message);
      return;
    }
    
    if (!tables || tables.length === 0) {
      console.log('❌ NO TABLES FOUND - Schema not deployed!');
      console.log('\n📋 You need to deploy the schema:');
      console.log('1. Go to: https://supabase.com/dashboard/project/evcmkemuczvfdyedvwcu');
      console.log('2. Click: SQL Editor → New Query');
      console.log('3. Copy & paste: DROPDOLLAR_ULTRA_CLEAN_SCHEMA.sql');
      console.log('4. Click: Run');
      return;
    }
    
    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });
    
    // Check if key tables exist
    const expectedTables = [
      'users', 'user_wallets', 'stripe_payments', 'high_scores', 
      'daily_game_caps', 'listings', 'tournaments', 'advertisements'
    ];
    
    const existingTableNames = tables.map(t => t.table_name);
    const missingTables = expectedTables.filter(table => !existingTableNames.includes(table));
    
    console.log('\n🔍 Schema Status:');
    if (missingTables.length === 0) {
      console.log('✅ All essential tables are present!');
    } else {
      console.log('❌ Missing essential tables:', missingTables.join(', '));
      console.log('\n📋 Deploy the complete schema to fix this.');
    }
    
    // Test user creation
    console.log('\n🧪 Testing user table...');
    const { data: userTest, error: userError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (userError) {
      console.log('❌ Users table error:', userError.message);
    } else {
      console.log('✅ Users table is accessible');
    }
    
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

checkSchema();
