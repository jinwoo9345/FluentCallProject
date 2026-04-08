import React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { XCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function PaymentFail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const message = searchParams.get('message') || '결제 중 오류가 발생했습니다.';
  const code = searchParams.get('code');

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

      <div className="flex gap-4">
        <Button variant="outline" onClick={() => navigate('/tutors')}>
          다시 시도하기
        </Button>
        <Link to="/help">
          <Button variant="ghost">
            고객센터 문의
          </Button>
        </Link>
      </div>
    </div>
  );
}
