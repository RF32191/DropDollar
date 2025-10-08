// Location and IP Verification System for Legal State Compliance

export interface LocationData {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
  status: string;
}

export interface LocationVerificationResult {
  isAllowed: boolean;
  location: LocationData | null;
  reason?: string;
  restrictionType?: 'excluded_state' | 'non_us' | 'vpn_detected' | 'unknown_location';
  stateCode?: string;
  stateName?: string;
}

export class LocationVerificationService {
  // States where skill-based contests with entry fees are prohibited or restricted
  private static readonly EXCLUDED_STATES = [
    'AZ', // Arizona
    'CO', // Colorado  
    'TN', // Tennessee
    'MD', // Maryland
    'ND', // North Dakota
  ];

  // States that may require registration for certain prize thresholds
  private static readonly REGISTRATION_REQUIRED_STATES = [
    'NY', // New York
    'FL', // Florida
  ];

  // State code to full name mapping
  private static readonly STATE_NAMES: { [key: string]: string } = {
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

  // Known VPN/Proxy IP ranges and indicators (simplified for demo)
  private static readonly VPN_INDICATORS = [
    'vpn', 'proxy', 'tor', 'hosting', 'datacenter', 'cloud'
  ];

  /**
   * Get user's IP address and location data
   */
  static async getUserLocation(userIP?: string): Promise<LocationData | null> {
    try {
      // In production, you would use a real IP geolocation service
      // For demo purposes, we'll simulate the response
      
      const ip = userIP || await this.getUserIP();
      
      // Mock location data - in production, use services like:
      // - MaxMind GeoIP2
      // - IPGeolocation.io
      // - ip-api.com
      // - ipinfo.io
      
      const mockLocationData: LocationData = {
        ip: ip,
        country: 'United States',
        countryCode: 'US',
        region: this.getMockRegionFromIP(ip),
        regionName: this.STATE_NAMES[this.getMockRegionFromIP(ip)] || 'Unknown',
        city: this.getMockCityFromIP(ip),
        zip: this.getMockZipFromIP(ip),
        lat: 40.7128,
        lon: -74.0060,
        timezone: 'America/New_York',
        isp: this.getMockISPFromIP(ip),
        org: 'Residential ISP',
        as: 'AS12345 Example ISP',
        query: ip,
        status: 'success'
      };

      console.log(`🌍 Location detected: ${mockLocationData.city}, ${mockLocationData.regionName} (${mockLocationData.region})`);
      return mockLocationData;
      
    } catch (error) {
      console.error('Location detection failed:', error);
      return null;
    }
  }

  /**
   * Get user's IP address
   */
  private static async getUserIP(): Promise<string> {
    try {
      // In production, you might use:
      // - Request headers (X-Forwarded-For, X-Real-IP)
      // - Third-party IP detection services
      // - Server-side IP detection
      
      // Mock IP generation for demo
      return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    } catch (error) {
      console.error('IP detection failed:', error);
      return '127.0.0.1';
    }
  }

  /**
   * Mock region detection based on IP (for demo purposes)
   */
  private static getMockRegionFromIP(ip: string): string {
    const ipHash = ip.split('.').reduce((acc, octet) => acc + parseInt(octet), 0);
    const states = Object.keys(this.STATE_NAMES);
    return states[ipHash % states.length];
  }

  /**
   * Mock city detection based on IP (for demo purposes)
   */
  private static getMockCityFromIP(ip: string): string {
    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'];
    const ipHash = ip.split('.').reduce((acc, octet) => acc + parseInt(octet), 0);
    return cities[ipHash % cities.length];
  }

  /**
   * Mock ZIP code detection based on IP (for demo purposes)
   */
  private static getMockZipFromIP(ip: string): string {
    const ipHash = ip.split('.').reduce((acc, octet) => acc + parseInt(octet), 0);
    return String(10001 + (ipHash % 89999)).padStart(5, '0');
  }

  /**
   * Mock ISP detection based on IP (for demo purposes)
   */
  private static getMockISPFromIP(ip: string): string {
    const isps = ['Comcast Cable', 'Verizon Fios', 'AT&T Internet', 'Spectrum', 'Cox Communications', 'Xfinity', 'CenturyLink'];
    const ipHash = ip.split('.').reduce((acc, octet) => acc + parseInt(octet), 0);
    return isps[ipHash % isps.length];
  }

  /**
   * Verify if user's location is allowed for gaming
   */
  static async verifyUserLocation(userIP?: string): Promise<LocationVerificationResult> {
    const location = await this.getUserLocation(userIP);
    
    if (!location) {
      return {
        isAllowed: false,
        location: null,
        reason: 'Unable to determine your location. Please ensure you have a stable internet connection and try again.',
        restrictionType: 'unknown_location'
      };
    }

    // Check if user is in the United States
    if (location.countryCode !== 'US') {
      return {
        isAllowed: false,
        location,
        reason: `Our gaming platform is only available to residents of the United States. Detected location: ${location.country}`,
        restrictionType: 'non_us'
      };
    }

    // Check for VPN/Proxy usage
    const isVPN = this.detectVPN(location);
    if (isVPN) {
      return {
        isAllowed: false,
        location,
        reason: 'VPN or proxy usage detected. Please disable your VPN and try again to verify your actual location.',
        restrictionType: 'vpn_detected'
      };
    }

    // Check if state is excluded
    if (this.EXCLUDED_STATES.includes(location.region)) {
      return {
        isAllowed: false,
        location,
        reason: `Skill-based gaming contests are not available in ${location.regionName} due to state regulations.`,
        restrictionType: 'excluded_state',
        stateCode: location.region,
        stateName: location.regionName
      };
    }

    // Check if state requires registration (warning but allow)
    if (this.REGISTRATION_REQUIRED_STATES.includes(location.region)) {
      console.warn(`⚠️ User in registration-required state: ${location.regionName}`);
      // In production, you might want to check if registration is complete for this state
    }

    // Location is allowed
    return {
      isAllowed: true,
      location,
      stateCode: location.region,
      stateName: location.regionName
    };
  }

  /**
   * Detect VPN/Proxy usage (simplified detection)
   */
  private static detectVPN(location: LocationData): boolean {
    // Check ISP/Organization for VPN indicators
    const orgLower = location.org.toLowerCase();
    const ispLower = location.isp.toLowerCase();
    
    for (const indicator of this.VPN_INDICATORS) {
      if (orgLower.includes(indicator) || ispLower.includes(indicator)) {
        return true;
      }
    }

    // Additional checks could include:
    // - Known VPN IP ranges
    // - Datacenter IP detection
    // - Multiple users from same IP
    // - Unusual geographic patterns
    
    return false;
  }

  /**
   * Verify location before game entry
   */
  static async verifyBeforeGameEntry(userId: string, gameId: string, userIP?: string): Promise<LocationVerificationResult> {
    console.log(`🎮 Verifying location for user ${userId} before game ${gameId}`);
    
    const verification = await this.verifyUserLocation(userIP);
    
    if (!verification.isAllowed) {
      console.log(`❌ Game entry blocked: ${verification.reason}`);
      
      // Log the blocked attempt for compliance
      this.logBlockedAttempt(userId, gameId, 'game_entry', verification);
    } else {
      console.log(`✅ Game entry allowed: ${verification.location?.city}, ${verification.location?.regionName}`);
      
      // Log the allowed entry for compliance
      this.logAllowedEntry(userId, gameId, 'game_entry', verification);
    }
    
    return verification;
  }

  /**
   * Verify location before payment/listing entry
   */
  static async verifyBeforePayment(userId: string, listingId: string, amount: number, userIP?: string): Promise<LocationVerificationResult> {
    console.log(`💰 Verifying location for user ${userId} before payment of $${amount} for listing ${listingId}`);
    
    const verification = await this.verifyUserLocation(userIP);
    
    if (!verification.isAllowed) {
      console.log(`❌ Payment blocked: ${verification.reason}`);
      
      // Log the blocked attempt for compliance
      this.logBlockedAttempt(userId, listingId, 'payment', verification, amount);
    } else {
      console.log(`✅ Payment allowed: ${verification.location?.city}, ${verification.location?.regionName}`);
      
      // Log the allowed payment for compliance
      this.logAllowedEntry(userId, listingId, 'payment', verification, amount);
    }
    
    return verification;
  }

  /**
   * Verify location during user registration
   */
  static async verifyDuringRegistration(email: string, userIP?: string): Promise<LocationVerificationResult> {
    console.log(`📝 Verifying location during registration for ${email}`);
    
    const verification = await this.verifyUserLocation(userIP);
    
    if (!verification.isAllowed) {
      console.log(`❌ Registration blocked: ${verification.reason}`);
      
      // Log the blocked registration attempt
      this.logBlockedAttempt(email, 'registration', 'registration', verification);
    } else {
      console.log(`✅ Registration allowed: ${verification.location?.city}, ${verification.location?.regionName}`);
      
      // Log the allowed registration
      this.logAllowedEntry(email, 'registration', 'registration', verification);
    }
    
    return verification;
  }

  /**
   * Log blocked attempts for compliance and fraud detection
   */
  private static logBlockedAttempt(
    userId: string, 
    resourceId: string, 
    actionType: string, 
    verification: LocationVerificationResult,
    amount?: number
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      resourceId,
      actionType,
      status: 'blocked',
      reason: verification.reason,
      restrictionType: verification.restrictionType,
      location: verification.location,
      amount: amount || null,
      ip: verification.location?.ip || 'unknown'
    };

    // In production, store this in a compliance database
    console.log('🚫 BLOCKED ATTEMPT LOGGED:', JSON.stringify(logEntry, null, 2));
    
    // Store in localStorage for demo (in production, use proper database)
    const existingLogs = JSON.parse(localStorage.getItem('blockedAttempts') || '[]');
    existingLogs.push(logEntry);
    localStorage.setItem('blockedAttempts', JSON.stringify(existingLogs));
  }

