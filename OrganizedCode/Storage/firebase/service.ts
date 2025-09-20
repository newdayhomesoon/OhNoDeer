import {initializeApp} from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  setPersistence,
  User,
} from 'firebase/auth';
import { getReactNativePersistence } from 'firebase/auth/react-native';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  GeoPoint,
  Timestamp,
  orderBy,
  limit,
  updateDoc,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import {getFunctions, httpsCallable} from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {firebaseConfig, firebaseConfigIsPlaceholder} from './config';
// Lightweight event listeners (avoid adding external deps)
type ConnectivityListener = (state: { offline: boolean; lastChange: number }) => void;
const connectivityListeners: ConnectivityListener[] = [];
let connectivityState = { offline: false, lastChange: Date.now() };
function notifyConnectivity() {
  connectivityListeners.forEach(l => {
    try { l(connectivityState); } catch {}
  });
}
function setOffline(offline: boolean) {
  if (connectivityState.offline !== offline) {
    connectivityState = { offline, lastChange: Date.now() };
    notifyConnectivity();
  }
}
export function onFirestoreConnectivityChange(listener: ConnectivityListener) {
  connectivityListeners.push(listener);
  // immediate push current state
  listener(connectivityState);
  return () => {
    const idx = connectivityListeners.indexOf(listener);
    if (idx >= 0) connectivityListeners.splice(idx, 1);
  };
}

// Types
export interface WildlifeReport {
  userId: string;
  timestamp: Timestamp;
  location: GeoPoint;
  animalCount: number;
  animalType: string;
}

export interface FirebaseHotspot {
  coordinates: GeoPoint;
  heatLevel: 'Low' | 'Medium' | 'High';
  reportCount: number;
  lastUpdated: Timestamp;
  gridId: string;
  radius: number;
  animalType: string;
  county?: string | null;
}

export interface FirebaseUserProfile {
  id: string;
  isPro: boolean;
  email: string;
  authId: string;
  subscriptionId?: string;
  subscriptionExpiry?: number;
}

// Initialize Firebase only if real config present
let app: ReturnType<typeof initializeApp> | null = null;
if (!firebaseConfigIsPlaceholder) {
  console.log('[DEBUG] Initializing Firebase app...');
  app = initializeApp(firebaseConfig);
  console.log('[DEBUG] Firebase app initialized successfully');
} else {
  console.warn('[DEBUG] Firebase config is placeholder, app not initialized');
}

// Export helpers that throw clear error if used before proper config
function requireApp(): ReturnType<typeof initializeApp> {
  if (!app) {
    throw new Error('Firebase not initialized: replace placeholder config in firebase/config.ts');
  }
  return app;
}

export const auth = (() => {
  console.log('[DEBUG] Initializing Firebase auth...');
  const authInstance = getAuth(requireApp());
  console.log('[DEBUG] Setting auth persistence to getReactNativePersistence...');
  // Set persistence to AsyncStorage for React Native compatibility
  setPersistence(authInstance, getReactNativePersistence(AsyncStorage)).catch((error) => {
    console.warn('[DEBUG] Failed to set auth persistence:', error);
  });
  console.log('[DEBUG] Firebase auth initialized successfully');
  return authInstance;
})();
export const db = (() => {
  console.log('[DEBUG] Initializing Firestore...');
  const instance = getFirestore(requireApp());
  console.log('[DEBUG] Setting Firestore settings...');
  // Improve reliability in React Native / emulator or restricted network environments
  // Only set settings if not already applied (avoids runtime warnings)
  try {
    // @ts-ignore - settings may not be strongly typed for these props in current version
    instance.settings({
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false,
    });
    console.log('[DEBUG] Firestore settings applied successfully');
  } catch (e) {
    console.warn('[DEBUG] Failed to apply Firestore settings:', e);
  }
  // Initial lightweight probe (non-fatal) to infer connectivity; uses a non-existent doc to reduce cost
  console.log('[DEBUG] Testing Firestore connectivity...');
  (async () => {
    try {
      const probeRef = doc(instance, '__health', 'ping');
      await getDoc(probeRef);
      setOffline(false); // success -> online
      console.log('[DEBUG] Firestore connectivity test passed');
    } catch (e: any) {
      if (e?.code === 'unavailable') {
        setOffline(true);
        console.warn('[DEBUG] Firestore connectivity test failed - offline mode');
      } else {
        console.warn('[DEBUG] Firestore connectivity test error:', e);
      }
    }
  })();
  console.log('[DEBUG] Firestore initialized successfully');
  return instance;
})();
// Region hint (adjust if your functions are deployed elsewhere)
const FUNCTIONS_REGION = process.env.FIREBASE_FUNCTIONS_REGION || 'us-central1';
export const functions = (() => getFunctions(requireApp(), FUNCTIONS_REGION))();

