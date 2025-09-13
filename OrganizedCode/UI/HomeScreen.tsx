import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import AnimalSelectionModal from './AnimalSelectionModal';
import QuantitySelectionModal from './QuantitySelectionModal';
import QuantityUpdateModal from './QuantityUpdateModal';
import SubscriptionScreen from './SubscriptionScreen';
import AdBanner from './AdBanner';
import WildlifeMap from './WildlifeMap';
import ErrorBoundary from './ErrorBoundary';
import {AnimalType, SightingReport, Location} from '../CoreLogic/types';
import WildlifeReportsService, {
  AuthService,
} from '../Storage/wildlifeReportsService';
import {backgroundService} from '../Storage/backgroundService';
import {voiceCommandService} from '../Storage/voiceCommandService';
import {inAppPurchaseService} from '../Storage/inAppPurchaseService';
import {adService} from '../Storage/adService';

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
  const [activeTab, setActiveTab] = useState<'map' | 'sightings' | 'profile'>(
    'map',
  );
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [_locationError, setLocationError] = useState<string | null>(null);
  const [lastReportId, setLastReportId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [servicesInitialized, setServicesInitialized] = useState(false);

  useEffect(() => {
    if (activeTab === 'sightings') {
      loadRecentSightings();
    }
  }, [activeTab]);

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
      
      // Initialize ad service (non-critical)
      try {
        console.log('[Init] adService.initialize:start');
        await adService.initialize();
        console.log('[Init] adService.initialize:success');
      } catch (adError) {
        console.warn('[Init] Ad service initialization failed:', adError);
      }

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

      // Initialize voice command service (non-critical)
      try {
        console.log('[Init] voiceCommandService.initialize:start');
        await voiceCommandService.initialize();
        console.log('[Init] voiceCommandService.initialize:success');
      } catch (voiceError) {
        console.warn('[Init] Voice command service initialization failed:', voiceError);
      }

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
        if (activeTab === 'sightings') {
          await loadRecentSightings();
        }

        Alert.alert(
          'Success',
          `Reported ${quantity} ${animalType}${
            quantity > 1 ? 's' : ''
          } sighted!`,
        );
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
              <ErrorBoundary>
                <WildlifeMap
                  currentLocation={currentLocation}
                  onLocationUpdate={setCurrentLocation}
                />
              </ErrorBoundary>
              <AdBanner isPro={isPro} />
            </View>
          ) : activeTab === 'sightings' ? (
            <View style={styles.sightingsContainer}>
              <Text style={styles.sectionTitle}>Recent Sightings</Text>
              {recentSightings.length > 0 ? (
                <View style={styles.sightingsList}>
                  {recentSightings.map(sighting => (
                    <View key={sighting.id} style={styles.sightingCard}>
                      <Text style={styles.sightingAnimal}>
                        {sighting.quantity} {sighting.type}
                        {sighting.quantity > 1 ? 's' : ''}
                      </Text>
                      <Text style={styles.sightingTime}>
                        {formatDate(sighting.timestamp)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noSightingsText}>
                  No recent sightings to display
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.profileContainer}>
              <Text style={styles.sectionTitle}>Profile</Text>

              {/* Pro Status */}
              <View style={styles.proStatusContainer}>
                <Text style={styles.proStatusText}>
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
              </View>

              <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                <Text style={styles.logoutButtonText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleReportPress}>
            <Text style={styles.primaryButtonText}>Report Sighting</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() =>
              setActiveTab(prev => (prev === 'sightings' ? 'map' : 'sightings'))
            }>
            <Text style={styles.secondaryButtonText}>
              {activeTab === 'sightings' ? 'Back to Map' : 'View Sightings'}
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
              Sightings
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
    justifyContent: 'center',
    alignItems: 'center',
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
  sightingsContainer: {
    flex: 1,
    width: '100%',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  sightingsList: {
    flex: 1,
  },
  sightingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sightingAnimal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sightingTime: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  noSightingsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
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
    backgroundColor: '#3182ce',
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
});
