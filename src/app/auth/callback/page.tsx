'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          setMessage('Authentication failed. Please try again.');
          return;
        }

        if (data.session?.user) {
          console.log('OAuth login successful:', data.session.user.email);
          
          // Create user profile if it doesn't exist (for OAuth users)
          const { data: existingProfile, error: profileError } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.session.user.id)
            .single();

          if (!existingProfile && !profileError) {
            // Create profile for OAuth user
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: data.session.user.id,
                email: data.session.user.email || '',
                username: data.session.user.user_metadata?.preferred_username || 
                         data.session.user.user_metadata?.user_name ||
                         data.session.user.email?.split('@')[0] || 
                         'user' + Math.random().toString(36).substr(2, 9),
                first_name: data.session.user.user_metadata?.given_name || 
                           data.session.user.user_metadata?.name?.split(' ')[0] || 
                           'User',
                last_name: data.session.user.user_metadata?.family_name || 
                          data.session.user.user_metadata?.name?.split(' ').slice(1).join(' ') || 
                          '',
                role: 'buyer',
                avatar_url: data.session.user.user_metadata?.avatar_url,
                is_verified: true, // OAuth users are pre-verified
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (insertError) {
              console.error('Error creating OAuth user profile:', insertError);
              // Continue anyway - user can still use the app
            }
          }

          setStatus('success');
          setMessage('Successfully authenticated! Redirecting...');
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('No user session found. Please try signing in again.');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred during authentication.');
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <img
              src="/DropCoin.png"
              alt="DropDollar Logo"
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">DropDollar</h1>
        </div>

        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-300">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="text-green-500 text-5xl mb-4">✅</div>
            <p className="text-green-400 font-semibold">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">❌</div>
            <p className="text-red-400 font-semibold mb-4">{message}</p>
            <button
              onClick={() => router.push('/auth/login')}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
