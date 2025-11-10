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
    
    // Check if token is expired
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000);
      const now = new Date();
      
      if (expiresAt <= now) {
        console.warn('⚠️ [SessionGuard] Session token expired');
        
        // Try to refresh
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('❌ [SessionGuard] Failed to refresh session:', refreshError);
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
 * Executes an RPC call with session validation
 * @param rpcName - Name of the RPC function
 * @param params - Parameters to pass to the RPC
 * @returns Promise<SessionGuardResult<T>>
 */
export async function executeRpcWithSession<T = any>(
  rpcName: string,
  params?: Record<string, any>
): Promise<SessionGuardResult<T>> {
  // Validate session first
  const isValid = await validateSession();
  
  if (!isValid) {
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

