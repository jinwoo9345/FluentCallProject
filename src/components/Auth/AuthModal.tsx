import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User as UserIcon, Check, ExternalLink, ArrowLeft } from 'lucide-react';
import { auth, db, googleProvider } from '../../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserSessionPersistence,
  signInWithPopup,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Button } from '../ui/Button';
import { cn, generateReferralCode } from '@/src/lib/utils';
import {
  validateNicknameFormat,
  isNicknameAvailable,
  claimNickname,
} from '@/src/lib/nickname';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [signupStep, setSignupStep] = useState<'methods' | 'email'>('methods');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [referralInput, setReferralInput] = useState(
    typeof window !== 'undefined' ? (localStorage.getItem('pendingReferralCode') || '') : ''
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // 닉네임 실시간 검증 상태
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [nicknameStatusMessage, setNicknameStatusMessage] = useState('');
  const [signupValidationAttempted, setSignupValidationAttempted] = useState(false);
  const nicknameSectionRef = useRef<HTMLDivElement>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);
  const consentSectionRef = useRef<HTMLDivElement>(null);

  // 가입 시 약관 동의 (필수: 이용약관 + 개인정보 / 선택: 마케팅 수신)
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const agreeAll = agreeTerms && agreePrivacy && agreeMarketing;
  const requiredConsentOk = agreeTerms && agreePrivacy;

  // Navbar 등 외부에서 요청한 로그인/회원가입 모드를 모달을 열 때마다 반영한다.
  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setSignupStep('methods');
    setError('');
  }, [initialMode, isOpen]);

  const toggleAll = (next: boolean) => {
    setAgreeTerms(next);
    setAgreePrivacy(next);
    setAgreeMarketing(next);
  };

  // 모드 전환 시 동의 상태 리셋
  useEffect(() => {
    if (mode === 'signin') {
      setAgreeTerms(false);
      setAgreePrivacy(false);
      setAgreeMarketing(false);
      setSignupValidationAttempted(false);
      setSignupStep('methods');
    }
  }, [mode]);

  // 닉네임 입력 debounce 중복 검사 (가입 모드 한정)
  useEffect(() => {
    if (mode !== 'signup') return;
    const trimmed = nickname.trim();
    if (!trimmed) {
      setNicknameStatus('idle');
      setNicknameStatusMessage('');
      return;
    }
    const formatCheck = validateNicknameFormat(trimmed);
    if (!formatCheck.ok) {
      setNicknameStatus('invalid');
      setNicknameStatusMessage(formatCheck.message || '');
      return;
    }
    setNicknameStatus('checking');
    setNicknameStatusMessage('확인 중...');
    const handle = setTimeout(async () => {
      try {
        const available = await isNicknameAvailable(trimmed);
        if (available) {
          setNicknameStatus('available');
          setNicknameStatusMessage('사용 가능한 닉네임입니다.');
        } else {
          setNicknameStatus('taken');
          setNicknameStatusMessage('이미 사용 중인 닉네임입니다.');
        }
      } catch (err) {
        console.warn('닉네임 검사 실패:', err);
        setNicknameStatus('idle');
        setNicknameStatusMessage('');
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [nickname, mode]);

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setPasswordConfirm('');
    setName('');
    setNickname('');
    setNicknameStatus('idle');
    setNicknameStatusMessage('');
    setReferralInput('');
    setAgreeTerms(false);
    setAgreePrivacy(false);
    setAgreeMarketing(false);
    setSignupValidationAttempted(false);
    setSignupStep('methods');
    setError('');
  };

  // 이메일 가입 완료 버튼은 필수 입력이 준비될 때까지 비활성화한다.
  // 소셜 가입 버튼은 항상 누를 수 있고, 클릭 시 누락된 필드로 안내한다.
  const signupBlocked = mode === 'signup' && (!requiredConsentOk || nicknameStatus !== 'available');

  // 가입 모드에서 닉네임 입력값을 검증하고 사용 가능 여부를 확정한다.
  // - 형식 오류 / 미입력 / 이미 사용 중 인 경우 false 반환 + error 표시
  const ensureNicknameUsable = async (showGlobalError = true): Promise<boolean> => {
    if (mode !== 'signup') return true;
    const fmt = validateNicknameFormat(nickname);
    if (!fmt.ok) {
      const message = fmt.message || '닉네임이 올바르지 않습니다.';
      setNicknameStatus('invalid');
      setNicknameStatusMessage(message);
      if (showGlobalError) setError(message);
      return false;
    }
    try {
      const available = await isNicknameAvailable(nickname);
      if (!available) {
        const message = '이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.';
        setNicknameStatus('taken');
        setNicknameStatusMessage(message);
        if (showGlobalError) setError(message);
        return false;
      }
      setNicknameStatus('available');
      setNicknameStatusMessage('사용 가능한 닉네임입니다.');
      return true;
    } catch (err: any) {
      console.warn('닉네임 가용성 확인 실패:', err);
      const message = '닉네임 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setNicknameStatus('idle');
      setNicknameStatusMessage(message);
      if (showGlobalError) setError(message);
      return false;
    }
  };

  const moveToField = (section: HTMLElement | null, input?: HTMLInputElement | null) => {
    requestAnimationFrame(() => {
      section?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input?.focus({ preventScroll: true });
    });
  };

  // 간편 가입 버튼 클릭 시 비활성화 대신 누락된 필드를 직접 안내한다.
  const ensureSignupBasicsReady = async (): Promise<boolean> => {
    if (mode !== 'signup') return true;
    setSignupValidationAttempted(true);

    if (!(await ensureNicknameUsable(false))) {
      moveToField(nicknameSectionRef.current, nicknameInputRef.current);
      return false;
    }
    if (!requiredConsentOk) {
      moveToField(consentSectionRef.current);
      return false;
    }
    return true;
  };

  // 입력된 추천인 코드가 유효한지 검증하고 정규화된 코드 반환
  // referral_codes/{code} 문서를 공개 read로 확인 (로그인 전에도 검증 가능)
  const validateReferral = async (raw: string): Promise<string> => {
    const code = (raw || '').trim().toUpperCase();
    if (!code) return '';
    const snap = await getDoc(doc(db, 'referral_codes', code));
    if (!snap.exists()) {
      throw new Error('존재하지 않는 추천인 코드입니다. 비워두거나 올바른 코드를 입력해주세요.');
    }
    return code;
  };

  const handleSocialLogin = async (provider: any) => {
    setError('');
    if (!(await ensureSignupBasicsReady())) return;
    setLoading(true);
    try {
      // 신규 가입 시에만 사용될 추천인 코드를 미리 검증
      let validatedReferral = '';
      if (mode === 'signup' && referralInput.trim()) {
        try {
          validatedReferral = await validateReferral(referralInput);
        } catch (err: any) {
          setError(err.message);
          setLoading(false);
          return;
        }
      }
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await ensureUserDocument(user, validatedReferral, mode === 'signup' ? nickname.trim() : '');
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('소셜 로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    setError('');
    if (!(await ensureSignupBasicsReady())) return;
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

      // 카카오는 redirect 흐름이라 동의값/닉네임을 localStorage 에 임시 저장해서 App.tsx 의 유저 생성 시점에 반영
      if (mode === 'signup') {
        localStorage.setItem(
          'pendingConsent',
          JSON.stringify({
            agreedToTerms: agreeTerms,
            agreedToPrivacy: agreePrivacy,
            marketingOptIn: agreeMarketing,
            ts: Date.now(),
          })
        );
        localStorage.setItem('pendingNickname', nickname.trim());
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

  const handleOpenEmailSignup = async () => {
    setError('');
    if (!(await ensureSignupBasicsReady())) return;
    setSignupStep('email');
  };

  const sendVerificationMail = async (user: any) => {
    auth.languageCode = 'ko';
    await sendEmailVerification(user, {
      url: `${window.location.origin}/dashboard`,
      handleCodeInApp: false,
    });
  };

  const ensureUserDocument = async (
    user: any,
    validatedReferral: string = '',
    chosenNickname: string = ''
  ) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const referralCode = generateReferralCode();
      const realName = user.displayName || '회원';
      const displayName = (chosenNickname || realName).trim();

      // 닉네임 유니크 인덱스 점유 (실패 시 가입 중단)
      await claimNickname(displayName, user.uid);

      await setDoc(userRef, {
        uid: user.uid,
        name: displayName,
        realName,
        email: user.email || '',
        role: 'student',
        credits: 0,
        referralCode,
        referredBy: validatedReferral,
        discountBalance: 0,
        createdAt: serverTimestamp(),
        avatar: `https://picsum.photos/seed/${user.uid}/200/200`,
        agreedToTermsAt: serverTimestamp(),
        agreedToPrivacyAt: serverTimestamp(),
        marketingOptIn: agreeMarketing,
        marketingOptInAt: agreeMarketing ? serverTimestamp() : null,
        emailVerificationRequired: false,
      });

      // 추천 코드 인덱스 문서 생성 (공개 조회용)
      try {
        await setDoc(doc(db, 'referral_codes', referralCode), {
          userId: user.uid,
          name: displayName,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('referral_codes 인덱스 생성 실패:', err);
      }

      if (validatedReferral) localStorage.removeItem('pendingReferralCode');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup') {
      if (!requiredConsentOk) {
        setError('이용약관 및 개인정보 수집·이용에 동의해주세요.');
        return;
      }
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
      // 닉네임 필수 + 중복 사전 검증
      if (!(await ensureNicknameUsable())) {
        return;
      }
    }

    setLoading(true);
    try {
      await setPersistence(auth, browserSessionPersistence);

      if (mode === 'signup') {
        // 추천인 코드 사전 검증 (입력 시에만)
        let validatedReferral = '';
        try {
          validatedReferral = await validateReferral(referralInput);
        } catch (err: any) {
          setError(err.message);
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const displayName = nickname.trim();
        await updateProfile(user, { displayName });

        // 닉네임 유니크 인덱스 점유 — 실패하면 Auth 계정만 남는 상태를 막기 위해 가입 흐름을 중단하고 보고.
        // (race condition 으로 사전 검사 통과 후 다른 유저가 선점한 경우)
        try {
          await claimNickname(displayName, user.uid);
        } catch (err: any) {
          throw new Error(err?.message || '닉네임 등록에 실패했습니다.');
        }

        const referralCode = generateReferralCode();

        const userDoc: any = {
          uid: user.uid,
          name: displayName,
          realName: name.trim(),
          email,
          role: 'student',
          credits: 0,
          referralCode,
          referredBy: validatedReferral,
          discountBalance: 0,
          createdAt: serverTimestamp(),
          avatar: `https://picsum.photos/seed/${user.uid}/200/200`,
          agreedToTermsAt: serverTimestamp(),
          agreedToPrivacyAt: serverTimestamp(),
          marketingOptIn: agreeMarketing,
          marketingOptInAt: agreeMarketing ? serverTimestamp() : null,
          emailVerificationRequired: true,
        };

        await setDoc(doc(db, 'users', user.uid), userDoc);

        // 추천 코드 인덱스 문서 생성 (공개 조회용 · 이름 스냅샷 포함)
        try {
          await setDoc(doc(db, 'referral_codes', referralCode), {
            userId: user.uid,
            name: displayName,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          console.warn('referral_codes 인덱스 생성 실패:', err);
        }

        if (validatedReferral) localStorage.removeItem('pendingReferralCode');
        try {
          await sendVerificationMail(user);
          alert('회원가입이 완료되었습니다. 받은 메일에서 이메일 인증을 진행해주세요.');
        } catch (verificationError) {
          // 계정과 프로필 생성은 이미 완료됐으므로 메일 발송 실패를 가입 실패로 오인시키지 않는다.
          console.warn('최초 이메일 인증 메일 발송 실패:', verificationError);
          alert('회원가입은 완료되었지만 인증 메일을 보내지 못했습니다. 마이페이지에서 다시 발송해주세요.');
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
                <div className="flex items-center gap-3">
                  {mode === 'signup' && signupStep === 'email' && (
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setSignupStep('methods');
                      }}
                      aria-label="가입 방식 선택으로 돌아가기"
                      className="text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      <ArrowLeft size={22} />
                    </button>
                  )}
                  <h2 className="text-xl font-bold text-slate-900">
                    {mode === 'signin' ? '로그인' : signupStep === 'email' ? '이메일로 회원가입' : '회원가입'}
                  </h2>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{error}</div>
                )}

                {mode === 'signup' && signupStep === 'methods' && (
                  <>
                    <div>
                      <p className="text-sm font-bold text-slate-900 mb-3">가입 정보</p>
                      {/* 이메일·소셜 가입에서 공통으로 사용할 닉네임 */}
                      <div
                        ref={nicknameSectionRef}
                        className={cn(
                          'p-4 rounded-2xl bg-slate-50 border transition-colors',
                          signupValidationAttempted && nicknameStatus !== 'available'
                            ? 'border-red-400 ring-1 ring-red-100'
                            : 'border-slate-100'
                        )}
                      >
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          닉네임 (필수 · 중복 불가)
                        </label>
                        <input
                          ref={nicknameInputRef}
                          type="text"
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          placeholder="예: 영어초보"
                          maxLength={20}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                        />
                        {nicknameStatusMessage && (
                          <p className={`mt-1 text-[11px] font-bold ${
                            nicknameStatus === 'available' ? 'text-green-600'
                            : nicknameStatus === 'checking' ? 'text-slate-500'
                            : 'text-red-600'
                          }`}>
                          {nicknameStatusMessage}
                          </p>
                        )}
                        {signupValidationAttempted && nicknameStatus === 'idle' && !nicknameStatusMessage && (
                          <p className="mt-1 text-[11px] font-bold text-red-600">
                            닉네임을 입력하고 사용 가능 여부를 확인해주세요.
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                          서비스 전반에서 표시되는 이름입니다. <strong>가입 후 마이페이지에서 변경할 수 있어요.</strong>
                        </p>
                      </div>
                    </div>

                    {/* 추천인 코드 입력 (이메일·소셜 공통) */}
                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                      <label className="block text-xs font-bold text-blue-700 mb-1.5">
                        추천인 코드 (선택)
                      </label>
                      <input
                        type="text"
                        value={referralInput}
                        onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                        placeholder="예: A1B2C3"
                        maxLength={10}
                        className="w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 uppercase tracking-widest"
                      />
                      <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                        가입 시 한 번만 입력 가능하며 <strong>이후 변경할 수 없습니다</strong>.
                        입력한 추천인은 결제 완료 시 <strong>20,000 포인트</strong>(=20,000원)를 받고, 회원님은 이 추천인에게만 <strong>포인트를 선물</strong>할 수 있습니다.
                      </p>
                    </div>
                  </>
                )}

                {mode === 'signup' && signupStep === 'methods' && (
                  <div ref={consentSectionRef}>
                    <ConsentPanel
                      agreeTerms={agreeTerms}
                      agreePrivacy={agreePrivacy}
                      agreeMarketing={agreeMarketing}
                      agreeAll={agreeAll}
                      showRequiredError={signupValidationAttempted && !requiredConsentOk}
                      onToggleTerms={() => setAgreeTerms(v => !v)}
                      onTogglePrivacy={() => setAgreePrivacy(v => !v)}
                      onToggleMarketing={() => setAgreeMarketing(v => !v)}
                      onToggleAll={() => toggleAll(!agreeAll)}
                    />
                  </div>
                )}

                {/* 가입 방식 선택 / 로그인용 소셜 버튼 */}
                {(mode === 'signin' || signupStep === 'methods') && (
                <div className="space-y-3">
                  {mode === 'signup' && (
                    <p className="text-sm font-bold text-slate-900">간편 가입</p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSocialLogin(googleProvider)}
                    disabled={loading}
                    className="w-full aspect-[600/90] flex items-center justify-center gap-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    구글 계정으로 {mode === 'signin' ? '로그인' : '시작하기'}
                  </button>
                  <button
                    type="button"
                    onClick={handleKakaoLogin}
                    disabled={loading}
                    aria-label={`카카오 계정으로 ${mode === 'signin' ? '로그인' : '시작하기'}`}
                    className="w-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <img
                      src="/kakao/kakao_login_large_wide.png"
                      alt="카카오 로그인"
                      width={600}
                      height={90}
                      className="w-full h-auto block"
                    />
                  </button>
                  {mode === 'signup' && (
                    <button
                      type="button"
                      onClick={handleOpenEmailSignup}
                      disabled={loading}
                      className="w-full aspect-[600/90] flex items-center justify-center gap-3 px-4 rounded-xl border border-slate-300 bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Mail size={20} />
                      이메일로 가입하기
                    </button>
                  )}
                  {mode === 'signup' && (
                    <p className="text-[11px] text-slate-500 text-center">
                      가입 방식을 선택하면 필요한 정보를 확인한 후 다음 단계가 진행됩니다.
                    </p>
                  )}
                </div>
                )}

                {mode === 'signin' && (
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink mx-4 text-xs text-slate-400 font-medium">
                      또는 이메일로 로그인
                    </span>
                    <div className="flex-grow border-t border-slate-100"></div>
                  </div>
                )}

                {(mode === 'signin' || signupStep === 'email') && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'signup' && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-700">
                      <strong>{nickname.trim()}</strong> 닉네임으로 이메일 계정을 만듭니다.
                    </div>
                  )}
                  {mode === 'signup' && (
                    <>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                        강사 신청은 회원가입 후 마이페이지에서 할 수 있습니다. 이메일 가입자는 계정 인증을 먼저 완료해주세요.
                      </div>

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

                      {/* 닉네임은 가입 모드 상단(소셜 버튼 위)에서 이미 입력 */}
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

                  <Button
                    type="submit"
                    className="w-full py-4 rounded-xl"
                    disabled={loading || signupBlocked}
                  >
                    {loading ? '처리 중...' : mode === 'signin' ? '로그인' : '회원가입 완료'}
                  </Button>

                  <div className="text-center text-sm text-slate-500 pt-2">
                    {mode === 'signin' ? (
                      <>
                        계정이 없으신가요?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setMode('signup');
                            setSignupStep('methods');
                          }}
                          className="text-blue-600 font-bold hover:underline"
                        >
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
                )}

                {mode === 'signup' && signupStep === 'methods' && (
                  <div className="text-center text-sm text-slate-500 pt-2">
                    이미 계정이 있으신가요?{' '}
                    <button type="button" onClick={() => setMode('signin')} className="text-blue-600 font-bold hover:underline">
                      로그인
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface ConsentPanelProps {
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
  agreeAll: boolean;
  showRequiredError: boolean;
  onToggleTerms: () => void;
  onTogglePrivacy: () => void;
  onToggleMarketing: () => void;
  onToggleAll: () => void;
}

function ConsentPanel({
  agreeTerms,
  agreePrivacy,
  agreeMarketing,
  agreeAll,
  showRequiredError,
  onToggleTerms,
  onTogglePrivacy,
  onToggleMarketing,
  onToggleAll,
}: ConsentPanelProps) {
  return (
    <div className={cn(
      'rounded-2xl border bg-slate-50/60 p-4 transition-colors',
      showRequiredError ? 'border-red-400 ring-1 ring-red-100' : 'border-slate-200'
    )}>
      <button
        type="button"
        onClick={onToggleAll}
        className="w-full flex items-center gap-3 pb-3 border-b border-slate-200"
      >
        <CheckBox checked={agreeAll} />
        <span className="text-sm font-bold text-slate-900">전체 동의</span>
      </button>
      <div className="space-y-2 pt-3">
        <ConsentRow
          checked={agreeTerms}
          onToggle={onToggleTerms}
          label="(필수) 이용약관 동의"
          href="/terms-of-service"
        />
        <ConsentRow
          checked={agreePrivacy}
          onToggle={onTogglePrivacy}
          label="(필수) 개인정보 수집·이용 동의"
          href="/privacy-policy"
        />
        <ConsentRow
          checked={agreeMarketing}
          onToggle={onToggleMarketing}
          label="(선택) 마케팅 정보 수신 동의"
        />
        {showRequiredError && (
          <p className="pt-1 text-[11px] font-bold text-red-600">
            이용약관과 개인정보 수집·이용 동의가 필요합니다.
          </p>
        )}
      </div>
    </div>
  );
}

function ConsentRow({
  checked,
  onToggle,
  label,
  href,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button type="button" onClick={onToggle} className="flex items-center gap-2.5 flex-1 text-left">
        <CheckBox checked={checked} small />
        <span className="text-[12px] text-slate-700">{label}</span>
      </button>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 flex-shrink-0"
        >
          보기 <ExternalLink size={11} />
        </a>
      )}
    </div>
  );
}

function CheckBox({ checked, small = false }: { checked: boolean; small?: boolean }) {
  const size = small ? 'h-4 w-4' : 'h-5 w-5';
  const iconSize = small ? 12 : 14;
  return (
    <span
      className={`${size} rounded-md flex items-center justify-center flex-shrink-0 border ${
        checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'
      }`}
    >
      <Check size={iconSize} strokeWidth={3} />
    </span>
  );
}
