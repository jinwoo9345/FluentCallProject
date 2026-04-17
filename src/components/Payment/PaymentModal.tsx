import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ExternalLink, CreditCard, ShieldCheck, AlertCircle, Ticket, Gift, Award } from 'lucide-react';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';
import { loadTossPayments } from '@tosspayments/payment-sdk';
import { db, auth } from '../../firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { RefundPolicyContent, TermsContent } from '../policy/PolicyContents';
import { cn } from '@/src/lib/utils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  price: string;
  amount: number; // 8회 기준 가격 (다른 패키지는 이 가격을 기준으로 배수 계산)
}

type PackageKey = '8' | '16' | '24';

const PACKAGES: {
  key: PackageKey;
  label: string;
  sessions: number;
  bonus: number;
  multiplier: number;
  tag?: string;
}[] = [
  { key: '8',  label: '베이직',   sessions: 8,  bonus: 0, multiplier: 1 },
  { key: '16', label: '스탠다드', sessions: 16, bonus: 1, multiplier: 2, tag: '+1회 무료' },
  { key: '24', label: '프리미엄', sessions: 24, bonus: 2, multiplier: 3, tag: '+2회 무료 · 가장 인기' },
];

export function PaymentModal({ isOpen, onClose, productId, productName, price, amount }: PaymentModalProps) {
  const { user } = useAuth();
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverConfig, setServerConfig] = useState<any>(null);
  const [useCredits, setUseCredits] = useState(false);
  const [referrerCode, setReferrerCode] = useState('');
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [checkingReferrer, setCheckingReferrer] = useState(false);
  const [referrerError, setReferrerError] = useState('');
  const [packageKey, setPackageKey] = useState<PackageKey>('8');

  const selectedPackage = PACKAGES.find(p => p.key === packageKey)!;
  const totalSessions = selectedPackage.sessions + selectedPackage.bonus;
  const packageAmount = amount * selectedPackage.multiplier;
  const perSessionRate = Math.round(packageAmount / totalSessions);

  // Credit discount logic: 1 credit = 1000 won
  const CREDIT_VALUE = 1000;
  const availableCredits = user?.credits || 0;
  const creditDiscount = useCredits ? Math.min(availableCredits * CREDIT_VALUE, packageAmount) : 0;
  const finalAmount = packageAmount - creditDiscount;

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

  const validateReferrer = async (code: string): Promise<string | null> => {
    const trimmed = (code || '').trim().toUpperCase();
    if (!trimmed) return null;

    if (trimmed === user?.referralCode) {
      setReferrerError('본인의 추천 코드는 사용할 수 없습니다.');
      setReferrerName(null);
      return null;
    }

    setCheckingReferrer(true);
    setReferrerError('');
    try {
      const q = query(collection(db, 'users'), where('referralCode', '==', trimmed));
      const snap = await getDocs(q);
      if (snap.empty) {
        setReferrerError('존재하지 않는 추천 코드입니다.');
        setReferrerName(null);
        return null;
      }
      const name = (snap.docs[0].data() as any).name || '회원';
      setReferrerName(name);
      return trimmed;
    } catch (err) {
      setReferrerError('추천 코드 확인 중 오류가 발생했습니다.');
      setReferrerName(null);
      return null;
    } finally {
      setCheckingReferrer(false);
    }
  };

  const handlePayment = async () => {
    if (!termsAgreed) return;
    if (!clientKey) {
      setError(`결제 설정을 찾을 수 없습니다. 페이지를 새로고침 해주세요.`);
      return;
    }

    // 추천 코드가 입력됐다면 유효한 코드인지 최종 확인
    let validatedReferrer: string | null = null;
    if (referrerCode.trim()) {
      validatedReferrer = await validateReferrer(referrerCode);
      if (!validatedReferrer) {
        setError('추천인 코드를 다시 확인해주세요.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const tossPayments = await loadTossPayments(clientKey);
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const fullProductName = `${productName} — ${selectedPackage.label} ${selectedPackage.sessions}회${selectedPackage.bonus > 0 ? ` +${selectedPackage.bonus}회` : ''}`;

      // Create a pending payment document
      if (auth.currentUser) {
        await setDoc(doc(db, 'payments', orderId), {
          orderId,
          userId: auth.currentUser.uid,
          amount: finalAmount,
          originalAmount: packageAmount,
          creditsUsed: useCredits ? Math.floor(creditDiscount / CREDIT_VALUE) : 0,
          productId,
          productName: fullProductName,
          packageKey: selectedPackage.key,
          packageSessions: selectedPackage.sessions,
          packageBonus: selectedPackage.bonus,
          totalSessions,
          status: 'pending',
          referredBy: validatedReferrer || '',
          createdAt: serverTimestamp()
        });
      }

      await tossPayments.requestPayment('카드', {
        amount: finalAmount,
        orderId,
        orderName: fullProductName,
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
                  <p className="text-sm text-blue-600 font-bold mb-1">선택한 튜터</p>
                  <h3 className="text-lg font-bold text-slate-900">{productName}</h3>
                  <p className="text-xs text-slate-500 mt-1">8회 기준 {price}</p>
                </div>

                {/* Package Select */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="text-blue-600" size={20} />
                    <span className="font-bold text-slate-900">수강권 선택</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-auto">
                      장기일수록 보너스 ↑
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {PACKAGES.map(pkg => {
                      const pkgAmount = amount * pkg.multiplier;
                      const total = pkg.sessions + pkg.bonus;
                      const per = Math.round(pkgAmount / total);
                      const isSelected = packageKey === pkg.key;
                      return (
                        <button
                          key={pkg.key}
                          type="button"
                          onClick={() => setPackageKey(pkg.key)}
                          className={cn(
                            'relative p-4 rounded-2xl border-2 text-left transition-all',
                            isSelected
                              ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-100'
                              : 'border-slate-100 bg-white hover:border-slate-200'
                          )}
                        >
                          {pkg.bonus > 0 && (
                            <span className="absolute -top-2 -right-2 text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow">
                              +{pkg.bonus}회 무료
                            </span>
                          )}
                          <p className={cn(
                            'text-xs font-black uppercase tracking-widest mb-1',
                            isSelected ? 'text-blue-600' : 'text-slate-400'
                          )}>
                            {pkg.label}
                          </p>
                          <p className="text-2xl font-black text-slate-900">
                            {pkg.sessions}회
                            {pkg.bonus > 0 && (
                              <span className="text-amber-600 ml-1 text-base font-bold">
                                +{pkg.bonus}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            총 {total}회 수업
                          </p>
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-0.5">
                            <p className="text-sm font-bold text-slate-900">
                              {pkgAmount.toLocaleString()}원
                            </p>
                            <p className="text-[10px] text-slate-500">
                              회당 약 {per.toLocaleString()}원
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                    <strong className="text-amber-600">16회 패키지</strong>는 1회 무료(총 17회),
                    <strong className="text-amber-600"> 24회 패키지</strong>는 2회 무료(총 26회)를 추가로 제공합니다.
                  </p>
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

                {/* Referrer Code */}
                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="text-blue-600" size={20} />
                    <span className="font-bold text-slate-900">추천인 코드 (선택)</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    친구에게 받은 추천 코드를 입력하면 결제 완료 시 <strong>해당 친구에게 20,000포인트</strong>가 지급됩니다.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="예: A1B2C3"
                      className="flex-1 rounded-xl border border-blue-200 px-4 py-3 text-sm focus:border-blue-500 outline-none uppercase tracking-widest"
                      value={referrerCode}
                      onChange={(e) => {
                        setReferrerCode(e.target.value.toUpperCase());
                        setReferrerName(null);
                        setReferrerError('');
                      }}
                      maxLength={10}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="px-4"
                      onClick={() => validateReferrer(referrerCode)}
                      disabled={checkingReferrer || !referrerCode.trim()}
                    >
                      {checkingReferrer ? '확인 중…' : '확인'}
                    </Button>
                  </div>
                  {referrerName && (
                    <p className="text-xs text-blue-700 font-bold mt-2">✓ 추천인 확인: {referrerName}님</p>
                  )}
                  {referrerError && (
                    <p className="text-xs text-red-600 font-bold mt-2">{referrerError}</p>
                  )}
                </div>

                {/* Detailed Terms & Refund Policy */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">서비스 이용약관 및 환불정책</span>
                    <div className="flex gap-3">
                      <Link to="/terms-of-service" target="_blank" className="text-[10px] text-blue-600 flex items-center gap-1 hover:underline">
                        새 탭에서 이용약관 <ExternalLink size={10} />
                      </Link>
                      <Link to="/refund-policy" target="_blank" className="text-[10px] text-blue-600 flex items-center gap-1 hover:underline">
                        새 탭에서 환불정책 <ExternalLink size={10} />
                      </Link>
                    </div>
                  </div>

                  {/* 박스 1: 서비스 이용약관 / 수강자 유의사항 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">서비스 이용약관 · 수강자 유의사항</p>
                      <span className="text-[10px] text-slate-400">스크롤하여 전체 확인</span>
                    </div>
                    <div className="h-56 overflow-y-auto bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-600 leading-relaxed">
                      <TermsContent compact />
                    </div>
                  </div>

                  {/* 박스 2: 환불 정책 전문 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">환불 정책 전문</p>
                      <span className="text-[10px] text-slate-400">스크롤하여 전체 확인</span>
                    </div>
                    <div className="h-56 overflow-y-auto bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-600 leading-relaxed">
                      <RefundPolicyContent compact />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-100 cursor-pointer transition-all group">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all ${termsAgreed ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200'}`}>
                      {termsAgreed && <Check size={16} />}
                    </div>
                    <input type="checkbox" className="hidden" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} />
                    <span className="text-sm font-bold text-slate-700">위 이용약관 및 환불정책을 확인하였으며 이에 동의합니다 (필수)</span>
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
