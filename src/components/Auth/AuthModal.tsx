import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User as UserIcon, GraduationCap, School } from 'lucide-react';
import { auth, db, googleProvider } from '../../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  setPersistence,
  browserSessionPersistence,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Button } from '../ui/Button';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [role, setRole] = useState<'student' | 'tutor'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSocialLogin = async (provider: any) => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await ensureUserDocument(user);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('소셜 로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    setError('');
    try {
      const Kakao = (window as any).Kakao;
      const KAKAO_KEY = (import.meta as any).env.VITE_KAKAO_JS_KEY;

      if (!Kakao) {
        throw new Error('카카오 SDK 로드에 실패했습니다. 페이지를 새로고침 해주세요.');
      }

      // 동적 초기화 시도
      if (!Kakao.isInitialized()) {
        if (KAKAO_KEY) {
          Kakao.init(KAKAO_KEY);
        } else {
          throw new Error('VITE_KAKAO_JS_KEY 설정이 누력되었습니다. Settings 메뉴를 확인해주세요.');
        }
      }

      const redirectUri = `${window.location.origin}/dashboard`; 
      Kakao.Auth.authorize({
        redirectUri: redirectUri,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || '카카오 로그인 중 오류가 발생했습니다.');
    }
  };

  const ensureUserDocument = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName || '회원',
        email: user.email || '',
        role: 'student',
        credits: 60,
        referralCode,
        referredBy: '',
        discountBalance: 0,
        createdAt: serverTimestamp(),
        avatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await setPersistence(auth, browserSessionPersistence);

      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });
        const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name,
          email,
          role,
          credits: role === 'student' ? 60 : 0,
          referralCode,
          referredBy: role === 'student' ? referredBy : '',
          discountBalance: 0,
          createdAt: serverTimestamp(),
          avatar: `https://picsum.photos/seed/${user.uid}/200/200`
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let errorMessage = '오류가 발생했습니다. 다시 시도해주세요.';
      const errorString = err.code || err.message || '';
      if (errorString.includes('email-already-in-use')) errorMessage = '이미 가입된 이메일입니다.';
      else if (errorString.includes('invalid-credential')) errorMessage = '이메일 또는 비밀번호가 일치하지 않습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {mode === 'signin' ? '로그인' : '회원가입'}
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Social Login Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleSocialLogin(googleProvider)}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  구글 계정으로 {mode === 'signin' ? '로그인' : '시작하기'}
                </button>
                {/* Kakao Button */}
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#FEE500] text-[#3c1e1e] font-bold hover:opacity-90 transition-all"
                  onClick={handleKakaoLogin}
                >
                  <div className="w-5 h-5 flex items-center justify-center bg-[#3c1e1e] rounded-sm text-[#FEE500] text-[10px]">K</div>
                  카카오 계정으로 {mode === 'signin' ? '로그인' : '시작하기'}
                </button>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-4 text-xs text-slate-400 font-medium">또는 이메일로 {mode === 'signin' ? '로그인' : '가입'}</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
                    {error}
                  </div>
                )}

                {mode === 'signup' && (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <button
                        type="button"
                        onClick={() => setRole('student')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                          role === 'student' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 bg-white text-slate-500'
                        }`}
                      >
                        <GraduationCap size={24} />
                        <span className="text-sm font-bold">수강생</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('tutor')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                          role === 'tutor' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 bg-white text-slate-500'
                        }`}
                      >
                        <School size={24} />
                        <span className="text-sm font-bold">강사</span>
                      </button>
                    </div>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" placeholder="이름" required className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  </>
                )}

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="email" placeholder="이메일" required className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="password" placeholder="비밀번호" required className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>

                <Button type="submit" className="w-full py-4 rounded-xl" disabled={loading}>
                  {loading ? '처리 중...' : mode === 'signin' ? '로그인' : '회원가입 완료'}
                </Button>

                <div className="text-center text-sm text-slate-500 pt-2">
                  {mode === 'signin' ? (
                    <>계정이 없으신가요? <button type="button" onClick={() => setMode('signup')} className="text-blue-600 font-bold hover:underline">회원가입</button></>
                  ) : (
                    <>이미 계정이 있으신가요? <button type="button" onClick={() => setMode('signin')} className="text-blue-600 font-bold hover:underline">로그인</button></>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    )}
    </AnimatePresence>
  );
}
