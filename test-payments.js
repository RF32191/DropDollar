#!/usr/bin/env node

// Payment Testing Script for Dollar Drop
// Tests Stripe and PayPal integrations

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🧪 Dollar Drop Payment Testing Script');
console.log('=====================================\n');

async function testStripeConnection() {
  console.log('🔵 Testing Stripe Connection...');
  
  try {
    // Check if Stripe keys are configured
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!stripeSecretKey || !stripePublishableKey) {
      console.log('❌ Stripe keys not configured');
      console.log('   Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.production');
      return false;
    }
    
    // Test Stripe API connection
    const Stripe = require('stripe');
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
    
    // Test API call
    const account = await stripe.accounts.retrieve();
    console.log('✅ Stripe connected successfully');
    console.log(`   Account ID: ${account.id}`);
    console.log(`   Country: ${account.country}`);
    console.log(`   Charges enabled: ${account.charges_enabled}`);
    console.log(`   Payouts enabled: ${account.payouts_enabled}`);
    
    return true;
  } catch (error) {
    console.log('❌ Stripe connection failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testPayPalConnection() {
  console.log('\n🟡 Testing PayPal Connection...');
  
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.log('❌ PayPal credentials not configured');
      console.log('   Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.production');
      return false;
    }
    
    // Test PayPal API connection
    const fetch = require('node-fetch');
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch('https://api.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ PayPal connected successfully');
      console.log(`   Access token received: ${data.access_token.substring(0, 20)}...`);
      console.log(`   Token type: ${data.token_type}`);
      return true;
    } else {
      console.log('❌ PayPal connection failed');
      console.log(`   Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ PayPal connection failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function createTestPayment() {
  console.log('\n💳 Creating Test Payment...');
  
  try {
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    
    // Create a test payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100, // $1.00 in cents
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        test: 'true',
        tokenAmount: '1',
        userId: 'test-user'
      }
    });
    
    console.log('✅ Test payment intent created');
    console.log(`   Payment Intent ID: ${paymentIntent.id}`);
    console.log(`   Amount: $${paymentIntent.amount / 100}`);
    console.log(`   Status: ${paymentIntent.status}`);
    
    return true;
  } catch (error) {
    console.log('❌ Test payment creation failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('Starting payment system tests...\n');
  
  // Load environment variables
  require('dotenv').config({ path: '.env.production' });
  
  const results = {
    stripe: await testStripeConnection(),
    paypal: await testPayPalConnection()
  };
  
  if (results.stripe) {
    await createTestPayment();
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Stripe: ${results.stripe ? '✅ Connected' : '❌ Failed'}`);
  console.log(`PayPal: ${results.paypal ? '✅ Connected' : '❌ Failed'}`);
  
  if (results.stripe && results.paypal) {
    console.log('\n🎉 All payment systems ready for production!');
    console.log('You can now deploy your site with working payments.');
  } else {
    console.log('\n⚠️  Some payment systems need configuration.');
    console.log('Please check the errors above and update your .env.production file.');
  }
}

// Handle missing dependencies
async function checkDependencies() {
  try {
    require('stripe');
    require('node-fetch');
    require('dotenv');
    return true;
  } catch (error) {
    console.log('❌ Missing dependencies. Installing...');
    const { exec } = require('child_process');
    
    return new Promise((resolve) => {
      exec('npm install stripe node-fetch dotenv', (error, stdout, stderr) => {
        if (error) {
          console.log('❌ Failed to install dependencies');
          console.log('Please run: npm install stripe node-fetch dotenv');
          resolve(false);
        } else {
          console.log('✅ Dependencies installed');
          resolve(true);
        }
      });
    });
  }
}

// Main execution
async function main() {
  const depsOk = await checkDependencies();
  if (depsOk) {
    await runTests();
  }
  
  rl.close();
}

main().catch(console.error);


