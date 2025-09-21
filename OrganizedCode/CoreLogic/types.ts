export type AnimalType =
  | 'deer'
  | 'bear'
  | 'moose_elk'
  | 'raccoon'
  | 'rabbit'
  | 'small_mammals';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface SimpleLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface SightingReport {
  id: string;
  type: AnimalType;
  quantity: number;
  timestamp: number;
  location: Location;
  reportedBy: string;
  status?: 'reported' | 'verified';
}

export type AnimalCategory = 'deer' | 'bear' | 'moose_elk' | 'small_mammals';

export const AnimalCategories: Record<
  AnimalCategory,
  {label: string; types: AnimalType[]}
> = {
  deer: {label: 'Deer', types: ['deer']},
  bear: {label: 'Bear', types: ['bear']},
  moose_elk: {label: 'Moose/Elk', types: ['moose_elk']},
  small_mammals: {
    label: 'Small Mammals',
    types: ['raccoon', 'rabbit', 'small_mammals'],
  },
};

// New types for advanced features
export interface UserProfile {
  id: string;
  email: string;
  isPro: boolean;
  subscriptionId?: string;
  subscriptionExpiry?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Hotspot {
  id: string;
  coordinates: Location;
  heatLevel: 'Low' | 'Medium' | 'High';
  reportCount: number;
  lastUpdated: number;
  gridId: string;
  radius: number; // in meters
}

export interface GeofenceRegion {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEntry: boolean;
  notifyOnExit: boolean;
}

export interface SubscriptionProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  period: 'monthly' | 'annual';
  platform: 'ios' | 'android';
}

export interface VoiceCommandResult {
  action: 'report_sighting';
  animalType: AnimalType;
  quantity: number;
  location?: Location;
}

export type AlertType = 'push' | 'audio' | 'voice';

export interface HotspotAlert {
  hotspotId: string;
  alertType: AlertType;
  message: string;
  timestamp: number;
  location: Location;
}
