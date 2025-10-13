/**
 * Admin Tools for DropDollar
 * Run with: npx ts-node scripts/admin-tools.ts
 */

import TournamentService from '../src/lib/supabase/tournamentService';
import { UserService } from '../src/lib/supabase/userService';

// ======================
// CREATE TEST TOURNAMENTS
// ======================
async function createTestTournaments() {
  console.log('🏆 Creating test tournaments...\n');

  try {
    // $100 Tournament - Multi-Target Reaction
    const tournament1 = await TournamentService.createTournament(
      '$100 Quick Strike Tournament',
      'multi-target',
      5,    // $5 entry fee
      100,  // $100 prize pool
      20,   // 20 players max
      [{ rank: 1, amount: 85, percentage: 85 }]
    );
    console.log('✅ Created: $100 Quick Strike Tournament');
    console.log('   ID:', tournament1?.id);
    console.log('   Entry: $5 (5 tokens)');
    console.log('   Prize: $85 to winner\n');

    // $500 Tournament - Laser Dodge
    const tournament2 = await TournamentService.createTournament(
      '$500 Elite Championship',
      'laser-dodge',
      10,   // $10 entry fee
      500,  // $500 prize pool
      50,   // 50 players max
      [{ rank: 1, amount: 425, percentage: 85 }]
    );
    console.log('✅ Created: $500 Elite Championship');
    console.log('   ID:', tournament2?.id);
    console.log('   Entry: $10 (10 tokens)');
    console.log('   Prize: $425 to winner\n');

    // $50 Tournament - Quick Click
    const tournament3 = await TournamentService.createTournament(
      '$50 Speed Challenge',
      'quick-click',
      2,    // $2 entry fee
      50,   // $50 prize pool
      25,   // 25 players max
      [{ rank: 1, amount: 42.50, percentage: 85 }]
    );
    console.log('✅ Created: $50 Speed Challenge');
    console.log('   ID:', tournament3?.id);
    console.log('   Entry: $2 (2 tokens)');
    console.log('   Prize: $42.50 to winner\n');

    console.log('🎉 All test tournaments created successfully!');
    console.log('   Go to https://www.drop-dollar.com/tournaments to see them');

  } catch (error) {
    console.error('❌ Error creating tournaments:', error);
  }
}

// ======================
// ADD TOKENS TO USER
// ======================
async function addTokensToUser(email: string, amount: number) {
  console.log(`💰 Adding ${amount} tokens to ${email}...\n`);

  try {
    // Get user by email
    const user = await UserService.getOrCreateUser(email, email);
    
    if (!user) {
      console.error('❌ User not found');
      return;
    }

    // Get current balance
    const currentTokens = user.tokens || 0;
    const newBalance = currentTokens + amount;

    // Update tokens
    await UserService.updateUserTokens(user.id, newBalance);

    // Record transaction
    await UserService.addTokenTransaction({
      user_id: user.id,
      amount: amount,
      type: 'admin_credit',
      description: `Admin credited ${amount} tokens`,
      balance_before: currentTokens,
      balance_after: newBalance,
      metadata: {
        admin_action: true,
        reason: 'Test credits'
      }
    });

    console.log('✅ Tokens added successfully!');
    console.log('   User:', email);
    console.log('   Previous balance:', currentTokens);
    console.log('   Amount added:', amount);
    console.log('   New balance:', newBalance);

  } catch (error) {
    console.error('❌ Error adding tokens:', error);
  }
}

// ======================
// MAIN EXECUTION
// ======================
async function main() {
  console.log('='.repeat(60));
  console.log('💎 DROPDOLLAR ADMIN TOOLS');
  console.log('='.repeat(60));
  console.log('\n');

  const action = process.argv[2];

  if (action === 'create-tournaments') {
    await createTestTournaments();
  } else if (action === 'add-tokens') {
    const email = process.argv[3];
    const amount = parseInt(process.argv[4] || '100');
    
    if (!email) {
      console.error('❌ Please provide an email address');
      console.log('   Usage: npx ts-node scripts/admin-tools.ts add-tokens <email> <amount>');
      console.log('   Example: npx ts-node scripts/admin-tools.ts add-tokens user@example.com 100');
      return;
    }

    await addTokensToUser(email, amount);
  } else {
    console.log('📋 Available Commands:\n');
    console.log('1. Create Test Tournaments:');
    console.log('   npx ts-node scripts/admin-tools.ts create-tournaments\n');
    console.log('2. Add Tokens to User:');
    console.log('   npx ts-node scripts/admin-tools.ts add-tokens <email> <amount>');
    console.log('   Example: npx ts-node scripts/admin-tools.ts add-tokens ryanfermoselle@yahoo.com 100\n');
  }

  console.log('\n' + '='.repeat(60));
}

// Run the script
main().catch(console.error);

