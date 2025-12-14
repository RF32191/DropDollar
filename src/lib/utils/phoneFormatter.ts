/**
 * Phone Number Formatting Utility
 * Formats phone numbers to a consistent format: +1XXXXXXXXXX (E.164 format)
 * Also supports US phone numbers without country code
 */

export function formatPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // If empty after removing non-digits, return null
  if (!digitsOnly) return null;
  
  // Handle US numbers (10 digits) - add +1 prefix
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  // Handle US numbers with country code (11 digits starting with 1)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // Handle numbers that already have country code (starts with +)
  if (phone.startsWith('+')) {
    return `+${digitsOnly}`;
  }
  
  // For other formats, try to preserve as E.164
  // If it's a reasonable length (10-15 digits), add + if missing
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }
  
  // Invalid format - return null
  return null;
}

/**
 * Validates phone number format
 * Accepts: US numbers (10 digits), US with country code (11 digits), or E.164 format
 */
export function validatePhoneNumber(phone: string | null | undefined): { valid: boolean; error?: string; formatted?: string } {
  if (!phone || phone.trim() === '') {
    return { valid: false, error: 'Phone number is required' };
  }
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Must have 10-15 digits (E.164 standard)
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return { 
      valid: false, 
      error: 'Phone number must be between 10 and 15 digits' 
    };
  }
  
  // Format the phone number
  const formatted = formatPhoneNumber(phone);
  
  if (!formatted) {
    return { 
      valid: false, 
      error: 'Invalid phone number format' 
    };
  }
  
  return { valid: true, formatted };
}

/**
 * Normalizes phone number for comparison (removes formatting)
 * Returns digits only for duplicate checking
 */
export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Handle US numbers (10 digits) - add 1 prefix for comparison
  if (digitsOnly.length === 10) {
    return `1${digitsOnly}`;
  }
  
  // Handle US numbers with country code (11 digits starting with 1)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return digitsOnly;
  }
  
  // For other formats, return digits only
  return digitsOnly || null;
}

