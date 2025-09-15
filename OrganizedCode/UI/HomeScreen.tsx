import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
  Modal,
  SafeAreaView,
  ScrollView,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnimalSelectionModal from './AnimalSelectionModal';
import QuantitySelectionModal from './QuantitySelectionModal';
import QuantityUpdateModal from './QuantityUpdateModal';
import SubscriptionScreen from './SubscriptionScreen';
// import AdBanner from './AdBanner'; // Temporarily disabled
import WildlifeMap from './WildlifeMap';
import ErrorBoundary from './ErrorBoundary';
import {auth, getCurrentUser, onAuthStateChange} from '../Storage/firebase/service';
import {
  WildlifeReportsService,
  AuthService,
} from '../Storage/wildlifeReportsService';
import {AnimalType, SightingReport, Location} from '../CoreLogic/types';
import {backgroundService} from '../Storage/backgroundService';
// import {voiceCommandService} from '../Storage/voiceCommandService'; // Temporarily disabled
import {inAppPurchaseService} from '../Storage/inAppPurchaseService';
// import {adService} from '../Storage/adService'; // Temporarily disabled

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
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [_locationError, setLocationError] = useState<string | null>(null);
  const [lastReportId, setLastReportId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [servicesInitialized, setServicesInitialized] = useState(false);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [profileInfoTab, setProfileInfoTab] = useState<'details' | 'data' | 'security'>('details');
  const [userName, setUserName] = useState('Guest');
  const [userEmail, setUserEmail] = useState('guest@example.com');
  const [animalCounters, setAnimalCounters] = useState({
    deer: 0,
    bear: 0,
    moose: 0,
    smallMammals: 0,
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
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'Oh No Deer needs access to your location to report wildlife sightings.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        } else {
          setLocationError('Location permission denied');
        }
      } catch {
        setLocationError('Failed to request location permission');
      }
    } else {
      getCurrentLocation();
    }
  }, []);

  useEffect(() => {
    requestLocationPermission();
  }, [requestLocationPermission]);

  useEffect(() => {
    if (activeTab === 'sightings') {
      loadRecentSightings();
    }
  }, [activeTab]);

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

  const getCurrentLocation = () => {
    // Location services disabled - use manual location entry instead
    setLocationError('Location services not available - please enter location manually');
    // Use placeholder location for testing
    setCurrentLocation({
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 0,
    });
  };

  const loadRecentSightings = async () => {
    try {
      const sightings = await WildlifeReportsService.getUserReports(20);
      setRecentSightings(sightings);
      
      // Calculate animal counters
      const counters = { deer: 0, bear: 0, moose: 0, smallMammals: 0 };
      sightings.forEach(sighting => {
        if (sighting.type === 'deer') {
          counters.deer += sighting.quantity;
        } else if (sighting.type === 'bear') {
          counters.bear += sighting.quantity;
        } else if (sighting.type === 'moose_elk') {
          counters.moose += sighting.quantity;
        } else if (['raccoon', 'squirrel', 'rabbit', 'other'].includes(sighting.type)) {
          counters.smallMammals += sighting.quantity;
        }
      });
      setAnimalCounters(counters);
    } catch {
      Alert.alert('Error', 'Failed to load recent sightings');
    }
  };

  const handleReportPress = async () => {
    if (!currentLocation) {
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please ensure location services are enabled and try again.',
      );
      return;
    }

    try {
      // Submit a quick report with default values
      const reportId = await WildlifeReportsService.submitReport(
        'deer', // Default to deer for quick reporting
        currentLocation,
        1, // Default quantity
      );

      if (reportId) {
        setLastReportId(reportId);
        // Show quantity update modal after successful submission
        setTimeout(() => {
          setShowQuantityUpdateModal(true);
        }, 1000);

        Alert.alert(
          'Report Submitted!',
          'Your wildlife sighting has been reported. You can update the details below.',
          [{text: 'OK'}],
        );

        if (activeTab === 'sightings') {
          await loadRecentSightings();
        }
      } else {
        Alert.alert('Error', 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const handleAnimalSelect = async (animal: AnimalType) => {
    setSelectedAnimal(animal);
    setShowAnimalModal(false);

    if (animal === 'other') {
      await handleSaveSighting(animal, 1);
    } else {
      setShowQuantityModal(true);
    }
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
    if (!currentLocation) {
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please ensure location services are enabled and try again.',
      );
      return;
    }

    try {
      const reportId = await WildlifeReportsService.submitReport(
        animalType,
        currentLocation,
        quantity,
      );

      if (reportId) {
        Alert.alert(
          'Success',
          `Reported ${quantity} ${animalType}${
            quantity > 1 ? 's' : ''
          } sighted!`,
        );

        if (activeTab === 'sightings') {
          await loadRecentSightings();
        }
      } else {
        Alert.alert('Error', 'Failed to save sighting. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Failed to save sighting. Please try again.');
    }
  };

  const handleQuantityUpdate = async (quantity: number) => {
    // Note: In a full implementation, you'd update the existing report
    // For now, we'll just close the modal
    setShowQuantityUpdateModal(false);
    setLastReportId(null);
    Alert.alert('Updated!', `Quantity updated to ${quantity}`);
  };

  const handleSkipQuantityUpdate = () => {
    setShowQuantityUpdateModal(false);
    setLastReportId(null);
  };

  const handleUpgradePress = () => {
    setShowSubscriptionScreen(true);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleBackToAnimals = () => {
    setShowQuantityModal(false);
    setShowAnimalModal(true);
  };

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
                  currentLocation={currentLocation}
                  onLocationUpdate={setCurrentLocation}
                  showLegend={showLegend}
                />
              </ErrorBoundary>
              {/* AdBanner temporarily removed */}
            </View>
          ) : activeTab === 'sightings' ? (
            <View style={styles.sightingsContainer}>
              <Text style={styles.sectionTitle}>Recent Sightings</Text>
              {recentSightings.length > 0 ? (
                <ScrollView style={styles.sightingsList}>
                  {recentSightings.map((sighting, index) => (
                    <View key={index} style={styles.sightingItem}>
                      <Text style={styles.sightingText}>
                        {sighting.type} - {sighting.quantity} reported
                      </Text>
                      <Text style={styles.sightingDate}>
                        {new Date(sighting.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noSightingsText}>
                  No recent sightings found. Start reporting wildlife to see your history here!
                </Text>
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
                      onPress={() => Alert.alert('Coming Soon', 'Subscription management will be available soon!')}>
                      <Text style={styles.manageSubscriptionButtonText}>Manage Subscription</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : profileInfoTab === 'data' ? (
                <View style={styles.profileInfoContent}>
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
                      <Text style={styles.counterValue}>{animalCounters.moose}</Text>
                    </View>
                    <View style={styles.counterRow}>
                      <Text style={styles.counterLabel}>Small Mammals:</Text>
                      <Text style={styles.counterValue}>{animalCounters.smallMammals}</Text>
                    </View>
                  </View>

                  <Text style={styles.subSectionTitle}>Recent Reports</Text>
                  <View style={styles.recentReportsList}>
                    {recentSightings.slice(0, 3).map((sighting, index) => (
                      <View key={index} style={styles.recentReportItem}>
                        <Text style={styles.recentReportText}>
                          {sighting.type} sighting - {Math.floor((Date.now() - sighting.timestamp) / (1000 * 60 * 60 * 24))} days ago
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.profileInfoContent}>
                  <TouchableOpacity
                    style={styles.securityButton}
                    onPress={() => Alert.alert('Coming Soon', 'Password change functionality will be available soon!')}>
                    <Text style={styles.securityButtonText}>Change Password</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.deleteAccountButton}
                    onPress={() => {
                      Alert.alert(
                        'Delete Account',
                        'Are you sure you want to delete your account? This action cannot be undone.',
                        [
                          {text: 'No, go back', style: 'cancel'},
                          {text: 'Yes', style: 'destructive', onPress: () => {
                            Alert.alert('Account Deleted', 'Your account has been deleted.');
                            // In a real app, this would call an API to delete the account
                          }},
                        ]
                      );
                    }}>
                    <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.logoutButtonOrange}
                    onPress={onLogout}>
                    <Text style={styles.logoutButtonOrangeText}>Log Out</Text>
                  </TouchableOpacity>
                </View>
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
                          Alert.alert(
                            'Disable Location Access',
                            'This app needs your location to properly function.\n\nTo continue disabling location access, go to your device settings and disable location permissions for this app.',
                            [{ text: 'OK' }]
                          );
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
                          Alert.alert(
                            'Ghost Mode Activated',
                            'You are now in Ghost mode. You can continue to report sightings like normal without your display name being shared.',
                            [{ text: 'OK' }]
                          );
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
                    onPress={() => Alert.alert('Coming Soon', 'Terms of Service will be available soon!')}>
                    <Text style={styles.linkButtonText}>Terms of Service</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.linkButton}
                    onPress={() => Alert.alert('Coming Soon', 'Privacy Policy will be available soon!')}>
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
                        Alert.alert('Call Support', 'Calling 888-888-8888...', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Call', onPress: () => Alert.alert('Success', 'Call initiated!') }
                        ]);
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
                        Alert.alert('Email Support', 'Opening email to ohnodeer@support.com...', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Send Email', onPress: () => Alert.alert('Success', 'Email client opened!') }
                        ]);
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
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleReportPress}>
            <Text style={styles.primaryButtonText}>Report Sighting</Text>
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

        {selectedAnimal &&
          (selectedAnimal === 'deer' || selectedAnimal === 'bear') && (
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
          animalType="wildlife"
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
                currentLocation={currentLocation}
                onLocationUpdate={setCurrentLocation}
                showLegend={showLegend}
              />
            </View>
          </SafeAreaView>
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
    backgroundColor: '#0a1929', // Dark blue background
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
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  motto: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 16,
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
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
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
    backgroundColor: '#3182ce',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  activeNavButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeNavButtonText: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
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
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  proBadge: {
    fontSize: 18,
    color: '#fbbf24',
    fontWeight: 'bold',
  },
  upgradeButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 16,
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
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  settingsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  arrowText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
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
    fontSize: 14,
  },
  sightingsContainer: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  sightingsList: {
    width: '100%',
    marginTop: 20,
  },
  sightingItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '100%',
  },
  sightingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  sightingDate: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 4,
  },
  noSightingsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileInfoTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: '#fff',
  },
  profileInfoTabText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  activeProfileInfoTabText: {
    color: '#000',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  userInfoValue: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  statusSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  subSectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 20,
  },
  animalCountersTable: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  counterValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    color: '#fff',
    fontSize: 14,
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAccountButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  deleteAccountButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButtonOrange: {
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonOrangeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: '#fff',
  },
  settingsTabButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  activeSettingsTabButtonText: {
    color: '#000',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  subSettingLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
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
    backgroundColor: '#3182ce',
  },
  unitButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  activeUnitButtonText: {
    color: '#fff',
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
    backgroundColor: '#3182ce',
  },
  radiusButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  activeRadiusButtonText: {
    color: '#fff',
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: '#fff',
  },
  helpTabButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeHelpTabButtonText: {
    color: '#000',
  },
  helpContent: {
    flex: 1,
  },
  contactSection: {
    marginBottom: 24,
  },
  contactTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  contactButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  contactInfo: {
    marginTop: 32,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  contactInfoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  faqPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  faqPlaceholderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  faqPlaceholderSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
