import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

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
  login: (name: string, email: string) => void;
  logout: () => void;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  role: null,
  loading: true,
  isAuthReady: false,
  login: () => {},
  logout: () => {},
});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('neuroweave_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setRole('user'); // Default role for all users
    }
    setLoading(false);
    setIsAuthReady(true);

    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();
  }, []);

  const login = (name: string, email: string) => {
    const newUser: AppUser = {
      uid: `user_${Date.now()}`,
      email,
      displayName: name,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    };
    setUser(newUser);
    setRole('user');
    localStorage.setItem('neuroweave_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('neuroweave_user');
  };

  return (
    <FirebaseContext.Provider value={{ user, role, loading, isAuthReady, login, logout }}>
      {children}
    </FirebaseContext.Provider>
  );
};