// Authentication
export const signInUser = async (): Promise<User | null> => {
  try {
    console.log('[DEBUG] signInUser - Starting anonymous sign in...');
    const result = await signInAnonymously(auth);
    console.log('[DEBUG] signInUser - Anonymous sign in successful, user:', result.user.uid);
    console.log('[DEBUG] signInUser - User details:', {
      uid: result.user.uid,
      email: result.user.email,
      isAnonymous: result.user.isAnonymous,
      emailVerified: result.user.emailVerified
    });
    return result.user;
  } catch (error) {
    console.error('[DEBUG] signInUser - Authentication error:', error);
    return null;
  }
};

export const getCurrentUser = (): User | null => {
  const user = auth.currentUser;
  console.log('[DEBUG] getCurrentUser called, current user:', user?.uid, user?.isAnonymous);
  return user;
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  console.log('[DEBUG] onAuthStateChange listener registered');
  return onAuthStateChanged(auth, (user) => {
    console.log('[DEBUG] onAuthStateChange fired with user:', user?.uid, user?.isAnonymous);
    callback(user);
  });
};

// Wildlife Reports
export const addWildlifeReport = async (
  animalType: string,
  location: {latitude: number; longitude: number},
  animalCount: number = 1,
): Promise<string | null> => {
  try {
    console.log('[DEBUG] addWildlifeReport called with:', animalType, location, animalCount);
    const user = getCurrentUser();
    console.log('[DEBUG] addWildlifeReport - Current user:', user?.uid);
    if (!user) {
      throw new Error('User not authenticated');
    }

    const reportData: Omit<WildlifeReport, 'userId'> = {
      timestamp: Timestamp.now(),
      location: new GeoPoint(location.latitude, location.longitude),
      animalCount,
      animalType,
    };

    console.log('[DEBUG] addWildlifeReport - Adding to collection with data:', { ...reportData, userId: user.uid });
    const docRef = await addDoc(collection(db, 'wildlife_reports'), {
      ...reportData,
      userId: user.uid,
    });

    console.log('[DEBUG] addWildlifeReport - Document added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[DEBUG] Error adding wildlife report:', error);
    return null;
  }
};

export const getUserReports = async (
  userId: string,
): Promise<WildlifeReport[]> => {
  try {
    console.log('[DEBUG] Firebase.getUserReports - Querying for userId:', userId);
    console.log('[DEBUG] Firebase.getUserReports - User ID type:', typeof userId);
    console.log('[DEBUG] Firebase.getUserReports - User ID length:', userId?.length);
    
    const q = query(
      collection(db, 'wildlife_reports'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50),
    );

    console.log('[DEBUG] Firebase.getUserReports - Query object created');
    console.log('[DEBUG] Firebase.getUserReports - Executing query...');
    const querySnapshot = await getDocs(q);
    console.log('[DEBUG] Firebase.getUserReports - Query completed. Snapshot size:', querySnapshot.size);
    console.log('[DEBUG] Firebase.getUserReports - Query completed. Snapshot empty:', querySnapshot.empty);
    
    if (querySnapshot.empty) {
      console.log('[DEBUG] Firebase.getUserReports - No documents found for user:', userId);
      console.log('[DEBUG] Firebase.getUserReports - Checking if there are any documents in the collection at all...');
      
      // Check if there are any documents in the collection
      const allDocsQuery = query(collection(db, 'wildlife_reports'), limit(1));
      const allDocsSnapshot = await getDocs(allDocsQuery);
      console.log('[DEBUG] Firebase.getUserReports - Total documents in collection:', allDocsSnapshot.size);
      
      if (allDocsSnapshot.size > 0) {
        console.log('[DEBUG] Firebase.getUserReports - Sample document data:', allDocsSnapshot.docs[0].data());
      }
      
      return [];
    }
    
    const reports = querySnapshot.docs.map((doc: any) => {
      const data = doc.data() as WildlifeReport;
      console.log('[DEBUG] Firebase.getUserReports - Document ID:', doc.id, 'Data:', data);
      console.log('[DEBUG] Firebase.getUserReports - Document userId matches query userId:', data.userId === userId);
      return data;
    });
    
    console.log('[DEBUG] Firebase.getUserReports - Total reports found:', reports.length);
    return reports;
  } catch (error) {
    console.error('[DEBUG] Firebase.getUserReports - Error getting user reports:', error);
    console.error('[DEBUG] Firebase.getUserReports - Error details:', error instanceof Error ? error.message : error);
    return [];
  }
};

