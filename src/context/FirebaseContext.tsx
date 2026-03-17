import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer, serverTimestamp } from 'firebase/firestore';
import { auth, db, signInWithGoogle, signInAsGuest } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
  isLocalMode: boolean;
  login: () => Promise<void>;
  loginSimple: (name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  role: null,
  loading: true,
  isAuthReady: false,
  isLocalMode: false,
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
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<{name: string, email: string} | null>(null);

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Set a timeout for Firestore operations to prevent hanging
          const firestorePromise = (async () => {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            let userData: AppUser;
            
            if (!userDoc.exists()) {
              const name = pendingProfile?.name || firebaseUser.displayName || 'Anonymous User';
              const email = pendingProfile?.email || firebaseUser.email || '';

              userData = {
                uid: firebaseUser.uid,
                email: email,
                displayName: name,
                photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
              };
              
              await setDoc(userDocRef, {
                ...userData,
                role: 'user',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
              });
              setRole('user');
              setPendingProfile(null);
            } else {
              const data = userDoc.data();
              userData = {
                uid: data.uid,
                email: data.email,
                displayName: data.displayName,
                photoURL: data.photoURL,
              };
              setRole(data.role || 'user');
              await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
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
      }
    });

    return () => unsubscribe();
  }, [pendingProfile]);

  const login = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const loginSimple = async (name: string, email: string) => {
    try {
      setPendingProfile({ name, email });
      await signInAsGuest();
    } catch (error: any) {
      console.error("Simple login error details:", error);
      
      const errorMsg = error.message || String(error);
      const isRestricted = error.code === 'auth/admin-restricted-operation' || 
                          errorMsg.includes('admin-restricted-operation') ||
                          errorMsg.includes('restricted-operation');

      // Handle the "Anonymous Auth Disabled" error by falling back to Local Mode
      if (isRestricted) {
        console.warn("Anonymous auth disabled. Falling back to Local Mode.");
        const localUid = `local-${Date.now()}`;
        const userData = {
          uid: localUid,
          email: email,
          displayName: name,
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${localUid}`,
        };
        setUser(userData);
        setRole('user');
        setIsLocalMode(true);
        setLoading(false);
        setIsAuthReady(true);
      } else {
        setPendingProfile(null);
        throw error;
      }
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, role, loading, isAuthReady, isLocalMode, login, loginSimple, logout }}>
      {children}
    </FirebaseContext.Provider>
  );
};
