/**
 * /payment/success
 *
 * ⚠️ 현재 비활성 페이지
 * 본 프로젝트는 PG 심사 통과 전까지 "무통장입금 수동 승인" 방식으로 운영되므로
 * 이 페이지는 직접 접속되지 않습니다. Toss Payments 재도입 시 아래 주석 블록을
 * 원복하고 App.tsx 의 라우트를 다시 활성화하세요.
 */
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Info } from 'lucide-react';

export default function PaymentSuccess() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 sm:px-6 lg:px-8 text-center">
      <div className="bg-white rounded-3xl border border-slate-100 p-12 shadow-sm">
        <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-6">
          <Info size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          현재 결제 방식이 무통장입금으로 전환되어 이 페이지는 사용되지 않습니다
        </h1>
        <p className="text-slate-500 leading-relaxed mb-8">
          주문 접수 후 관리자가 입금을 확인하면 내 강의실에서 수강권이 자동으로 활성화됩니다.
        </p>
        <Link to="/dashboard">
          <Button className="px-10 py-4 rounded-2xl shadow-lg">내 강의실로 이동</Button>
        </Link>
      </div>
    </div>
  );
}

/* ===================================================================
 * === Toss Payments 재도입 시 아래 블록을 복원하세요 (현재 주석) ===
 *
 * import React, { useEffect, useState } from 'react';
 * import { motion } from 'motion/react';
 * import { useSearchParams, useNavigate, Link } from 'react-router-dom';
 * import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
 * import { Button } from '../components/ui/Button';
 * import { auth, db } from '../firebase';
 * import { paymentService } from '../services/paymentService';
 * import { doc, getDoc } from 'firebase/firestore';
 *
 * export default function PaymentSuccess() {
 *   const [searchParams] = useSearchParams();
 *   const navigate = useNavigate();
 *   const [loading, setLoading] = useState(true);
 *   const [error, setError] = useState('');
 *   const [paymentData, setPaymentData] = useState<any>(null);
 *
 *   const paymentKey = searchParams.get('paymentKey');
 *   const orderId = searchParams.get('orderId');
 *   const amount = searchParams.get('amount');
 *
 *   useEffect(() => {
 *     const confirmPayment = async () => {
 *       try {
 *         const idToken = await auth.currentUser?.getIdToken();
 *         const userId = auth.currentUser?.uid;
 *         if (!userId) { setError('사용자 인증 정보가 없습니다.'); setLoading(false); return; }
 *
 *         const response = await fetch('/api/payments/confirm', {
 *           method: 'POST',
 *           headers: { 'Content-Type': 'application/json', 'Authorization': idToken ? `Bearer ${idToken}` : '' },
 *           body: JSON.stringify({ paymentKey, orderId, amount }),
 *         });
 *         const data = await response.json();
 *
 *         if (response.ok) {
 *           setPaymentData(data);
 *           const pendingPaymentDoc = await getDoc(doc(db, 'payments', orderId!));
 *           if (pendingPaymentDoc.exists()) {
 *             const pData = pendingPaymentDoc.data();
 *             if (pData.status !== 'completed') {
 *               await paymentService.recordPayment(orderId!, {
 *                 paymentKey, method: data.method, receiptUrl: data.receipt?.url || null,
 *               });
 *               if (pData.referredBy) {
 *                 await paymentService.handleReferralReward(userId, pData.referredBy);
 *               }
 *             }
 *           }
 *         } else {
 *           setError(data.message || '결제 승인에 실패했습니다.');
 *         }
 *       } catch (err) {
 *         console.error(err);
 *         setError('결제 승인 중 오류가 발생했습니다.');
 *       } finally {
 *         setLoading(false);
 *       }
 *     };
 *
 *     if (paymentKey && orderId && amount) confirmPayment();
 *     else { setError('필수 결제 정보가 누락되었습니다.'); setLoading(false); }
 *   }, [paymentKey, orderId, amount]);
 *
 *   // ...렌더링 JSX는 git 히스토리 커밋 5433812 이전 버전을 참고하세요...
 * }
 * ================================================================== */