  /**
   * Log allowed entries for compliance tracking
   */
  private static logAllowedEntry(
    userId: string, 
    resourceId: string, 
    actionType: string, 
    verification: LocationVerificationResult,
    amount?: number
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      resourceId,
      actionType,
      status: 'allowed',
      location: verification.location,
      amount: amount || null,
      ip: verification.location?.ip || 'unknown'
    };

    // In production, store this in a compliance database
    console.log('✅ ALLOWED ENTRY LOGGED:', JSON.stringify(logEntry, null, 2));
    
    // Store in localStorage for demo (in production, use proper database)
    const existingLogs = JSON.parse(localStorage.getItem('allowedEntries') || '[]');
    existingLogs.push(logEntry);
    localStorage.setItem('allowedEntries', JSON.stringify(existingLogs));
  }

  /**
   * Get compliance logs for admin review
   */
  static getComplianceLogs(): { blocked: any[], allowed: any[] } {
    const blocked = JSON.parse(localStorage.getItem('blockedAttempts') || '[]');
    const allowed = JSON.parse(localStorage.getItem('allowedEntries') || '[]');
    
    return { blocked, allowed };
  }

  /**
   * Get user's current location status
   */
  static async getCurrentLocationStatus(userIP?: string): Promise<{
    location: LocationData | null;
    isAllowed: boolean;
    restrictions: string[];
    warnings: string[];
  }> {
    const verification = await this.verifyUserLocation(userIP);
    
    const restrictions: string[] = [];
    const warnings: string[] = [];
    
    if (!verification.isAllowed) {
      restrictions.push(verification.reason || 'Location not allowed');
    }
    
    if (verification.location && this.REGISTRATION_REQUIRED_STATES.includes(verification.location.region)) {
      warnings.push(`Your state (${verification.location.regionName}) may have additional registration requirements for certain prize levels.`);
    }
    
    return {
      location: verification.location,
      isAllowed: verification.isAllowed,
      restrictions,
      warnings
    };
  }

  /**
   * Check if IP has been flagged for suspicious activity
   */
  static checkIPReputation(ip: string): {
    isSuspicious: boolean;
    reasons: string[];
    riskScore: number; // 0-100, higher = more risky
  } {
    // In production, integrate with IP reputation services like:
    // - AbuseIPDB
    // - VirusTotal
    // - Shodan
    // - Custom fraud detection
    
    // Mock implementation for demo
    const reasons: string[] = [];
    let riskScore = 0;
    
    // Check for suspicious patterns (mock)
    if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) {
      reasons.push('Private IP address detected');
      riskScore += 30;
    }
    
    // Mock additional checks
    const ipHash = ip.split('.').reduce((acc, octet) => acc + parseInt(octet), 0);
    if (ipHash % 10 === 0) {
      reasons.push('IP flagged in fraud database');
      riskScore += 50;
    }
    
    return {
      isSuspicious: riskScore > 40,
      reasons,
      riskScore
    };
  }
}

export default LocationVerificationService;
