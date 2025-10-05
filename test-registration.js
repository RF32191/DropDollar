// TEMPORARY DIAGNOSTIC - Add this to your browser console to test registration directly

async function testRegistration() {
  console.log('🧪 Testing registration API directly...');
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser123',
        phoneNumber: '+1234567890',
        role: 'buyer',
        location: null
      })
    });
    
    const result = await response.json();
    console.log('🔍 API Response:', result);
    
    if (!response.ok) {
      console.error('❌ API Error:', response.status, result);
    }
  } catch (error) {
    console.error('💥 Network Error:', error);
  }
}

// Run the test
testRegistration();
