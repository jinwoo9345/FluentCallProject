import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ExternalLink, CreditCard, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';
import { loadTossPayments } from '@tosspayments/payment-sdk';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  price: string;
  amount: number;
}

export function PaymentModal({ isOpen, onClose, productId, productName, price, amount }: PaymentModalProps) {
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverConfig, setServerConfig] = useState<any>(null);

  const clientKey = serverConfig?.tossClientKey || (import.meta.env.VITE_TOSS_CLIENT_KEY || '').trim();

  useEffect(() => {
    // 서버에서 환경변수 가져오기
    const loadConfig = async (retries = 5) => {
      console.log(`Fetching config from server (Attempt ${6 - retries})...`);
      try {
        const res = await fetch(`/api/config?t=${Date.now()}`, { 
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        });
        
        console.log("[Debug] Response Headers:", 
          res.headers.get('Content-Type'), 
          res.headers.get('X-Custom-Server')
        );
        
        const text = await res.text();
        
        try {
          const data = JSON.parse(text);
          setServerConfig(data);
          console.log("Server config loaded successfully");
        } catch (parseErr) {
          console.error("Non-JSON response from /api/config:", text.substring(0, 100));
          if (retries > 0) {
            console.log(`Retrying in 1s... (${retries} retries left)`);
            setTimeout(() => loadConfig(retries - 1), 1000);
          } else {
            setError("서버 설정 데이터를 불러오는 데 실패했습니다. 페이지를 새로고침해 주세요.");
          }
        }
      } catch (err: any) {
        console.error('Failed to load server config:', err);
        if (retries > 0) {
          setTimeout(() => loadConfig(retries - 1), 1000);
        }
      }
    };

    loadConfig();
  }, []);

  const handlePayment = async () => {
    if (!termsAgreed) return;
    
    if (!clientKey) {
      const availableKeys = Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')).join(', ');
      setError(`결제 설정(VITE_TOSS_CLIENT_KEY)을 찾을 수 없습니다. Settings 메뉴에서 값을 확인한 후 페이지를 새로고침해 주세요. (인식된 변수: ${availableKeys || '없음'})`);
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const tossPayments = await loadTossPayments(clientKey);
      
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      console.log('Requesting payment...', { orderId, amount, productName });

      await tossPayments.requestPayment('카드', {
        amount: amount,
        orderId: orderId,
        orderName: productName,
        customerName: '회원',
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (err: any) {
      console.error('Toss Payment Error:', err);
      if (err.code === 'USER_CANCEL') {
        setError('결제가 취소되었습니다.');
      } else if (err.message?.includes('401') || err.code === 'INVALID_CLIENT_KEY' || err.message?.includes('인증되지 않은')) {
        setError('토스페이먼츠 인증에 실패했습니다. 입력하신 클라이언트 키가 해당 환경(테스트/실제)에 맞는지 확인해주세요.');
        setShowManualInput(true);
      } else {
        setError(err.message || '결제 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="text-blue-600" size={24} /> 수강 신청 및 약관 동의
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* Product Info */}
                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                  <p className="text-sm text-blue-600 font-bold mb-1">선택한 수강권</p>
                  <div className="flex justify-between items-end">
                    <h3 className="text-2xl font-black text-slate-900">{productName}</h3>
                    <p className="text-xl font-bold text-blue-700">{price}</p>
                  </div>
                </div>

                {/* Terms Summary */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">서비스 이용약관 및 환불정책</span>
                    <div className="flex gap-3">
                      <Link to="/terms-of-service" target="_blank" className="text-[10px] text-blue-600 flex items-center gap-1 hover:underline">
                        이용약관 보기 <ExternalLink size={10} />
                      </Link>
                      <Link to="/refund-policy" target="_blank" className="text-[10px] text-blue-600 flex items-center gap-1 hover:underline">
                        환불정책 보기 <ExternalLink size={10} />
                      </Link>
                    </div>
                  </div>
                  
                  <div className="h-40 overflow-y-auto text-[11px] text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
                    <p className="font-bold mb-1 text-slate-700">[서비스 이용약관 요약]</p>
                    <p>- 본 서비스는 강사와 회원을 연결하는 중개 서비스입니다.</p>
                    <p>- 수업 일정은 강사와 상호 협의하여 결정합니다.</p>
                    <p>- 강사와 직접 거래 시 서비스 이용이 제한될 수 있습니다.</p>
                    <p className="font-bold mt-3 mb-1 text-slate-700">[환불 정책 요약]</p>
                    <p>- 수업 시작 전: 100% 전액 환불</p>
                    <p>- 수업 시작 후: 진행 횟수 제외 후 환불</p>
                    <p>- 3/8 이상 진행 시 서비스 이용료(49,000원) 공제 후 환불</p>
                    <p className="mt-3 text-[10px] text-slate-400">※ 신청 완료 시 위 약관에 동의한 것으로 간주됩니다.</p>
                  </div>

                  <label className="flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-100 cursor-pointer transition-all group">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all ${termsAgreed ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 group-hover:border-blue-300'}`}>
                      {termsAgreed && <Check size={16} />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                    />
                    <span className="text-sm font-bold text-slate-700">위 약관 및 환불정책에 동의합니다 (필수)</span>
                  </label>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <div className="pt-2">
                  <Button 
                    className="w-full py-6 rounded-2xl gap-2 text-lg shadow-lg shadow-blue-100" 
                    onClick={handlePayment} 
                    disabled={loading || !termsAgreed}
                  >
                    {loading ? '처리 중...' : <><ShieldCheck size={20} /> 동의하고 신청하기</>}
                  </Button>
                  <p className="text-center text-[10px] text-slate-400 mt-4">
                    신청 후 담당자가 결제 안내를 위해 연락드릴 예정입니다.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
