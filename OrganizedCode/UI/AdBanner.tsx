import React from 'react';
import {View, StyleSheet} from 'react-native';
import {adService} from '../Storage/adService';
import {theme} from '../../src/app-theme';

interface AdBannerProps {
  isPro: boolean;
}

const AdBanner: React.FC<AdBannerProps> = ({isPro}) => {
  if (isPro) {
    return null; // Don't show ads for Pro users
  }

  const bannerAd = adService.getBannerAd();

  if (!bannerAd) {
    return null;
  }

  return <View style={styles.container}>{bannerAd}</View>;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: theme.spacing.s,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    overflow: 'hidden',
  },
});

export default AdBanner;
