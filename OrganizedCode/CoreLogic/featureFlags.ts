export const featureFlags = {
  MAP_PROVIDER: 'google' as 'google',
  ENABLE_USER_LOCATION: true,
  ENABLE_ADS: false,
  ENABLE_VOICE_COMMANDS: false,
};

export type FeatureFlags = typeof featureFlags;
