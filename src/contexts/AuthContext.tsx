import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAuthReady: boolean;
  isAuthModalOpen: boolean;
  authMode: 'signin' | 'signup';
  setIsAuthModalOpen: (open: boolean) => void;
  setAuthMode: (mode: 'signin' | 'signup') => void;
  toggleWishlist: (tutorId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (fUser) => {
      setFirebaseUser(fUser);
      if (!fUser) {
        setUser(null);
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (firebaseUser) {
      setLoading(true);
      const unsubscribeUser = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as User);
          } else {
            setUser(null);
          }
          setLoading(false);
          setIsAuthReady(true);
        },
        (error) => {
          console.error('Error fetching user profile:', error);
          setLoading(false);
          setIsAuthReady(true);
        }
      );
      return () => unsubscribeUser();
    }
  }, [firebaseUser]);

  const toggleWishlist = async (tutorId: string) => {
    if (!firebaseUser) {
      setAuthMode('signin');
      setIsAuthModalOpen(true);
      return;
    }

    const userRef = doc(db, 'users', firebaseUser.uid);
    const isWishlisted = user?.wishlist?.includes(tutorId);

    try {
      await updateDoc(userRef, {
        wishlist: isWishlisted ? arrayRemove(tutorId) : arrayUnion(tutorId)
      });
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      firebaseUser, 
      loading, 
      isAuthReady, 
      isAuthModalOpen, 
      authMode, 
      setIsAuthModalOpen, 
      setAuthMode,
      toggleWishlist
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
