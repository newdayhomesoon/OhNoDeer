import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from '../Storage/firebase/credentials';
import {appleAuth} from '@invertase/react-native-apple-authentication';
import {
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signInAnonymously,
} from 'firebase/auth';
import {auth, createUserProfile} from '../Storage/firebase/service';

type LoginScreenProps = {
  onLogin: () => void;
};

export default function LoginScreen({onLogin}: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  const handleGuestLogin = () => {
    setShowGuestModal(true);
  };

  const confirmGuestLogin = async () => {
    setShowGuestModal(false);
    setLoading(true);
    try {
      // Sign in anonymously with Firebase
  const userCredential = await signInAnonymously(auth);
      await createUserProfile(userCredential.user.uid, 'guest');
      onLogin();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      if (!GOOGLE_WEB_CLIENT_ID || GOOGLE_WEB_CLIENT_ID.startsWith('your-google-web-client-id')) {
        throw new Error('Google Web Client ID is not configured');
      }
      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();

      // Sign in with Google
      const {idToken} = await GoogleSignin.signIn();

      // Create Firebase credential
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign in to Firebase
      const result = await signInWithCredential(auth, googleCredential);

      // Create user profile in Firestore
      await createUserProfile(result.user.uid, result.user.email || '');

      onLogin();
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      Alert.alert('Error', 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (!appleAuth.isSupported) {
      Alert.alert('Error', 'Apple Sign-In is not supported on this device');
      return;
    }

    setLoading(true);
    try {
      // Start Apple sign-in
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      // Create Firebase credential
      const {identityToken, nonce} = appleAuthRequestResponse;
      if (!identityToken) {
        throw new Error('Apple identity token missing');
      }
      const appleCredential = new OAuthProvider('apple.com').credential({
        idToken: identityToken, // identityToken is non-null after guard
        rawNonce: nonce || undefined,
      });

      // Sign in to Firebase
      const result = await signInWithCredential(auth, appleCredential);

      // Create user profile in Firestore
      await createUserProfile(result.user.uid, result.user.email || '');

      onLogin();
    } catch (error: any) {
      console.error('Apple sign-in error:', error);
      if (error.code !== appleAuth.Error.CANCELED) {
        Alert.alert('Error', 'Apple sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = () => {
    Alert.alert('Coming Soon', 'Email authentication will be available soon!');
  };

  return (
    <View style={styles.background}>
      <View style={styles.overlay}>
        <View style={styles.headerSection}>
          <Text style={styles.companyName}>Oh, No Deer</Text>
          <Text style={styles.motto}>
            Preventing wildlife collisions with a real time, live-alert,
            community driven platform
          </Text>
        </View>
        <View style={styles.formSection}>
          <Text style={styles.tagline}>Protect the wildlife</Text>
          <Text style={[styles.tagline, styles.taglineMargin]}>
            Secure your safety
          </Text>
          <Text style={styles.title}>Join the movement!</Text>
          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={handleGoogleLogin}
            disabled={loading}>
            <Text style={[styles.buttonText, styles.googleButtonText]}>
              Continue with Google
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.appleButton]}
            onPress={handleAppleLogin}
            disabled={loading}>
            <Text style={[styles.buttonText, styles.appleButtonText]}>
              Continue with Apple
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.emailButton]}
            onPress={handleEmailLogin}
            disabled={loading}>
            <Text style={[styles.buttonText, styles.emailButtonText]}>
              Continue with Email
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.guestLink} onPress={handleGuestLogin}>
            <Text style={styles.guestLinkText}>Continue as Guest</Text>
          </TouchableOpacity>

          <Modal
            animationType="fade"
            transparent={true}
            visible={showGuestModal}
            onRequestClose={() => setShowGuestModal(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Wait!</Text>
                <Text style={styles.modalText}>
                  You can continue as a Guest, but you can only view sightings
                  in your area.
                </Text>
                <Text style={styles.modalActionText}>
                  Log in to get the full experience!
                </Text>
                <TouchableOpacity
                  style={styles.learnMoreLink}
                  onPress={() => {}}>
                  <Text style={styles.learnMoreText}>
                    Learn more about the app
                  </Text>
                </TouchableOpacity>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowGuestModal(false)}>
                    <Text style={styles.modalButtonText}>Go back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.continueButton]}
                    onPress={confirmGuestLogin}
                    disabled={loading}>
                    <Text
                      style={[
                        styles.modalButtonText,
                        styles.continueButtonText,
                      ]}>
                      {loading ? 'Loading...' : 'Continue anyways'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0a1929', // Dark blue background
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 25, 41, 0.85)',
    padding: 24,
    justifyContent: 'space-between',
  },
  headerSection: {
    marginTop: '15%',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  companyName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  motto: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  formSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: '10%',
  },
  title: {
    fontSize: 28,
    color: '#fff',
    marginBottom: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 22,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 32,
  },
  taglineMargin: {
    marginBottom: 24,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginVertical: 8,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  appleButton: {
    backgroundColor: '#000',
  },
  emailButton: {
    backgroundColor: '#fff',
  },
  buttonText: {
    color: '#1a365d',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  googleButtonText: {
    color: '#fff',
  },
  appleButtonText: {
    color: '#fff',
  },
  emailButtonText: {
    color: '#1a365d',
  },
  guestLink: {
    marginTop: 16,
    padding: 12,
    marginBottom: 30,
  },
  guestLinkText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1a365d',
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'center',
    color: '#4a5568',
  },
  modalActionText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'center',
    color: '#3182ce',
    fontWeight: '600',
  },
  learnMoreLink: {
    marginBottom: 16,
    alignSelf: 'center',
  },
  learnMoreText: {
    fontSize: 14,
    color: '#4a5568',
    textDecorationLine: 'underline',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  continueButton: {
    backgroundColor: '#3182ce',
  },
  modalButtonText: {
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
    width: '100%',
    color: '#4a5568',
  },
  continueButtonText: {
    color: '#fff',
  },
});
