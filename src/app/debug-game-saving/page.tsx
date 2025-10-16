'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SimpleGameService } from '@/lib/supabase/simpleGameService';
import { supabase } from '@/lib/supabase/client';

export default function GameSavingDebugPage() {
  const { user } = useAuth();
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testGameSaving = async () => {
    if (!user) {
      setTestResult('❌ No user logged in');
      return;
    }

    setIsLoading(true);
    setTestResult('🔄 Testing game saving...\n');

    try {
      // Test 1: Check if user exists
      setTestResult(prev => prev + `✅ User ID: ${user.id}\n`);
      setTestResult(prev => prev + `✅ User Email: ${user.email}\n\n`);

      // Test 2: Try to save a test game
      setTestResult(prev => prev + '🎮 Attempting to save test game...\n');
      
      const result = await SimpleGameService.saveGameHistory({
        user_id: user.id,
        game_type: 'debug-test',
        score: 1500,
        accuracy: 95.5,
        avg_reaction_time: 250,
        game_duration: 60,
        is_practice: true,
        metadata: { test: true, timestamp: new Date().toISOString() }
      });

      if (result) {
        setTestResult(prev => prev + `✅ SUCCESS! Game saved with ID: ${result.id}\n`);
        setTestResult(prev => prev + `✅ Score: ${result.score}\n`);
        setTestResult(prev => prev + `✅ Game Type: ${result.game_type}\n`);
        setTestResult(prev => prev + `✅ Created At: ${result.created_at}\n`);
      } else {
        setTestResult(prev => prev + '❌ FAILED! Game was not saved\n');
      }

    } catch (error) {
      setTestResult(prev => prev + `❌ ERROR: ${error}\n`);
      console.error('Debug test error:', error);
    }

    setIsLoading(false);
  };

  const testDatabaseConnection = async () => {
    setIsLoading(true);
    setTestResult('🔄 Testing database connection...\n');

    try {
      const { data, error } = await supabase
        .from('game_history')
        .select('count')
        .limit(1);

      if (error) {
        setTestResult(prev => prev + `❌ Database Error: ${error.message}\n`);
        setTestResult(prev => prev + `❌ Error Code: ${error.code}\n`);
      } else {
        setTestResult(prev => prev + '✅ Database connection successful\n');
      }
    } catch (error) {
      setTestResult(prev => prev + `❌ Connection Error: ${error}\n`);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">🔧 Game Saving Debug Tool</h1>
        
        <div className="bg-black/30 rounded-xl p-6 border border-purple-500/20 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Current Status</h2>
          <div className="text-sm text-gray-300 mb-4">
            <p>User: {user ? `${user.email} (${user.id})` : 'Not logged in'}</p>
            <p>Timestamp: {new Date().toISOString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <button
            onClick={testGameSaving}
            disabled={isLoading || !user}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎮 Test Game Saving
          </button>

          <button
            onClick={testDatabaseConnection}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔗 Test Database Connection
          </button>
        </div>

        <div className="bg-black/30 rounded-xl p-6 border border-purple-500/20">
          <h2 className="text-xl font-bold text-white mb-4">Test Results</h2>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-black/50 p-4 rounded-lg">
            {testResult || 'Click a test button to see results...'}
          </pre>
        </div>

        <div className="mt-6 bg-yellow-900/30 border border-yellow-500/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-300 mb-2">📋 Next Steps</h3>
          <ol className="text-sm text-yellow-200 space-y-2">
            <li>1. Run the tests above to see what's failing</li>
            <li>2. Copy the SQL from DEBUG_GAME_SAVING.sql into Supabase SQL Editor</li>
            <li>3. Run the EMERGENCY_GAME_FIX.sql if the table doesn't exist</li>
            <li>4. Check browser console for detailed error messages</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