export const getRecentSightings = async (
  hoursBack: number = 12,
): Promise<WildlifeReport[]> => {
  try {
    console.log('[DEBUG] Firebase.getRecentSightings - Getting sightings from last', hoursBack, 'hours');
    
    // Calculate timestamp for X hours ago
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hoursBack);
    const timestampLimit = Timestamp.fromDate(hoursAgo);
    
    console.log('[DEBUG] Firebase.getRecentSightings - Timestamp limit:', timestampLimit.toDate());
    
    const q = query(
      collection(db, 'wildlife_reports'),
      where('timestamp', '>=', timestampLimit),
      orderBy('timestamp', 'desc'),
      limit(100), // Get more to allow for location filtering
    );

    console.log('[DEBUG] Firebase.getRecentSightings - Executing query...');
    const querySnapshot = await getDocs(q);
    console.log('[DEBUG] Firebase.getRecentSightings - Query completed. Snapshot size:', querySnapshot.size);
    
    const reports = querySnapshot.docs.map((doc: any) => {
      const data = doc.data() as WildlifeReport;
      return data;
    });
    
    console.log('[DEBUG] Firebase.getRecentSightings - Total recent reports found:', reports.length);
    return reports;
  } catch (error) {
    console.error('[DEBUG] Firebase.getRecentSightings - Error getting recent sightings:', error);
    console.error('[DEBUG] Firebase.getRecentSightings - Error details:', error instanceof Error ? error.message : error);
    return [];
  }
};

// Hotspots
// Create or update a hotspot for a sighting
export const createOrUpdateHotspot = async (
  latitude: number,
  longitude: number,
  animalType: string,
  quantity: number,
  county: string | null = null
) => {
  // Use a grid system for hotspot grouping (e.g., round lat/lng to nearest 0.01)
  const gridLat = Math.round(latitude * 100) / 100;
  const gridLng = Math.round(longitude * 100) / 100;
  const gridId = `${animalType}_${gridLat}_${gridLng}`;
  const hotspotRef = doc(db, 'hotspots', gridId);
  const hotspotSnap = await getDoc(hotspotRef);
  let newCount = quantity;
  let heatLevel: 'Low' | 'Medium' | 'High' = 'Low';
  if (hotspotSnap.exists()) {
    const data = hotspotSnap.data();
    newCount += data.reportCount || 0;
  }
  if (newCount >= 5) heatLevel = 'High';
  else if (newCount >= 3) heatLevel = 'Medium';
  else heatLevel = 'Low';
  await setDoc(hotspotRef, {
    coordinates: new GeoPoint(latitude, longitude),
    heatLevel,
    reportCount: newCount,
    lastUpdated: Timestamp.now(),
    gridId,
    radius: 500,
    animalType,
    county: county || null,
  }, { merge: true });
  return { gridId, heatLevel, reportCount: newCount, county, animalType };
};
export const checkNearbyHotspots = async (
  latitude: number,
  longitude: number,
): Promise<{hotspots: FirebaseHotspot[]; count: number}> => {
  try {
    const checkHotspotsFunction = httpsCallable<
      {latitude: number; longitude: number},
      {hotspots: FirebaseHotspot[]; count: number}
    >(functions, 'checkHotspots');
    try {
      const result = await checkHotspotsFunction({ latitude, longitude });
      // Ensure animalType is present in all returned hotspots
      if (result.data && Array.isArray(result.data.hotspots)) {
        result.data.hotspots = result.data.hotspots.map(h => ({
          ...h,
          animalType: h.animalType || '',
        }));
      }
      return result.data;
    } catch (err: any) {
      if (err?.code === 'functions/not-found') {
        console.warn('checkHotspots function not deployed yet - returning empty set');
        return { hotspots: [], count: 0 };
      }
      throw err;
    }
  } catch (error) {
    console.error('Error checking hotspots:', error);
    if ((error as any)?.code === 'unavailable') setOffline(true);
    return {hotspots: [], count: 0};
  }
};

