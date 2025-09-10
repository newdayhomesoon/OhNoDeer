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

function App(): JSX.Element {
  const [loggedIn, setLoggedIn] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Listen to authentication state changes
    const unsubscribe = AuthService.onAuthStateChange(user => {
      setLoggedIn(!!user);
      if (initializing) {
        setInitializing(false);
      }
    });

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
