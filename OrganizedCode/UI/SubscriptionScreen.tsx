import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {SubscriptionProduct} from '../CoreLogic/types';
import {inAppPurchaseService} from '../Storage/inAppPurchaseService';

interface SubscriptionScreenProps {
  onClose: () => void;
  onSubscriptionSuccess?: () => void;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({
  onClose,
  onSubscriptionSuccess,
}) => {
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
      Alert.alert(
        'Error',
        'Failed to load subscription options. Please try again.',
      );
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
      Alert.alert(
        'Purchase Failed',
        'Unable to complete purchase. Please try again.',
      );
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
    backgroundColor: '#0a1929',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1929',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureBullet: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  productsContainer: {
    marginBottom: 24,
  },
  productCard: {
    backgroundColor: 'rgba(49, 130, 206, 0.2)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(49, 130, 206, 0.3)',
  },
  productCardDisabled: {
    opacity: 0.6,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3182ce',
  },
  productDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  purchasingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchasingText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
  restoreButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  restoreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 18,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default SubscriptionScreen;
