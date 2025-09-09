import {Platform, Alert, EmitterSubscription} from 'react-native';
import * as RNIap from 'react-native-iap';
import {SubscriptionProduct} from '../CoreLogic/types';
import {WildlifeReportsService, AuthService} from './wildlifeReportsService';

class InAppPurchaseService {
  private isInitialized = false;
  private products: SubscriptionProduct[] = [];
  private purchaseUpdateSubscription: EmitterSubscription | null = null;
  private purchaseErrorSubscription: EmitterSubscription | null = null;

  // Product IDs for different platforms
  private readonly PRODUCT_IDS = {
    ios: {
      monthly: 'com.buzz20.ohnodeer.pro.monthly',
      annual: 'com.buzz20.ohnodeer.pro.annual',
    },
    android: {
      monthly: 'ohno_deer_pro_monthly',
      annual: 'ohno_deer_pro_annual',
    },
  };

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Initialize IAP connection
      await RNIap.initConnection();

      // Get available products
      await this.loadProducts();

      // Set up purchase event listeners
      this.setupPurchaseListeners();

      this.isInitialized = true;
      console.log('In-app purchase service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize IAP service:', error);
      return false;
    }
  }

  private async loadProducts() {
    try {
      const productIds =
        Platform.OS === 'ios'
          ? [this.PRODUCT_IDS.ios.monthly, this.PRODUCT_IDS.ios.annual]
          : [this.PRODUCT_IDS.android.monthly, this.PRODUCT_IDS.android.annual];

      const products = await RNIap.getProducts({skus: productIds});

      this.products = products.map((product: RNIap.Product) => ({
        id: product.productId,
        title: product.title || '',
        description: product.description || '',
        price: product.price || '',
        currency: product.currency || 'USD',
        period: product.productId.includes('annual') ? 'annual' : 'monthly',
        platform: Platform.OS as 'ios' | 'android',
      }));

      console.log('Loaded products:', this.products);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }

  private setupPurchaseListeners() {
    // Purchase updated listener
    this.purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
      async (purchase: RNIap.Purchase) => {
        console.log('Purchase updated:', purchase);

        try {
          // Verify purchase
          const receipt = purchase.transactionReceipt;
          if (receipt) {
            await this.processPurchase(purchase);
          }
        } catch (error) {
          console.error('Purchase processing failed:', error);
        }
      },
    );

    // Purchase error listener
    this.purchaseErrorSubscription = RNIap.purchaseErrorListener(
      (error: RNIap.PurchaseError) => {
        console.error('Purchase error:', error);
        Alert.alert(
          'Purchase Error',
          'There was an error processing your purchase. Please try again.',
        );
      },
    );
  }

  async getProducts(): Promise<SubscriptionProduct[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.products;
  }

  async purchaseSubscription(productId: string): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Request purchase
      await RNIap.requestSubscription({sku: productId});

      // The purchase flow will be handled by the purchaseUpdatedListener
      return true;
    } catch (error) {
      console.error('Purchase failed:', error);
      Alert.alert(
        'Purchase Failed',
        'Unable to complete purchase. Please try again.',
      );
      return false;
    }
  }

  private async processPurchase(purchase: RNIap.Purchase): Promise<boolean> {
    try {
      // Verify receipt with server (in production, this should be done on your backend)
      const isValid = await this.verifyReceipt(purchase);

      if (isValid) {
        // Update user profile in Firestore
        await this.updateUserSubscription(purchase);

        // Finish transaction
        await RNIap.finishTransaction(purchase, false);

        Alert.alert(
          'Purchase Successful!',
          'Welcome to Oh No Deer Pro! You now have access to voice alerts and ad-free experience.',
        );

        return true;
      } else {
        console.error('Purchase verification failed');
        return false;
      }
    } catch (error) {
      console.error('Purchase processing failed:', error);
      return false;
    }
  }

  private async verifyReceipt(purchase: RNIap.Purchase): Promise<boolean> {
    // In production, send receipt to your backend for verification
    // For now, we'll assume the purchase is valid
    console.log('Verifying receipt:', purchase.transactionReceipt);
    return true;
  }

  private async updateUserSubscription(purchase: RNIap.Purchase) {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) {
        return;
      }

      // Calculate subscription expiry
      const now = Date.now();
      const isAnnual = purchase.productId.includes('annual');
      const expiryTime = isAnnual
        ? 365 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
      const subscriptionExpiry = now + expiryTime;

      // Update user profile in Firestore
      await WildlifeReportsService.updateUserProfile(user.uid, {
        isPro: true,
        subscriptionId: purchase.productId,
        subscriptionExpiry,
      });

      console.log('User subscription updated successfully');
    } catch (error) {
      console.error('Failed to update user subscription:', error);
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      const purchases = await RNIap.getAvailablePurchases();

      for (const purchase of purchases) {
        if (
          purchase.productId.includes('ohno') ||
          purchase.productId.includes('buzz20')
        ) {
          await this.processPurchase(purchase);
        }
      }

      Alert.alert('Restore Complete', 'Your purchases have been restored.');
      return true;
    } catch (error) {
      console.error('Restore purchases failed:', error);
      Alert.alert(
        'Restore Failed',
        'Unable to restore purchases. Please try again.',
      );
      return false;
    }
  }

  async getSubscriptionStatus(): Promise<{isPro: boolean; expiryDate?: Date}> {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) {
        return {isPro: false};
      }

      const profile = await WildlifeReportsService.getUserProfile(user.uid);
      if (!profile || !profile.isPro) {
        return {isPro: false};
      }

      const now = Date.now();
      const isPro =
        profile.isPro &&
        (!profile.subscriptionExpiry || profile.subscriptionExpiry > now);

      return {
        isPro,
        expiryDate: profile.subscriptionExpiry
          ? new Date(profile.subscriptionExpiry)
          : undefined,
      };
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      return {isPro: false};
    }
  }

  async cancelSubscription() {
    // This would typically open the app store subscription management
    Alert.alert(
      'Cancel Subscription',
      'To cancel your subscription, please go to your App Store or Google Play Store account settings.',
      [{text: 'OK'}],
    );
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      productsCount: this.products.length,
      platform: Platform.OS,
    };
  }

  async cleanup() {
    try {
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }
      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = null;
      }
      await RNIap.endConnection();
      this.isInitialized = false;
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

export const inAppPurchaseService = new InAppPurchaseService();
