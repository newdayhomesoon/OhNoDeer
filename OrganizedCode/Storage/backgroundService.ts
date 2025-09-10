import PushNotification from 'react-native-push-notification';
import Sound from 'react-native-sound';
import Tts from 'react-native-tts';
import {Platform, PermissionsAndroid, AppState} from 'react-native';
import {SimpleLocation, Hotspot} from '../CoreLogic/types';
// import WildlifeReportsService from './wildlifeReportsService'; // REMOVED TO BREAK CIRCULAR DEPENDENCY

declare const __DEV__: boolean;

class SimpleBackgroundService {
  private isInitialized = false;
  private alertSound: Sound | null = null;
  private userIsPro = false;
  private locationWatchId: number | null = null;
  private appStateSubscription: any = null;
  private currentLocation: SimpleLocation | null = null;
  private geofenceCheckInterval: number | null = null;

  constructor() {
    this.initializeSound();
    this.initializeTTS();
    this.setupAppStateHandling();
  }

  private async initializeSound() {
    this.alertSound = new Sound(
      'alert_chime.mp3',
      Sound.MAIN_BUNDLE,
      (error: any) => {
        if (error) {
          console.log('Failed to load alert sound', error);
        }
      },
    );
  }

  private initializeTTS() {
    Tts.setDefaultLanguage('en-US');
    Tts.setDefaultRate(0.5);
    Tts.setDefaultPitch(1.0);
  }

