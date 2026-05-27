/**
 * /payment/success
 *
 * 토스 결제위젯에서 결제 완료 후 리다이렉트되는 페이지.
 * 쿼리로 받은 paymentKey/orderId/amount 를 서버 confirm API 로 전송하여 최종 승인 처리한다.
 *
 * 흐름:
 *  1) Toss SDK 가 paymentKey, orderId, amount 를 query 로 보냄
 *  2) /api/payments/confirm 호출 → 토스 v1 confirm API 로 승인
 *  3) 응답 성공 시 Firestore payments doc 을 completed 로 업데이트 + 추천인 보상 처리
 */
import { useEffect, useState } from 'react';
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
    if (!paymentKey || !orderId || amount == null) {
      setError('필수 결제 정보가 누락되었습니다.');
      setLoading(false);
      return;
    }

    // 토스 결제창에서 redirect 되어 돌아온 직후에는 Firebase Auth 가 localStorage 에서
    // 인증 상태를 비동기로 복원하는 중이라 auth.currentUser 가 잠시 null 일 수 있다.
    // onAuthStateChanged 의 첫 발화를 기다린 뒤 confirm 호출.
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();

      if (!user) {
        setError('사용자 인증 정보가 없습니다. 다시 로그인 후 시도해주세요.');
        setLoading(false);
        return;
      }

      try {
        const idToken = await user.getIdToken();
        const userId = user.uid;

        const response = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });
        const data: any = await response.json();

        if (!response.ok) {
          setError(data?.message || '결제 승인에 실패했습니다.');
          setLoading(false);
          return;
        }

        setPaymentData(data);

        // pending → completed 로 결제 doc 갱신 + 추천인 보상 (중복 처리 방지)
        const pendingPaymentDoc = await getDoc(doc(db, 'payments', orderId));
        if (pendingPaymentDoc.exists()) {
          const pData = pendingPaymentDoc.data() as any;
          if (pData.status !== 'completed') {
            await paymentService.recordPayment(orderId, {
              paymentKey,
              method: data.method,
              receiptUrl: data.receipt?.url || null,
            });
            if (pData.referredBy && !pData.referralRewarded) {
              await paymentService.handleReferralReward(userId, pData.referredBy);
            }
          }
        }
      } catch (err: any) {
        console.error('[PaymentSuccess] confirm error:', err);
        setError(err?.message || '결제 승인 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [paymentKey, orderId, amount]);

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-6">
          <Loader2 size={32} className="animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">결제 승인 중입니다…</h1>
        <p className="text-slate-500">잠시만 기다려주세요. 페이지를 닫지 마세요.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-6">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">결제 승인에 실패했습니다</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">{error}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate('/tutors')}>
            다시 시도하기
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')}>홈으로</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <div className="bg-white rounded-3xl border border-slate-100 p-12 shadow-sm">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
          <CheckCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">결제가 완료되었습니다</h1>
        <p className="text-slate-500 leading-relaxed mb-8">
          수강권이 활성화되었습니다. 내 강의실에서 수업 일정을 확인해주세요.
        </p>

        {paymentData && (
          <div className="mb-8 rounded-2xl bg-slate-50 border border-slate-100 p-5 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-bold">주문번호</span>
              <span className="font-mono text-xs text-slate-700">{orderId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-bold">결제금액</span>
              <span className="font-bold text-slate-900">{Number(amount).toLocaleString()}원</span>
            </div>
            {paymentData.method && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-bold">결제수단</span>
                <span className="text-slate-700">{paymentData.method}</span>
              </div>
            )}
            {paymentData.receipt?.url && (
              <div className="pt-2 text-right">
                <a
                  href={paymentData.receipt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  영수증 보기 →
                </a>
              </div>
            )}
          </div>
        )}

        <Link to="/dashboard">
          <Button className="px-10 py-4 rounded-2xl shadow-lg">내 강의실로 이동</Button>
        </Link>
      </div>
    </div>
  );
}
