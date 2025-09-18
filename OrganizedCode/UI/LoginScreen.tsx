import React, {useState, useEffect, useRef} from 'react';
import { Image } from 'react-native';
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
import { theme } from '../../src/app-theme';

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
      {/* Future background image container - add Image component here later */}
      <View style={styles.backgroundImageContainer}>
        {/* Background image will be added here */}
      </View>

      {/* Semi-transparent overlay for text readability */}
      <View style={styles.backgroundOverlay} />

      <View style={styles.overlay}>
        {/* Header: Oh, No Deer at very top, motto just below */}
        <View style={styles.headerSectionTight}>
          <Text style={styles.companyNameLugrasimo}>Oh, No Deer</Text>
          <Text style={styles.mottoTight}>
            Real-time wildlife alerts. Drive safer.
          </Text>
        </View>

        {/* Spacer to push content to bottom */}
        <View style={{flex: 1}} />

        {/* Tagline and title just above buttons */}
        <View style={styles.bottomTextSection}>
          <Text style={styles.titleLugrasimo}>Join the Movement</Text>
        </View>

        {/* Button cluster at the bottom */}
        <View style={styles.bottomButtonSection}>
          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={() => throttle(handleGoogleLogin)}
            disabled={loading}>
            <Text style={[styles.iconText, styles.googleIconText]}>G</Text>
            <Text style={[styles.buttonText, styles.googleButtonText]}>Continue with Google</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.appleButton]}
            onPress={() => throttle(handleAppleLogin)}
            disabled={loading}>
            <Image
              source={require('../../assets/apple-logo.png')}
              style={{ width: 24, height: 24, marginRight: theme.spacing.s, tintColor: '#fff' }}
              resizeMode="contain"
            />
            <Text style={[styles.buttonText, styles.appleButtonText]}>Continue with Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.emailButton]}
            onPress={() => throttle(openEmailModal)}
            disabled={loading}>
            <Text style={[styles.iconText, styles.emailIconText]}>✉</Text>
            <Text style={[styles.buttonText, styles.emailButtonText]}>Continue with Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.guestButton} onPress={() => throttle(handleGuestLogin)}>
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
    backgroundColor: theme.colors.primaryBackground,
  },
  backgroundImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Future: Add Image component here with resizeMode: 'cover'
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(43, 45, 58, 0.7)', // Semi-transparent overlay
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 25, 41, 0.85)',
    paddingHorizontal: 24,
    paddingTop: Platform.select({ ios: 0, android: 0, default: 0 }),
  },
  headerSectionTight: {
    marginTop: Platform.select({ ios: theme.spacing.l, android: theme.spacing.l, default: theme.spacing.l }),
    alignItems: 'center',
    paddingHorizontal: theme.spacing.s,
    marginBottom: theme.spacing.s,
  },
  companyNameLugrasimo: {
    fontSize: theme.fontSize.h1,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontFamily: theme.fontFamily.lato,
    marginTop: Platform.select({ ios: theme.spacing.l, android: theme.spacing.l, default: theme.spacing.l }),
    marginBottom: theme.spacing.s,
    letterSpacing: 1.5,
  },
  mottoTight: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: theme.spacing.m,
    marginBottom: theme.spacing.l,
    fontFamily: theme.fontFamily.openSans,
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
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
    fontFamily: theme.fontFamily.openSans,
  },
  titleLugrasimo: {
    fontSize: theme.fontSize.h2,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontFamily: theme.fontFamily.lato,
    marginBottom: theme.spacing.s,
    letterSpacing: 1.2,
  },
  bottomTextSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.l,
  },
  bottomButtonSection: {
    alignItems: 'center',
    paddingBottom: Platform.select({ ios: theme.spacing.xl, android: theme.spacing.l, default: theme.spacing.l }),
    width: '100%',
    gap: theme.spacing.m,
  },
  guestButton: {
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.s,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    backgroundColor: 'transparent',
    paddingVertical: theme.spacing.m,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: theme.spacing.l,
    paddingHorizontal: theme.spacing.l,
    borderRadius: theme.spacing.s,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  googleButton: {
    backgroundColor: theme.colors.accent,
  },
  appleButton: {
    backgroundColor: '#000',
  },
  emailButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  buttonText: {
    color: '#1a365d',
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  googleButtonText: {
    color: '#fff',
  },
  appleButtonText: {
    color: '#fff',
  },
  emailButtonText: {
    color: theme.colors.accent,
  },
  iconText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: theme.spacing.s,
  },
  googleIconText: {
    color: '#fff',
  },
  appleIconText: {
    color: '#fff',
  },
  emailIconText: {
    color: theme.colors.accent,
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
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.body,
    textAlign: 'center',
    fontFamily: theme.fontFamily.openSans,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: theme.fontSize.h2,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily.lato,
  },
  modalText: {
    fontSize: theme.fontSize.body,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily.openSans,
  },
  modalActionText: {
    fontSize: theme.fontSize.body,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'center',
    color: theme.colors.accent,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  learnMoreLink: {
    marginBottom: 16,
    alignSelf: 'center',
  },
  learnMoreText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
    fontFamily: theme.fontFamily.openSans,
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
    backgroundColor: theme.colors.secondaryBackground,
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
  },
  continueButton: {
    backgroundColor: theme.colors.accent,
  },
  modalButtonText: {
    fontWeight: '600',
    fontSize: theme.fontSize.body,
    textAlign: 'center',
    width: '100%',
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily.openSans,
  },
  continueButtonText: {
    color: theme.colors.textPrimary,
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
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  input: {
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: theme.fontSize.body,
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
    marginBottom: 14,
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily.openSans,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  forgotLinkText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  inlineErrors: {
    marginTop: 12,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.caption,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '500',
    fontFamily: theme.fontFamily.openSans,
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
    color: theme.colors.accent,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
});
