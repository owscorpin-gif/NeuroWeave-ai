import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer, serverTimestamp } from 'firebase/firestore';
import { auth, db, signInWithGoogle, signInAsGuest } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface FirebaseContextType {
  user: AppUser | null;
  role: string | null;
  loading: boolean;
  isAuthReady: boolean;
  login: () => Promise<void>;
  loginSimple: (name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  role: null,
  loading: true,
  isAuthReady: false,
  login: async () => {},
  loginSimple: async () => {},
  logout: async () => {},
});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Test connection to Firestore on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'system', 'health'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firestore is offline. Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    // Safety timeout: Ensure loading is set to false after 8 seconds regardless of Firebase state
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Firebase initialization taking too long, forcing loading to false.");
        setLoading(false);
        setIsAuthReady(true);
      }
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Set a timeout for Firestore operations to prevent hanging
          const firestorePromise = (async () => {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            let userDoc;
            try {
              userDoc = await getDoc(userDocRef);
            } catch (err) {
              handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
              return null;
            }
            
            if (!userDoc) return null;
            
            let userData: AppUser;
            
            if (!userDoc.exists()) {
              userData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || 'Anonymous User',
                photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
              };
              
              const initialRole = firebaseUser.email === 'shashwat.kesarwani12405@gmail.com' ? 'admin' : 'user';
              
              try {
                await setDoc(userDocRef, {
                  ...userData,
                  role: initialRole,
                  createdAt: serverTimestamp(),
                  lastLogin: serverTimestamp()
                });
              } catch (err) {
                handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
              }
              setRole(initialRole);
            } else {
              const data = userDoc.data();
              userData = {
                uid: data.uid,
                email: data.email,
                displayName: data.displayName,
                photoURL: data.photoURL,
              };
              setRole(data.role || 'user');
              try {
                await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
              } catch (err) {
                handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
              }
            }
            return userData;
          })();

          // Race against a 5-second timeout
          const timeoutPromise = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error("Firestore timeout")), 5000)
          );

          const userData = await Promise.race([firestorePromise, timeoutPromise]);
          if (userData) setUser(userData as AppUser);
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error("Auth sync error:", error);
        if (firebaseUser) {
          // Fallback to basic info if Firestore is slow or failing
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            photoURL: firebaseUser.photoURL || undefined
          });
        }
      } finally {
        setLoading(false);
        setIsAuthReady(true);
        clearTimeout(safetyTimeout);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const login = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
      throw error;
    }
  };

  const loginSimple = async (name: string, email: string) => {
    // Deprecated in favor of Google Login, but kept for type compatibility
    console.warn("loginSimple is deprecated. Use Google Login.");
  };

  const logout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, role, loading, isAuthReady, login, loginSimple, logout }}>
      {children}
    </FirebaseContext.Provider>
  );
};
