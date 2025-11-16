'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function TestMarketplacePage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testRPC() {
      try {
        console.log('🔍 Testing marketplace RPC...');
        
        const { data: result, error: rpcError } = await supabase.rpc('get_all_marketplace_listings', {
          category_filter: 'electronics'
        });

        if (rpcError) {
          console.error('❌ RPC Error:', rpcError);
          setError(JSON.stringify(rpcError, null, 2));
          return;
        }

        console.log('✅ RPC Success! Data:', result);
        setData(result);
      } catch (err: any) {
        console.error('❌ Catch Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    testRPC();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-2xl font-bold mb-4">🔍 Testing Marketplace RPC...</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">🔍 Marketplace RPC Test Results</h1>
      
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
          <h2 className="text-xl font-bold text-red-400 mb-2">❌ Error:</h2>
          <pre className="text-sm overflow-auto">{error}</pre>
        </div>
      )}

      {data && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
          <h2 className="text-xl font-bold text-green-400 mb-2">✅ Success! Received {Array.isArray(data) ? data.length : 0} listings</h2>
          
          <div className="mt-4">
            <h3 className="font-bold mb-2">Data Structure:</h3>
            <pre className="text-xs overflow-auto bg-gray-800 p-4 rounded">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>

          {Array.isArray(data) && data.length > 0 && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">First Listing Keys:</h3>
              <ul className="list-disc pl-6">
                {Object.keys(data[0]).map(key => (
                  <li key={key} className="text-sm">
                    <span className="text-blue-400">{key}</span>: {typeof data[0][key]} 
                    {data[0][key] === null && <span className="text-red-400"> (NULL)</span>}
                    {data[0][key] === undefined && <span className="text-red-400"> (UNDEFINED)</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

