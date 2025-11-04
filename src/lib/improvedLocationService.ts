export interface LocationData {
  city: string;
  state: string;
  stateCode: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export class ImprovedLocationService {
  // States where skill-based gaming is PROHIBITED
  private static readonly EXCLUDED_STATES = [
    'Arizona', 'Arkansas', 'Connecticut', 'Delaware', 'Louisiana', 
    'Montana', 'South Carolina', 'South Dakota', 'Tennessee', 'Washington'
  ];

  // States that REQUIRE special registration or have additional restrictions
  private static readonly RESTRICTED_STATES = [
    'Iowa', 'Illinois', 'Michigan', 'Nevada'
  ];

  // All US states for validation
  private static readonly US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
    'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee',
    'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
    'District of Columbia'
  ];

  private static readonly ALLOWED_COUNTRIES = ['US', 'United States'];

  static async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude, accuracy } = position.coords;
            
            // Use reverse geocoding to get location details
            const locationData = await this.reverseGeocode(latitude, longitude);
            locationData.accuracy = accuracy;
            locationData.timestamp = Date.now();
            
            console.log('📍 Location obtained:', locationData);
            resolve(locationData);
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          console.error('❌ Geolocation error:', error);
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  }

  private static async reverseGeocode(latitude: number, longitude: number): Promise<LocationData> {
    try {
      // Use a free reverse geocoding service
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      
      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      
      return {
        city: data.city || data.locality || 'Unknown',
        state: data.principalSubdivision || 'Unknown',
        stateCode: data.principalSubdivisionCode || 'Unknown',
        country: data.countryName || 'Unknown',
        countryCode: data.countryCode || 'Unknown',
        latitude,
        longitude
      };
    } catch (error) {
      // Fallback to basic location data
      return {
        city: 'Unknown',
        state: 'Unknown',
        stateCode: 'Unknown',
        country: 'Unknown',
        countryCode: 'Unknown',
        latitude,
        longitude
      };
    }
  }

  static isGamingAllowed(location: LocationData): boolean {
    // Check if country is allowed (must be US)
    if (!this.ALLOWED_COUNTRIES.includes(location.countryCode)) {
      console.log('❌ Country not allowed:', location.country);
      return false;
    }

    // Check if state is excluded (prohibited states)
    if (this.EXCLUDED_STATES.includes(location.state)) {
      console.log('❌ State excluded:', location.state);
      return false;
    }

    // Check if state is valid US state
    if (!this.US_STATES.includes(location.state)) {
      console.log('❌ Invalid US state:', location.state);
      return false;
    }

    console.log('✅ Gaming allowed in:', location.state);
    return true;
  }

  static getLocationStatus(location: LocationData): {
    allowed: boolean;
    reason?: string;
    warning?: string;
  } {
    // Check country
    if (!this.ALLOWED_COUNTRIES.includes(location.countryCode)) {
      return {
        allowed: false,
        reason: `Skill-based gaming is only available in the United States. Your location: ${location.country}`
      };
    }

    // Check excluded states
    if (this.EXCLUDED_STATES.includes(location.state)) {
      return {
        allowed: false,
        reason: `Skill-based gaming with entry fees is prohibited in ${location.state} under state law.`
      };
    }

    // Check if valid US state
    if (!this.US_STATES.includes(location.state)) {
      return {
        allowed: false,
        reason: `Unable to verify location: ${location.state}. Please ensure location services are enabled and accurate.`
      };
    }

    // Check restricted states (allowed but with warning)
    if (this.RESTRICTED_STATES.includes(location.state)) {
      return {
        allowed: true,
        warning: `${location.state} has specific regulations for skill-based gaming. Please ensure you comply with local laws.`
      };
    }

    return {
      allowed: true
    };
  }

  static getExcludedStates(): string[] {
    return [...this.EXCLUDED_STATES];
  }

  static getRestrictedStates(): string[] {
    return [...this.RESTRICTED_STATES];
  }
}
