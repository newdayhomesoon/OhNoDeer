import Geolocation from '@react-native-community/geolocation';
import {PermissionsAndroid, Platform, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
  timestamp: number;
}

export interface LocationServiceConfig {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
  distanceFilter?: number;
  useSignificantChanges?: boolean;
}

export interface LocationError {
  code: number;
  message: string;
  type: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN';
}

class LocationService {
  private static instance: LocationService;
  private watchId: number | null = null;
  private isWatching = false;
  private lastLocation: LocationData | null = null;
  private locationCallbacks: ((location: LocationData) => void)[] = [];
  private errorCallbacks: ((error: LocationError) => void)[] = [];

  private defaultConfig: LocationServiceConfig = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 10000,
    distanceFilter: 10, // meters
    useSignificantChanges: false,
  };

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request location permissions for React Native
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // iOS permissions are handled through Info.plist
        // We'll assume permissions are granted if the app can request location
        return true;
      } else if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to report wildlife sightings.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return false;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Check if location permissions are granted
   */
  async checkPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // For iOS, we'll assume permissions are granted if we can get location
        return true;
      } else if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted;
      }
      return false;
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return false;
    }
  }

  /**
   * Get current location with comprehensive error handling
   */
  async getCurrentLocation(config?: Partial<LocationServiceConfig>): Promise<LocationData> {
    const finalConfig = { ...this.defaultConfig, ...config };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject({
          code: 3,
          message: 'Location request timed out',
          type: 'TIMEOUT' as const,
        });
      }, finalConfig.timeout);

      Geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          };

          this.lastLocation = location;
          console.log('Location obtained:', location);
          resolve(location);
        },
        (error) => {
          clearTimeout(timeoutId);
          console.error('Location error:', error);

          const locationError: LocationError = {
            code: error.code,
            message: error.message,
            type: this.mapErrorCode(error.code),
          };

          // Try to get cached location as fallback
          if (this.lastLocation) {
            console.log('Using cached location as fallback');
            resolve(this.lastLocation);
          } else {
            reject(locationError);
          }
        },
        {
          enableHighAccuracy: finalConfig.enableHighAccuracy,
          timeout: finalConfig.timeout,
          maximumAge: finalConfig.maximumAge,
          distanceFilter: finalConfig.distanceFilter,
          useSignificantChanges: finalConfig.useSignificantChanges,
        }
      );
    });
  }

  /**
   * Start watching location changes
   */
  startWatchingLocation(
    config?: Partial<LocationServiceConfig>,
    onLocation?: (location: LocationData) => void,
    onError?: (error: LocationError) => void
  ): void {
    if (this.isWatching) {
      console.warn('Location watching already started');
      return;
    }

    const finalConfig = { ...this.defaultConfig, ...config };

    this.watchId = Geolocation.watchPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          speed: position.coords.speed || undefined,
          timestamp: position.timestamp,
        };

        this.lastLocation = location;
        console.log('Location update:', location);

        // Call specific callback if provided
        if (onLocation) {
          onLocation(location);
        }

        // Call all registered callbacks
        this.locationCallbacks.forEach(callback => {
          try {
            callback(location);
          } catch (error) {
            console.error('Error in location callback:', error);
          }
        });
      },
      (error) => {
        console.error('Location watch error:', error);

        const locationError: LocationError = {
          code: error.code,
          message: error.message,
          type: this.mapErrorCode(error.code),
        };

        // Call specific error callback if provided
        if (onError) {
          onError(locationError);
        }

        // Call all registered error callbacks
        this.errorCallbacks.forEach(callback => {
          try {
            callback(locationError);
          } catch (error) {
            console.error('Error in location error callback:', error);
          }
        });
      },
      {
        enableHighAccuracy: finalConfig.enableHighAccuracy,
        timeout: finalConfig.timeout,
        maximumAge: finalConfig.maximumAge,
        distanceFilter: finalConfig.distanceFilter,
        useSignificantChanges: finalConfig.useSignificantChanges,
      }
    );

    this.isWatching = true;
    console.log('Started watching location with ID:', this.watchId);
  }

  /**
   * Stop watching location changes
   */
  stopWatchingLocation(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
      console.log('Stopped watching location');
    }
  }

  /**
   * Add location update callback
   */
  addLocationCallback(callback: (location: LocationData) => void): void {
    this.locationCallbacks.push(callback);
  }

  /**
   * Remove location update callback
   */
  removeLocationCallback(callback: (location: LocationData) => void): void {
    const index = this.locationCallbacks.indexOf(callback);
    if (index > -1) {
      this.locationCallbacks.splice(index, 1);
    }
  }

  /**
   * Add error callback
   */
  addErrorCallback(callback: (error: LocationError) => void): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Remove error callback
   */
  removeErrorCallback(callback: (error: LocationError) => void): void {
    const index = this.errorCallbacks.indexOf(callback);
    if (index > -1) {
      this.errorCallbacks.splice(index, 1);
    }
  }

  /**
   * Get last known location
   */
  getLastLocation(): LocationData | null {
    return this.lastLocation;
  }

  /**
   * Save location to cache
   */
  async saveLocationToCache(location: LocationData): Promise<void> {
    try {
      await AsyncStorage.setItem('lastLocation', JSON.stringify(location));
    } catch (error) {
      console.error('Error saving location to cache:', error);
    }
  }

  /**
   * Load location from cache
   */
  async loadLocationFromCache(): Promise<LocationData | null> {
    try {
      const cached = await AsyncStorage.getItem('lastLocation');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error loading location from cache:', error);
    }
    return null;
  }

  /**
   * Get fallback location (New York City)
   */
  getFallbackLocation(): LocationData {
    return {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 1000,
      timestamp: Date.now(),
    };
  }

  /**
   * Check if location is accurate enough
   */
  isLocationAccurate(location: LocationData, minAccuracy = 100): boolean {
    return location.accuracy <= minAccuracy;
  }

  /**
   * Calculate distance between two locations in meters
   */
  calculateDistance(loc1: LocationData, loc2: LocationData): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (loc1.latitude * Math.PI) / 180;
    const φ2 = (loc2.latitude * Math.PI) / 180;
    const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Map Geolocation error codes to our error types
   */
  private mapErrorCode(code: number): LocationError['type'] {
    switch (code) {
      case 1:
        return 'PERMISSION_DENIED';
      case 2:
        return 'POSITION_UNAVAILABLE';
      case 3:
        return 'TIMEOUT';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Initialize location service with permissions check
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing LocationService...');

      // Check permissions
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        console.log('Requesting location permissions...');
        const granted = await this.requestPermissions();
        if (!granted) {
          console.warn('Location permissions denied');
          return false;
        }
      }

      // Try to load cached location
      const cachedLocation = await this.loadLocationFromCache();
      if (cachedLocation) {
        this.lastLocation = cachedLocation;
        console.log('Loaded cached location:', cachedLocation);
      }

      console.log('LocationService initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing LocationService:', error);
      return false;
    }
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    this.stopWatchingLocation();
    this.locationCallbacks = [];
    this.errorCallbacks = [];
    this.lastLocation = null;
  }
}

// Export singleton instance
export const locationService = LocationService.getInstance();
export default locationService;