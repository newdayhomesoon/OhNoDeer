import {initializeApp} from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
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
  app = initializeApp(firebaseConfig);
}

// Export helpers that throw clear error if used before proper config
function requireApp(): ReturnType<typeof initializeApp> {
  if (!app) {
    throw new Error('Firebase not initialized: replace placeholder config in firebase/config.ts');
  }
  return app;
}

export const auth = (() => getAuth(requireApp()))();
export const db = (() => {
  const instance = getFirestore(requireApp());
  // Improve reliability in React Native / emulator or restricted network environments
  // Only set settings if not already applied (avoids runtime warnings)
  try {
    // @ts-ignore - settings may not be strongly typed for these props in current version
    instance.settings({
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false,
    });
  } catch (e) {
    // Swallow setting errors silently (e.g., if called twice)
  }
  // Initial lightweight probe (non-fatal) to infer connectivity; uses a non-existent doc to reduce cost
  (async () => {
    try {
      const probeRef = doc(instance, '__health', 'ping');
      await getDoc(probeRef);
      setOffline(false); // success -> online
    } catch (e: any) {
      if (e?.code === 'unavailable') setOffline(true);
    }
  })();
  return instance;
})();
// Region hint (adjust if your functions are deployed elsewhere)
const FUNCTIONS_REGION = process.env.FIREBASE_FUNCTIONS_REGION || 'us-central1';
export const functions = (() => getFunctions(requireApp(), FUNCTIONS_REGION))();

// Authentication
export const signInUser = async (): Promise<User | null> => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Wildlife Reports
export const addWildlifeReport = async (
  animalType: string,
  location: {latitude: number; longitude: number},
  animalCount: number = 1,
): Promise<string | null> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const reportData: Omit<WildlifeReport, 'userId'> = {
      timestamp: Timestamp.now(),
      location: new GeoPoint(location.latitude, location.longitude),
      animalCount,
      animalType,
    };

    const docRef = await addDoc(collection(db, 'wildlife_reports'), {
      ...reportData,
      userId: user.uid,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error adding wildlife report:', error);
    return null;
  }
};

export const getUserReports = async (
  userId: string,
): Promise<WildlifeReport[]> => {
  try {
    const q = query(
      collection(db, 'wildlife_reports'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50),
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc: any) => doc.data() as WildlifeReport);
  } catch (error) {
    console.error('Error getting user reports:', error);
    return [];
  }
};

// Hotspots
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
  };
};
