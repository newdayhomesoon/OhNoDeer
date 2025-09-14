import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';

// Font loading for Lugrasimo
// Removed expo-font import; using fontFamily style only
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from '../Storage/firebase/credentials';
import {appleAuth} from '@invertase/react-native-apple-authentication';
import {
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {auth, createUserProfile} from '../Storage/firebase/service';

type LoginScreenProps = {
  onLogin: () => void;
};

export default function LoginScreen({onLogin}: LoginScreenProps) {
  // No font loading needed; fontFamily is set directly in styles
  const [loading, setLoading] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailMode, setEmailMode] = useState<'login' | 'create'>('login');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalAuthError, setGeneralAuthError] = useState('');
  const lastActionRef = useRef<number>(0);
  const [showPassword, setShowPassword] = useState(false);

  const throttle = (fn: () => void, delay = 700) => {
    const now = Date.now();
    if (now - lastActionRef.current < delay) return;
    lastActionRef.current = now;
    fn();
  };

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

  const openEmailModal = () => {
    setShowEmailModal(true);
    setEmailMode('login');
  };

  const attemptEmailAuth = async () => {
    // Clear previous inline errors
    setEmailError('');
    setPasswordError('');
    setGeneralAuthError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      if (!trimmedEmail) setEmailError('Email is required');
      if (!password) setPasswordError('Password is required');
      return;
    }
    // Basic email regex (simple format validation)
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Invalid email format');
      return;
    }
    // Password validation rules
    const issues: string[] = [];
    if (password.length < 10 || password.length > 15) {
      issues.push('Password must be 10-15 characters long');
    }
    if (!/[0-9]/.test(password)) {
      issues.push('Include at least one number');
    }
    if (!/[@#$&]/.test(password)) {
      issues.push('Include at least one special character (@ # $ &)');
    }
    if (issues.length) {
      setPasswordError(issues.join('\n'));
      return;
    }
    setLoading(true);
    try {
      let userCred;
      if (emailMode === 'login') {
        try {
          userCred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        } catch (err: any) {
          if (err?.code === 'auth/user-not-found') {
            // Switch to create mode automatically
            setEmailMode('create');
            setGeneralAuthError('Account not found. Press Create to register.');
            return;
          }
          throw err;
        }
      } else {
        userCred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      }
      if (userCred) {
        await createUserProfile(userCred.user.uid, userCred.user.email || trimmedEmail);
        setShowEmailModal(false);
        onLogin();
      }
    } catch (error: any) {
      console.error('Email auth error:', error);
      setGeneralAuthError(error?.message?.replace('Firebase:', '').trim() || 'Email authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    setEmailError('');
    setGeneralAuthError('');
    if (!email.trim()) {
      setEmailError('Enter your email to get a reset link');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setGeneralAuthError('Password reset email sent.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      setGeneralAuthError('Could not send reset email.');
    }
  };


  return (
    <View style={styles.background}>
      <View style={styles.overlay}>
        {/* Header: Oh, No Deer at very top, motto just below */}
        <View style={styles.headerSectionTight}>
          <Text style={styles.companyNameLugrasimo}>Oh, No Deer</Text>
          <Text style={styles.mottoTight}>
            Preventing wildlife collisions with a real time, live-alert,
            community driven platform
          </Text>
        </View>

        {/* Tagline and title, smaller and moved down */}
        <View style={styles.formSectionWrapperTight}>
          <View style={styles.formSectionTight}>  
            <Text style={styles.taglineSmall}>Protect the wildlife <Text style={styles.taglineSmall}>Secure your safety</Text></Text>
            <Text style={styles.titleLugrasimo}>Join the movement!</Text>
            {/* All buttons and other content moved to bottom */}
          </View>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={() => throttle(handleGoogleLogin)}
            disabled={loading}>
            <Text style={[styles.buttonText, styles.googleButtonText]}>Continue with Google</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.appleButton]}
            onPress={() => throttle(handleAppleLogin)}
            disabled={loading}>
            <Text style={[styles.buttonText, styles.appleButtonText]}>Continue with Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.emailButton]}
            onPress={() => throttle(openEmailModal)}
            disabled={loading}>
            <Text style={[styles.buttonText, styles.emailButtonText]}>Continue with Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.guestLink} onPress={() => throttle(handleGuestLogin)}>
            <Text style={styles.guestLinkText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>

        {/* Guest Warning Modal */}
        <Modal
          animationType="fade"
          transparent
          visible={showGuestModal}
          onRequestClose={() => setShowGuestModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Wait!</Text>
              <Text style={styles.modalText}>
                You can continue as a Guest, but you can only view sightings in your area.
              </Text>
              <Text style={styles.modalActionText}>Log in to get the full experience!</Text>
              <TouchableOpacity style={styles.learnMoreLink} onPress={() => {}}>
                <Text style={styles.learnMoreText}>Learn more about the app</Text>
              </TouchableOpacity>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowGuestModal(false)}>
                  <Text style={styles.modalButtonText}>Go back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.continueButton]}
                  onPress={() => throttle(confirmGuestLogin)}
                  disabled={loading}>
                  <Text style={[styles.modalButtonText, styles.continueButtonText]}>
                    {loading ? 'Loading...' : 'Continue anyways'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Email Auth Modal */}
        <Modal
          animationType="fade"
          transparent
          visible={showEmailModal}
          onRequestClose={() => setShowEmailModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {emailMode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor="#718096"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
              <View style={styles.passwordWrapper}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#718096"
                  secureTextEntry={!showPassword}
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(p => !p)}
                  disabled={loading}
                >
                  <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={forgotPassword} style={styles.forgotLink}>
                <Text style={styles.forgotLinkText}>Forgot password?</Text>
              </TouchableOpacity>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowEmailModal(false)}
                  disabled={loading}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.continueButton]}
                  onPress={() => throttle(attemptEmailAuth)}
                  disabled={loading}>
                  <Text style={[styles.modalButtonText, styles.continueButtonText]}>
                    {loading ? 'Please wait...' : emailMode === 'login' ? 'Login' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
              {(emailError || passwordError || generalAuthError) && (
                <View style={styles.inlineErrors}>
                  {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                  {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                  {generalAuthError ? <Text style={styles.errorText}>{generalAuthError}</Text> : null}
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Please wait...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0a1929',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 25, 41, 0.85)',
    paddingHorizontal: 24,
    paddingTop: Platform.select({ ios: 0, android: 0, default: 0 }),
  },
  headerSectionTight: {
    marginTop: Platform.select({ ios: 10, android: 10, default: 10 }),
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  companyNameLugrasimo: {
    fontSize: 38,
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Lugrasimo-Regular',
    marginTop: Platform.select({ ios: 10, android: 10, default: 10 }),
    marginBottom: 2,
    letterSpacing: 1.5,
  },
  mottoTight: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  formSectionWrapperTight: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  formSectionTight: {
    width: '100%',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  taglineSmall: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
  },
  titleLugrasimo: {
    fontSize: 32,
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Lugrasimo-Regular',
    marginBottom: 0,
    letterSpacing: 1.2,
  },
  bottomSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: Platform.select({ ios: 24, android: 16, default: 16 }),
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'transparent',
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
    position: 'absolute',
    bottom: Platform.select({ ios: 20, android: 16, default: 16 }),
    left: 0,
    right: 0,
    paddingVertical: 12,
    alignItems: 'center',
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f7fafc',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    color: '#1a365d',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  forgotLinkText: {
    color: '#3182ce',
    fontSize: 14,
    fontWeight: '600',
  },
  inlineErrors: {
    marginTop: 12,
  },
  errorText: {
    color: '#e53e3e',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '500',
  },
  passwordWrapper: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    paddingRight: 80,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  passwordToggleText: {
    color: '#3182ce',
    fontSize: 14,
    fontWeight: '600',
  },
});
