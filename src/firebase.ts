import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendEmailVerification,
  updatePassword,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, query, where, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// Use the named database if provided in the config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Set persistence to local to handle iframe restrictions better
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Could not set persistence:", err);
});

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInAsGuest = () => signInAnonymously(auth);
export const signOut = () => auth.signOut();

export { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendEmailVerification,
  updatePassword,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier
};
