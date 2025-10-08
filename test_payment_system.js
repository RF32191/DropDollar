#!/usr/bin/env node

/**
 * Drop Dollar Payment System Test Script
 * Tests the payment API endpoints to ensure they're working correctly
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Test data
const testPayment = {
  payment_method: 'card',
  token_amount: 100,
  customer_email: 'test@example.com'
};

const testCryptoPayment = {
  payment_method: 'eth',
  token_amount: 50,
  customer_email: 'crypto@example.com',
  customer_address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
};

async function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data))
      }
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function testPaymentAPI() {
  console.log('🧪 Testing Drop Dollar Payment System');
  console.log('=====================================\n');

  // Test 1: Basic card payment
  console.log('1️⃣ Testing card payment...');
  try {
    const result = await makeRequest(`${BASE_URL}/api/create_payment`, testPayment);
    if (result.status === 200 && result.data.payment_id) {
      console.log('✅ Card payment test passed');
      console.log(`   Payment ID: ${result.data.payment_id}`);
      console.log(`   Amount: $${result.data.amount_usd}`);
      console.log(`   Status: ${result.data.status}`);
    } else {
      console.log('❌ Card payment test failed');
      console.log(`   Status: ${result.status}`);
      console.log(`   Response: ${JSON.stringify(result.data)}`);
    }
  } catch (error) {
    console.log('❌ Card payment test failed with error:', error.message);
  }

  console.log('');

  // Test 2: ETH payment
  console.log('2️⃣ Testing ETH payment...');
  try {
    const result = await makeRequest(`${BASE_URL}/api/create_payment`, testCryptoPayment);
    if (result.status === 200 && result.data.payment_id) {
      console.log('✅ ETH payment test passed');
      console.log(`   Payment ID: ${result.data.payment_id}`);
      console.log(`   Amount: $${result.data.amount_usd}`);
      console.log(`   ETH Amount: ${result.data.amount_eth?.toFixed(6)} ETH`);
      console.log(`   Contract: ${result.data.contract_address}`);
    } else {
      console.log('❌ ETH payment test failed');
      console.log(`   Status: ${result.status}`);
      console.log(`   Response: ${JSON.stringify(result.data)}`);
    }
  } catch (error) {
    console.log('❌ ETH payment test failed with error:', error.message);
  }

  console.log('');

  // Test 3: iOS-compatible endpoint
  console.log('3️⃣ Testing iOS-compatible endpoint...');
  const iosPayment = {
    tokenAmount: 25,
    paymentMethod: 'apple_pay',
    customerEmail: 'ios@example.com'
  };
  
  try {
    const result = await makeRequest(`${BASE_URL}/api/dropcoin/create-payment`, iosPayment);
    if (result.status === 200 && result.data.paymentId) {
      console.log('✅ iOS payment test passed');
      console.log(`   Payment ID: ${result.data.paymentId}`);
      console.log(`   Amount: $${result.data.amountUsd}`);
      console.log(`   Status: ${result.data.status}`);
    } else {
      console.log('❌ iOS payment test failed');
      console.log(`   Status: ${result.status}`);
      console.log(`   Response: ${JSON.stringify(result.data)}`);
    }
  } catch (error) {
    console.log('❌ iOS payment test failed with error:', error.message);
  }

  console.log('');

  // Test 4: Error handling
  console.log('4️⃣ Testing error handling...');
  const invalidPayment = {
    payment_method: 'card',
    // Missing token_amount and customer_email
  };
  
  try {
    const result = await makeRequest(`${BASE_URL}/api/create_payment`, invalidPayment);
    if (result.status === 400) {
      console.log('✅ Error handling test passed');
      console.log(`   Correctly returned 400 for invalid data`);
    } else {
      console.log('❌ Error handling test failed');
      console.log(`   Expected 400, got ${result.status}`);
    }
  } catch (error) {
    console.log('❌ Error handling test failed with error:', error.message);
  }

  console.log('\n🎉 Payment system testing complete!');
  console.log('=====================================');
  console.log('If all tests passed, your payment system is working correctly.');
  console.log('If any tests failed, check:');
  console.log('  - Environment variables are set correctly');
  console.log('  - Supabase database is accessible');
  console.log('  - Stripe keys are valid');
  console.log('  - Server is running on the correct port');
}

// Run the tests
if (require.main === module) {
  testPaymentAPI().catch(console.error);
}

module.exports = { testPaymentAPI };
