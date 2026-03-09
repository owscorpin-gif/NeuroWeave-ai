import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface FirebaseContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  isAuthReady: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  role: null,
  loading: true,
  isAuthReady: false,
});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch role from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        } else {
          // Default role for new users
          const defaultRole = 'user';
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: defaultRole,
            createdAt: new Date().toISOString()
          });
          setRole(defaultRole);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    // Connection test
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

    return () => unsubscribe();
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, role, loading, isAuthReady }}>
      {children}
    </FirebaseContext.Provider>
  );
};
