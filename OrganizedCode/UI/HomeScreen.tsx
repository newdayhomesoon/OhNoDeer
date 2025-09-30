import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Modal,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMessageModal } from './useMessageModal';
import AnimalSelectionModal from './AnimalSelectionModal';
import QuantitySelectionModal from './QuantitySelectionModal';
import QuantityUpdateModal from './QuantityUpdateModal';
import SubscriptionScreen from './SubscriptionScreen';
// import AdBanner from './AdBanner'; // Temporarily disabled
import WildlifeMap from './WildlifeMap';
import ErrorBoundary from './ErrorBoundary';
import DebugStorageScreen from './DebugStorageScreen';
import {auth, getCurrentUser, onAuthStateChange, createUserProfile} from '../Storage/firebase/service';
import {
  WildlifeReportsService,
  AuthService,
} from '../Storage/wildlifeReportsService';
import {AnimalType, SightingReport, Location} from '../CoreLogic/types';
import {backgroundService} from '../Storage/backgroundService';
// import {voiceCommandService} from '../Storage/voiceCommandService'; // Temporarily disabled
import {inAppPurchaseService} from '../Storage/inAppPurchaseService';
// import {adService} from '../Storage/adService'; // Temporarily disabled
import {locationService, LocationData, LocationError} from '../Storage/locationService';
import { theme } from '../../src/app-theme';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from '../Storage/firebase/credentials';
import {appleAuth} from '@invertase/react-native-apple-authentication';
import {
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';

type HomeScreenProps = {
  onLogout: () => void;
};

export default function HomeScreen({onLogout}: HomeScreenProps) {
  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showQuantityUpdateModal, setShowQuantityUpdateModal] = useState(false);
  const [showSubscriptionScreen, setShowSubscriptionScreen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalType | null>(null);
  const [recentSightings, setRecentSightings] = useState<SightingReport[]>([]);
  const [activeTab, setActiveTab] = useState<'map' | 'sightings' | 'profile' | 'profile_info' | 'settings' | 'help'>('map');
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<LocationError | null>(null);
  const [locationServiceInitialized, setLocationServiceInitialized] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [lastReportId, setLastReportId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [servicesInitialized, setServicesInitialized] = useState(false);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [profileInfoTab, setProfileInfoTab] = useState<'details' | 'data' | 'security'>('details');
  const [userName, setUserName] = useState('Guest');
  const [userEmail, setUserEmail] = useState('guest@example.com');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sightingsUnsubscribe, setSightingsUnsubscribe] = useState<(() => void) | null>(null);
  const [animalCounters, setAnimalCounters] = useState({
    deer: 0,
    bear: 0,
    moose_elk: 0,
    raccoon: 0,
    rabbit: 0,
    small_mammals: 0,
  });
  
  // Settings state variables
  const [settingsTab, setSettingsTab] = useState<'preferences' | 'notifications' | 'privacy' | 'about'>('preferences');
  const [locationAccessEnabled, setLocationAccessEnabled] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [units, setUnits] = useState<'miles' | 'kilometers'>('miles');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [newSightingsNotifications, setNewSightingsNotifications] = useState(true);
  const [promotionalNotifications, setPromotionalNotifications] = useState(true);
  const [appUpdateNotifications, setAppUpdateNotifications] = useState(true);
  const [notificationRadius, setNotificationRadius] = useState(5);
  const [anonymousSightings, setAnonymousSightings] = useState(false);

  // Help state variables
  const [helpTab, setHelpTab] = useState<'contact' | 'faq'>('contact');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDebugStorage, setShowDebugStorage] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailMode, setEmailMode] = useState<'login' | 'create'>('login');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalAuthError, setGeneralAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { showMessage } = useMessageModal();

  // Helper functions for caching sightings data
  const saveSightingsToCache = async (sightings: SightingReport[]) => {
    try {
      const cacheData = {
        sightings,
        timestamp: Date.now(),
        userId: getCurrentUser()?.uid
      };
      await AsyncStorage.setItem('cachedSightings', JSON.stringify(cacheData));
      console.log('[DEBUG] Sightings cached successfully:', sightings.length);
    } catch (error) {
      console.warn('[DEBUG] Failed to cache sightings:', error);
    }
  };

  const loadSightingsFromCache = async (): Promise<SightingReport[] | null> => {
    try {
      const cachedData = await AsyncStorage.getItem('cachedSightings');
      if (!cachedData) return null;

      const parsed = JSON.parse(cachedData);
      const currentUserId = getCurrentUser()?.uid;

      // Check if cache is for current user and not too old (24 hours)
      if (parsed.userId === currentUserId && 
          Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        console.log('[DEBUG] Loaded valid cached sightings:', parsed.sightings.length);
        return parsed.sightings;
      } else {
        console.log('[DEBUG] Cached sightings expired or for different user, clearing cache');
        await AsyncStorage.removeItem('cachedSightings');
        return null;
      }
    } catch (error) {
      console.warn('[DEBUG] Failed to load cached sightings:', error);
      return null;
    }
  };

  const saveCountersToCache = async (counters: typeof animalCounters) => {
    try {
      const cacheData = {
        counters,
        timestamp: Date.now(),
        userId: getCurrentUser()?.uid
      };
      await AsyncStorage.setItem('cachedCounters', JSON.stringify(cacheData));
      console.log('[DEBUG] Counters cached successfully');
    } catch (error) {
      console.warn('[DEBUG] Failed to cache counters:', error);
    }
  };

  const loadCountersFromCache = async (): Promise<typeof animalCounters | null> => {
    try {
      const cachedData = await AsyncStorage.getItem('cachedCounters');
      if (!cachedData) return null;

      const parsed = JSON.parse(cachedData);
      const currentUserId = getCurrentUser()?.uid;

      // Check if cache is for current user and not too old (24 hours)
      if (parsed.userId === currentUserId && 
          Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        console.log('[DEBUG] Loaded valid cached counters');
        return parsed.counters;
      } else {
        console.log('[DEBUG] Cached counters expired or for different user, clearing cache');
        await AsyncStorage.removeItem('cachedCounters');
        return null;
      }
    } catch (error) {
      console.warn('[DEBUG] Failed to load cached counters:', error);
      return null;
    }
  };

  // Removed: useEffect for sightings tab

  useEffect(() => {
    // Defer service initialization slightly to isolate crashes unrelated to mount/render
    const timer = setTimeout(() => {
      initializeServices();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

    const initializeServices = async () => {
    try {
      console.log('[Init] Starting service initialization...');

      // Initialize location service first
      console.log('[Init] locationService.initialize:start');
      const locationInitialized = await locationService.initialize();
      if (locationInitialized) {
        console.log('[Init] locationService.initialize:success');
        setLocationServiceInitialized(true);

        // Try to get initial location
        try {
          const initialLocation = await locationService.getCurrentLocation();
          setCurrentLocation(initialLocation);
          console.log('[Init] Initial location obtained:', initialLocation);
        } catch (locationErr) {
          console.warn('[Init] Could not get initial location:', locationErr);
          // Try cached location
          const cachedLocation = await locationService.loadLocationFromCache();
          if (cachedLocation) {
            setCurrentLocation(cachedLocation);
            console.log('[Init] Using cached location:', cachedLocation);
          } else {
            // Use fallback location
            const fallbackLocation = locationService.getFallbackLocation();
            setCurrentLocation(fallbackLocation);
            console.log('[Init] Using fallback location:', fallbackLocation);
          }
        }
      } else {
        console.warn('[Init] Location service initialization failed');
        // Use fallback location
        const fallbackLocation = locationService.getFallbackLocation();
        setCurrentLocation(fallbackLocation);
      }

      // Ad service temporarily disabled
      console.log('[Init] adService.initialize:skipped');

      // Initialize in-app purchase service (non-critical)
      try {
        console.log('[Init] inAppPurchaseService.initialize:start');
        await inAppPurchaseService.initialize();
        console.log('[Init] inAppPurchaseService.initialize:success');
      } catch (iapError) {
        console.warn('[Init] In-app purchase service initialization failed:', iapError);
      }

      // Check subscription status (non-critical)
      try {
        console.log('[Init] checkSubscriptionStatus:start');
        await checkSubscriptionStatus();
        console.log('[Init] checkSubscriptionStatus:success');
      } catch (subError) {
        console.warn('[Init] Subscription status check failed:', subError);
      }

      // Voice command service temporarily disabled
      console.log('[Init] voiceCommandService.initialize:skipped');

      // Initialize background service with Pro status (now using simple service)
      try {
        console.log('[Init] backgroundService.initialize:start');
        const backgroundInitialized = await backgroundService.initialize(isPro);
        if (backgroundInitialized) {
          console.log('[Init] backgroundService.initialize:success');
        } else {
          console.log('[Init] backgroundService.initialize:limited-mode');
        }
      } catch (backgroundError) {
        console.error('[Init] Background service initialization failed:', backgroundError);
        // Don't block the UI - continue with limited functionality
      }

      // Mark services as initialized
      setServicesInitialized(true);
      console.log('[Init] All services initialization completed');
    } catch (error) {
      console.error('[Init] Critical error during service initialization:', error);
      // Still set initialized to true to prevent gray screen
      setServicesInitialized(true);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const status = await inAppPurchaseService.getSubscriptionStatus();
      setIsPro(status.isPro);

      // Update background service with Pro status
      if (servicesInitialized) {
        await backgroundService.updateUserSubscription(status.isPro);
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  const requestLocationPermission = useCallback(async () => {
    try {
      console.log('Requesting location permission...');
      setIsRequestingLocation(true);

      const hasPermission = await locationService.checkPermissions();
      if (!hasPermission) {
        const granted = await locationService.requestPermissions();
        if (!granted) {
          showMessage({
            type: 'error',
            title: 'Location Permission Required',
            message: 'This app needs location access to report wildlife sightings. Please enable location permissions in your device settings.',
            buttons: [{ text: 'OK', onPress: () => {} }]
          });
          setLocationError({
            code: 1,
            message: 'Location permission denied',
            type: 'PERMISSION_DENIED',
          });
          return;
        }
      }

      // Try to get current location
      try {
        const location = await locationService.getCurrentLocation();
        setCurrentLocation(location);
        setLocationError(null);
        console.log('Location permission granted and location obtained:', location);
      } catch (locationErr) {
        console.error('Error getting location after permission granted:', locationErr);
        setLocationError(locationErr as LocationError);

        // Try cached location
        const cachedLocation = await locationService.loadLocationFromCache();
        if (cachedLocation) {
          setCurrentLocation(cachedLocation);
          console.log('Using cached location:', cachedLocation);
        } else {
          // Use fallback
          const fallbackLocation = locationService.getFallbackLocation();
          setCurrentLocation(fallbackLocation);
          console.log('Using fallback location:', fallbackLocation);
        }
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationError({
        code: 1,
        message: 'Failed to request location permission',
        type: 'PERMISSION_DENIED',
      });
    } finally {
      setIsRequestingLocation(false);
    }
  }, []);

  useEffect(() => {
    if (locationServiceInitialized) {
      requestLocationPermission();
    }
  }, [locationServiceInitialized, requestLocationPermission]);

  useEffect(() => {
    if (activeTab === 'sightings') {
      loadRecentSightings();
    }
  }, [activeTab]);

  // Load sightings data when viewing profile data tab
  useEffect(() => {
    if (activeTab === 'profile_info' && profileInfoTab === 'data') {
      loadRecentSightings();
    }
  }, [activeTab, profileInfoTab]);

  // Load settings from AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await AsyncStorage.getItem('appSettings');
        if (settings) {
          const parsedSettings = JSON.parse(settings);
          setLocationAccessEnabled(parsedSettings.locationAccessEnabled ?? true);
          setShowLegend(parsedSettings.showLegend ?? true);
          setUnits(parsedSettings.units ?? 'miles');
          setNotificationsEnabled(parsedSettings.notificationsEnabled ?? true);
          setNewSightingsNotifications(parsedSettings.newSightingsNotifications ?? true);
          setPromotionalNotifications(parsedSettings.promotionalNotifications ?? true);
          setAppUpdateNotifications(parsedSettings.appUpdateNotifications ?? true);
          setNotificationRadius(parsedSettings.notificationRadius ?? 5);
          setAnonymousSightings(parsedSettings.anonymousSightings ?? false);
        }
      } catch (error) {
        console.warn('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Configure Google Sign-In
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  // Load user profile when authentication state changes
  useEffect(() => {
    const loadUserProfile = async (user?: any) => {
      console.log('loadUserProfile called with user:', user?.uid);
      const currentUser = user || getCurrentUser();
      console.log('Current user for profile load:', currentUser?.uid, currentUser?.email, currentUser?.isAnonymous);
      if (currentUser) {
        try {
          // Load user profile from Firestore using UID
          const profile = await WildlifeReportsService.getUserProfile(currentUser.uid);
          console.log('User profile loaded:', profile);
          if (profile) {
            setUserName(currentUser.displayName || currentUser.email?.split('@')[0] || 'User');
            setUserEmail(currentUser.email || profile.email || 'No email');
          } else {
            setUserName(currentUser.displayName || currentUser.email?.split('@')[0] || 'User');
            setUserEmail(currentUser.email || 'No email');
          }
          
          // Load cached counters first for immediate UI update
          const cachedCounters = await loadCountersFromCache();
          if (cachedCounters) {
            console.log('Using cached counters:', cachedCounters);
            setAnimalCounters(cachedCounters);
          }
          
          // Load sightings after user is authenticated
          console.log('Loading sightings after auth...');
          await loadRecentSightings();
        } catch (error) {
          console.warn('Failed to load user profile:', error);
          setUserName(currentUser.displayName || currentUser.email?.split('@')[0] || 'User');
          setUserEmail(currentUser.email || 'No email');
        }
      } else {
        console.log('No user, clearing data');
        setUserName('Guest');
        setUserEmail('guest@example.com');
        setRecentSightings([]);
        setAnimalCounters({
          deer: 0,
          bear: 0,
          moose_elk: 0,
          raccoon: 0,
          rabbit: 0,
          small_mammals: 0,
        });
      }
    };

    // Listen for authentication state changes
    const unsubscribe = onAuthStateChange((user) => {
      console.log('Auth state changed - User:', user?.uid, user?.email, user?.isAnonymous);
      setIsAnonymous(user?.isAnonymous || false);
      loadUserProfile(user);
    });
    return unsubscribe;
  }, []);

  // Save settings to AsyncStorage
  const saveSettings = async (newSettings: any) => {
    try {
      const currentSettings = {
        locationAccessEnabled,
        showLegend,
        units,
        notificationsEnabled,
        newSightingsNotifications,
        promotionalNotifications,
        appUpdateNotifications,
        notificationRadius,
        anonymousSightings,
        ...newSettings,
      };
      await AsyncStorage.setItem('appSettings', JSON.stringify(currentSettings));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  };

  const getCurrentLocation = useCallback(async () => {
    if (!locationServiceInitialized) {
      console.warn('Location service not initialized');
      return;
    }

    try {
      console.log('Getting current location...');
      setIsRequestingLocation(true);

      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
      setLocationError(null);

      // Save to cache
      await locationService.saveLocationToCache(location);

      console.log('Current location obtained:', location);
    } catch (error) {
      console.error('Error getting current location:', error);
      setLocationError(error as LocationError);

      // Try cached location as fallback
      const cachedLocation = await locationService.loadLocationFromCache();
      if (cachedLocation) {
        setCurrentLocation(cachedLocation);
        console.log('Using cached location as fallback:', cachedLocation);
      } else {
        // Use fallback location
        const fallbackLocation = locationService.getFallbackLocation();
        setCurrentLocation(fallbackLocation);
        console.log('Using fallback location:', fallbackLocation);
      }
    } finally {
      setIsRequestingLocation(false);
    }
  }, [locationServiceInitialized]);

  const loadRecentSightings = async () => {
    try {
      console.log('[DEBUG] loadRecentSightings called');
      const user = getCurrentUser();
      console.log('[DEBUG] Current user:', user?.uid, user?.email, user?.isAnonymous);
      if (!user) {
        console.log('[DEBUG] No authenticated user, skipping sightings load');
        setRecentSightings([]);
        return;
      }

      console.log('[DEBUG] User authenticated, fetching recent sightings from all users...');
      // Temporarily use getRecentSightings with time filter instead of getMostRecentSightings
      const sightings = await WildlifeReportsService.getRecentSightings(24, currentLocation ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
      } : undefined);
      // Limit to 5 most recent in UI for now
      const limitedSightings = sightings.slice(0, 5);
      console.log('[DEBUG] Raw sightings data from service:', limitedSightings);
      console.log('[DEBUG] Number of sightings loaded:', limitedSightings.length);
      
      // Log each sighting for debugging
      limitedSightings.forEach((sighting, index) => {
        console.log(`[DEBUG] Sighting ${index}:`, {
          id: sighting.id,
          type: sighting.type,
          quantity: sighting.quantity,
          timestamp: sighting.timestamp,
          location: sighting.location,
          reportedBy: sighting.reportedBy
        });
      });
      
      setRecentSightings(limitedSightings);
      // Cache the sightings data
      await saveSightingsToCache(limitedSightings);
      console.log('[DEBUG] Recent sightings state updated and cached:', limitedSightings);
      
      // Calculate animal counters based on user's own reports (get all reports for accurate counting)
      const userSightings = await WildlifeReportsService.getUserReports(1000);
      const counters = { 
        deer: 0, 
        bear: 0, 
        moose_elk: 0, 
        raccoon: 0, 
        rabbit: 0, 
        small_mammals: 0 
      };
      userSightings.forEach(sighting => {
        console.log('[DEBUG] Processing sighting for counters:', sighting.type, sighting.quantity);
        if (sighting.type in counters) {
          counters[sighting.type] += sighting.quantity;
        }
      });
      console.log('[DEBUG] Calculated animal counters:', counters);
      setAnimalCounters(counters);
      // Cache the counters
      await saveCountersToCache(counters);
    } catch (error) {
      console.error('[DEBUG] Error loading recent sightings:', error);
      // Try to use cached data as fallback
      const cachedSightings = await loadSightingsFromCache();
      if (cachedSightings && cachedSightings.length > 0) {
        console.log('[DEBUG] Using cached sightings as fallback');
        setRecentSightings(cachedSightings);
      } else {
        setRecentSightings([]);
      }
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'Failed to load recent sightings. Please check your connection and try again.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    }
  };

  // Set up real-time listener for recent sightings
  useEffect(() => {
    const setupSightingsListener = async () => {
      try {
        console.log('[DEBUG] Setting up real-time sightings listener');
        const { collection, query, orderBy, limit, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('../Storage/firebase/service');

        const q = query(
          collection(db, 'wildlife_reports'),
          orderBy('timestamp', 'desc'),
          limit(5)  // Show 5 most recent sightings
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          console.log('[DEBUG] Real-time sightings update received');
          const sightings: SightingReport[] = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            sightings.push({
              id: doc.id,
              type: data.type,
              quantity: data.quantity,
              location: data.location,
              timestamp: data.timestamp,
              reportedBy: data.reportedBy
            });
          });

          console.log('[DEBUG] Real-time sightings loaded:', sightings.length);
          setRecentSightings(sightings);
          
          // Cache the sightings data
          saveSightingsToCache(sightings);
        }, (error) => {
          console.error('[DEBUG] Real-time sightings listener error:', error);
          // Try to use cached data as fallback
          loadSightingsFromCache().then(cachedSightings => {
            if (cachedSightings && cachedSightings.length > 0) {
              console.log('[DEBUG] Using cached sightings as fallback');
              setRecentSightings(cachedSightings);
            }
          });
        });

        setSightingsUnsubscribe(() => unsubscribe);
        console.log('[DEBUG] Real-time sightings listener set up successfully');
      } catch (error) {
        console.error('[DEBUG] Error setting up sightings listener:', error);
      }
    };

    setupSightingsListener();

    // Cleanup function
    return () => {
      if (sightingsUnsubscribe) {
        console.log('[DEBUG] Cleaning up sightings listener');
        sightingsUnsubscribe();
        setSightingsUnsubscribe(null);
      }
    };
  }, []);

  const handleReportPress = async () => {
    // Open animal selection modal instead of submitting immediately
    setShowAnimalModal(true);
  };

  const handleAnimalSelect = async (animal: AnimalType) => {
    setSelectedAnimal(animal);
    setShowAnimalModal(false);

    setShowQuantityModal(true);
  };

  const handleQuantitySelect = async (quantity: number) => {
    if (!selectedAnimal) {
      return;
    }
    await handleSaveSighting(selectedAnimal, quantity);
    setShowQuantityModal(false);
    setSelectedAnimal(null);
  };

  const handleSaveSighting = async (
    animalType: AnimalType,
    quantity: number,
  ) => {
    console.log('[DEBUG] handleSaveSighting called with:', { animalType, quantity });

    try {
      // Prepare location data for the report
      if (!currentLocation) {
        console.log('[DEBUG] No current location available');
        showMessage({
          type: 'error',
          title: 'Location Error',
          message: 'Unable to get your current location. Please ensure location services are enabled and try again.',
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
        return;
      }

      const locationForReport = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
      };

      console.log('[DEBUG] Submitting report:', { animalType, locationForReport, quantity });

      // Check authentication status
      const user = getCurrentUser();
      console.log('[DEBUG] Current user before submission:', {
        uid: user?.uid,
        email: user?.email,
        isAnonymous: user?.isAnonymous,
        exists: !!user
      });

      if (!user) {
        console.log('[DEBUG] No authenticated user, cannot submit report');
        showMessage({
          type: 'error',
          title: 'Authentication Error',
          message: 'You must be logged in to report sightings.',
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
        return;
      }

      const reportId = await WildlifeReportsService.submitReport(
        animalType,
        locationForReport,
        quantity,
      );

      console.log('[DEBUG] Report submission result:', { reportId });

      if (reportId) {
        console.log('[DEBUG] Report submitted successfully, reloading sightings...');
        // Reload sightings and counters from backend to ensure UI/profile are up to date
        await loadRecentSightings();
        console.log('[DEBUG] Sightings and counters reloaded after report');
        setActiveTab('sightings');

        showMessage({
          type: 'success',
          title: 'Report Submitted!',
          message: `Your ${animalType} sighting has been reported successfully.`,
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
      } else {
        console.log('[DEBUG] Report submission failed, no ID returned');
        showMessage({
          type: 'error',
          title: 'Submission Failed',
          message: 'Failed to submit report. Please try again.',
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
      }
    } catch (error) {
      console.error('[DEBUG] Error in handleSaveSighting:', error);
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'Failed to submit report. Please check your connection and try again.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    }
  };

  const handleQuantityUpdate = async (selectedAnimalType: AnimalType, quantity: number) => {
    // This function is called from QuantityUpdateModal to provide additional details
    // after an initial report has been submitted. It should NOT create a new report.
    
    // Update animal counters for the profile data with the additional details
    setAnimalCounters(prev => ({
      ...prev,
      [selectedAnimalType]: prev[selectedAnimalType] + quantity,
    }));

    // Show confirmation that additional details were recorded
    showMessage({
      type: 'success',
      title: 'Details Updated!',
      message: `Additional ${quantity} ${selectedAnimalType}${quantity > 1 ? 's' : ''} recorded.`,
      buttons: [{ text: 'OK', onPress: () => {} }]
    });

    setShowQuantityUpdateModal(false);
    setLastReportId(null);
  };

  const handleSkipQuantityUpdate = () => {
    setShowQuantityUpdateModal(false);
    setLastReportId(null);
  };

  const handleLogout = async () => {
    try {
      // Sign out from Firebase
      await auth.signOut();
      
      // Call the parent logout handler
      onLogout();
    } catch (error) {
      console.warn('Error during logout:', error);
      // Still call logout even if there's an error
      onLogout();
    }
  };

  const handleUpgradePress = () => {
    setShowSubscriptionScreen(true);
  };

  const handleGuestLogin = () => {
    setShowGuestModal(true);
  };

  const confirmGuestLogin = async () => {
    setShowGuestModal(false);
    setLoading(true);
    try {
      // Sign in anonymously using the service (ensures persistence is set)
      const success = await AuthService.signInAnonymously();
      if (success) {
        setShowLoginModal(false);
        // Reload user profile and sightings
        await loadRecentSightings();
      } else {
        showMessage({
          type: 'error',
          title: 'Sign In Failed',
          message: 'Failed to sign in. Please try again.',
        });
      }
    } catch (error) {
      showMessage({
        type: 'error',
        title: 'Sign In Failed',
        message: 'Failed to sign in. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      if (!GOOGLE_WEB_CLIENT_ID || GOOGLE_WEB_CLIENT_ID.startsWith('your-google-web-client-id')) {
        throw new Error('Google Web Client ID is not configured');
      }
      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();

      // Sign in with Google
      const {idToken} = await GoogleSignin.signIn();

      // Create Firebase credential
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign in to Firebase
      const result = await signInWithCredential(auth, googleCredential);

      // Create user profile in Firestore
      await createUserProfile(result.user.uid, result.user.email || '');

      setShowLoginModal(false);
      // Reload user profile and sightings
      await loadRecentSightings();
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      showMessage({
        type: 'error',
        title: 'Google Sign-In Failed',
        message: 'Google sign-in failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (!appleAuth.isSupported) {
      showMessage({
        type: 'warning',
        title: 'Not Supported',
        message: 'Apple Sign-In is not supported on this device',
      });
      return;
    }

    setLoading(true);
    try {
      // Start Apple sign-in
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      // Create Firebase credential
      const {identityToken, nonce} = appleAuthRequestResponse;
      if (!identityToken) {
        throw new Error('Apple identity token missing');
      }
      const appleCredential = new OAuthProvider('apple.com').credential({
        idToken: identityToken, // identityToken is non-null after guard
        rawNonce: nonce || undefined,
      });

      // Sign in to Firebase
      const result = await signInWithCredential(auth, appleCredential);

      // Create user profile in Firestore
      await createUserProfile(result.user.uid, result.user.email || '');

      setShowLoginModal(false);
      // Reload user profile and sightings
      await loadRecentSightings();
    } catch (error: any) {
      console.error('Apple sign-in error:', error);
      if (error.code !== appleAuth.Error.CANCELED) {
        showMessage({
          type: 'error',
          title: 'Apple Sign-In Failed',
          message: 'Apple sign-in failed. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const openEmailModal = () => {
    setShowEmailModal(true);
    setEmailMode('login');
  };

  const attemptEmailAuth = async () => {
    // Clear previous inline errors
    setEmailError('');
    setPasswordError('');
    setGeneralAuthError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      if (!trimmedEmail) setEmailError('Email is required');
      if (!password) setPasswordError('Password is required');
      return;
    }
    // Basic email regex (simple format validation)
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Invalid email format');
      return;
    }
    // Password validation rules
    const issues: string[] = [];
    if (password.length < 10 || password.length > 15) {
      issues.push('Password must be 10-15 characters long');
    }
    if (!/[0-9]/.test(password)) {
      issues.push('Include at least one number');
    }
    if (!/[@#$&]/.test(password)) {
      issues.push('Include at least one special character (@ # $ &)');
    }
    if (issues.length) {
      setPasswordError(issues.join('\n'));
      return;
    }
    setLoading(true);
    try {
      let userCred;
      if (emailMode === 'login') {
        try {
          userCred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        } catch (err: any) {
          if (err?.code === 'auth/user-not-found') {
            // Switch to create mode automatically
            setEmailMode('create');
            setGeneralAuthError('Account not found. Press Create to register.');
            return;
          }
          throw err;
        }
      } else {
        userCred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      }
      if (userCred) {
        await createUserProfile(userCred.user.uid, userCred.user.email || trimmedEmail);
        setShowEmailModal(false);
        setShowLoginModal(false);
        // Reload user profile and sightings
        await loadRecentSightings();
      }
    } catch (error: any) {
      console.error('Email auth error:', error);
      setGeneralAuthError(error?.message?.replace('Firebase:', '').trim() || 'Email authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    setEmailError('');
    setGeneralAuthError('');
    if (!email.trim()) {
      setEmailError('Enter your email to get a reset link');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setGeneralAuthError('Password reset email sent.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      setGeneralAuthError('Could not send reset email.');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatLocation = (latitude: number, longitude: number) => {
    // Convert coordinates to approximate street address format
    const lat = Math.abs(latitude);
    const lng = Math.abs(longitude);
    
    // Simple approximation: round to nearest 0.1 degree and create street-like name
    const latStreet = Math.round(lat * 10) / 10;
    const lngStreet = Math.round(lng * 10) / 10;
    
    // Create a simple street name based on coordinates
    const directions = [
      latitude >= 0 ? 'N' : 'S',
      longitude >= 0 ? 'E' : 'W'
    ];
    
    return `${directions[0]}${latStreet} ${directions[1]}${lngStreet} St`;
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2); // Last 2 digits of year
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  };

  const handleBackToAnimals = () => {
    setShowQuantityModal(false);
    setShowAnimalModal(true);
  };

  const handleLocationUpdate = useCallback((location: Location) => {
    // Convert Location to LocationData
    const locationData: LocationData = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy ?? 0, // Provide default value if undefined
      timestamp: Date.now(),
    };
    setCurrentLocation(locationData);
  }, []);

  return (
    <View style={styles.background}>
      <View style={styles.overlay}>
        <View style={styles.headerSection}>
          <Text style={styles.companyName}>Oh, No Deer</Text>
          <Text style={styles.motto}>
            Real-time wildlife collision prevention
          </Text>
        </View>

        <View style={styles.mapContainer}>
          {__DEV__ && (
            <TouchableOpacity style={styles.debugFloating} onPress={() => setShowDebugStorage(true)}>
              <Text style={{color: '#fff', fontSize: 12}}>DBG</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'map' ? (
            <View style={styles.mapWithAdsContainer}>
              {/* Fullscreen (enlarge) button */}
              <TouchableOpacity
                style={styles.fullscreenButton}
                onPress={() => setIsFullscreenMap(true)}
                accessibilityLabel="Expand map to fullscreen"
                testID="expandMapButton">
                <Text style={styles.fullscreenButtonText}>⛶</Text>
              </TouchableOpacity>
              <ErrorBoundary>
                <WildlifeMap
                  currentLocation={currentLocation ? {
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    accuracy: currentLocation.accuracy,
                  } : null}
                  onLocationUpdate={handleLocationUpdate}
                  showLegend={showLegend}
                />
              </ErrorBoundary>
              {/* AdBanner temporarily removed */}
            </View>
          ) : activeTab === 'sightings' ? (
            <View style={styles.sightingsContainer}>
              <View style={styles.sightingsHeader}>
                <Text style={styles.sectionTitle}>Recent Sightings</Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => {
                    console.log('Manual refresh triggered');
                    loadRecentSightings();
                  }}>
                  <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
                </TouchableOpacity>
              </View>
              {recentSightings.length > 0 ? (
                <ScrollView style={styles.sightingsList}>
                  {recentSightings.map((sighting, index) => (
                    <View key={index} style={styles.sightingItem}>
                      <Text style={styles.sightingText}>
                        {sighting.type.charAt(0).toUpperCase() + sighting.type.slice(1)}- {sighting.quantity} Reported, {formatLocation(sighting.location.latitude, sighting.location.longitude)}
                      </Text>
                      <Text style={styles.sightingDate}>
                        {formatDateTime(sighting.timestamp)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noSightingsContainer}>
                  <Text style={styles.noSightingsText}>
                    No recent sightings found. Start reporting wildlife to see your history here!
                  </Text>
                  <View style={styles.debugInfo}>
                    <Text style={styles.debugText}>
                      Debug Info:
                    </Text>
                    <Text style={styles.debugText}>
                      User: {getCurrentUser() ? 'Authenticated' : 'Not authenticated'}
                    </Text>
                    <Text style={styles.debugText}>
                      User ID: {getCurrentUser()?.uid || 'None'}
                    </Text>
                    <Text style={styles.debugText}>
                      User Email: {getCurrentUser()?.email || 'None'}
                    </Text>
                    <Text style={styles.debugText}>
                      Is Anonymous: {getCurrentUser()?.isAnonymous ? 'Yes' : 'No'}
                    </Text>
                    <Text style={styles.debugText}>
                      Sightings loaded: {recentSightings.length}
                    </Text>
                    <Text style={styles.debugText}>
                      Last load attempt: {new Date().toLocaleTimeString()}
                    </Text>
                    <TouchableOpacity
                      style={styles.debugButton}
                      onPress={async () => {
                        console.log('[DEBUG] Debug button pressed - checking Firestore data');
                        try {
                          const { collection, query, where, getDocs, orderBy, limit } = await import('firebase/firestore');
                          const user = getCurrentUser();
                          
                          if (!user) {
                            showMessage({
                              type: 'error',
                              title: 'Error',
                              message: 'No authenticated user',
                              buttons: [{ text: 'OK', onPress: () => {} }]
                            });
                            return;
                          }
                          
                          console.log('[DEBUG] Querying Firestore directly for user:', user.uid);
                          
                          // Import the db instance
                          const { db } = await import('../Storage/firebase/service');
                          
                          const q = query(
                            collection(db, 'wildlife_reports'),
                            orderBy('timestamp', 'desc'),
                            limit(10)
                          );
                          
                          const querySnapshot = await getDocs(q);
                          console.log('[DEBUG] Direct Firestore query result:');
                          console.log('[DEBUG] - Query snapshot size:', querySnapshot.size);
                          console.log('[DEBUG] - Query snapshot empty:', querySnapshot.empty);
                          
                          const docs: Array<{id: string; data: any}> = [];
                          querySnapshot.forEach((doc) => {
                            console.log('[DEBUG] Document ID:', doc.id);
                            console.log('[DEBUG] Document data:', doc.data());
                            docs.push({ id: doc.id, data: doc.data() });
                          });
                          
                          showMessage({
                            type: 'info',
                            title: 'Firestore Debug',
                            message: `Found ${docs.length} documents in wildlife_reports collection`,
                            buttons: [{ text: 'OK', onPress: () => {} }]
                          });
                        } catch (error) {
                          console.error('[DEBUG] Error querying Firestore directly:', error);
                          showMessage({
                            type: 'error',
                            title: 'Error',
                            message: `Failed to query Firestore: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            buttons: [{ text: 'OK', onPress: () => {} }]
                          });
                        }
                      }}>
                      <Text style={styles.debugButtonText}>Debug Firestore</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : activeTab === 'profile_info' ? (
            <View style={styles.profileInfoContainer}>
              <View style={styles.profileInfoHeader}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setActiveTab('profile')}>
                  <Text style={styles.backButtonText}>‹ Back</Text>
                </TouchableOpacity>
                <Text style={styles.sectionTitle}>Profile Information</Text>
              </View>

              {/* Profile Info Sub-tabs */}
              <View style={styles.profileInfoTabs}>
                <TouchableOpacity 
                  style={[styles.profileInfoTab, profileInfoTab === 'details' && styles.activeProfileInfoTab]}
                  onPress={() => setProfileInfoTab('details')}>
                  <Text style={[styles.profileInfoTabText, profileInfoTab === 'details' && styles.activeProfileInfoTabText]}>
                    Profile Details
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.profileInfoTab, profileInfoTab === 'data' && styles.activeProfileInfoTab]}
                  onPress={() => setProfileInfoTab('data')}>
                  <Text style={[styles.profileInfoTabText, profileInfoTab === 'data' && styles.activeProfileInfoTabText]}>
                    App Data
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.profileInfoTab, profileInfoTab === 'security' && styles.activeProfileInfoTab]}
                  onPress={() => setProfileInfoTab('security')}>
                  <Text style={[styles.profileInfoTabText, profileInfoTab === 'security' && styles.activeProfileInfoTabText]}>
                    Account Security
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Profile Info Content */}
              {profileInfoTab === 'details' ? (
                <View style={styles.profileInfoContent}>
                  {isAnonymous ? (
                    <View style={styles.guestProfileContent}>
                      <Text style={styles.guestProfileTitle}>Guest Mode</Text>
                      <Text style={styles.guestProfileText}>
                        You're browsing as a guest. Sign in to access your personal profile and reporting history.
                      </Text>
                      <TouchableOpacity
                        style={styles.signInPromptButton}
                        onPress={() => setShowLoginModal(true)}>
                        <Text style={styles.signInPromptButtonText}>Sign In</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={styles.userInfoSection}>
                        <Text style={styles.userInfoLabel}>Name:</Text>
                        <Text style={styles.userInfoValue}>{userName}</Text>
                      </View>
                      <View style={styles.userInfoSection}>
                        <Text style={styles.userInfoLabel}>Email:</Text>
                        <Text style={styles.userInfoValue}>{userEmail}</Text>
                      </View>
                      
                      {/* Status moved here */}
                      <View style={styles.statusSection}>
                        <Text style={styles.statusText}>
                          Status: {isPro ? 'Pro User' : 'Free User'}
                        </Text>
                        {isPro ? (
                          <Text style={styles.proBadge}>⭐ Pro</Text>
                        ) : (
                          <TouchableOpacity
                            style={styles.upgradeButton}
                            onPress={handleUpgradePress}>
                            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.manageSubscriptionButton}
                          onPress={() => showMessage({
                            type: 'info',
                            title: 'Coming Soon',
                            message: 'Subscription management will be available soon!',
                            buttons: [{ text: 'OK', onPress: () => {} }]
                          })}>
                          <Text style={styles.manageSubscriptionButtonText}>Manage Subscription</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              ) : profileInfoTab === 'data' ? (
                isAnonymous ? (
                  <View style={styles.profileInfoContent}>
                    <View style={styles.guestProfileContent}>
                      <Text style={styles.guestProfileTitle}>Personal Data</Text>
                      <Text style={styles.guestProfileText}>
                        Sign in to view your sighting history and contribution statistics.
                      </Text>
                      <TouchableOpacity
                        style={styles.signInPromptButton}
                        onPress={() => setShowLoginModal(true)}>
                        <Text style={styles.signInPromptButtonText}>Sign In</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <ScrollView style={styles.profileInfoContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.subSectionTitle}>Animal Sightings</Text>
                    <View style={styles.animalCountersTable}>
                      <View style={styles.counterRow}>
                        <Text style={styles.counterLabel}>Deer:</Text>
                        <Text style={styles.counterValue}>{animalCounters.deer}</Text>
                      </View>
                      <View style={styles.counterRow}>
                        <Text style={styles.counterLabel}>Bear:</Text>
                        <Text style={styles.counterValue}>{animalCounters.bear}</Text>
                      </View>
                      <View style={styles.counterRow}>
                        <Text style={styles.counterLabel}>Moose:</Text>
                        <Text style={styles.counterValue}>{animalCounters.moose_elk}</Text>
                      </View>
                      <View style={styles.counterRow}>
                        <Text style={styles.counterLabel}>Small Mammals:</Text>
                        <Text style={styles.counterValue}>{animalCounters.small_mammals}</Text>
                      </View>
                    </View>

                    <Text style={styles.subSectionTitle}>Recent Reports</Text>
                    <View style={styles.recentReportsList}>
                      {recentSightings.slice(0, 5).map((sighting, index) => (
                        <View key={index} style={styles.recentReportItem}>
                          <Text style={styles.recentReportText}>
                            {sighting.type.charAt(0).toUpperCase() + sighting.type.slice(1)}- {sighting.quantity} Reported, {formatLocation(sighting.location.latitude, sighting.location.longitude)}
                          </Text>
                          <Text style={styles.recentReportDate}>
                            {formatDateTime(sighting.timestamp)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )
              ) : (
                isAnonymous ? (
                  <View style={styles.profileInfoContent}>
                    <View style={styles.guestProfileContent}>
                      <Text style={styles.guestProfileTitle}>Account Security</Text>
                      <Text style={styles.guestProfileText}>
                        Sign in to manage your account security settings.
                      </Text>
                      <TouchableOpacity
                        style={styles.signInPromptButton}
                        onPress={() => setShowLoginModal(true)}>
                        <Text style={styles.signInPromptButtonText}>Sign In</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.profileInfoContent}>
                    <TouchableOpacity
                      style={styles.securityButton}
                      onPress={() => showMessage({
                        type: 'info',
                        title: 'Coming Soon',
                        message: 'Password change functionality will be available soon!',
                        buttons: [{ text: 'OK', onPress: () => {} }]
                      })}>
                      <Text style={styles.securityButtonText}>Change Password</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.deleteAccountButton}
                      onPress={() => {
                        showMessage({
                          type: 'warning',
                          title: 'Delete Account',
                          message: 'Are you sure you want to delete your account? This action cannot be undone.',
                          buttons: [
                            { text: 'No, go back', onPress: () => {}, style: 'cancel' },
                            { text: 'Yes', onPress: () => {
                              showMessage({
                                type: 'success',
                                title: 'Account Deleted',
                                message: 'Your account has been deleted.',
                                buttons: [{ text: 'OK', onPress: () => {} }]
                              });
                              // In a real app, this would call an API to delete the account
                            }, style: 'destructive' }
                          ]
                        });
                      }}>
                      <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.logoutButtonOrange}
                      onPress={handleLogout}>
                      <Text style={styles.logoutButtonOrangeText}>Log Out</Text>
                    </TouchableOpacity>
                  </View>
                )
              )}
            </View>
          ) : activeTab === 'settings' ? (
            <View style={styles.settingsContainer}>
              <View style={styles.settingsHeader}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setActiveTab('profile')}>
                  <Text style={styles.backButtonText}>‹ Back</Text>
                </TouchableOpacity>
                <Text style={styles.sectionTitle}>Settings</Text>
              </View>

              {/* Settings Sub-tabs */}
              <View style={styles.settingsTabs}>
                <TouchableOpacity 
                  style={[styles.settingsTabButton, settingsTab === 'preferences' && styles.activeSettingsTabButton]}
                  onPress={() => setSettingsTab('preferences')}>
                  <Text style={[styles.settingsTabButtonText, settingsTab === 'preferences' && styles.activeSettingsTabButtonText]}>
                    Preferences
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.settingsTabButton, settingsTab === 'notifications' && styles.activeSettingsTabButton]}
                  onPress={() => setSettingsTab('notifications')}>
                  <Text style={[styles.settingsTabButtonText, settingsTab === 'notifications' && styles.activeSettingsTabButtonText]}>
                    Notifications
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.settingsTabButton, settingsTab === 'privacy' && styles.activeSettingsTabButton]}
                  onPress={() => setSettingsTab('privacy')}>
                  <Text style={[styles.settingsTabButtonText, settingsTab === 'privacy' && styles.activeSettingsTabButtonText]}>
                    Privacy & Security
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.settingsTabButton, settingsTab === 'about' && styles.activeSettingsTabButton]}
                  onPress={() => setSettingsTab('about')}>
                  <Text style={[styles.settingsTabButtonText, settingsTab === 'about' && styles.activeSettingsTabButtonText]}>
                    General & About
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Settings Content */}
              {settingsTab === 'preferences' ? (
                <View style={styles.settingsContent}>
                  <Text style={styles.subSectionTitle}>App Preferences</Text>
                  
                  {/* Location Access Toggle */}
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Location Access</Text>
                    <Switch
                      value={locationAccessEnabled}
                      onValueChange={(value) => {
                        if (!value) {
                          showMessage({
                            type: 'warning',
                            title: 'Disable Location Access',
                            message: 'This app needs your location to properly function.\n\nTo continue disabling location access, go to your device settings and disable location permissions for this app.',
                            buttons: [{ text: 'OK', onPress: () => {} }]
                          });
                        } else {
                          setLocationAccessEnabled(value);
                          saveSettings({ locationAccessEnabled: value });
                        }
                      }}
                      trackColor={{ false: '#767577', true: '#81b0ff' }}
                      thumbColor={locationAccessEnabled ? '#f5dd4b' : '#f4f3f4'}
                    />
                  </View>

                  {/* Legend Toggle */}
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Show Map Legend</Text>
                    <Switch
                      value={showLegend}
                      onValueChange={(value) => {
                        setShowLegend(value);
                        saveSettings({ showLegend: value });
                      }}
                      trackColor={{ false: '#767577', true: '#81b0ff' }}
                      thumbColor={showLegend ? '#f5dd4b' : '#f4f3f4'}
                    />
                  </View>

                  {/* Units Selection */}
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Units of Measurement</Text>
                    <View style={styles.unitsSelector}>
                      <TouchableOpacity 
                        style={[styles.unitButton, units === 'miles' && styles.activeUnitButton]}
                        onPress={() => {
                          setUnits('miles');
                          saveSettings({ units: 'miles' });
                        }}>
                        <Text style={[styles.unitButtonText, units === 'miles' && styles.activeUnitButtonText]}>Miles</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.unitButton, units === 'kilometers' && styles.activeUnitButton]}
                        onPress={() => {
                          setUnits('kilometers');
                          saveSettings({ units: 'kilometers' });
                        }}>
                        <Text style={[styles.unitButtonText, units === 'kilometers' && styles.activeUnitButtonText]}>Kilometers</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : settingsTab === 'notifications' ? (
                <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
                  <Text style={styles.subSectionTitle}>Notification Settings</Text>
                  
                  {/* Master Toggle */}
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Enable All Notifications</Text>
                    <Switch
                      value={notificationsEnabled}
                      onValueChange={(value) => {
                        setNotificationsEnabled(value);
                        saveSettings({ notificationsEnabled: value });
                      }}
                      trackColor={{ false: '#767577', true: '#81b0ff' }}
                      thumbColor={notificationsEnabled ? '#f5dd4b' : '#f4f3f4'}
                    />
                  </View>

                  {/* Sub-toggles */}
                  <View style={styles.notificationSubSettings}>
                    <View style={styles.settingRow}>
                      <Text style={styles.subSettingLabel}>New Sightings</Text>
                      <Switch
                        value={newSightingsNotifications && notificationsEnabled}
                        onValueChange={(value) => {
                          setNewSightingsNotifications(value);
                          saveSettings({ newSightingsNotifications: value });
                        }}
                        disabled={!notificationsEnabled}
                        trackColor={{ false: '#767577', true: '#81b0ff' }}
                        thumbColor={(newSightingsNotifications && notificationsEnabled) ? '#f5dd4b' : '#f4f3f4'}
                      />
                    </View>
                    
                    <View style={styles.settingRow}>
                      <Text style={styles.subSettingLabel}>Promotional</Text>
                      <Switch
                        value={promotionalNotifications && notificationsEnabled}
                        onValueChange={(value) => {
                          setPromotionalNotifications(value);
                          saveSettings({ promotionalNotifications: value });
                        }}
                        disabled={!notificationsEnabled}
                        trackColor={{ false: '#767577', true: '#81b0ff' }}
                        thumbColor={(promotionalNotifications && notificationsEnabled) ? '#f5dd4b' : '#f4f3f4'}
                      />
                    </View>
                    
                    <View style={styles.settingRow}>
                      <Text style={styles.subSettingLabel}>App Updates</Text>
                      <Switch
                        value={appUpdateNotifications && notificationsEnabled}
                        onValueChange={(value) => {
                          setAppUpdateNotifications(value);
                          saveSettings({ appUpdateNotifications: value });
                        }}
                        disabled={!notificationsEnabled}
                        trackColor={{ false: '#767577', true: '#81b0ff' }}
                        thumbColor={(appUpdateNotifications && notificationsEnabled) ? '#f5dd4b' : '#f4f3f4'}
                      />
                    </View>
                  </View>

                  {/* Notification Radius */}
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Notification Radius</Text>
                    <View style={styles.radiusSelector}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {[0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((radius) => (
                          <TouchableOpacity
                            key={radius}
                            style={[styles.radiusButton, notificationRadius === radius && styles.activeRadiusButton]}
                            onPress={() => {
                              setNotificationRadius(radius);
                              saveSettings({ notificationRadius: radius });
                            }}>
                            <Text style={[styles.radiusButtonText, notificationRadius === radius && styles.activeRadiusButtonText]}>
                              {radius} {units}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </ScrollView>
              ) : settingsTab === 'privacy' ? (
                <View style={styles.settingsContent}>
                  <Text style={styles.subSectionTitle}>Privacy & Security</Text>
                  
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Report sightings anonymously</Text>
                    <Switch
                      value={anonymousSightings}
                      onValueChange={(value) => {
                        if (value) {
                          showMessage({
                            type: 'info',
                            title: 'Ghost Mode Activated',
                            message: 'You are now in Ghost mode. You can continue to report sightings like normal without your display name being shared.',
                            buttons: [{ text: 'OK', onPress: () => {} }]
                          });
                        }
                        setAnonymousSightings(value);
                        saveSettings({ anonymousSightings: value });
                      }}
                      trackColor={{ false: '#767577', true: '#81b0ff' }}
                      thumbColor={anonymousSightings ? '#f5dd4b' : '#f4f3f4'}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.settingsContent}>
                  <Text style={styles.subSectionTitle}>General & About</Text>
                  
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>App Version</Text>
                    <Text style={styles.versionText}>1.0.0</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.linkButton}
                    onPress={() => showMessage({
                      type: 'info',
                      title: 'Coming Soon',
                      message: 'Terms of Service will be available soon!',
                      buttons: [{ text: 'OK', onPress: () => {} }]
                    })}>
                    <Text style={styles.linkButtonText}>Terms of Service</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.linkButton}
                    onPress={() => showMessage({
                      type: 'info',
                      title: 'Coming Soon',
                      message: 'Privacy Policy will be available soon!',
                      buttons: [{ text: 'OK', onPress: () => {} }]
                    })}>
                    <Text style={styles.linkButtonText}>Privacy Policy</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : activeTab === 'help' ? (
            <View style={styles.helpContainer}>
              <View style={styles.helpHeader}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setActiveTab('profile')}>
                  <Text style={styles.backButtonText}>‹ Back</Text>
                </TouchableOpacity>
                <Text style={styles.sectionTitle}>Help & Support</Text>
              </View>

              {/* Help Sub-tabs */}
              <View style={styles.helpTabs}>
                <TouchableOpacity 
                  style={[styles.helpTabButton, helpTab === 'contact' && styles.activeHelpTabButton]}
                  onPress={() => setHelpTab('contact')}>
                  <Text style={[styles.helpTabButtonText, helpTab === 'contact' && styles.activeHelpTabButtonText]}>
                    Contact Us
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.helpTabButton, helpTab === 'faq' && styles.activeHelpTabButton]}
                  onPress={() => setHelpTab('faq')}>
                  <Text style={[styles.helpTabButtonText, helpTab === 'faq' && styles.activeHelpTabButtonText]}>
                    FAQ
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Help Content */}
              {helpTab === 'contact' ? (
                <View style={styles.helpContent}>
                  <Text style={styles.subSectionTitle}>Get in Touch</Text>
                  
                  <View style={styles.contactSection}>
                    <Text style={styles.contactTitle}>Phone Support</Text>
                    <TouchableOpacity 
                      style={styles.contactButton}
                      onPress={() => {
                        // In a real app, this would initiate a phone call
                        showMessage({
                          type: 'info',
                          title: 'Call Support',
                          message: 'Calling 888-888-8888...',
                          buttons: [
                            { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                            { text: 'Call', onPress: () => showMessage({
                              type: 'success',
                              title: 'Success',
                              message: 'Call initiated!',
                              buttons: [{ text: 'OK', onPress: () => {} }]
                            }) }
                          ]
                        });
                      }}>
                      <Text style={styles.contactButtonText}>📞 888-888-8888</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.contactSection}>
                    <Text style={styles.contactTitle}>Email Support</Text>
                    <TouchableOpacity 
                      style={styles.contactButton}
                      onPress={() => {
                        // In a real app, this would open email client
                        showMessage({
                          type: 'info',
                          title: 'Email Support',
                          message: 'Opening email to ohnodeer@support.com...',
                          buttons: [
                            { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                            { text: 'Send Email', onPress: () => showMessage({
                              type: 'success',
                              title: 'Success',
                              message: 'Email client opened!',
                              buttons: [{ text: 'OK', onPress: () => {} }]
                            }) }
                          ]
                        });
                      }}>
                      <Text style={styles.contactButtonText}>✉️ ohnodeer@support.com</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.contactInfo}>
                    <Text style={styles.contactInfoText}>
                      Our support team is available Monday through Friday, 9 AM to 6 PM EST.
                    </Text>
                    <Text style={styles.contactInfoText}>
                      For urgent wildlife emergencies, please contact your local authorities.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.helpContent}>
                  <Text style={styles.subSectionTitle}>Frequently Asked Questions</Text>
                  
                  <View style={styles.faqPlaceholder}>
                    <Text style={styles.faqPlaceholderText}>
                      FAQ section coming soon!
                    </Text>
                    <Text style={styles.faqPlaceholderSubtext}>
                      We're working on comprehensive answers to common questions about wildlife reporting and app features.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.profileContainer}>
              <Text style={styles.sectionTitle}>Profile</Text>

              {/* Profile Photo Placeholder */}
              <TouchableOpacity style={styles.profilePhotoContainer}>
                <View style={styles.profilePhotoPlaceholder}>
                  <Text style={styles.profilePhotoText}>Add Photo</Text>
                </View>
              </TouchableOpacity>

              {/* Settings Section */}
              <View style={styles.settingsSection}>
                <TouchableOpacity 
                  style={styles.settingsTab}
                  onPress={() => setActiveTab('profile_info')}>
                  <Text style={styles.settingsTabText}>Profile Information</Text>
                  <Text style={styles.arrowText}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.settingsTab}
                  onPress={() => setActiveTab('settings')}>
                  <Text style={styles.settingsTabText}>Settings</Text>
                  <Text style={styles.arrowText}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.settingsTab}
                  onPress={() => setActiveTab('help')}>
                  <Text style={styles.settingsTabText}>Help</Text>
                  <Text style={styles.arrowText}>›</Text>
                </TouchableOpacity>
                {/* Status at bottom of settings - REMOVED */}
              </View>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.primaryButton,
              isAnonymous && styles.disabledButton
            ]}
            onPress={isAnonymous ? () => {
              showMessage({
                type: 'info',
                title: 'Sign In Required',
                message: 'Please sign in to report wildlife sightings. Guest users can only view existing sightings.',
                buttons: [{ text: 'OK', onPress: () => {} }]
              });
            } : handleReportPress}>
            <Text style={styles.primaryButtonText}>
              {isAnonymous ? 'View Only Mode' : 'Report Sighting'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navBar}>
          <TouchableOpacity
            style={[
              styles.navButton,
              activeTab === 'map' && styles.activeNavButton,
            ]}
            onPress={() => setActiveTab('map')}>
            <Text
              style={[
                styles.navButtonText,
                activeTab === 'map' && styles.activeNavButtonText,
              ]}>
              Map
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.navButton,
              activeTab === 'sightings' && styles.activeNavButton,
            ]}
            onPress={() => setActiveTab('sightings')}>
            <Text
              style={[
                styles.navButtonText,
                activeTab === 'sightings' && styles.activeNavButtonText,
              ]}>
              View Recent Sightings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.navButton,
              activeTab === 'profile' && styles.activeNavButton,
            ]}
            onPress={() => setActiveTab('profile')}>
            <Text
              style={[
                styles.navButtonText,
                activeTab === 'profile' && styles.activeNavButtonText,
              ]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>

        <AnimalSelectionModal
          visible={showAnimalModal}
          onSelect={handleAnimalSelect}
          onClose={() => setShowAnimalModal(false)}
        />

        {__DEV__ && (
          <DebugStorageScreen visible={showDebugStorage} onClose={() => setShowDebugStorage(false)} />
        )}

        {selectedAnimal && showQuantityModal && (
          <QuantitySelectionModal
            visible={showQuantityModal}
            animalType={selectedAnimal}
            onSelect={handleQuantitySelect}
            onClose={() => setShowQuantityModal(false)}
            onBack={handleBackToAnimals}
          />
        )}

        <QuantityUpdateModal
          visible={showQuantityUpdateModal}
          animalType={selectedAnimal || 'deer'}
          onConfirm={handleQuantityUpdate}
          onSkip={handleSkipQuantityUpdate}
        />

        {showSubscriptionScreen && (
          <SubscriptionScreen
            onClose={() => setShowSubscriptionScreen(false)}
            onSubscriptionSuccess={() => {
              setShowSubscriptionScreen(false);
              checkSubscriptionStatus();
            }}
          />
        )}

        {/* Fullscreen Map Modal */}
        <Modal
          visible={isFullscreenMap}
          animationType="fade"
          onRequestClose={() => setIsFullscreenMap(false)}
          transparent={false}>
          <SafeAreaView style={styles.fullscreenModalContainer}>
            <View style={styles.fullscreenInner}>
              <TouchableOpacity
                style={styles.fullscreenCloseButton}
                onPress={() => setIsFullscreenMap(false)}
                accessibilityLabel="Close fullscreen map"
                testID="closeFullscreenMapButton">
                <Text style={styles.fullscreenCloseButtonText}>✕</Text>
              </TouchableOpacity>
              <WildlifeMap
                currentLocation={currentLocation ? {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  accuracy: currentLocation.accuracy,
                } : null}
                onLocationUpdate={handleLocationUpdate}
                showLegend={showLegend}
              />
            </View>
          </SafeAreaView>
        </Modal>

        {/* Login Modal */}
        <Modal
          visible={showLoginModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowLoginModal(false)}>
          <View style={styles.loginModalOverlay}>
            <View style={styles.loginModalContent}>
              <TouchableOpacity
                style={styles.loginModalCloseButton}
                onPress={() => setShowLoginModal(false)}>
                <Text style={styles.loginModalCloseButtonText}>✕</Text>
              </TouchableOpacity>

              <Text style={styles.loginModalTitle}>Sign In</Text>
              <Text style={styles.loginModalSubtitle}>Choose your sign-in method</Text>

              <View style={styles.loginButtonsContainer}>
                <TouchableOpacity
                  style={[styles.loginButton, styles.googleLoginButton]}
                  onPress={handleGoogleLogin}
                  disabled={loading}>
                  <Text style={[styles.loginButtonIcon, styles.googleLoginIconText]}>G</Text>
                  <Text style={[styles.loginButtonText, styles.googleLoginButtonText]}>Continue with Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.loginButton, styles.appleLoginButton]}
                  onPress={handleAppleLogin}
                  disabled={loading}>
                  <Image
                    source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' }}
                    style={{ width: 24, height: 24, marginRight: theme.spacing.s, tintColor: '#fff' }}
                    resizeMode="contain"
                  />
                  <Text style={[styles.loginButtonText, styles.appleLoginButtonText]}>Continue with Apple</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.loginButton, styles.emailLoginButton]}
                  onPress={openEmailModal}
                  disabled={loading}>
                  <Text style={[styles.loginButtonIcon, styles.emailLoginIconText]}>✉</Text>
                  <Text style={[styles.loginButtonText, styles.emailLoginButtonText]}>Continue with Email</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.guestLoginButton}
                  onPress={handleGuestLogin}>
                  <Text style={styles.guestLoginLinkText}>Continue as Guest</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Guest Warning Modal */}
        <Modal
          animationType="fade"
          transparent
          visible={showGuestModal}
          onRequestClose={() => setShowGuestModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Wait!</Text>
              <Text style={styles.modalText}>
                You can continue as a Guest, but you can only view sightings in your area.
              </Text>
              <Text style={styles.modalActionText}>Log in to get the full experience!</Text>
              <TouchableOpacity style={styles.learnMoreLink} onPress={() => {}}>
                <Text style={styles.learnMoreText}>Learn more about the app</Text>
              </TouchableOpacity>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowGuestModal(false)}>
                  <Text style={styles.modalButtonText}>Go back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.continueButton]}
                  onPress={confirmGuestLogin}
                  disabled={loading}>
                  <Text style={[styles.modalButtonText, styles.continueButtonText]}>
                    {loading ? 'Loading...' : 'Continue anyways'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Email Auth Modal */}
        <Modal
          animationType="fade"
          transparent
          visible={showEmailModal}
          onRequestClose={() => setShowEmailModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {emailMode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor="#718096"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
              <View style={styles.passwordWrapper}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#718096"
                  secureTextEntry={!showPassword}
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(p => !p)}
                  disabled={loading}
                >
                  <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={forgotPassword} style={styles.forgotLink}>
                <Text style={styles.forgotLinkText}>Forgot password?</Text>
              </TouchableOpacity>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowEmailModal(false)}
                  disabled={loading}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.continueButton]}
                  onPress={attemptEmailAuth}
                  disabled={loading}>
                  <Text style={[styles.modalButtonText, styles.continueButtonText]}>
                    {loading ? 'Please wait...' : emailMode === 'login' ? 'Login' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
              {(emailError || passwordError || generalAuthError) && (
                <View style={styles.inlineErrors}>
                  {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                  {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                  {generalAuthError ? <Text style={styles.errorText}>{generalAuthError}</Text> : null}
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.primaryBackground,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 25, 41, 0.85)',
    padding: 16,
    justifyContent: 'space-between',
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  companyName: {
    fontSize: theme.fontSize.h1,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: theme.fontFamily.lato,
  },
  motto: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: theme.fontFamily.openSans,
  },
  mapContainer: {
    flex: 1,
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    // Allow child MapView to stretch fully
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    width: '100%',
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapPlaceholderText: {
    fontSize: theme.fontSize.h3,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    fontFamily: theme.fontFamily.lato,
  },
  mapPlaceholderSubtext: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontFamily: theme.fontFamily.openSans,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    position: 'absolute',
    bottom: theme.spacing.l,
    left: theme.spacing.m,
    right: theme.spacing.m,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    opacity: 0.6,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  primaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryBackground,
    borderRadius: 30,
    padding: 8,
    marginBottom: 16,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 24,
  },
  navButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  activeNavButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeNavButtonText: {
    color: theme.colors.accent,
  },
  sectionTitle: {
    fontSize: theme.fontSize.h2,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
    fontFamily: theme.fontFamily.lato,
  },
  profileContainer: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  proStatusContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  proStatusText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    fontFamily: theme.fontFamily.openSans,
  },
  proBadge: {
    fontSize: theme.fontSize.h3,
    color: '#fbbf24',
    fontWeight: 'bold',
    fontFamily: theme.fontFamily.lato,
  },
  upgradeButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  mapWithAdsContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  fullscreenButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  fullscreenButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  debugFloating: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 50,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenInner: {
    flex: 1,
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 24,
  },
  fullscreenCloseButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '700',
    fontFamily: theme.fontFamily.openSans,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    marginTop: 24,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.openSans,
  },
  profilePhotoContainer: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  profilePhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.caption,
    textAlign: 'center',
    fontFamily: theme.fontFamily.openSans,
  },
  settingsSection: {
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 24,
    width: '100%',
    overflow: 'hidden',
  },
  settingsTab: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingsTabText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '500',
    fontFamily: theme.fontFamily.openSans,
  },
  arrowText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.h3,
    fontWeight: 'bold',
    fontFamily: theme.fontFamily.openSans,
  },
  statusContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    fontFamily: theme.fontFamily.openSans,
  },
  logoutButtonSmall: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    marginTop: 12,
  },
  logoutButtonTextSmall: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: theme.fontSize.caption,
    fontFamily: theme.fontFamily.openSans,
  },
  sightingsContainer: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  sightingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  refreshButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  sightingsList: {
    width: '100%',
    marginTop: 20,
  },
  sightingItem: {
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '100%',
  },
  sightingText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '500',
    fontFamily: theme.fontFamily.openSans,
  },
  sightingDate: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.caption,
    marginTop: 4,
    fontFamily: theme.fontFamily.openSans,
  },
  noSightingsText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 32,
    fontSize: theme.fontSize.body,
    padding: theme.spacing.m,
    fontFamily: theme.fontFamily.openSans,
  },
  noSightingsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  debugInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    width: '100%',
    alignItems: 'flex-start',
  },
  debugText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.caption,
    fontFamily: theme.fontFamily.openSans,
    marginBottom: 4,
  },
  profileInfoContainer: {
    flex: 1,
    padding: 16,
  },
  profileInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  profileInfoTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 8,
    padding: 4,
  },
  profileInfoTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeProfileInfoTab: {
    backgroundColor: theme.colors.textPrimary,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  profileInfoTabText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  activeProfileInfoTabText: {
    color: theme.colors.primaryBackground,
    fontFamily: theme.fontFamily.openSans,
  },
  profileInfoContent: {
    flex: 1,
  },
  userInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 12,
  },
  userInfoLabel: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '500',
    fontFamily: theme.fontFamily.openSans,
  },
  userInfoValue: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.openSans,
  },
  statusSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 12,
    alignItems: 'center',
  },
  manageSubscriptionButton: {
    backgroundColor: '#4a5568',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
  },
  manageSubscriptionButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  subSectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.h3,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 20,
    fontFamily: theme.fontFamily.lato,
  },
  animalCountersTable: {
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  counterLabel: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '500',
    fontFamily: theme.fontFamily.openSans,
  },
  counterValue: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  recentReportsList: {
    marginTop: 16,
  },
  recentReportItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recentReportText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.caption,
    fontFamily: theme.fontFamily.openSans,
  },
  recentReportDate: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.caption,
    fontFamily: theme.fontFamily.openSans,
    marginTop: 4,
  },
  securityButton: {
    backgroundColor: '#4a5568',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  securityButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  deleteAccountButton: {
    backgroundColor: theme.colors.error,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  deleteAccountButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  logoutButtonOrange: {
    backgroundColor: theme.colors.warning,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonOrangeText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  // Settings Styles
  settingsContainer: {
    flex: 1,
    padding: 16,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingsTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 8,
    padding: 4,
  },
  settingsTabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeSettingsTabButton: {
    backgroundColor: theme.colors.textPrimary,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  settingsTabButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.body,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: theme.fontFamily.openSans,
  },
  activeSettingsTabButtonText: {
    color: theme.colors.primaryBackground,
    fontFamily: theme.fontFamily.openSans,
  },
  settingsContent: {
    flex: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 12,
  },
  settingLabel: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '500',
    flex: 1,
    fontFamily: theme.fontFamily.openSans,
  },
  subSettingLabel: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.caption,
    fontWeight: '500',
    flex: 1,
    fontFamily: theme.fontFamily.openSans,
  },
  unitsSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  unitButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  activeUnitButton: {
    backgroundColor: theme.colors.accent,
  },
  unitButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  activeUnitButtonText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily.openSans,
  },
  notificationSubSettings: {
    marginLeft: 16,
    marginTop: 8,
  },
  radiusSelector: {
    flex: 1,
    marginLeft: 16,
  },
  radiusButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 60,
    alignItems: 'center',
  },
  activeRadiusButton: {
    backgroundColor: theme.colors.accent,
  },
  radiusButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  activeRadiusButtonText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily.openSans,
  },
  versionText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.openSans,
  },
  linkButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  linkButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '500',
    fontFamily: theme.fontFamily.openSans,
  },
  // Help Styles
  helpContainer: {
    flex: 1,
    padding: 16,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  helpTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 8,
    padding: 4,
  },
  helpTabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeHelpTabButton: {
    backgroundColor: theme.colors.textPrimary,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  helpTabButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: theme.fontFamily.openSans,
  },
  activeHelpTabButtonText: {
    color: theme.colors.primaryBackground,
    fontFamily: theme.fontFamily.openSans,
  },
  helpContent: {
    flex: 1,
  },
  contactSection: {
    marginBottom: 24,
  },
  contactTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: theme.fontFamily.openSans,
  },
  contactButton: {
    backgroundColor: theme.colors.secondaryBackground,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  contactButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '500',
    fontFamily: theme.fontFamily.openSans,
  },
  contactInfo: {
    marginTop: 32,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  contactInfoText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.caption,
    lineHeight: 20,
    marginBottom: 8,
    fontFamily: theme.fontFamily.openSans,
  },
  faqPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  faqPlaceholderText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.h3,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: theme.fontFamily.lato,
  },
  faqPlaceholderSubtext: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.body,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: theme.fontFamily.openSans,
  },
  guestProfileContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  guestProfileTitle: {
    fontSize: theme.fontSize.h3,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.m,
    fontFamily: theme.fontFamily.lato,
  },
  guestProfileText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.l,
    lineHeight: 24,
    fontFamily: theme.fontFamily.openSans,
  },
  signInPromptButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.l,
    borderRadius: theme.spacing.s,
    minWidth: 120,
    alignItems: 'center',
  },
  signInPromptButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  // Login Modal Styles
  loginModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loginModalContent: {
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  loginModalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  loginModalCloseButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.h3,
    fontWeight: 'bold',
    fontFamily: theme.fontFamily.openSans,
  },
  loginModalTitle: {
    fontSize: theme.fontSize.h2,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily.lato,
  },
  loginModalSubtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    fontFamily: theme.fontFamily.openSans,
  },
  loginButtonsContainer: {
    width: '100%',
    gap: theme.spacing.m,
  },
  loginButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: theme.spacing.l,
    paddingHorizontal: theme.spacing.l,
    borderRadius: theme.spacing.s,
    alignItems: 'center',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  googleLoginButton: {
    backgroundColor: theme.colors.accent,
  },
  appleLoginButton: {
    backgroundColor: '#000',
  },
  emailLoginButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  loginButtonText: {
    color: '#1a365d',
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  googleLoginButtonText: {
    color: '#fff',
  },
  appleLoginButtonText: {
    color: '#fff',
  },
  emailLoginButtonText: {
    color: theme.colors.accent,
  },
  loginButtonIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  googleLoginIconText: {
    color: '#fff',
  },
  emailLoginIconText: {
    color: theme.colors.accent,
  },
  guestLoginButton: {
    marginTop: theme.spacing.s,
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'transparent',
    paddingVertical: theme.spacing.m,
  },
  guestLoginLinkText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.body,
    textAlign: 'center',
    fontFamily: theme.fontFamily.openSans,
  },
  // Modal Styles (for guest warning and email auth)
  modalContent: {
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: theme.fontSize.h2,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily.lato,
  },
  modalText: {
    fontSize: theme.fontSize.body,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily.openSans,
  },
  modalActionText: {
    fontSize: theme.fontSize.body,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'center',
    color: theme.colors.accent,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  learnMoreLink: {
    marginBottom: 16,
    alignSelf: 'center',
  },
  learnMoreText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
    fontFamily: theme.fontFamily.openSans,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: theme.colors.secondaryBackground,
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
  },
  continueButton: {
    backgroundColor: theme.colors.accent,
  },
  modalButtonText: {
    fontWeight: '600',
    fontSize: theme.fontSize.body,
    textAlign: 'center',
    width: '100%',
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily.openSans,
  },
  continueButtonText: {
    color: theme.colors.textPrimary,
  },
  input: {
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: theme.fontSize.body,
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
    marginBottom: 14,
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily.openSans,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  forgotLinkText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  inlineErrors: {
    marginTop: 12,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.caption,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '500',
    fontFamily: theme.fontFamily.openSans,
  },
  passwordWrapper: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    paddingRight: 80,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  passwordToggleText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
});
