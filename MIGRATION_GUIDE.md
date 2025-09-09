# Migration Guide: AsyncStorage to Firebase

## Overview
This guide outlines the steps to migrate from the existing AsyncStorage-based storage to the new Firebase backend.

## Files to Update

### 1. Update SightingService (`OrganizedCode/Storage/sightingService.ts`)

**Before:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import {v4 as uuidv4} from 'uuid';
import {SightingReport} from '../CoreLogic/types';
```

**After:**
```typescript
import {
  addWildlifeReport,
  getUserReports,
  signInUser,
  getCurrentUser,
  onAuthStateChange
} from './firebase/service';
import {SightingReport} from '../CoreLogic/types';
```

### 2. Update Core Functions

**addSighting function:**
```typescript
const addSighting = async (
  sighting: Omit<SightingReport, 'id' | 'timestamp' | 'status'>,
): Promise<boolean> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      await signInUser(); // Ensure user is authenticated
    }

    const reportId = await addWildlifeReport(
      sighting.type,
      {
        latitude: sighting.location.latitude,
        longitude: sighting.location.longitude
      },
      sighting.quantity
    );

    return reportId !== null;
  } catch (e) {
    return false;
  }
};
```

**getRecentSightings function:**
```typescript
const getRecentSightings = async (
  limit: number = 50,
): Promise<SightingReport[]> => {
  try {
    const user = getCurrentUser();
    if (!user) return [];

    const firebaseReports = await getUserReports(user.uid);

    // Convert Firebase format to existing SightingReport format
    return firebaseReports.map(report => ({
      id: `${report.userId}_${report.timestamp.toMillis()}`,
      type: report.animalType as any,
      quantity: report.animalCount || 1,
      timestamp: report.timestamp.toMillis(),
      location: {
        latitude: report.location.latitude,
        longitude: report.location.longitude,
        accuracy: 0
      },
      reportedBy: report.userId,
      status: 'reported' as const
    }));
  } catch (e) {
    return [];
  }
};
```

### 3. Update App Initialization

Add Firebase initialization to your main App component:

```typescript
import { signInUser, onAuthStateChange } from './OrganizedCode/Storage/firebase/service';

// In App.tsx or main component
useEffect(() => {
  const unsubscribe = onAuthStateChange((user) => {
    if (user) {
      console.log('User authenticated:', user.uid);
    } else {
      signInUser(); // Auto-sign in anonymous user
    }
  });

  return unsubscribe;
}, []);
```

### 4. Update HomeScreen for Hotspots

Add hotspot checking to your HomeScreen:

```typescript
import { checkNearbyHotspots } from '../Storage/firebase/service';

// In HomeScreen component
const loadHotspots = async (latitude: number, longitude: number) => {
  const { hotspots, count } = await checkNearbyHotspots(latitude, longitude);
  setHotspots(hotspots);
  console.log(`Found ${count} hotspots nearby`);
};
```

## Breaking Changes

### Data Structure Changes
- **ID Generation**: No longer uses UUID, Firebase generates document IDs
- **Timestamp Format**: Changed from number to Firestore Timestamp
- **Location Format**: Changed from plain object to GeoPoint
- **Status Field**: Simplified status handling

### Authentication Requirements
- All operations now require Firebase authentication
- Anonymous authentication is used for seamless user experience
- User profiles are automatically created in Firestore

### Real-time Updates
- Hotspots are now updated every hour via Cloud Functions
- No manual refresh needed for hotspot data
- Data is automatically synced across devices

## Testing Migration

1. **Install Firebase**: `npm install firebase`
2. **Update Firebase Config**: Replace placeholder values in `firebase/config.ts`
3. **Test Authentication**: Verify anonymous sign-in works
4. **Test Report Submission**: Submit a test wildlife report
5. **Test Hotspot Query**: Check nearby hotspots functionality

## Rollback Plan

If issues arise during migration:
1. Keep AsyncStorage functions as backup
2. Use feature flags to switch between implementations
3. Gradually migrate users to Firebase backend
4. Monitor error rates and performance metrics

## Performance Considerations

- **Firebase Cold Starts**: First function calls may be slower
- **Offline Support**: Firebase provides automatic offline persistence
- **Bundle Size**: Firebase SDK adds ~200KB to app bundle
- **Network Usage**: Real-time sync may increase data usage

## Next Steps

1. Set up Firebase project and update configuration
2. Deploy Cloud Functions to Firebase
3. Test end-to-end functionality
4. Monitor performance and error rates
5. Gradually roll out to production users
