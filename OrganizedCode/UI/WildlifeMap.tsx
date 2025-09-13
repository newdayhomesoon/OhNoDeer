import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Alert, Text} from 'react-native';
import MapView, {Marker, Circle, PROVIDER_GOOGLE} from 'react-native-maps';
import {
  checkNearbyHotspots,
  FirebaseHotspot,
} from '../Storage/firebase/service';
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
}

const WildlifeMap: React.FC<WildlifeMapProps> = ({
  currentLocation,
  onLocationUpdate,
}) => {
  const [hotspots, setHotspots] = useState<FirebaseHotspot[]>([]);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Update map region when current location changes
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

  const getHeatColor = (heatLevel: 'Low' | 'Medium' | 'High'): string => {
    switch (heatLevel) {
      case 'High':
        return 'rgba(239, 68, 68, 0.7)'; // Red
      case 'Medium':
        return 'rgba(245, 158, 11, 0.7)'; // Orange/Yellow
      case 'Low':
        return 'rgba(34, 197, 94, 0.7)'; // Green
      default:
        return 'rgba(156, 163, 175, 0.7)'; // Gray
    }
  };

  const getHeatBorderColor = (heatLevel: 'Low' | 'Medium' | 'High'): string => {
    switch (heatLevel) {
      case 'High':
        return '#dc2626'; // Dark red
      case 'Medium':
        return '#d97706'; // Dark orange
      case 'Low':
        return '#16a34a'; // Dark green
      default:
        return '#6b7280'; // Dark gray
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        // Temporarily disable user location layer to avoid FusedLocationProviderClient class mismatch crash
        // showsUserLocation
        // showsMyLocationButton
        onRegionChangeComplete={(region: Region) => {
          // Optional: Load hotspots for new region if user pans far
          if (currentLocation) {
            const distance = Math.sqrt(
              Math.pow(region.latitude - currentLocation.latitude, 2) +
                Math.pow(region.longitude - currentLocation.longitude, 2),
            );
            if (distance > 0.01) {
              // If user moved more than ~1km
              loadHotspots(region.latitude, region.longitude);
            }
          }
        }}>
        {/* Render hotspots as circles */}
        {hotspots.map((hotspot, index) => (
          <Circle
            key={`${hotspot.gridId}_${index}`}
            center={{
              latitude: hotspot.coordinates.latitude,
              longitude: hotspot.coordinates.longitude,
            }}
            radius={500} // 500 meters radius for visibility
            fillColor={getHeatColor(hotspot.heatLevel)}
            strokeColor={getHeatBorderColor(hotspot.heatLevel)}
            strokeWidth={2}
          />
        ))}

        {/* Optional: Add markers for high-heat areas */}
        {hotspots
          .filter(hotspot => hotspot.heatLevel === 'High')
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

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendColor, {backgroundColor: getHeatColor('Low')}]}
          />
          <View style={styles.legendText}>
            <View style={styles.legendCircle} />
            <View style={styles.legendLabel}>
              <View style={styles.legendTextContent}>
                <View
                  style={[
                    styles.legendDot,
                    {backgroundColor: getHeatBorderColor('Low')},
                  ]}
                />
                <View style={styles.legendTextWrapper}>
                  <View style={styles.legendTextLine}>
                    <Text style={styles.legendTextWord}>Low</Text>
                    <Text style={styles.legendTextWord}>Activity</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColor,
              {backgroundColor: getHeatColor('Medium')},
            ]}
          />
          <View style={styles.legendText}>
            <View style={styles.legendCircle} />
            <View style={styles.legendLabel}>
              <View style={styles.legendTextContent}>
                <View
                  style={[
                    styles.legendDot,
                    {backgroundColor: getHeatBorderColor('Medium')},
                  ]}
                />
                <View style={styles.legendTextWrapper}>
                  <View style={styles.legendTextLine}>
                    <Text style={styles.legendTextWord}>Medium</Text>
                    <Text style={styles.legendTextWord}>Activity</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColor,
              {backgroundColor: getHeatColor('High')},
            ]}
          />
          <View style={styles.legendText}>
            <View style={styles.legendCircle} />
            <View style={styles.legendLabel}>
              <View style={styles.legendTextContent}>
                <View
                  style={[
                    styles.legendDot,
                    {backgroundColor: getHeatBorderColor('High')},
                  ]}
                />
                <View style={styles.legendTextWrapper}>
                  <View style={styles.legendTextLine}>
                    <Text style={styles.legendTextWord}>High</Text>
                    <Text style={styles.legendTextWord}>Activity</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
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
  },
  legend: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 8,
    minWidth: 120,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
  },
  legendCircle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  legendLabel: {
    marginLeft: 16,
  },
  legendTextContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendTextWrapper: {
    flex: 1,
  },
  legendTextLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendTextWord: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
});

export default WildlifeMap;
