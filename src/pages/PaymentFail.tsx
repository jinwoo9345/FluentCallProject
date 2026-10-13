import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { auth } from '../firebase';
import { paymentApi, forgetPayment } from '../services/paymentService';

export default function PaymentFail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const message = searchParams.get('message') || '결제 중 오류가 발생했습니다.';
  const code = searchParams.get('code');
  const orderId = searchParams.get('orderId');

  const [refundStatus, setRefundStatus] = useState('결제 상태와 포인트 반환을 확인하고 있습니다.');
  useEffect(() => {
    if (!orderId) { setRefundStatus('주문번호가 없어 관리자 확인이 필요합니다.'); return; }
    let busy = false;
    let disposed = false;
    let settled = false;
    const recover = async () => {
      if (busy || settled || !auth.currentUser) return;
      busy = true;
      try {
        const result = await paymentApi('/api/payments/cancel', { orderId, reason: message });
        if (disposed) return;
        settled = true;
        forgetPayment(orderId);
        if (result.status === 'completed') {
          setRefundStatus('이미 결제가 완료된 주문입니다. 내 강의실에서 확인해주세요.');
        } else {
          forgetPayment(orderId);
          setRefundStatus('결제 취소를 확인했습니다. 사용 포인트가 있다면 반환이 완료되었습니다.');
        }
      } catch (error: any) { if (!disposed) setRefundStatus(error.message || '확인이 지연되고 있습니다. 잠시 후 다시 확인해주세요.'); }
      finally { busy = false; }
    };
    const unsub = auth.onAuthStateChanged(u => { if (u) void recover(); else setRefundStatus('로그인 후 포인트 반환을 다시 확인해주세요.'); });
    const timer = window.setInterval(recover, 15000);
    return () => { disposed = true; unsub(); window.clearInterval(timer); };
  }, [orderId, message]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
        <XCircle size={40} />
      </div>
      <h2 className="text-3xl font-bold text-slate-900 mb-2">결제에 실패했습니다</h2>
      <p className="text-slate-600 mb-8 text-center max-w-md">
        {message}
        {code && <span className="block text-xs text-slate-400 mt-2">에러 코드: {code}</span>}
      </p>

      <p role="status" className="mb-6 max-w-md text-center text-sm text-slate-600">{refundStatus}</p>
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => navigate('/tutors')}>
          다시 시도하기
        </Button>
        <Button variant="ghost" onClick={() => navigate('/')}>
          홈으로
        </Button>
      </div>
    </div>
  );
}
