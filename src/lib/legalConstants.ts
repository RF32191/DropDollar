/**
 * LEGAL COMPLIANCE CONSTANTS
 * Single source of truth for all legal restrictions
 * Last Updated: 2025-01-01
 * 
 * IMPORTANT: This file contains the authoritative list of state restrictions
 * for skill-based gaming. All other files MUST import from here.
 */

// ============================================
// STATE RESTRICTIONS FOR SKILL-BASED GAMING
// ============================================

/**
 * States where skill-based gaming with entry fees is PROHIBITED
 * Based on state gambling laws as of 2025
 */
export const BLOCKED_STATES = new Set([
  'AZ', // Arizona - Prohibits skill games with entry fees
  'AR', // Arkansas - Strict gambling laws, unclear skill game exemption
  'CT', // Connecticut - Requires business registration, complex regulations
  'HI', // Hawaii - Prohibits ALL forms of gambling
  'ID', // Idaho - Restrictive gambling laws
  'IA', // Iowa - Requires registration for skill contests
  'LA', // Louisiana - State-controlled gambling only
  'MT', // Montana - Highly restrictive skill gaming laws
  'NV', // Nevada - Requires casino licensing for gaming
  'SC', // South Carolina - Prohibits all skill gaming with prizes
  'TN', // Tennessee - Recent legislation banning skill-based gaming
  'UT', // Utah - Strictest gambling prohibition in US
  'WA', // Washington - Criminal penalties for online gaming
]);

/**
 * States that require additional compliance measures but are ALLOWED
 * Platform operates in these states with enhanced monitoring
 */
export const COMPLIANCE_REQUIRED_STATES = new Set([
  'AL', // Alabama - Age verification required
  'DE', // Delaware - Prize value reporting required
  'FL', // Florida - Registration for prizes over $5,000
  'IN', // Indiana - Age verification and reporting
  'MD', // Maryland - Registration required for certain contests
  'MS', // Mississippi - Enhanced age verification
  'NY', // New York - Registration required for prizes over $5,000
  'TX', // Texas - Enhanced compliance measures
]);

/**
 * State code to full name mapping
 */
export const STATE_NAMES: { [key: string]: string } = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'District of Columbia'
};

/**
 * Get full state name from state code
 */
export function getStateName(stateCode: string): string {
  return STATE_NAMES[stateCode.toUpperCase()] || stateCode;
}

/**
 * Check if a state is blocked for skill-based gaming
 */
export function isStateBlocked(stateCode: string): boolean {
  return BLOCKED_STATES.has(stateCode.toUpperCase());
}

/**
 * Check if a state requires additional compliance measures
 */
export function requiresCompliance(stateCode: string): boolean {
  return COMPLIANCE_REQUIRED_STATES.has(stateCode.toUpperCase());
}

/**
 * Get the restriction status and message for a state
 */
export function getStateRestrictionInfo(stateCode: string): {
  isAllowed: boolean;
  requiresCompliance: boolean;
  message: string;
} {
  const code = stateCode.toUpperCase();
  const stateName = getStateName(code);

  if (BLOCKED_STATES.has(code)) {
    return {
      isAllowed: false,
      requiresCompliance: false,
      message: `Skill-based gaming is not available in ${stateName} due to state gambling regulations. We apologize for any inconvenience.`
    };
  }

  if (COMPLIANCE_REQUIRED_STATES.has(code)) {
    return {
      isAllowed: true,
      requiresCompliance: true,
      message: `Additional compliance measures apply in ${stateName}. Please ensure you meet all age and participation requirements.`
    };
  }

  return {
    isAllowed: true,
    requiresCompliance: false,
    message: `Skill-based gaming is available in ${stateName}.`
  };
}

// ============================================
// AGE RESTRICTIONS
// ============================================

/**
 * Minimum age requirement for platform participation
 */
export const MINIMUM_AGE = 18;

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Check if user meets minimum age requirement
 */
export function meetsAgeRequirement(dateOfBirth: Date): boolean {
  return calculateAge(dateOfBirth) >= MINIMUM_AGE;
}

/**
 * Parse date string (YYYY-MM-DD) to Date object
 */
export function parseDateOfBirth(dateString: string): Date | null {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Validate date of birth format and range
 */
export function validateDateOfBirth(dateString: string): {
  isValid: boolean;
  error?: string;
  age?: number;
} {
  if (!dateString || dateString.trim() === '') {
    return { isValid: false, error: 'Date of birth is required' };
  }

  const date = parseDateOfBirth(dateString);
  if (!date) {
    return { isValid: false, error: 'Invalid date format. Please use YYYY-MM-DD' };
  }

  // Check if date is in the future
  if (date > new Date()) {
    return { isValid: false, error: 'Date of birth cannot be in the future' };
  }

  // Check if date is too far in the past (older than 120 years)
  const maxAge = 120;
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - maxAge);
  
  if (date < minDate) {
    return { isValid: false, error: 'Invalid date of birth' };
  }

  const age = calculateAge(date);

  if (age < MINIMUM_AGE) {
    return { 
      isValid: false, 
      error: `You must be at least ${MINIMUM_AGE} years old to use this platform. You are currently ${age} years old.`,
      age 
    };
  }

  return { isValid: true, age };
}

// ============================================
// LEGAL MESSAGES
// ============================================

export const LEGAL_MESSAGES = {
  AGE_REQUIREMENT: `You must be at least ${MINIMUM_AGE} years old to participate in skill-based gaming on DropDollar.`,
  
  GEOGRAPHIC_RESTRICTION: 'DropDollar is only available to residents of the United States in approved states.',
  
  VPN_DETECTED: 'VPN or proxy usage detected. Please disable your VPN to verify your actual location. This is required for legal compliance.',
  
  LOCATION_REQUIRED: 'Location verification is required to ensure compliance with state gaming regulations.',
  
  TERMS_ACCEPTANCE: 'By using DropDollar, you agree to our Terms of Service and confirm that you meet all eligibility requirements.',
  
  BLOCKED_STATE_NOTICE: 'We apologize, but skill-based gaming is not available in your state due to local regulations. We are working to expand to more states in the future.',
  
  COMPLIANCE_STATE_NOTICE: 'Your state requires additional compliance measures. Please ensure you meet all local age and participation requirements.',
};

// Export all blocked states as an array for easy iteration
export const BLOCKED_STATES_ARRAY = Array.from(BLOCKED_STATES);
export const COMPLIANCE_STATES_ARRAY = Array.from(COMPLIANCE_REQUIRED_STATES);

