import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ExternalLink, CreditCard, ShieldCheck, AlertCircle, Ticket } from 'lucide-react';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';
import { loadTossPayments } from '@tosspayments/payment-sdk';
import { db, auth } from '../../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  price: string;
  amount: number;
}

export function PaymentModal({ isOpen, onClose, productId, productName, price, amount }: PaymentModalProps) {
  const { user } = useAuth();
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverConfig, setServerConfig] = useState<any>(null);
  const [useCredits, setUseCredits] = useState(false);

  // Credit discount logic: 1 credit = 1000 won
  const CREDIT_VALUE = 1000;
  const availableCredits = user?.credits || 0;
  const creditDiscount = useCredits ? Math.min(availableCredits * CREDIT_VALUE, amount) : 0;
  const finalAmount = amount - creditDiscount;

  const clientKey = serverConfig?.tossClientKey || ((import.meta as any).env.VITE_TOSS_CLIENT_KEY || '').trim();

  useEffect(() => {
    const loadConfig = async (retries = 2) => {
      try {
        const url = `/api/config?t=${Date.now()}`;
        const res = await fetch(url, { 
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();
        setServerConfig(data);
      } catch (err) {
        if (retries > 0) setTimeout(() => loadConfig(retries - 1), 1000);
      }
    };
    loadConfig();
  }, []);

  const handlePayment = async () => {
    if (!termsAgreed) return;
    if (!clientKey) {
      setError(`결제 설정을 찾을 수 없습니다. 페이지를 새로고침 해주세요.`);
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const tossPayments = await loadTossPayments(clientKey);
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create a pending payment document
      if (auth.currentUser) {
        await setDoc(doc(db, 'payments', orderId), {
          orderId,
          userId: auth.currentUser.uid,
          amount: finalAmount,
          originalAmount: amount,
          creditsUsed: useCredits ? Math.floor(creditDiscount / CREDIT_VALUE) : 0,
          productId: productId,
          productName: productName,
          status: 'pending',
          referredBy: user?.referredBy || null,
          createdAt: serverTimestamp()
        });
      }

      await tossPayments.requestPayment('카드', {
        amount: finalAmount,
        orderId: orderId,
        orderName: productName,
        customerName: user?.name || '회원',
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (err: any) {
      console.error('Toss Payment Error:', err);
      setError(err.message || '결제 진행 중 권한 오류가 발생했습니다. Firestore 규칙을 확인해주세요.');
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
                  <CreditCard className="text-blue-600" size={24} /> 수강 신청 및 결제
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
                    <h3 className="text-lg font-bold text-slate-900">{productName}</h3>
                    <p className="text-xl font-bold text-blue-700">{price}</p>
                  </div>
                </div>

                {/* Credits Discount */}
                {availableCredits > 0 && (
                  <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Ticket className="text-amber-600" size={20} />
                        <span className="font-bold text-slate-900">보유 크레딧 사용</span>
                      </div>
                      <span className="text-sm font-bold text-amber-700">{availableCredits} 크레딧 보유</span>
                    </div>
                    <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200 cursor-pointer">
                      <span className="text-sm text-slate-600">전액 사용 (최대 -{(availableCredits * CREDIT_VALUE).toLocaleString()}원)</span>
                      <input 
                        type="checkbox" 
                        className="h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        checked={useCredits}
                        onChange={(e) => setUseCredits(e.target.checked)}
                      />
                    </label>
                  </div>
                )}

                {/* Detailed Terms & Refund Policy (RESTORED) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">서비스 이용약관 및 환불정책</span>
                    <div className="flex gap-3">
                      <Link to="/terms-of-service" target="_blank" className="text-[10px] text-blue-600 flex items-center gap-1 hover:underline">
                        이용약관 <ExternalLink size={10} />
                      </Link>
                      <Link to="/refund-policy" target="_blank" className="text-[10px] text-blue-600 flex items-center gap-1 hover:underline">
                        환불정책 <ExternalLink size={10} />
                      </Link>
                    </div>
                  </div>
                  
                  <div className="h-32 overflow-y-auto text-[11px] text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
                    <p className="font-bold mb-1 text-slate-700">[서비스 이용약관 요약]</p>
                    <p>- 본 서비스는 강사와 회원을 연결하는 중개 서비스입니다.</p>
                    <p>- 수업 일정은 강사와 상호 협의하여 결정합니다.</p>
                    <p className="font-bold mt-3 mb-1 text-slate-700">[환불 정책 요약]</p>
                    <p>- 수업 시작 전: 100% 전액 환불</p>
                    <p>- 수업 시작 후: 진행 횟수 제외 후 환불</p>
                    <p>- 3/8 이상 진행 시 서비스 이용료 공제 후 환불</p>
                  </div>

                  <label className="flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-100 cursor-pointer transition-all group">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all ${termsAgreed ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200'}`}>
                      {termsAgreed && <Check size={16} />}
                    </div>
                    <input type="checkbox" className="hidden" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} />
                    <span className="text-sm font-bold text-slate-700">위 약관 및 환불정책에 동의합니다 (필수)</span>
                  </label>
                </div>

                <div className="pt-2">
                  {error && (
                    <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-2">
                      <AlertCircle size={16} /> {error}
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-sm text-slate-500">최종 결제 금액</span>
                    <span className="text-2xl font-black text-slate-900">{finalAmount.toLocaleString()}원</span>
                  </div>

                  <Button className="w-full py-6 rounded-2xl gap-2 text-lg shadow-lg" onClick={handlePayment} disabled={loading || !termsAgreed}>
                    {loading ? '처리 중...' : <><ShieldCheck size={20} /> 결제하기</>}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
