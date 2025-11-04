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
      console.log('🧹 [ClearCorruptedData] Clearing all localStorage to fix...');
      
      // Clear everything
      localStorage.clear();
      
      // Also clear sessionStorage
      sessionStorage.clear();
      
      // Clear Supabase auth storage
      const supabaseKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || key.includes('supabase')
      );
      supabaseKeys.forEach(key => localStorage.removeItem(key));
      
      console.log('✅ [ClearCorruptedData] Corrupted data cleared. User should log in again.');
      return true; // Data was corrupted and cleared
    }
    
    return false; // Data is valid
  } catch (error) {
    console.error('❌ [ClearCorruptedData] Error checking localStorage:', error);
    // If there's an error parsing, clear everything to be safe
    localStorage.clear();
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

