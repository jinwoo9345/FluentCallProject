import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/Auth/AuthModal';
import Home from './pages/Home';
import Tutors from './pages/Tutors';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import RefundPolicy from './pages/RefundPolicy';
import TermsOfService from './pages/TermsOfService';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFail from './pages/PaymentFail';
import ReferralProgram from './pages/ReferralProgram';
import Placeholder from './pages/Placeholder';
import ConsultationRequest from './pages/ConsultationRequest';
import { useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithCustomToken } from 'firebase/auth';

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
          const redirectUri = `${window.location.origin}/dashboard`;
          console.log('[Kakao Auth] Sending code to backend...', { redirectUri });

          const response = await fetch('/api/auth/kakao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirectUri }) 
          });

          const data = await response.json();
          console.log('[Kakao Auth] Backend raw response:', data); // 응답 데이터 전체 출력
          
          if (!response.ok) throw new Error(data.detail || data.message);

          const userCredential = await signInWithCustomToken(auth, data.customToken);
          const user = userCredential.user;

          // Check for pending consultation to link
          const pendingConsultationId = localStorage.getItem('pendingConsultationId');
          const pendingReferral = localStorage.getItem('pendingReferralCode') || '';

          // Ensure user document exists or update existing info
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const fallbackName = `카카오회원${user.uid.slice(-4)}`;
            const kakaoName = data.userName || user.displayName || fallbackName;
            await setDoc(userRef, {
              uid: user.uid,
              name: kakaoName,           // 표시명 (닉네임이 없으면 실명 사용)
              realName: kakaoName,       // 실명 (마이페이지에서 참조용)
              email: user.email || '',
              role: 'student',
              credits: 0,
              referralCode,
              referredBy: '',
              discountBalance: 0,
              createdAt: serverTimestamp(),
              avatar: `https://picsum.photos/seed/${user.uid}/200/200`,
              hasCompletedConsultation: !!pendingConsultationId // If consultation was done before login
            });
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
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tutors" element={<Tutors />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/fail" element={<PaymentFail />} />
          <Route path="/referral" element={<ReferralProgram />} />
          <Route path="/consultation" element={<ConsultationRequest />} />
          <Route
            path="/about"
            element={<Placeholder title="프로그램 소개" />}
          />
          <Route
            path="/level-test"
            element={<Placeholder title="레벨테스트" description="영어 회화 레벨을 진단하는 테스트 페이지가 준비 중입니다." />}
          />
          <Route
            path="/faq"
            element={<Placeholder title="자주 묻는 질문 (FAQ)" description="메인 페이지 FAQ 섹션에서 먼저 확인해보세요. 전용 페이지는 곧 추가될 예정입니다." />}
          />
          <Route
            path="/qna"
            element={<Placeholder title="Q&A 게시판" description="회원 간 질문과 답변을 나누는 게시판입니다. 곧 오픈 예정입니다." />}
          />
          <Route
            path="/info-board"
            element={<Placeholder title="정보 게시판 (회원 전용)" description="학습 팁과 공지가 공유되는 회원 전용 게시판입니다. 준비 중입니다." />}
          />
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
