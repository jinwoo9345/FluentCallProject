import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User as UserIcon, GraduationCap, School } from 'lucide-react';
import { auth, db } from '../../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Set persistence to session (logout when browser/tab closes)
      await setPersistence(auth, browserSessionPersistence);

      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });
        
        // Generate a random 6-character referral code
        const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name,
          email,
          role,
          credits: role === 'student' ? 60 : 0, // Initial 60 mins for students
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
      
      if (errorString.includes('email-already-in-use')) {
        errorMessage = '이미 가입된 이메일입니다.';
      } else if (errorString.includes('invalid-email')) {
        errorMessage = '유효하지 않은 이메일 형식입니다.';
      } else if (errorString.includes('weak-password')) {
        errorMessage = '비밀번호는 6자리 이상이어야 합니다.';
      } else if (errorString.includes('user-not-found') || errorString.includes('invalid-credential')) {
        errorMessage = '이메일 또는 비밀번호가 일치하지 않습니다.';
      } else if (errorString.includes('wrong-password')) {
        errorMessage = '비밀번호가 일치하지 않습니다.';
      } else if (errorString.includes('operation-not-allowed')) {
        errorMessage = '이메일 로그인이 비활성화되어 있습니다. (관리자 설정 필요)';
      } else if (errorString.includes('permission-denied') || errorString.includes('Missing or insufficient permissions')) {
        errorMessage = '입력하신 정보가 올바르지 않거나 권한이 없습니다. (이름은 2자 이상 입력해주세요)';
      }

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

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                        role === 'student' 
                          ? 'border-blue-600 bg-blue-50 text-blue-600' 
                          : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <GraduationCap size={24} />
                      <span className="text-sm font-bold">수강생</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('tutor')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        role === 'tutor' 
                          ? 'border-blue-600 bg-blue-50 text-blue-600' 
                          : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <School size={24} />
                      <span className="text-sm font-bold">강사</span>
                    </button>
                  </div>

                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="이름"
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  {role === 'student' && (
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">#</div>
                      <input
                        type="text"
                        placeholder="추천인 코드 (선택)"
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        value={referredBy}
                        onChange={(e) => setReferredBy(e.target.value.toUpperCase())}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  placeholder="이메일"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  placeholder="비밀번호"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full py-4 rounded-xl" disabled={loading}>
                {loading ? '처리 중...' : mode === 'signin' ? '로그인' : '회원가입 완료'}
              </Button>

              <div className="text-center text-sm text-slate-500 pt-2">
                {mode === 'signin' ? (
                  <>
                    계정이 없으신가요?{' '}
                    <button type="button" onClick={() => setMode('signup')} className="text-blue-600 font-bold hover:underline">
                      회원가입
                    </button>
                  </>
                ) : (
                  <>
                    이미 계정이 있으신가요?{' '}
                    <button type="button" onClick={() => setMode('signin')} className="text-blue-600 font-bold hover:underline">
                      로그인
                    </button>
                  </>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    )}
    </AnimatePresence>
  );
}
