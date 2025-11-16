'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import CategoryPageMarketplace from '@/components/CategoryPageMarketplace';
import { ElectronicsAnimationWrapper } from '@/lib/AnimationEffects';
import ErrorBoundary from '@/components/ErrorBoundary';
import SoundEffects from '@/lib/SoundEffects';

export default function ElectronicsPage() {
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    // Play electronics sound when page loads
    SoundEffects.playElectronicsSound();
    
    // Test RPC function
    async function testRPC() {
      try {
        const { data, error } = await supabase.rpc('get_all_marketplace_listings', {
          category_filter: 'electronics'
        });
        
        if (error) {
          setTestResult({ success: false, error: error.message, details: error });
        } else {
          setTestResult({ success: true, count: data?.length || 0, data });
        }
      } catch (err: any) {
        setTestResult({ success: false, error: err.message, caught: true });
      }
    }
    
    testRPC();
  }, []);

  return (
    <ErrorBoundary>
      <ElectronicsAnimationWrapper>
        {testResult && !testResult.success && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-red-900 text-white p-4 border-b-4 border-red-700">
            <h2 className="text-xl font-bold mb-2">⚠️ DATABASE ERROR</h2>
            <p className="mb-2">Error: {testResult.error}</p>
            {testResult.details && (
              <details className="text-sm">
                <summary className="cursor-pointer font-bold">Click for details</summary>
                <pre className="mt-2 p-2 bg-red-950 rounded overflow-auto">
                  {JSON.stringify(testResult.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
        
        {testResult && testResult.success && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-green-900 text-white p-2 border-b-2 border-green-700 text-center">
            ✅ RPC Working! Found {testResult.count} listings
          </div>
        )}
        
        <CategoryPageMarketplace categoryId="electronics" categoryIcon="📱" />
      </ElectronicsAnimationWrapper>
    </ErrorBoundary>
  );
}