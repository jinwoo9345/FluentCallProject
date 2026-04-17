import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User as UserIcon, GraduationCap, School, AtSign } from 'lucide-react';
import { auth, db, googleProvider } from '../../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserSessionPersistence,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
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
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  // 강사 신청 전용 필드
  const [tutorContact, setTutorContact] = useState('');
  const [tutorExperience, setTutorExperience] = useState('');
  const [tutorQualifications, setTutorQualifications] = useState('');
  const [tutorIntroduction, setTutorIntroduction] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetFields = () => {
    setPassword('');
    setPasswordConfirm('');
    setTutorContact('');
    setTutorExperience('');
    setTutorQualifications('');
    setTutorIntroduction('');
    setError('');
  };

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

      if (!Kakao.isInitialized()) {
        if (KAKAO_KEY) {
          Kakao.init(KAKAO_KEY);
        } else {
          throw new Error('VITE_KAKAO_JS_KEY 설정이 누락되었습니다. Settings 메뉴를 확인해주세요.');
        }
      }

      const redirectUri = `${window.location.origin}/dashboard`;
      Kakao.Auth.authorize({
        redirectUri: redirectUri,
        scope: 'profile_nickname',
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
      const displayName = user.displayName || '회원';
      await setDoc(userRef, {
        uid: user.uid,
        name: displayName,       // 초기 표시명 = 실명 (닉네임 설정 전)
        realName: displayName,   // 실명은 별도 보관
        email: user.email || '',
        role: 'student',
        credits: 0,
        referralCode,
        referredBy: '',
        discountBalance: 0,
        createdAt: serverTimestamp(),
        avatar: `https://picsum.photos/seed/${user.uid}/200/200`,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup') {
      if (password !== passwordConfirm) {
        setError('비밀번호가 서로 일치하지 않습니다.');
        return;
      }
      if (password.length < 6) {
        setError('비밀번호는 6자 이상이어야 합니다.');
        return;
      }
      if (!name.trim()) {
        setError('실명을 입력해주세요.');
        return;
      }
      if (role === 'tutor') {
        if (!tutorContact.trim() || !tutorExperience.trim() || !tutorIntroduction.trim()) {
          setError('강사 신청에는 연락처, 경력, 자기소개가 모두 필요합니다.');
          return;
        }
      }
    }

    setLoading(true);
    try {
      await setPersistence(auth, browserSessionPersistence);

      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const displayName = (nickname.trim() || name.trim());
        await updateProfile(user, { displayName });
        const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // 강사 가입 지원자도 일단 'student'로 등록하고 별도 신청 문서 생성.
        // 관리자가 승인하면 tutors 컬렉션 등록 + role 변경.
        const userDoc: any = {
          uid: user.uid,
          name: displayName,
          realName: name.trim(),
          email,
          role: 'student',
          credits: 0,
          referralCode,
          referredBy: '',
          discountBalance: 0,
          createdAt: serverTimestamp(),
          avatar: `https://picsum.photos/seed/${user.uid}/200/200`,
        };

        if (role === 'tutor') {
          userDoc.tutorApplicationStatus = 'pending';
        }

        await setDoc(doc(db, 'users', user.uid), userDoc);

        if (role === 'tutor') {
          const appRef = await addDoc(collection(db, 'tutor_applications'), {
            userId: user.uid,
            name: name.trim(),
            email,
            contactValue: tutorContact.trim(),
            experience: tutorExperience.trim(),
            qualifications: tutorQualifications.trim(),
            introduction: tutorIntroduction.trim(),
            status: 'pending',
            createdAt: serverTimestamp(),
          });
          await updateDoc(doc(db, 'users', user.uid), { tutorApplicationId: appRef.id });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      resetFields();
      onClose();
    } catch (err: any) {
      console.error(err);
      let errorMessage = '오류가 발생했습니다. 다시 시도해주세요.';
      const errorString = err.code || err.message || '';
      if (errorString.includes('email-already-in-use')) errorMessage = '이미 가입된 이메일입니다.';
      else if (errorString.includes('invalid-credential')) errorMessage = '이메일 또는 비밀번호가 일치하지 않습니다.';
      else if (errorString.includes('weak-password')) errorMessage = '비밀번호는 6자 이상이어야 합니다.';
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

              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
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
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#FEE500] text-[#3c1e1e] font-bold hover:opacity-90 transition-all"
                    onClick={handleKakaoLogin}
                  >
                    <div className="w-5 h-5 flex items-center justify-center bg-[#3c1e1e] rounded-sm text-[#FEE500] text-[10px]">K</div>
                    카카오 계정으로 {mode === 'signin' ? '로그인' : '시작하기'}
                  </button>
                </div>

                {mode === 'signup' && (
                  <p className="text-[11px] text-slate-500 -mt-2 text-center leading-relaxed">
                    소셜 가입 후에는 <strong>마이페이지에서 닉네임</strong>을 자유롭게 변경할 수 있습니다.
                  </p>
                )}

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-4 text-xs text-slate-400 font-medium">
                    또는 이메일로 {mode === 'signin' ? '로그인' : '가입'}
                  </span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{error}</div>
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
                          <span className="text-sm font-bold">강사 신청</span>
                        </button>
                      </div>

                      {role === 'tutor' && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-[11px] text-amber-800 leading-relaxed">
                          강사 가입은 관리자의 승인이 필요합니다. 제출 후 마이페이지에서 진행 상태를 확인하실 수 있습니다.
                        </div>
                      )}

                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          placeholder="실명"
                          required
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>

                      <div className="relative">
                        <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          placeholder="닉네임 (선택, 미입력 시 실명으로 표시)"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none"
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          maxLength={20}
                        />
                      </div>
                    </>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      placeholder="이메일"
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      placeholder="비밀번호 (6자 이상)"
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  {mode === 'signup' && (
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="password"
                        placeholder="비밀번호 확인"
                        required
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                      />
                    </div>
                  )}

                  {mode === 'signup' && role === 'tutor' && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">연락처 (카카오톡/전화) *</label>
                        <input
                          type="text"
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
                          value={tutorContact}
                          onChange={(e) => setTutorContact(e.target.value)}
                          placeholder="예: 010-1234-5678"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">영어 교육/체류 경험 *</label>
                        <textarea
                          required
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none resize-none text-sm"
                          value={tutorExperience}
                          onChange={(e) => setTutorExperience(e.target.value)}
                          placeholder="예: 5년간 1:1 회화 지도, 미국 시애틀 3년 거주 등"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">자격증 / 학력</label>
                        <textarea
                          rows={2}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none resize-none text-sm"
                          value={tutorQualifications}
                          onChange={(e) => setTutorQualifications(e.target.value)}
                          placeholder="예: TESOL, TOEIC 990"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">자기 소개 *</label>
                        <textarea
                          required
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none resize-none text-sm"
                          value={tutorIntroduction}
                          onChange={(e) => setTutorIntroduction(e.target.value)}
                          placeholder="수업 스타일과 강점을 자유롭게 적어주세요"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        * 추후 증빙 서류 업로드 기능이 추가될 예정입니다. 현재는 텍스트 정보로만 신청됩니다.
                      </p>
                    </div>
                  )}

                  <Button type="submit" className="w-full py-4 rounded-xl" disabled={loading}>
                    {loading ? '처리 중...' : mode === 'signin' ? '로그인' : role === 'tutor' ? '강사 신청 제출' : '회원가입 완료'}
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
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
