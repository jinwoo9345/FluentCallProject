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
import { useEffect } from 'react';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithCustomToken } from 'firebase/auth';

function AppContent() {
  const { isAuthModalOpen, setIsAuthModalOpen, authMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle Kakao Redirect
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      const handleKakaoAuth = async () => {
        try {
          const redirectUri = `${window.location.origin}/dashboard`;
          const response = await fetch('/api/auth/kakao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirectUri }) 
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.message);

          const userCredential = await signInWithCustomToken(auth, data.customToken);
          const user = userCredential.user;

          // Ensure user document exists
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            await setDoc(userRef, {
              uid: user.uid,
              name: user.displayName || '카카오 회원',
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
          
          // Clear query params
          searchParams.delete('code');
          setSearchParams(searchParams);
        } catch (err) {
          console.error('Kakao auth error:', err);
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
