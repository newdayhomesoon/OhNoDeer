/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useState, useEffect} from 'react';
import {View, Text} from 'react-native';
import LoginScreen from './OrganizedCode/UI/LoginScreen';
import HomeScreen from './OrganizedCode/UI/HomeScreen';
import ErrorBoundary from './OrganizedCode/UI/ErrorBoundary';
import {AuthService} from './OrganizedCode/Storage/wildlifeReportsService';
import {auth, onAuthStateChange} from './OrganizedCode/Storage/firebase/service';

function App(): JSX.Element {
  const [loggedIn, setLoggedIn] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showLoginScreen, setShowLoginScreen] = useState(true);

  useEffect(() => {
    console.log('[DEBUG] App - Setting up auth state listener');
    let hasInitialized = false;

    // Wait for Firebase auth persistence to be set before setting up listener
    const setupAuthListener = async () => {
      try {
        // Wait for persistence to be configured
        const persistencePromise = (auth as any)._persistencePromise;
        if (persistencePromise) {
          console.log('[DEBUG] App - Waiting for auth persistence...');
          await persistencePromise;
          console.log('[DEBUG] App - Auth persistence confirmed');
        }

                // Now set up the auth state listener
        const unsubscribe = onAuthStateChange(async (user) => {
          console.log('[DEBUG] App - Auth state changed, user:', user?.uid, user?.email, user?.isAnonymous);

          if (user) {
            // User is signed in (either anonymous or authenticated)
            const isLoggedIn = true;
            console.log('[DEBUG] App - User logged in, setting loggedIn to:', isLoggedIn);
            setLoggedIn(isLoggedIn);
            setShowLoginScreen(false);
          } else {
            // No user is signed in, show login screen
            console.log('[DEBUG] App - No user found, showing login screen');
            setLoggedIn(false);
            setShowLoginScreen(true);
          }

          if (!hasInitialized) {
            console.log('[DEBUG] App - Setting initializing to false');
            setInitializing(false);
            hasInitialized = true;
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error('[DEBUG] App - Error setting up auth listener:', error);
        // Still set initializing to false to prevent infinite loading
        setInitializing(false);
        return () => {}; // Return empty unsubscribe function
      }
    };

    const unsubscribePromise = setupAuthListener();

    return () => {
      unsubscribePromise.then(unsubscribe => unsubscribe());
    };
  }, []);

  if (initializing) {
    // Show a simple loading screen
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0a1929',
        }}>
        <Text style={{color: '#fff', fontSize: 18}}>Loading...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      {showLoginScreen ? (
        <LoginScreen onLogin={() => setShowLoginScreen(false)} />
      ) : loggedIn ? (
        <HomeScreen 
          onLogout={() => setLoggedIn(false)}
        />
      ) : (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#0a1929',
          }}>
          <Text style={{color: '#fff', fontSize: 18}}>Signing in...</Text>
        </View>
      )}
    </ErrorBoundary>
  );
}

export default App;
