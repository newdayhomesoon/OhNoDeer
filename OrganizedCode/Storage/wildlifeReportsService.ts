import {
  addWildlifeReport,
  getUserReports,
  checkNearbyHotspots,
  signInUser,
  getCurrentUser,
  onAuthStateChange,
  createUserProfile,
  updateUserProfile as updateUserProfileFirebase,
  getUserProfile as getUserProfileFirebase,
  logError,
  WildlifeReport as FirebaseReport,
  FirebaseHotspot,
  FirebaseUserProfile,
  firebaseHotspotToHotspot,
} from './firebase/service';
import {
  SightingReport,
  Location,
  AnimalType,
  Hotspot,
} from '../CoreLogic/types';

// Convert Firebase report to app format
const firebaseToAppReport = (
  firebaseReport: FirebaseReport,
): SightingReport => ({
  id: `${firebaseReport.userId}_${firebaseReport.timestamp.toMillis()}`,
  type: firebaseReport.animalType as AnimalType,
  quantity: firebaseReport.animalCount,
  timestamp: firebaseReport.timestamp.toMillis(),
  location: {
    latitude: firebaseReport.location.latitude,
    longitude: firebaseReport.location.longitude,
    accuracy: 0,
  },
  reportedBy: firebaseReport.userId,
  status: 'reported',
});

// Wildlife Reports Service
export const WildlifeReportsService = {
  // Submit a new wildlife report
  async submitReport(
    animalType: AnimalType,
    location: Location,
    animalCount: number = 1,
  ): Promise<string | null> {
    try {
      const user = getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const reportId = await addWildlifeReport(
        animalType,
        {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        animalCount,
      );

      return reportId;
    } catch (error) {
      console.error('Error submitting wildlife report:', error);
      return null;
    }
  },

  // Get user's recent reports
  async getUserReports(limit: number = 50): Promise<SightingReport[]> {
    try {
      const user = getCurrentUser();
      if (!user) {
        return [];
      }

      const firebaseReports = await getUserReports(user.uid);
      return firebaseReports
        .slice(0, limit)
        .map(firebaseToAppReport)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting user reports:', error);
      return [];
    }
  },

  // Get nearby hotspots
  async getNearbyHotspots(
    latitude: number, 
    longitude: number
  ): Promise<{hotspots: Hotspot[]; count: number}> {
    try {
      const result = await checkNearbyHotspots(latitude, longitude);
      return {
        hotspots: result.hotspots.map(firebaseHotspotToHotspot),
        count: result.count,
      };
    } catch (error) {
      console.error('Error getting nearby hotspots:', error);
      await logError(
        `Failed to get nearby hotspots: ${error}`,
        'WildlifeReportsService.getNearbyHotspots',
        getCurrentUser()?.uid,
      );
      return {hotspots: [], count: 0};
    }
  },

  // Get user profile
  async getUserProfile(userId: string): Promise<FirebaseUserProfile | null> {
    try {
      return await getUserProfileFirebase(userId);
    } catch (error) {
      console.error('Error getting user profile:', error);
      await logError(
        `Failed to get user profile: ${error}`,
        'WildlifeReportsService.getUserProfile',
        userId,
      );
      return null;
    }
  },

  // Update user profile
  async updateUserProfile(
    userId: string,
    updates: Partial<FirebaseUserProfile>,
  ): Promise<void> {
    try {
      await updateUserProfileFirebase(userId, updates);
    } catch (error) {
      console.error('Error updating user profile:', error);
      await logError(
        `Failed to update user profile: ${error}`,
        'WildlifeReportsService.updateUserProfile',
        userId,
      );
      throw error;
    }
  },
};

// Authentication Service
export const AuthService = {
  // Sign in anonymously
  async signInAnonymously(): Promise<boolean> {
    try {
      const user = await signInUser();
      if (user) {
        // Create user profile if it doesn't exist
        await createUserProfile(
          user.uid,
          user.email || 'anonymous@example.com',
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      return false;
    }
  },

  // Get current user
  getCurrentUser() {
    return getCurrentUser();
  },

  // Listen to auth state changes
  onAuthStateChange(
    callback: (user: import('firebase/auth').User | null) => void,
  ) {
    return onAuthStateChange(callback);
  },
};

export default WildlifeReportsService;
