declare module 'react-native-background-geolocation' {
  export interface Location {
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number;
      speed: number;
      heading: number;
      altitude: number;
    };
    timestamp: string;
    mocked?: boolean;
  }

  export interface GeofenceEvent {
    action: 'ENTER' | 'EXIT';
    identifier: string;
    location: Location;
  }

  export interface GeofenceRegion {
    identifier: string;
    latitude: number;
    longitude: number;
    radius: number;
    notifyOnEntry: boolean;
    notifyOnExit: boolean;
  }

  export const LOG_LEVEL_VERBOSE: number;
  export const DESIRED_ACCURACY_HIGH: number;

  export interface ReadyConfig {
    desiredAccuracy?: number;
    distanceFilter?: number;
    stopTimeout?: number;
    debug?: boolean;
    logLevel?: number;
    stopOnTerminate?: boolean;
    startOnBoot?: boolean;
    enableHeadless?: boolean;
    locationAuthorizationRequest?: string;
    allowIdenticalLocations?: boolean;
    foregroundService?: boolean;
    notificationTitle?: string;
    notificationText?: string;
    notificationIconColor?: string;
  }

  export default class BackgroundGeolocation {
    static ready(config: ReadyConfig): Promise<void>;
    static start(): Promise<void>;
    static stop(): Promise<void>;
    static onLocation(callback: (location: Location) => void): void;
    static onGeofence(callback: (event: GeofenceEvent) => void): void;
    static addGeofence(region: GeofenceRegion): Promise<void>;
    static removeGeofence(identifier: string): Promise<void>;
    static getCurrentPosition(): Promise<Location>;
  }
}
