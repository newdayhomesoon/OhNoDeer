// Firebase configuration
// Replace the placeholder values below with your actual Firebase project config.
// You obtain these from the Firebase Console after registering the Android app.
export const firebaseConfig = {
  apiKey: 'AIzaSyB29BRTDHJ2e2CXhL13EHCkN6bc-wvD-E4',
  authDomain: 'buzz20new.firebaseapp.com',
  projectId: 'buzz20new',
  storageBucket: 'buzz20new.firebasestorage.app',
  messagingSenderId: '226934539990',
  appId: '1:226934539990:web:21624a42fedd27b5466b77',
};

// Detect whether the config still contains obvious placeholder values.
export function isPlaceholderFirebaseConfig(cfg: typeof firebaseConfig = firebaseConfig): boolean {
  return (
    !cfg.apiKey || cfg.apiKey === 'your-api-key' ||
    !cfg.messagingSenderId || cfg.messagingSenderId === 'your-sender-id' ||
    !cfg.appId || cfg.appId === 'your-app-id'
  );
}

export const firebaseConfigIsPlaceholder = isPlaceholderFirebaseConfig();
