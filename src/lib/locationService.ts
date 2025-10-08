// Location Service for Legal Compliance
// Handles geolocation, state restrictions, and skill-based gaming laws

export interface LocationData {
  latitude: number;
  longitude: number;
  state: string;
  stateCode: string;
  city: string;
  country: string;
  isAllowed: boolean;
  restrictionReason?: string;
  timestamp: number;
}

export interface LocationPermissionResult {
  granted: boolean;
  location?: LocationData;
  error?: string;
  requiresVPN?: boolean;
}

// States where skill-based gaming competitions may be restricted
const RESTRICTED_STATES = new Set([
  'AL', // Alabama - Strict gambling laws
  'AZ', // Arizona - Complex gambling regulations
  'AR', // Arkansas - Restrictive gambling laws
  'DE', // Delaware - State-controlled gambling
  'FL', // Florida - Complex gaming laws
  'GA', // Georgia - Strict gambling prohibitions
  'HI', // Hawaii - No gambling allowed
  'ID', // Idaho - Restrictive gambling laws
  'IN', // Indiana - Complex gaming regulations
  'IA', // Iowa - Restrictive skill gaming laws
  'LA', // Louisiana - State-controlled gambling
  'ME', // Maine - Restrictive gambling laws
  'MD', // Maryland - State-controlled gambling
  'MS', // Mississippi - Complex gambling laws
  'MT', // Montana - Restrictive skill gaming
  'NV', // Nevada - Highly regulated gambling
  'SC', // South Carolina - Strict gambling prohibitions
  'TN', // Tennessee - Complex gambling laws
  'TX', // Texas - Restrictive gambling laws
  'UT', // Utah - No gambling allowed
  'WA', // Washington - Restrictive gambling laws
  'WV'  // West Virginia - Complex gambling regulations
]);

// Additional states with partial restrictions or age requirements
const PARTIAL_RESTRICTION_STATES = new Set([
  'CT', // Connecticut - Age restrictions
  'IL', // Illinois - Licensing requirements
  'KS', // Kansas - Age and prize restrictions
  'KY', // Kentucky - Prize value limits
  'MI', // Michigan - Complex regulations
  'MN', // Minnesota - Prize restrictions
  'NE', // Nebraska - Age restrictions
  'NJ', // New Jersey - Licensing requirements
  'NY', // New York - Complex skill gaming laws
  'OH', // Ohio - Recent gaming law changes
  'OK', // Oklahoma - Tribal gaming considerations
  'OR', // Oregon - Prize restrictions
  'PA', // Pennsylvania - Complex gaming laws
  'RI', // Rhode Island - State lottery restrictions
  'VT', // Vermont - Prize restrictions
  'WI', // Wisconsin - Age and prize limits
  'WY'  // Wyoming - Limited gaming allowances
]);

export class LocationService {
  private static readonly STORAGE_KEY = 'user_location_data';
  private static readonly PERMISSION_KEY = 'location_permission_granted';
  private static readonly SESSION_KEY = 'location_session_cache';
  private static readonly GEOCODING_API = 'https://api.bigdatacloud.net/data/reverse-geocode-client';
  
  // Check if location permission has been granted recently (1 hour session)
  static hasLocationPermission(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check session cache first (1 hour)
    const sessionCache = localStorage.getItem(this.SESSION_KEY);
    if (sessionCache) {
      try {
        const sessionData = JSON.parse(sessionCache);
        // Check if session is less than 1 hour old
        if (Date.now() - sessionData.timestamp < 60 * 60 * 1000) {
          console.log('📍 Using 1-hour location session cache');
          return sessionData.hasPermission;
        } else {
          console.log('📍 Location session cache expired (1 hour)');
          localStorage.removeItem(this.SESSION_KEY);
        }
      } catch (error) {
        console.error('Error parsing session cache:', error);
        localStorage.removeItem(this.SESSION_KEY);
      }
    }
    
    // Fallback to persistent permission
    return localStorage.getItem(this.PERMISSION_KEY) === 'true';
  }

