import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { auth } from '../firebase';

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
        
        const response = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': idToken ? `Bearer ${idToken}` : '',
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount,
          }),
        });

        const data = await response.json() as any;

        if (response.ok) {
          setPaymentData(data);
        } else {
          setError(data.message || '결제 승인에 실패했습니다.');
        }
      } catch (err) {
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">결제 승인 실패</h2>
        <p className="text-slate-600 mb-8 text-center max-w-md">{error}</p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/tutors')}>
            다시 시도
          </Button>
          <Button onClick={() => navigate('/')}>
            홈으로 이동
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
        <CheckCircle size={40} />
      </div>
      <h2 className="text-3xl font-bold text-slate-900 mb-2">결제가 완료되었습니다!</h2>
      <p className="text-slate-600 mb-8 text-center">
        성공적으로 수강 신청이 완료되었습니다.<br />
        곧 담당 강사님이 연락드릴 예정입니다.
      </p>

      <div className="w-full max-w-md bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">주문 번호</span>
            <span className="font-medium text-slate-900">{orderId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">결제 금액</span>
            <span className="font-bold text-blue-600">{Number(amount).toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">결제 수단</span>
            <span className="font-medium text-slate-900">{paymentData?.method || '카드'}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Link to="/dashboard">
          <Button className="px-8">
            내 강의실로 이동
          </Button>
        </Link>
        <Link to="/">
          <Button variant="outline" className="px-8">
            홈으로
          </Button>
        </Link>
      </div>
    </div>
  );
}
