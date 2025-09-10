// Copy this file to config.ts and fill in your Firebase Web App credentials.
// You can find them in Firebase Console → Project settings → General → Your apps (Web)
export const firebaseConfig = {
  apiKey: 'your-api-key',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: 'your-sender-id',
  appId: 'your-app-id',
};

export function isPlaceholderFirebaseConfig(cfg: typeof firebaseConfig = firebaseConfig): boolean {
  return (
    !cfg.apiKey || cfg.apiKey === 'your-api-key' ||
    !cfg.messagingSenderId || cfg.messagingSenderId === 'your-sender-id' ||
    !cfg.appId || cfg.appId === 'your-app-id'
  );
}

export const firebaseConfigIsPlaceholder = isPlaceholderFirebaseConfig();