  // Store session permission (1 hour cache)
  static storeSessionPermission(hasPermission: boolean): void {
    if (typeof window === 'undefined') return;
    
    const sessionData = {
      hasPermission,
      timestamp: Date.now()
    };
    
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
    console.log('📍 Stored 1-hour location session cache:', hasPermission);
  }

  // Get stored location data
  static getStoredLocation(): LocationData | null {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;
    
    try {
      const data = JSON.parse(stored);
      // Check if data is less than 24 hours old
      if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
        this.clearStoredLocation();
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error parsing stored location:', error);
      this.clearStoredLocation();
      return null;
    }
  }

  // Clear stored location data
  static clearStoredLocation(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.PERMISSION_KEY);
  }

  // Request location permission and get user location
  static async requestLocationPermission(): Promise<LocationPermissionResult> {
    if (typeof window === 'undefined') {
      return { granted: false, error: 'Server-side environment' };
    }

    // Check if we already have permission and valid location
    const storedLocation = this.getStoredLocation();
    if (storedLocation && this.hasLocationPermission()) {
      return { granted: true, location: storedLocation };
    }

    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        return { 
          granted: false, 
          error: 'Geolocation is not supported by this browser. Please enable location services to participate in skill-based competitions.' 
        };
      }

      console.log('Requesting location permission...');

      // Request location with shorter timeout and lower accuracy for faster response
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Location request timed out after 10 seconds'));
        }, 10000); // Reduced from 15 seconds

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve(pos);
          },
          (error) => {
            clearTimeout(timeoutId);
            reject(error);
          },
          {
            enableHighAccuracy: false, // Changed to false for faster response
            timeout: 8000, // Reduced timeout
            maximumAge: 600000 // 10 minutes (increased for caching)
          }
        );
      });

      console.log('Location obtained, getting address details...');

      // Get location details from coordinates
      const locationData = await this.getLocationFromCoordinates(
        position.coords.latitude,
        position.coords.longitude
      );

      console.log('Location data processed:', locationData);

      // Store location data and permission
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(locationData));
      localStorage.setItem(this.PERMISSION_KEY, 'true');
      
      // Store 1-hour session cache
      this.storeSessionPermission(true);

      return { granted: true, location: locationData };

    } catch (error: any) {
      console.error('Location permission error:', error);
      
      let errorMessage = 'Unable to access your location. ';
      
      if (error.code === 1) { // PERMISSION_DENIED
        errorMessage += 'Location access was denied. Please enable location permissions in your browser settings to participate in skill-based competitions.';
      } else if (error.code === 2) { // POSITION_UNAVAILABLE
        errorMessage += 'Location information is unavailable. Please check your internet connection and try again.';
      } else if (error.code === 3 || error.message?.includes('timeout')) { // TIMEOUT
        errorMessage += 'Location request timed out. Please try again or check your location settings.';
      } else {
        errorMessage += 'Please enable location services to ensure legal compliance with skill-based gaming regulations.';
      }

      return { 
        granted: false, 
        error: errorMessage,
        requiresVPN: error.code === 1 // Might be using VPN
      };
    }
  }

  // Get location details from coordinates using reverse geocoding
  private static async getLocationFromCoordinates(
    latitude: number, 
    longitude: number
  ): Promise<LocationData> {
    try {
      console.log(`Getting location details for ${latitude}, ${longitude}`);
      
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(
        `${this.GEOCODING_API}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
        { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Geocoding service error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Geocoding response:', data);
      
      const stateCode = data.principalSubdivisionCode || data.principalSubdivision || 'UNKNOWN';
      const state = data.principalSubdivision || stateCode;
      const city = data.city || data.locality || data.localityInfo?.administrative?.[3]?.name || 'Unknown';
      const country = data.countryCode || 'UNKNOWN';
      
      console.log(`Parsed location: ${city}, ${stateCode}, ${country}`);
      
      // Check if location is allowed for skill-based gaming
      const { isAllowed, restrictionReason } = this.checkLocationRestrictions(
        stateCode, 
        country
      );
      
      const locationData: LocationData = {
        latitude,
        longitude,
        state,
        stateCode,
        city,
        country,
        isAllowed,
        restrictionReason,
        timestamp: Date.now()
      };
      
      console.log('Final location data:', locationData);
      return locationData;
      
    } catch (error) {
      console.error('Geocoding error:', error);
      
      // Fallback: assume restricted if we can't verify location
      const fallbackData: LocationData = {
        latitude,
        longitude,
        state: 'UNKNOWN',
        stateCode: 'UNKNOWN',
        city: 'Unknown',
        country: 'UNKNOWN',
        isAllowed: false,
        restrictionReason: 'Unable to verify location for legal compliance. Please try again or contact support.',
        timestamp: Date.now()
      };
      
      console.log('Using fallback location data:', fallbackData);
      return fallbackData;
    }
  }

  // Check if a location is allowed for skill-based gaming
  private static checkLocationRestrictions(
    stateCode: string, 
    country: string
  ): { isAllowed: boolean; restrictionReason?: string } {
    
    // Only allow US locations for now
    if (country !== 'US') {
      return {
        isAllowed: false,
        restrictionReason: 'Skill-based competitions are currently only available in select US states due to legal regulations.'
      };
    }
    
    // Check fully restricted states
    if (RESTRICTED_STATES.has(stateCode)) {
      return {
        isAllowed: false,
        restrictionReason: `Skill-based gaming competitions are not available in ${stateCode} due to state gambling regulations. We apologize for any inconvenience.`
      };
    }
    
    // Check partially restricted states (allow with warnings)
    if (PARTIAL_RESTRICTION_STATES.has(stateCode)) {
      return {
        isAllowed: true, // Allow but with additional compliance measures
        restrictionReason: `Additional restrictions may apply in ${stateCode}. Please ensure you meet all local age and participation requirements.`
      };
    }
    
    // Allow all other US states
    return { isAllowed: true };
  }

  // Check if current user location allows gaming
  static async checkCurrentLocationAllowed(): Promise<{
    allowed: boolean;
    location?: LocationData;
    message?: string;
  }> {
    const storedLocation = this.getStoredLocation();
    
    if (storedLocation) {
      return {
        allowed: storedLocation.isAllowed,
        location: storedLocation,
        message: storedLocation.restrictionReason
      };
    }
    
    // Need to request permission first
    const result = await this.requestLocationPermission();
    
    if (!result.granted) {
      return {
        allowed: false,
        message: result.error || 'Location access required for legal compliance'
      };
    }
    
    return {
      allowed: result.location?.isAllowed || false,
      location: result.location,
      message: result.location?.restrictionReason
    };
  }

  // Get user-friendly state name from code
  static getStateName(stateCode: string): string {
    const stateNames: { [key: string]: string } = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
      'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
      'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
      'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
      'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
      'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
      'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
    };
    
    return stateNames[stateCode] || stateCode;
  }

  // Check if user needs to reverify location (daily check)
  static needsLocationReverification(): boolean {
    const storedLocation = this.getStoredLocation();
    if (!storedLocation) return true;
    
    // Require reverification every 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    return storedLocation.timestamp < oneDayAgo;
  }

  // Get compliance message for display
  static getComplianceMessage(location?: LocationData): string {
    if (!location) {
      return 'Location verification required for legal compliance with skill-based gaming regulations.';
    }
    
    if (!location.isAllowed) {
      return location.restrictionReason || 'Skill-based competitions are not available in your location.';
    }
    
    if (PARTIAL_RESTRICTION_STATES.has(location.stateCode)) {
      return `You are participating from ${this.getStateName(location.stateCode)}. ${location.restrictionReason || 'Additional local restrictions may apply.'}`;
    }
    
    return `Verified location: ${location.city}, ${this.getStateName(location.stateCode)}. You are eligible to participate in skill-based competitions.`;
  }
}
