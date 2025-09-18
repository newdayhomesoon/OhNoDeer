import React, {useEffect, useState, useRef} from 'react';
import {View, StyleSheet, Alert, Text, Animated} from 'react-native';
import MapView, {Marker, Circle, PROVIDER_GOOGLE} from 'react-native-maps';
import {featureFlags} from '../CoreLogic/featureFlags';
import {checkNearbyHotspots, FirebaseHotspot} from '../Storage/firebase/service';
import {Location} from '../CoreLogic/types';
import { theme } from '../../src/app-theme';

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface WildlifeMapProps {
  currentLocation: Location | null;
  onLocationUpdate?: (location: Location) => void;
  showLegend?: boolean;
}

const AnimatedUserLocation: React.FC<{location: Location}> = ({location}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    const opacityAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    opacityAnimation.start();

    return () => {
      pulseAnimation.stop();
      opacityAnimation.stop();
    };
  }, [pulseAnim, opacityAnim]);

  return (
    <Marker
      coordinate={{
        latitude: location.latitude,
        longitude: location.longitude,
      }}
      anchor={{x: 0.5, y: 0.5}}
    >
      <View style={styles.userLocationContainer}>
        <Animated.View
          style={[
            styles.userLocationPulse,
            {
              transform: [{scale: pulseAnim}],
              opacity: opacityAnim,
            },
          ]}
        />
        <View style={styles.userLocationCore} />
      </View>
    </Marker>
  );
};

const WildlifeMap: React.FC<WildlifeMapProps> = ({currentLocation, onLocationUpdate, showLegend = true}) => {
  const [hotspots, setHotspots] = useState<FirebaseHotspot[]>([]);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const getHeatColor = (heatLevel: 'Low' | 'Medium' | 'High'): string => {
    switch (heatLevel) {
      case 'High':
        return 'rgba(239, 68, 68, 0.7)';
      case 'Medium':
        return 'rgba(245, 158, 11, 0.7)';
      case 'Low':
        return 'rgba(34, 197, 94, 0.7)';
      default:
        return 'rgba(156, 163, 175, 0.7)';
    }
  };

  const getHeatBorderColor = (heatLevel: 'Low' | 'Medium' | 'High'): string => {
    switch (heatLevel) {
      case 'High':
        return '#dc2626';
      case 'Medium':
        return '#d97706';
      case 'Low':
        return '#16a34a';
      default:
        return '#6b7280';
    }
  };

  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (currentLocation) {
      setMapRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      loadHotspots(currentLocation.latitude, currentLocation.longitude);
    }
  }, [currentLocation]);

  const loadHotspots = async (latitude: number, longitude: number) => {
    try {
      const result = await checkNearbyHotspots(latitude, longitude);
      setHotspots(result.hotspots);
    } catch (error) {
      console.error('Error loading hotspots:', error);
      Alert.alert('Error', 'Failed to load wildlife hotspots');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapReady) {
        console.warn('[Map] Not ready after 5s');
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [mapReady]);

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        showsUserLocation={false}
        showsMyLocationButton={featureFlags.ENABLE_USER_LOCATION}
        onMapReady={() => {
          console.log('[Map] onMapReady');
          setMapReady(true);
        }}
        onMapLoaded={() => console.log('[Map] onMapLoaded')}
        onRegionChangeComplete={(region: Region) => {
          if (currentLocation) {
            const distance = Math.sqrt(
              Math.pow(region.latitude - currentLocation.latitude, 2) +
                Math.pow(region.longitude - currentLocation.longitude, 2),
            );
            if (distance > 0.01) {
              loadHotspots(region.latitude, region.longitude);
            }
          }
        }}>
        {currentLocation && featureFlags.ENABLE_USER_LOCATION && (
          <AnimatedUserLocation location={currentLocation} />
        )}

        {hotspots.map((hotspot, index) => (
          <Circle
            key={`${hotspot.gridId}_${index}`}
            center={{
              latitude: hotspot.coordinates.latitude,
              longitude: hotspot.coordinates.longitude,
            }}
            radius={500}
            fillColor={getHeatColor(hotspot.heatLevel)}
            strokeColor={getHeatBorderColor(hotspot.heatLevel)}
            strokeWidth={2}
          />
        ))}

        {hotspots.length === 0 && (
          <Marker
            coordinate={{
              latitude: mapRegion.latitude,
              longitude: mapRegion.longitude,
            }}
            title="Map Active"
            description="Placeholder marker (no hotspots)"
            pinColor="blue"
          />
        )}

        {hotspots
          .filter(h => h.heatLevel === 'High')
          .map((hotspot, index) => (
            <Marker
              key={`marker_${hotspot.gridId}_${index}`}
              coordinate={{
                latitude: hotspot.coordinates.latitude,
                longitude: hotspot.coordinates.longitude,
              }}
              title={'High Activity Area'}
              description={`${hotspot.reportCount} recent reports`}
              pinColor="red"
            />
          ))}
      </MapView>

      {!mapReady && (
        <View style={styles.overlayStatus}>
          <Text style={styles.overlayText}>Loading map…</Text>
        </View>
      )}

      {showLegend && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Deer Spotted</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendDotWrapper}>
              <View style={[styles.legendDotLarge, {backgroundColor: getHeatBorderColor('Low')}]} />
              <Text style={styles.legendRowText}>Low Activity</Text>
            </View>
            <View style={styles.legendDotWrapper}>
              <View style={[styles.legendDotLarge, {backgroundColor: getHeatBorderColor('Medium')}]} />
              <Text style={styles.legendRowText}>Medium Activity</Text>
            </View>
            <View style={styles.legendDotWrapper}>
              <View style={[styles.legendDotLarge, {backgroundColor: getHeatBorderColor('High')}]} />
              <Text style={styles.legendRowText}>High Activity</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#08111d',
  },
  overlayStatus: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)'
  },
  overlayStatusError: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,0,0,0.4)'
  },
  overlayText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  legend: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: theme.spacing.m,
    borderRadius: 10,
    maxWidth: 200,
  },
  legendTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.caption,
    fontWeight: '700',
    marginBottom: theme.spacing.s,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: theme.fontFamily.lato,
  },
  legendRow: {
    flexDirection: 'column',
    gap: 4,
  },
  legendDotWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  legendDotLarge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: theme.spacing.s,
  },
  legendRowText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.caption,
    fontWeight: '500',
    fontFamily: theme.fontFamily.openSans,
  },
  userLocationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  userLocationPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(74, 144, 226, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(74, 144, 226, 0.6)',
  },
  userLocationCore: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.accent,
    borderWidth: 3,
    borderColor: theme.colors.textPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default WildlifeMap;
