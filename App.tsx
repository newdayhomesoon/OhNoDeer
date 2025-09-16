/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useState, useEffect} from 'react';
import {View, Text} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './OrganizedCode/UI/LoginScreen';
import HomeScreen from './OrganizedCode/UI/HomeScreen';
import ErrorBoundary from './OrganizedCode/UI/ErrorBoundary';
import {AuthService} from './OrganizedCode/Storage/wildlifeReportsService';

function App(): JSX.Element {
  const [loggedIn, setLoggedIn] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Check for stored authentication state first
    const checkStoredAuthState = async () => {
      try {
        const storedAuthState = await AsyncStorage.getItem('authState');
        if (storedAuthState === 'loggedIn') {
          // Check if user is still authenticated with Firebase
          const currentUser = AuthService.getCurrentUser();
          if (currentUser) {
            setLoggedIn(true);
          } else {
            // Clear stored state if user is not authenticated
            await AsyncStorage.removeItem('authState');
          }
        }
      } catch (error) {
        console.warn('Error checking stored auth state:', error);
      }
    };

    // Listen to authentication state changes
    const unsubscribe = AuthService.onAuthStateChange(async (user) => {
      const isLoggedIn = !!user;
      setLoggedIn(isLoggedIn);
      
      // Store authentication state
      try {
        if (isLoggedIn) {
          await AsyncStorage.setItem('authState', 'loggedIn');
        } else {
          await AsyncStorage.removeItem('authState');
        }
      } catch (error) {
        console.warn('Error storing auth state:', error);
      }
      
      if (initializing) {
        setInitializing(false);
      }
    });

    // Check stored state first, then set up listener
    checkStoredAuthState();

    return unsubscribe;
  }, [initializing]);

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
      {!loggedIn ? (
        <LoginScreen onLogin={() => setLoggedIn(true)} />
      ) : (
        <HomeScreen onLogout={() => setLoggedIn(false)} />
      )}
    </ErrorBoundary>
  );
}

export default App;
