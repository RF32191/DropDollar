/**
 * Utility to detect and clear corrupted localStorage data
 * This fixes the "invalid input syntax for type uuid" error
 */

export function clearCorruptedLocalStorage(): boolean {
  try {
    const storedUser = localStorage.getItem('user');
    
    if (!storedUser) {
      return false; // Nothing to check
    }
    
    const userData = JSON.parse(storedUser);
    
    // Check if user ID is a valid UUID
    const isValidUUID = (id: string) => {
      if (!id || typeof id !== 'string') return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };
    
    if (!isValidUUID(userData.id)) {
      console.warn('🧹 [ClearCorruptedData] Detected corrupted user ID:', userData.id);
      console.log('🧹 [ClearCorruptedData] Clearing corrupted user data (preserving Supabase auth)...');
      
      // CRITICAL: Only clear OUR app data, NOT Supabase auth tokens!
      // Supabase uses keys like 'sb-<project>-auth-token' which we must preserve
      const keysToRemove = [
        'user',
        'isLoggedIn',
        'userId',
        'userEmail',
        'sessionId',
        'loginTime',
        'lastActivity',
        'rememberMe'
      ];
      
      keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log('🧹 Removed corrupted key:', key);
        }
      });
      
      // Clear sessionStorage (doesn't affect auth)
      sessionStorage.clear();
      
      console.log('✅ [ClearCorruptedData] Corrupted user data cleared. Supabase auth preserved.');
      return true; // Data was corrupted and cleared
    }
    
    return false; // Data is valid
  } catch (error) {
    console.error('❌ [ClearCorruptedData] Error checking localStorage:', error);
    // If there's an error parsing, only clear OUR app data (preserve Supabase auth)
    const keysToRemove = ['user', 'isLoggedIn', 'userId', 'userEmail', 'sessionId', 'loginTime', 'lastActivity', 'rememberMe'];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return true;
  }
}

/**
 * Check and clear corrupted data on app initialization
 */
export function initializeDataValidation(): void {
  if (typeof window === 'undefined') return;
  
  const wasCorrupted = clearCorruptedLocalStorage();
  
  if (wasCorrupted) {
    // Show user-friendly message
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 Data cleanup performed');
    console.log('Please log in again to continue.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Redirect to login if not already there
    if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
      console.log('🔄 Redirecting to login page...');
      window.location.href = '/login';
    }
  }
}

