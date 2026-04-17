import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
        async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as User;
            setUser(data);

            // 기존 유저 마이그레이션: referral_codes 인덱스 문서가 없으면 자동 생성
            if (data.referralCode) {
              try {
                const codeRef = doc(db, 'referral_codes', data.referralCode);
                const codeSnap = await getDoc(codeRef);
                if (!codeSnap.exists()) {
                  await setDoc(codeRef, {
                    userId: firebaseUser.uid,
                    name: data.name || '회원',
                    createdAt: serverTimestamp(),
                  });
                }
              } catch (err) {
                // 조용히 실패해도 앱 동작에는 영향 없음
                console.warn('referral_codes 인덱스 자동 생성 실패:', err);
              }
            }
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
