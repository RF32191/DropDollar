/**
 * Session Guard Utility
 * Ensures valid Supabase session exists before making RPC calls
 */

import { supabase } from './client';
import type { PostgrestError } from '@supabase/supabase-js';

export interface SessionGuardResult<T = any> {
  data: T | null;
  error: PostgrestError | { message: string; code?: string } | null;
  isSessionValid: boolean;
}

/**
 * Validates that a Supabase session is active
 * @returns Promise<boolean> - true if session is valid
 */
export async function validateSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ [SessionGuard] Session validation error:', error);
      return false;
    }
    
    if (!session) {
      console.warn('⚠️ [SessionGuard] No active session found');
      return false;
    }
    
    // Check if token is expired or will expire soon (within 5 minutes)
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000);
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      
      if (expiresAt <= fiveMinutesFromNow) {
        console.warn('⚠️ [SessionGuard] Session token expired or expiring soon, refreshing...');
        
        // Try to refresh
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('❌ [SessionGuard] Failed to refresh session:', refreshError);
          // If refresh fails, check if current session is still valid (not expired yet)
          if (expiresAt > now) {
            console.warn('⚠️ [SessionGuard] Refresh failed but session still valid, continuing...');
            return true;
          }
          return false;
        }
        
        console.log('✅ [SessionGuard] Session refreshed successfully');
        return true;
      }
    }
    
    console.log('✅ [SessionGuard] Session is valid');
    return true;
  } catch (error) {
    console.error('❌ [SessionGuard] Unexpected error during session validation:', error);
    return false;
  }
}

/**
 * Retrieves the current access token
 * @returns Promise<string | null> - access token or null
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('❌ [SessionGuard] Error getting access token:', error);
    return null;
  }
}

/**
 * Executes an RPC call with session validation and retry logic
 * @param rpcName - Name of the RPC function
 * @param params - Parameters to pass to the RPC
 * @param options - Options for retry behavior
 * @returns Promise<SessionGuardResult<T>>
 */
export async function executeRpcWithSession<T = any>(
  rpcName: string,
  params?: Record<string, any>,
  options?: { retryOnSessionError?: boolean; maxRetries?: number }
): Promise<SessionGuardResult<T>> {
  const retryOnSessionError = options?.retryOnSessionError ?? false;
  const maxRetries = options?.maxRetries ?? 2;
  let attempts = 0;

  while (attempts <= maxRetries) {
    // Validate session first
    const isValid = await validateSession();
    
    if (!isValid) {
      // If this is a retryable operation and we haven't exceeded max retries, try refreshing
      if (retryOnSessionError && attempts < maxRetries) {
        console.log(`🔄 [SessionGuard] Session invalid, attempting refresh (attempt ${attempts + 1}/${maxRetries + 1})...`);
        const refreshed = await refreshAuthToken();
        
        if (refreshed) {
          attempts++;
          continue; // Retry with refreshed session
        }
      }
      
      return {
        data: null,
        error: {
          message: 'Session is not active. Please log in again.',
          code: 'SESSION_INACTIVE'
        },
        isSessionValid: false
      };
    }
    
    try {
      console.log(`🔐 [SessionGuard] Executing RPC: ${rpcName}`, params ? 'with params' : 'without params');
      
      // Execute the RPC with validated session
      const { data, error } = await supabase.rpc(rpcName, params);
      
      // If we get an auth error and retry is enabled, try refreshing and retrying
      if (error && retryOnSessionError && attempts < maxRetries) {
        const errorMessage = error.message?.toLowerCase() || '';
        if (errorMessage.includes('jwt') || errorMessage.includes('token') || errorMessage.includes('session') || errorMessage.includes('unauthorized')) {
          console.log(`🔄 [SessionGuard] Auth error detected, refreshing session (attempt ${attempts + 1}/${maxRetries + 1})...`);
          const refreshed = await refreshAuthToken();
          
          if (refreshed) {
            attempts++;
            continue; // Retry with refreshed session
          }
        }
      }
      
      if (error) {
        console.error(`❌ [SessionGuard] RPC ${rpcName} error:`, error);
        return {
          data: null,
          error,
          isSessionValid: true
        };
      }
      
      console.log(`✅ [SessionGuard] RPC ${rpcName} successful`);
      return {
        data,
        error: null,
        isSessionValid: true
      };
    } catch (error: any) {
      console.error(`❌ [SessionGuard] Unexpected error in RPC ${rpcName}:`, error);
      return {
        data: null,
        error: {
          message: error.message || 'Unexpected error occurred',
          code: 'UNKNOWN_ERROR'
        },
        isSessionValid: true
      };
    }
  }

  // If we exhausted all retries
  return {
    data: null,
    error: {
      message: 'Session refresh failed after multiple attempts. Please log in again.',
      code: 'SESSION_REFRESH_FAILED'
    },
    isSessionValid: false
  };
}

/**
 * Hook-friendly session checker
 * Use this in components to check if user can make authenticated calls
 */
export async function ensureAuthReady(
  isAuthenticated: boolean,
  isLoading: boolean
): Promise<{ ready: boolean; message?: string }> {
  // Still loading auth state
  if (isLoading) {
    return {
      ready: false,
      message: 'Authentication is loading...'
    };
  }
  
  // Not authenticated at all
  if (!isAuthenticated) {
    return {
      ready: false,
      message: 'User is not authenticated'
    };
  }
  
  // Validate Supabase session
  const isValid = await validateSession();
  
  if (!isValid) {
    return {
      ready: false,
      message: 'Session is not active or has expired'
    };
  }
  
  return {
    ready: true
  };
}

/**
 * Refresh session token
 * Call this when you suspect the token might be stale
 */
export async function refreshAuthToken(): Promise<boolean> {
  try {
    console.log('🔄 [SessionGuard] Refreshing auth token...');
    
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error || !data.session) {
      console.error('❌ [SessionGuard] Failed to refresh token:', error);
      return false;
    }
    
    console.log('✅ [SessionGuard] Token refreshed successfully');
    return true;
  } catch (error) {
    console.error('❌ [SessionGuard] Error refreshing token:', error);
    return false;
  }
}

/**
 * Proactively refresh session before starting a long operation (like a game)
 * This helps prevent session expiration during gameplay
 */
export async function ensureSessionForLongOperation(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.warn('⚠️ [SessionGuard] No session found for long operation');
      return false;
    }
    
    // If session expires in less than 10 minutes, refresh it now
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000);
      const now = new Date();
      const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
      
      if (expiresAt <= tenMinutesFromNow) {
        console.log('🔄 [SessionGuard] Proactively refreshing session before long operation...');
        return await refreshAuthToken();
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ [SessionGuard] Error ensuring session for long operation:', error);
    return false;
  }
}