  private setupAppStateHandling() {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  async initialize(userIsPro: boolean = false): Promise<boolean> {
    console.log('Initializing simple background service...');
    
    if (this.isInitialized) {
      return true;
    }

    this.userIsPro = userIsPro;

    try {
      // Initialize push notifications
      this.configurePushNotifications();

      // Request location permissions
      const hasPermission = await this.requestLocationPermissions();
      if (hasPermission) {
        this.startLocationMonitoring();
      } else {
        console.warn('Location permission denied - limited functionality');
      }

      this.isInitialized = true;
      console.log('Simple background service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize background service:', error);
      // Still mark as initialized to prevent app crash
      this.isInitialized = true;
      return false;
    }
  }

  private async requestLocationPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        ]);

        return (
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
            PermissionsAndroid.RESULTS.GRANTED ||
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (error) {
        console.error('Permission request failed:', error);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  }

  private configurePushNotifications() {
    PushNotification.configure({
      onRegister: (token: {os: string; token: string}) => {
        console.log('Push notification token:', token);
      },
      onNotification: (notification: any) => {
        console.log('Notification received:', notification);
        if (notification.finish) {
          notification.finish();
        }
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: true,
    });

    // Create notification channel for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel({
        channelId: 'wildlife-alerts',
        channelName: 'Wildlife Alerts',
        channelDescription: 'Notifications for nearby wildlife activity',
        soundName: 'default',
        importance: 4,
        vibrate: true,
      });
    }
  }

  private startLocationMonitoring() {
    if (this.locationWatchId !== null) {
      return; // Already monitoring
    }

    console.log('Starting location monitoring...');
    
    // Temporarily disabled for app startup - geolocation package not linked
    // this.locationWatchId = Geolocation.watchPosition(
    //   (position) => {
    //     const location: SimpleLocation = {
    //       latitude: position.coords.latitude,
    //       longitude: position.coords.longitude,
    //       accuracy: position.coords.accuracy || 0,
    //       timestamp: position.timestamp,
    //     };
    //     this.onLocationUpdate(location);
    //   },
    //   (error) => {
    //     console.warn('Location watch error:', error);
    //   },
    //   {
    //     enableHighAccuracy: false,
    //     distanceFilter: 100,
    //     maximumAge: 60000,
    //     timeout: 30000,
    //   }
    // );

    // Start geofence checking if Pro user
    if (this.userIsPro) {
      this.startGeofenceMonitoring();
    }
  }

  private stopLocationMonitoring() {
    if (this.locationWatchId !== null) {
      // Geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
      this.locationWatchId = null;
      console.log('Location monitoring stopped');
    }
  }

  private onLocationUpdate(location: SimpleLocation) {
    this.currentLocation = location;
    console.log('Location updated:', location.latitude, location.longitude);
    
    // Only check for hotspots if Pro user
    if (this.userIsPro) {
      this.checkNearbyHotspots(location);
    }
  }

  private startGeofenceMonitoring() {
    if (this.geofenceCheckInterval) {
      return; // Already monitoring
    }

    console.log('Starting geofence monitoring for Pro user...');
    
    // Check every 2 minutes for nearby hotspots
    this.geofenceCheckInterval = setInterval(() => {
      if (this.currentLocation) {
        this.checkNearbyHotspots(this.currentLocation);
      }
    }, 120000) as any; // 2 minutes
  }

  private stopGeofenceMonitoring() {
    if (this.geofenceCheckInterval) {
      clearInterval(this.geofenceCheckInterval);
      this.geofenceCheckInterval = null;
      console.log('Geofence monitoring stopped');
    }
  }

  private async checkNearbyHotspots(location: SimpleLocation) {
    try {
      // Temporarily disabled - circular dependency fix
      // const result = await WildlifeReportsService.getNearbyHotspots(
      //   location.latitude,
      //   location.longitude
      // );
      const result = { hotspots: [], count: 0 }; // Placeholder

      if (result.hotspots && result.hotspots.length > 0) {
        const closestHotspot = result.hotspots[0];
        this.handleHotspotAlert(closestHotspot);
      }
    } catch (error) {
      console.warn('Failed to check nearby hotspots:', error);
    }
  }

  private handleHotspotAlert(hotspot: Hotspot) {
    const alertMessage = `Wildlife Alert: Entering area with ${hotspot.reportCount} recent wildlife reports`;

    // Send push notification
    this.sendPushNotification('Wildlife Hotspot Alert', alertMessage);

    // Play audio alert based on subscription
    if (this.userIsPro) {
      this.playVoiceAlert(alertMessage);
    } else {
      this.playAudioChime();
    }

    console.log('Hotspot alert triggered:', hotspot.id);
  }

  private sendPushNotification(title: string, message: string) {
    PushNotification.localNotification({
      channelId: 'wildlife-alerts',
      title,
      message,
      playSound: true,
      soundName: 'default',
      importance: 'high' as const,
      priority: 'high' as const,
    });
  }

  private playAudioChime() {
    if (this.alertSound) {
      this.alertSound.play((success: boolean) => {
        if (!success) {
          console.log('Audio playback failed');
        }
      });
    }
  }

  private async playVoiceAlert(message: string) {
    try {
      await Tts.speak(message);
    } catch (error) {
      console.error('TTS failed:', error);
      // Fallback to audio chime
      this.playAudioChime();
    }
  }

  private handleAppStateChange(nextAppState: string) {
    if (nextAppState === 'active') {
      // App came to foreground
      if (!this.locationWatchId && this.isInitialized) {
        this.startLocationMonitoring();
      }
    } else if (nextAppState === 'background') {
      // App went to background - keep monitoring if Pro user
      if (!this.userIsPro) {
        this.stopLocationMonitoring();
      }
    }
  }

  async updateUserSubscription(isPro: boolean) {
    const wasProBefore = this.userIsPro;
    this.userIsPro = isPro;
    
    console.log('User subscription updated:', isPro ? 'Pro' : 'Free');
    
    if (isPro && !wasProBefore) {
      // Upgraded to Pro - start geofence monitoring
      this.startGeofenceMonitoring();
    } else if (!isPro && wasProBefore) {
      // Downgraded from Pro - stop geofence monitoring
      this.stopGeofenceMonitoring();
    }
  }

  async stopService() {
    console.log('Stopping background service...');
    
    this.stopLocationMonitoring();
    this.stopGeofenceMonitoring();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    this.isInitialized = false;
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isPro: this.userIsPro,
      hasLocationWatch: this.locationWatchId !== null,
      hasGeofenceMonitoring: this.geofenceCheckInterval !== null,
      currentLocation: this.currentLocation,
    };
  }
}

export const backgroundService = new SimpleBackgroundService();
