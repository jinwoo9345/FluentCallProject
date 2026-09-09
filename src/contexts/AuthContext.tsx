import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  reload,
  sendEmailVerification as sendFirebaseEmailVerification,
  User as FirebaseUser,
} from 'firebase/auth';
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
  emailVerificationRequired: boolean;
  emailVerified: boolean;
  sendVerificationEmail: () => Promise<void>;
  refreshEmailVerification: () => Promise<boolean>;
  requireVerifiedEmail: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [firebaseEmailVerified, setFirebaseEmailVerified] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (fUser) => {
      setFirebaseUser(fUser);
      setFirebaseEmailVerified(fUser?.emailVerified === true);
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

  const emailVerificationRequired = user?.emailVerificationRequired === true;
  const emailVerified = !emailVerificationRequired || firebaseEmailVerified;

  const refreshEmailVerification = async (): Promise<boolean> => {
    if (!firebaseUser) return false;
    try {
      await reload(firebaseUser);
      if (firebaseUser.emailVerified) await firebaseUser.getIdToken(true);
      setFirebaseEmailVerified(firebaseUser.emailVerified);
      return firebaseUser.emailVerified;
    } catch (err) {
      console.warn('이메일 인증 상태 확인 실패:', err);
      return false;
    }
  };

  useEffect(() => {
    if (!firebaseUser || !emailVerificationRequired || firebaseEmailVerified) return;
    const refresh = () => { void refreshEmailVerification(); };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    // 인증 링크에서 돌아온 직후에도 별도 클릭 없이 최신 상태를 가져온다.
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [firebaseUser, emailVerificationRequired, firebaseEmailVerified]);

  const sendVerificationEmail = async () => {
    if (!firebaseUser?.email) throw new Error('인증할 이메일 주소를 찾을 수 없습니다.');
    auth.languageCode = 'ko';
    await sendFirebaseEmailVerification(firebaseUser, {
      url: `${window.location.origin}/dashboard`,
      handleCodeInApp: false,
    });
  };

  const requireVerifiedEmail = (): boolean => {
    if (emailVerificationRequired && !emailVerified) {
      alert('이메일 인증 후 이용할 수 있습니다. 마이페이지에서 계정 인증을 완료해주세요.');
      window.location.assign('/dashboard#email-verification');
      return false;
    }
    return true;
  };

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
      toggleWishlist,
      emailVerificationRequired,
      emailVerified,
      sendVerificationEmail,
      refreshEmailVerification,
      requireVerifiedEmail,
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
