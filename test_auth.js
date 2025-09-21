import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from './OrganizedCode/Storage/firebase/service.js';

console.log('Testing authentication persistence...');

// Test 1: Check current auth state
const currentUser = auth.currentUser;
console.log('Current user:', currentUser ? `UID: ${currentUser.uid}, Anonymous: ${currentUser.isAnonymous}` : 'No user');

// Test 2: Listen for auth state changes
const unsubscribe = onAuthStateChanged(auth, (user) => {
  console.log('Auth state changed:', user ? `UID: ${user.uid}, Anonymous: ${user.isAnonymous}` : 'No user');
  
  if (!user) {
    console.log('No user found, attempting anonymous sign-in...');
    signInAnonymously(auth).then((result) => {
      console.log('Anonymous sign-in successful:', result.user.uid);
    }).catch((error) => {
      console.error('Anonymous sign-in failed:', error);
    });
  }
});

// Cleanup after 10 seconds
setTimeout(() => {
  console.log('Cleaning up auth listener...');
  unsubscribe();
}, 10000);
