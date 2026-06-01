import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/Auth/AuthModal';
import Home from './pages/Home';
import Tutors from './pages/Tutors';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import RefundPolicy from './pages/RefundPolicy';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFail from './pages/PaymentFail';
import ReferralProgram from './pages/ReferralProgram';
import Events from './pages/Events';
import ConsultationRequest from './pages/ConsultationRequest';
import About from './pages/About';
import Reviews from './pages/Reviews';
import Qna from './pages/Qna';
import InfoBoard from './pages/InfoBoard';
import { useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { generateReferralCode } from './lib/utils';
import { claimNickname, isNicknameAvailable, validateNicknameFormat } from './lib/nickname';

function AppContent() {
  const { isAuthModalOpen, setIsAuthModalOpen, authMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const processingRef = useRef(false);

  // Capture referral code from URL (?ref=CODE) so signup can use it later
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('pendingReferralCode', ref);
      searchParams.delete('ref');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Handle Kakao Redirect
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && !processingRef.current) {
      processingRef.current = true;
      const handleKakaoAuth = async () => {
        try {
          const response = await fetch('/api/auth/kakao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
          });

          const data = await response.json() as {
            customToken?: string;
            userName?: string;
            message?: string;
          };
          // customToken 포함된 응답 전체를 로그로 남기지 않음 (devtools 유출 방지)
          if (!response.ok) throw new Error(data.message || '카카오 로그인 실패');

          const userCredential = await signInWithCustomToken(auth, data.customToken);
          const user = userCredential.user;

          // Check for pending consultation to link
          const pendingConsultationId = localStorage.getItem('pendingConsultationId');
          const pendingReferral = localStorage.getItem('pendingReferralCode') || '';

          // 카카오 redirect 흐름에서 가입 모달의 약관 동의 상태를 읽음
          let pendingConsent: { agreedToTerms?: boolean; agreedToPrivacy?: boolean; marketingOptIn?: boolean } = {};
          try {
            const raw = localStorage.getItem('pendingConsent');
            if (raw) pendingConsent = JSON.parse(raw);
          } catch {}

          // Ensure user document exists or update existing info
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            const referralCode = generateReferralCode();
            const kakaoName = data.userName || user.displayName || `카카오회원${user.uid.slice(-4)}`;

            // 신규 가입은 AuthModal 에서 미리 입력한 닉네임이 있어야 진행.
            // 누락된 경우(다른 흐름으로 진입한 신규 유저)는 가입 보류 + 안내.
            const pendingNickname = localStorage.getItem('pendingNickname') || '';
            const fmt = validateNicknameFormat(pendingNickname);
            if (!fmt.ok) {
              await signOut(auth);
              localStorage.removeItem('pendingNickname');
              alert('신규 가입은 회원가입 모달에서 닉네임 입력 후 진행해주세요.');
              return;
            }
            // race condition 으로 사전 검사 통과 후 점유된 경우를 대비해 한 번 더 확인
            const available = await isNicknameAvailable(pendingNickname);
            if (!available) {
              await signOut(auth);
              localStorage.removeItem('pendingNickname');
              alert('입력하신 닉네임이 방금 다른 사용자에게 등록되었습니다. 다시 시도해주세요.');
              return;
            }

            // 추천인 코드 검증 (referral_codes 인덱스 사용 — 비로그인 상태에서도 읽기 가능)
            let validatedReferral = '';
            if (pendingReferral) {
              try {
                const codeDoc = await getDoc(
                  doc(db, 'referral_codes', pendingReferral.toUpperCase())
                );
                if (codeDoc.exists()) validatedReferral = pendingReferral.toUpperCase();
              } catch (err) {
                console.warn('추천인 코드 검증 실패:', err);
              }
            }

            // 닉네임 인덱스 점유 (실패 시 가입 중단)
            try {
              await claimNickname(pendingNickname, user.uid);
            } catch (err: any) {
              await signOut(auth);
              localStorage.removeItem('pendingNickname');
              alert(err?.message || '닉네임 등록에 실패했습니다.');
              return;
            }

            const marketingOptIn = !!pendingConsent.marketingOptIn;
            await setDoc(userRef, {
              uid: user.uid,
              name: pendingNickname.trim(),
              realName: kakaoName,
              email: '',
              role: 'student',
              credits: 0,
              referralCode,
              referredBy: validatedReferral,
              discountBalance: 0,
              createdAt: serverTimestamp(),
              avatar: `https://picsum.photos/seed/${user.uid}/200/200`,
              hasCompletedConsultation: !!pendingConsultationId,
              agreedToTermsAt: serverTimestamp(),
              agreedToPrivacyAt: serverTimestamp(),
              marketingOptIn,
              marketingOptInAt: marketingOptIn ? serverTimestamp() : null,
            });
            localStorage.removeItem('pendingConsent');
            localStorage.removeItem('pendingNickname');

            // 추천 코드 인덱스 문서 생성 (공개 조회용 · 이름 스냅샷 포함)
            try {
              await setDoc(doc(db, 'referral_codes', referralCode), {
                userId: user.uid,
                name: pendingNickname.trim(),
                createdAt: serverTimestamp(),
              });
            } catch (err) {
              console.warn('referral_codes 인덱스 생성 실패:', err);
            }

            if (validatedReferral) localStorage.removeItem('pendingReferralCode');
          } else {
            // Update existing user profile — realName 없으면 보정, 표시명(name)은 사용자 설정값 유지
            const existing = userSnap.data() as any;
            const updateData: any = {};
            if (!existing.realName && (data.userName || user.displayName)) {
              updateData.realName = data.userName || user.displayName;
            }
            // 기존 표시명이 기본값(카카오회원·카카오 회원)이고 닉네임을 설정하지 않은 경우에만 최신 이름으로 덮어씀
            if (
              (existing.name === '카카오 회원' || !existing.name) &&
              (data.userName || user.displayName)
            ) {
              updateData.name = data.userName || user.displayName;
            }
            if (pendingConsultationId) {
              updateData.hasCompletedConsultation = true;
            }
            if (Object.keys(updateData).length > 0) {
              await setDoc(userRef, updateData, { merge: true });
            }
          }

          // Link the consultation document to the user
          if (pendingConsultationId) {
            try {
              await updateDoc(doc(db, 'consultations', pendingConsultationId), {
                userId: user.uid
              });
              localStorage.removeItem('pendingConsultationId');
              localStorage.removeItem('pendingConsultationName');
              console.log('[Auth] Linked pending consultation to user:', user.uid);
            } catch (err) {
              console.error('Error linking consultation:', err);
            }
          }
          
          // Clear query params
          searchParams.delete('code');
          setSearchParams(searchParams);
        } catch (err: any) {
          console.error('Kakao auth error:', err);
          alert('카카오 로그인 실패: ' + (err.message || '알 수 없는 오류'));
        }
      };
      handleKakaoAuth();
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900 antialiased">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tutors" element={<Tutors />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/fail" element={<PaymentFail />} />
          <Route path="/referral" element={<ReferralProgram />} />
          <Route path="/events" element={<Events />} />
          <Route path="/consultation" element={<ConsultationRequest />} />
          <Route path="/about" element={<About />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/qna" element={<Qna />} />
          <Route path="/info-board" element={<InfoBoard />} />
        </Routes>
      </main>
      <Footer />
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authMode} 
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
