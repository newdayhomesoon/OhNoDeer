declare module 'react-native-iap' {
  export interface Product {
    productId: string;
    title?: string;
    description?: string;
    price?: string;
    currency?: string;
    type?: string;
    originalPrice?: string;
    subscriptionPeriodAndroid?: string;
    subscriptionPeriodIOS?: string;
    introductoryPrice?: string;
    introductoryPricePaymentModeAndroid?: string;
    introductoryPriceNumberOfPeriodsAndroid?: string;
    introductoryPriceSubscriptionPeriodAndroid?: string;
    freeTrialPeriodAndroid?: string;
  }

  export interface Purchase {
    productId: string;
    transactionId?: string;
    transactionReceipt?: string;
    purchaseToken?: string;
    transactionDate?: number;
    originalTransactionDateIOS?: number;
    originalTransactionIdentifierIOS?: string;
    dataAndroid?: string;
    signatureAndroid?: string;
    autoRenewingAndroid?: boolean;
    isAcknowledgedAndroid?: boolean;
    packageNameAndroid?: string;
    developerPayloadAndroid?: string;
    obfuscatedAccountIdAndroid?: string;
    obfuscatedProfileIdAndroid?: string;
    purchaseStateAndroid?: number;
  }

  export interface PurchaseError {
    code: string;
    message: string;
    responseCode?: number;
  }

  export function initConnection(): Promise<string>;
  export function endConnection(): Promise<void>;
  export function getProducts(skus: {skus: string[]}): Promise<Product[]>;
  export function getSubscriptions(skus: {skus: string[]}): Promise<Product[]>;
  export function requestSubscription(sku: {sku: string}): Promise<void>;
  export function requestPurchase(sku: {sku: string}): Promise<void>;
  export function finishTransaction(
    purchase: Purchase,
    isConsumable?: boolean,
  ): Promise<void>;
  export function getAvailablePurchases(): Promise<Purchase[]>;
  export function purchaseUpdatedListener(
    callback: (purchase: Purchase) => void,
  ): any;
  export function purchaseErrorListener(
    callback: (error: PurchaseError) => void,
  ): any;
}
