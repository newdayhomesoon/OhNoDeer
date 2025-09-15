import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Alert, Text} from 'react-native';
import MapView, {Marker, Circle, PROVIDER_GOOGLE} from 'react-native-maps';
import {featureFlags} from '../CoreLogic/featureFlags';
import {checkNearbyHotspots, FirebaseHotspot} from '../Storage/firebase/service';
import {Location} from '../CoreLogic/types';

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
        showsUserLocation={featureFlags.ENABLE_USER_LOCATION}
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  legend: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 10,
    maxWidth: 200,
  },
  legendTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legendRow: {
    flexDirection: 'column',
    gap: 4,
  },
  legendDotWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDotLarge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  legendRowText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
});

export default WildlifeMap;
