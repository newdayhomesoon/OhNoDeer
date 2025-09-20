import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {SubscriptionProduct} from '../CoreLogic/types';
import {inAppPurchaseService} from '../Storage/inAppPurchaseService';
import { theme } from '../../src/app-theme';
import { useMessageModal } from './useMessageModal';

interface SubscriptionScreenProps {
  onClose: () => void;
  onSubscriptionSuccess?: () => void;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({
  onClose,
  onSubscriptionSuccess,
}) => {
  const { showMessage } = useMessageModal();
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const availableProducts = await inAppPurchaseService.getProducts();
      setProducts(availableProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'Failed to load subscription options. Please try again.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (productId: string) => {
    setPurchasing(productId);

    try {
      const success = await inAppPurchaseService.purchaseSubscription(
        productId,
      );

      if (success && onSubscriptionSuccess) {
        onSubscriptionSuccess();
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      showMessage({
        type: 'error',
        title: 'Purchase Failed',
        message: 'Unable to complete purchase. Please try again.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestorePurchases = async () => {
    setLoading(true);
    try {
      await inAppPurchaseService.restorePurchases();
    } catch (error) {
      console.error('Restore failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3182ce" />
        <Text style={styles.loadingText}>Loading subscription options...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Upgrade to Pro</Text>
          <Text style={styles.subtitle}>
            Get voice alerts, remove ads, and support wildlife safety
          </Text>
        </View>

        {/* Pro Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Pro Features:</Text>

          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>🔊</Text>
            <Text style={styles.featureText}>Voice alerts for hotspots</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>🚫</Text>
            <Text style={styles.featureText}>Ad-free experience</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>🎯</Text>
            <Text style={styles.featureText}>Priority support</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>📊</Text>
            <Text style={styles.featureText}>Advanced analytics</Text>
          </View>
        </View>

        {/* Subscription Options */}
        <View style={styles.productsContainer}>
          {products.map(product => (
            <TouchableOpacity
              key={product.id}
              style={[
                styles.productCard,
                purchasing === product.id && styles.productCardDisabled,
              ]}
              onPress={() => handlePurchase(product.id)}
              disabled={purchasing !== null}>
              {purchasing === product.id ? (
                <View style={styles.purchasingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.purchasingText}>Processing...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.productHeader}>
                    <Text style={styles.productTitle}>
                      {product.period === 'annual'
                        ? 'Annual Pro'
                        : 'Monthly Pro'}
                    </Text>
                    <Text style={styles.productPrice}>
                      {product.price} {product.currency.toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.productDescription}>
                    {product.description}
                  </Text>

                  {product.period === 'annual' && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>Save 17%</Text>
                    </View>
                  )}
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={loading}>
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.termsText}>
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Subscriptions auto-renew and can be cancelled anytime.
        </Text>
      </ScrollView>

      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primaryBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryBackground,
  },
  loadingText: {
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.m,
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.openSans,
  },
  scrollView: {
    flex: 1,
    padding: theme.spacing.m,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.h1,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.s,
    fontFamily: theme.fontFamily.lato,
  },
  subtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: theme.fontFamily.openSans,
  },
  featuresContainer: {
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 16,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.xl,
  },
  featuresTitle: {
    fontSize: theme.fontSize.h3,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.m,
    fontFamily: theme.fontFamily.lato,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  featureBullet: {
    fontSize: theme.fontSize.body,
    marginRight: theme.spacing.m,
    width: 24,
    textAlign: 'center',
  },
  featureText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily.openSans,
  },
  productsContainer: {
    marginBottom: theme.spacing.xl,
  },
  productCard: {
    backgroundColor: 'rgba(92, 124, 158, 0.2)',
    borderRadius: 16,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.m,
    borderWidth: 2,
    borderColor: 'rgba(92, 124, 158, 0.3)',
  },
  productCardDisabled: {
    opacity: 0.6,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  productTitle: {
    fontSize: theme.fontSize.h3,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily.lato,
  },
  productPrice: {
    fontSize: theme.fontSize.h2,
    fontWeight: 'bold',
    color: theme.colors.accent,
    fontFamily: theme.fontFamily.lato,
  },
  productDescription: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    fontFamily: theme.fontFamily.openSans,
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.s,
    borderRadius: 12,
  },
  savingsText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  purchasingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchasingText: {
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.s,
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.openSans,
  },
  restoreButton: {
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 12,
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  restoreButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  termsText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: theme.fontFamily.openSans,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.m,
    right: theme.spacing.m,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: 'bold',
    fontFamily: theme.fontFamily.openSans,
  },
});

export default SubscriptionScreen;
