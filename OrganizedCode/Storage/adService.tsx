import React from 'react';

// Mock implementation since @react-native-firebase/admob is not available
class AdService {
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    // Mock initialization
    this.isInitialized = true;
    console.log('Ad service initialized (mock)');
    return true;
  }

  getBannerAd(): React.ReactElement | null {
    if (!this.isInitialized) {
      console.warn('Ad service not initialized');
      return null;
    }

    // Return a placeholder view instead of actual ad
    return <React.Fragment>{/* Placeholder for ad */}</React.Fragment>;
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      platform: 'mock',
    };
  }

  async cleanup() {
    this.isInitialized = false;
  }
}

export const adService = new AdService();
