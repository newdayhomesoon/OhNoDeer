import AsyncStorage from '@react-native-async-storage/async-storage';
import {v4 as uuidv4} from 'uuid';
import {SightingReport} from '../CoreLogic/types';

const SIGHTINGS_KEY = '@OhNoDeer:sightings';

const getSightings = async (): Promise<SightingReport[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(SIGHTINGS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    return [];
  }
};

const addSighting = async (
  sighting: Omit<SightingReport, 'id' | 'timestamp' | 'status'>,
): Promise<boolean> => {
  try {
    const sightings = await getSightings();
    const newSighting: SightingReport = {
      ...sighting,
      id: uuidv4(),
      timestamp: Date.now(),
      status: 'reported',
    };

    await AsyncStorage.setItem(
      SIGHTINGS_KEY,
      JSON.stringify([...sightings, newSighting]),
    );
    return true;
  } catch (e) {
    return false;
  }
};

const getRecentSightings = async (
  limit: number = 50,
): Promise<SightingReport[]> => {
  try {
    const sightings = await getSightings();
    return sightings
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(sighting => ({
        ...sighting,
        status: sighting.status || 'reported',
        location: {
          ...sighting.location,
          accuracy: sighting.location.accuracy || 0,
        },
      }));
  } catch (e) {
    return [];
  }
};

const clearSightings = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SIGHTINGS_KEY);
  } catch (e) {
    // ignore
  }
};

export const SightingService = {
  getSightings,
  addSighting,
  getRecentSightings,
  clearSightings,
};

export default SightingService;
