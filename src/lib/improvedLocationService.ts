export interface LocationData {
  city: string;
  state: string;
  stateCode: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

export class ImprovedLocationService {
  private static readonly ALLOWED_STATES = [
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
            const { latitude, longitude } = position.coords;
            
            // Use reverse geocoding to get location details
            const locationData = await this.reverseGeocode(latitude, longitude);
            resolve(locationData);
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
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
    // Check if country is allowed
    if (!this.ALLOWED_COUNTRIES.includes(location.countryCode)) {
      return false;
    }

    // Check if state is allowed
    if (!this.ALLOWED_STATES.includes(location.state)) {
      return false;
    }

    return true;
  }

  static getLocationStatus(location: LocationData): {
    allowed: boolean;
    reason?: string;
  } {
    if (!this.ALLOWED_COUNTRIES.includes(location.countryCode)) {
      return {
        allowed: false,
        reason: `Gaming not allowed in ${location.country}`
      };
    }

    if (!this.ALLOWED_STATES.includes(location.state)) {
      return {
        allowed: false,
        reason: `Gaming not allowed in ${location.state}`
      };
    }

    return {
      allowed: true
    };
  }
}