// Trigger real-time hotspot update after report submission
export const triggerHotspotUpdate = async (
  reportId?: string,
): Promise<{success: boolean; hotspotsUpdated: number; message: string}> => {
  try {
    const triggerUpdateFunction = httpsCallable<
      {reportId?: string},
      {success: boolean; hotspotsUpdated: number; message: string}
    >(functions, 'triggerHotspotUpdate');

    try {
      const result = await triggerUpdateFunction({ reportId });
      console.log('[DEBUG] triggerHotspotUpdate result:', result.data);
      return result.data;
    } catch (err: any) {
      if (err?.code === 'functions/not-found') {
        console.warn('triggerHotspotUpdate function not deployed yet - hotspots will update hourly');
        return {
          success: false,
          hotspotsUpdated: 0,
          message: 'Hotspot update function not available - will update hourly'
        };
      }
      throw err;
    }
  } catch (error) {
    console.error('Error triggering hotspot update:', error);
    return {
      success: false,
      hotspotsUpdated: 0,
      message: 'Failed to trigger hotspot update'
    };
  }
};

// Expose manual triggers for enabling/disabling network if desired later
export async function markFirestoreOfflineForUI() { setOffline(true); }
export async function markFirestoreOnlineForUI() { setOffline(false); }

// User Profile
export const getUserProfile = async (
  userId: string,
): Promise<FirebaseUserProfile | null> => {
  try {
    // Prefer direct fetch by UID doc to comply with security rules and avoid queries
    const ref = doc(db, 'users', userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as Omit<FirebaseUserProfile, 'id'>;
      return { ...data, id: snap.id } as FirebaseUserProfile;
    }
    // Fallback to legacy lookup by authId if older docs exist
    const q = query(collection(db, 'users'), where('authId', '==', userId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const first = querySnapshot.docs[0];
      const data = first.data() as Omit<FirebaseUserProfile, 'id'>;
      return { ...data, id: first.id } as FirebaseUserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<FirebaseUserProfile>,
): Promise<void> => {
  try {
    const ref = doc(db, 'users', userId);
    await updateDoc(ref, { ...updates, updatedAt: Timestamp.now() });
  } catch (error: any) {
    // If doc doesn't exist, create it instead to keep flow resilient
    if (error?.code === 'not-found') {
      await setDoc(doc(db, 'users', userId), {
        ...updates,
        authId: userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }, { merge: true });
      return;
    }
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const createUserProfile = async (
  userId: string,
  email: string,
): Promise<void> => {
  try {
    const ref = doc(db, 'users', userId);
    // Use merge to avoid overwriting if doc already exists
    await setDoc(ref, {
      isPro: false,
      email,
      authId: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const logError = async (
  errorMessage: string,
  source: string,
  userId?: string,
): Promise<void> => {
  try {
    await addDoc(collection(db, 'error_logs'), {
      errorMessage,
      source,
      userId: userId || 'anonymous',
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error('Failed to log error:', error);
  }
};

// Type conversion utilities
export const firebaseHotspotToHotspot = (
  firebaseHotspot: FirebaseHotspot,
): import('../../CoreLogic/types').Hotspot => {
  return {
    id: firebaseHotspot.gridId, // Use gridId as id
    coordinates: {
      latitude: firebaseHotspot.coordinates.latitude,
      longitude: firebaseHotspot.coordinates.longitude,
    },
    heatLevel: firebaseHotspot.heatLevel,
    reportCount: firebaseHotspot.reportCount,
    lastUpdated: firebaseHotspot.lastUpdated.toMillis(),
    gridId: firebaseHotspot.gridId,
    radius: firebaseHotspot.radius,
  };
};

export const hotspotToFirebaseHotspot = (
  hotspot: import('../../CoreLogic/types').Hotspot,
): FirebaseHotspot => {
  return {
    coordinates: new GeoPoint(
      hotspot.coordinates.latitude,
      hotspot.coordinates.longitude,
    ),
    heatLevel: hotspot.heatLevel,
    reportCount: hotspot.reportCount,
    lastUpdated: Timestamp.fromMillis(hotspot.lastUpdated),
    gridId: hotspot.gridId,
    radius: hotspot.radius,
    animalType: (hotspot as any).animalType || '', // Only add if present
  };
};
