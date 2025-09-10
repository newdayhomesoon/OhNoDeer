declare module '@react-native-community/geolocation' {
  export interface GeolocationOptions {
    timeout?: number;
    maximumAge?: number;
    enableHighAccuracy?: boolean;
    distanceFilter?: number;
    useSignificantChanges?: boolean;
  }

  export interface GeolocationCoordinates {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy: number;
    altitudeAccuracy?: number;
    heading?: number;
    speed?: number;
  }

  export interface GeolocationPosition {
    coords: GeolocationCoordinates;
    timestamp: number;
  }

  export interface GeolocationError {
    code: number;
    message: string;
    PERMISSION_DENIED: number;
    POSITION_UNAVAILABLE: number;
    TIMEOUT: number;
  }

  export function getCurrentPosition(
    success: (position: GeolocationPosition) => void,
    error?: (error: GeolocationError) => void,
    options?: GeolocationOptions
  ): void;

  export function watchPosition(
    success: (position: GeolocationPosition) => void,
    error?: (error: GeolocationError) => void,
    options?: GeolocationOptions
  ): number;

  export function clearWatch(watchId: number): void;

  export function stopObserving(): void;

  const Geolocation: {
    getCurrentPosition: typeof getCurrentPosition;
    watchPosition: typeof watchPosition;
    clearWatch: typeof clearWatch;
    stopObserving: typeof stopObserving;
  };

  export default Geolocation;
}
