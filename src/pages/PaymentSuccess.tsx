import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { auth, db } from '../firebase';
import { paymentService } from '../services/paymentService';
import { doc, getDoc } from 'firebase/firestore';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentData, setPaymentData] = useState<any>(null);

  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const userId = auth.currentUser?.uid;

        if (!userId) {
          setError('사용자 인증 정보가 없습니다.');
          setLoading(false);
          return;
        }

        // 1. 서버 승인 (Toss API)
        const response = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': idToken ? `Bearer ${idToken}` : '',
          },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });

        const data = await response.json();

        if (response.ok) {
          setPaymentData(data);

          // 2. DB 기록 및 보상 처리 (Phase 3)
          const pendingPaymentDoc = await getDoc(doc(db, 'payments', orderId!));
          if (pendingPaymentDoc.exists()) {
            const pData = pendingPaymentDoc.data();
            
            // 결제 기록 업데이트
            await paymentService.recordPayment({
              ...pData,
              paymentKey,
              method: data.method,
              status: 'completed',
              receiptUrl: data.receipt?.url || null
            });

            // 크레딧 충전 (예: 결제 금액 1000원당 1분 크레딧)
            const creditsToCharge = Math.floor(Number(amount) / 1000);
            await paymentService.updateUserCredits(userId, creditsToCharge);

            // 추천인 보상 (첫 결제인 경우)
            if (pData.referredBy) {
              await paymentService.handleReferralReward(userId, pData.referredBy);
            }
          }
        } else {
          setError(data.message || '결제 승인에 실패했습니다.');
        }
      } catch (err: any) {
        console.error(err);
        setError('결제 승인 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (paymentKey && orderId && amount) {
      confirmPayment();
    } else {
      setError('필수 결제 정보가 누락되었습니다.');
      setLoading(false);
    }
  }, [paymentKey, orderId, amount]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">결제 승인 중입니다...</h2>
        <p className="text-slate-500">잠시만 기다려주세요.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">결제 승인 실패</h2>
        <p className="text-slate-600 mb-8 max-w-md">{error}</p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/tutors')}>다시 시도</Button>
          <Button onClick={() => navigate('/')}>홈으로 이동</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6"
      >
        <CheckCircle size={40} />
      </motion.div>
      <h2 className="text-3xl font-bold text-slate-900 mb-2">결제가 완료되었습니다!</h2>
      <p className="text-slate-600 mb-8 text-center">
        수강권이 성공적으로 충전되었습니다.<br />
        이제 대시보드에서 수업을 시작해보세요.
      </p>

      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-100 shadow-xl mb-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-slate-50">
            <span className="text-slate-500 text-sm">주문 번호</span>
            <span className="font-mono text-xs font-bold text-slate-900">{orderId}</span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-slate-50">
            <span className="text-slate-500 text-sm">최종 결제 금액</span>
            <span className="text-xl font-black text-blue-600">{Number(amount).toLocaleString()}원</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 text-sm">결제 수단</span>
            <span className="font-bold text-slate-900">{paymentData?.method || '카드'}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Link to="/dashboard">
          <Button className="px-10 py-4 rounded-2xl shadow-lg">내 강의실 이동</Button>
        </Link>
        <Link to="/">
          <Button variant="outline" className="px-10 py-4 rounded-2xl">홈으로</Button>
        </Link>
      </div>
    </div>
  );
}
