'use client';

import { useState, useEffect } from 'react';

export default function DiagnosticPage() {
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    testServer();
  }, []);

  const testServer = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/test-server');
      const data = await response.json();
      setServerInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testPaymentIntent = async () => {
    try {
      const response = await fetch('/api/payments/simple-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 100,
          currency: 'usd',
          metadata: {
            userId: 'test_user',
            type: 'tokens',
            gameType: 'test'
          }
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('✅ Payment Intent Created Successfully!\n\n' + JSON.stringify(data, null, 2));
      } else {
        alert('❌ Payment Intent Failed:\n\n' + JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🔧 DropDollar Diagnostic</h1>

        {/* Server Environment Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">📋 Server Environment</h2>
          
          {loading && (
            <div className="text-yellow-400">Loading server info...</div>
          )}
          
          {error && (
            <div className="text-red-400">❌ Error: {error}</div>
          )}
          
          {serverInfo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-400 text-sm">Stripe Secret Key Exists</div>
                  <div className={serverInfo.environment?.stripeSecretKeyExists ? 'text-green-400' : 'text-red-400'}>
                    {serverInfo.environment?.stripeSecretKeyExists ? '✅ Yes' : '❌ No'}
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-400 text-sm">Stripe Secret Key Length</div>
                  <div className={serverInfo.environment?.stripeSecretKeyLength > 50 ? 'text-green-400' : 'text-red-400'}>
                    {serverInfo.environment?.stripeSecretKeyLength || 0} characters
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-400 text-sm">Stripe Publishable Key Exists</div>
                  <div className={serverInfo.environment?.stripePublishableKeyExists ? 'text-green-400' : 'text-red-400'}>
                    {serverInfo.environment?.stripePublishableKeyExists ? '✅ Yes' : '❌ No'}
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-400 text-sm">Node Environment</div>
                  <div className="text-blue-400">
                    {serverInfo.environment?.nodeEnv || 'unknown'}
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-400 text-sm">Vercel Environment</div>
                  <div className="text-blue-400">
                    {serverInfo.environment?.vercelEnv || 'local'}
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-400 text-sm">Stripe Test</div>
                  <div className={serverInfo.environment?.stripeTest?.includes('success') ? 'text-green-400' : 'text-red-400'}>
                    {serverInfo.environment?.stripeTest || 'unknown'}
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <pre className="bg-gray-900 p-4 rounded overflow-auto text-sm">
                  {JSON.stringify(serverInfo, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          <button
            onClick={testServer}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            🔄 Refresh Server Info
          </button>
        </div>

        {/* Test Payment Intent */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">💳 Test Payment Intent</h2>
          <p className="text-gray-400 mb-4">
            This will attempt to create a $1.00 test payment intent with Stripe.
            Check your Stripe dashboard after clicking.
          </p>
          
          <button
            onClick={testPaymentIntent}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded font-bold"
          >
            🧪 Test Payment Intent Creation
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">📋 Troubleshooting</h2>
          
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-bold text-white mb-2">❌ If Stripe Secret Key is missing:</h3>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Go to Vercel Dashboard: <a href="https://vercel.com/rf32191s-projects/drop-dollar/settings/environment-variables" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">Environment Variables</a></li>
                <li>Add <code className="bg-gray-700 px-2 py-1 rounded">STRIPE_SECRET_KEY</code></li>
                <li>Value: Your Stripe secret key (starts with sk_live_)</li>
                <li>Select all environments: Production, Preview, Development</li>
                <li>Redeploy the site</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-2">❌ If Stripe Publishable Key is missing:</h3>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Go to Vercel Dashboard: <a href="https://vercel.com/rf32191s-projects/drop-dollar/settings/environment-variables" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">Environment Variables</a></li>
                <li>Add <code className="bg-gray-700 px-2 py-1 rounded">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code></li>
                <li>Value: Your Stripe publishable key (starts with pk_live_)</li>
                <li>Select all environments: Production, Preview, Development</li>
                <li>Redeploy the site</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-2">✅ If everything shows green:</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Click "Test Payment Intent Creation" button</li>
                <li>Check your Stripe dashboard for the test payment</li>
                <li>If it appears, your payment system is working!</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-gray-800 rounded-lg p-6 mt-6">
          <h2 className="text-2xl font-bold mb-4">🔗 Quick Links</h2>
          <div className="space-y-2">
            <a 
              href="https://vercel.com/rf32191s-projects/drop-dollar/settings/environment-variables" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-blue-400 hover:text-blue-300 underline"
            >
              → Vercel Environment Variables
            </a>
            <a 
              href="https://dashboard.stripe.com/test/payments" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-blue-400 hover:text-blue-300 underline"
            >
              → Stripe Dashboard (Test Mode)
            </a>
            <a 
              href="https://dashboard.stripe.com/payments" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-blue-400 hover:text-blue-300 underline"
            >
              → Stripe Dashboard (Live Mode)
            </a>
            <a 
              href="https://vercel.com/rf32191s-projects/drop-dollar" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-blue-400 hover:text-blue-300 underline"
            >
              → Vercel Deployment
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
