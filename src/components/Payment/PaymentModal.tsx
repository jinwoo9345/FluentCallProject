import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Check, ExternalLink, CreditCard, AlertCircle, Ticket, Gift, Award,
  Banknote, Copy, CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';
// === Toss Payments (심사 통과 후 사용 예정 — 현재는 주석 처리) ===
// import { loadTossPayments } from '@tosspayments/payment-sdk';
import { db, auth } from '../../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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

// 계좌 정보 기본값 (app_settings/main 에서 덮어씀)
const DEFAULT_BANK = {
  bankName: '(은행명 미설정)',
  accountNumber: '(계좌번호 미설정)',
  accountHolder: '(예금주 미설정)',
};

export function PaymentModal({ isOpen, onClose, productId, productName, price, amount }: PaymentModalProps) {
  const { user } = useAuth();
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // === Toss 클라이언트 키 로드 — 심사 통과 후 복구 (주석 유지) ===
  // const [serverConfig, setServerConfig] = useState<any>(null);
  const [useCredits, setUseCredits] = useState(false);
  const [packageKey, setPackageKey] = useState<PackageKey>('8');
  const [depositorName, setDepositorName] = useState('');
  const [bankInfo, setBankInfo] = useState(DEFAULT_BANK);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);

  const selectedPackage = PACKAGES.find(p => p.key === packageKey)!;
  const totalSessions = selectedPackage.sessions + selectedPackage.bonus;
  const packageAmount = amount * selectedPackage.multiplier;
  const perSessionRate = Math.round(packageAmount / totalSessions);

  // Credit discount logic: 1 credit = 1000 won
  const CREDIT_VALUE = 1000;
  const availableCredits = user?.credits || 0;
  const creditDiscount = useCredits ? Math.min(availableCredits * CREDIT_VALUE, packageAmount) : 0;
  const finalAmount = packageAmount - creditDiscount;

  // === Toss 클라이언트 키 (심사 통과 후 복구용 — 주석 처리) ===
  // const clientKey = serverConfig?.tossClientKey || ((import.meta as any).env.VITE_TOSS_CLIENT_KEY || '').trim();

  useEffect(() => {
    if (!isOpen) return;

    // === Toss config 로드 (심사 통과 후 복구용 — 주석 처리) ===
    // const loadConfig = async (retries = 2) => {
    //   try {
    //     const url = `/api/config?t=${Date.now()}`;
    //     const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    //     const data = await res.json();
    //     setServerConfig(data);
    //   } catch (err) {
    //     if (retries > 0) setTimeout(() => loadConfig(retries - 1), 1000);
    //   }
    // };
    // loadConfig();

    // 계좌 정보를 Firestore app_settings/main 에서 실시간 로드
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'app_settings', 'main'));
        if (snap.exists()) {
          const data = snap.data() as any;
          setBankInfo({
            bankName: data.bankName || DEFAULT_BANK.bankName,
            accountNumber: data.accountNumber || DEFAULT_BANK.accountNumber,
            accountHolder: data.accountHolder || DEFAULT_BANK.accountHolder,
          });
        }
      } catch (err) {
        console.warn('계좌 정보 로드 실패:', err);
      }
    })();

    // 기본 입금자명: 실명 > 닉네임
    if (user) {
      setDepositorName(user.realName || user.name || '');
    }
  }, [isOpen, user]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text.replace(/[^0-9]/g, field === 'account' ? '' : ''));
      // 계좌번호는 숫자만 복사
      if (field === 'account') {
        await navigator.clipboard.writeText(text.replace(/[^0-9-]/g, ''));
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {}
  };

  const handleManualPayment = async () => {
    if (!termsAgreed) {
      setError('약관에 동의해주세요.');
      return;
    }
    if (!depositorName.trim()) {
      setError('입금자명을 입력해주세요.');
      return;
    }
    if (!auth.currentUser) {
      setError('로그인 후 이용해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const fullProductName = `${productName} — ${selectedPackage.label} ${selectedPackage.sessions}회${
        selectedPackage.bonus > 0 ? ` +${selectedPackage.bonus}회` : ''
      }`;

      // 가입 시 고정된 추천인 코드를 자동 사용
      const validatedReferrer = (user?.referredBy || '').trim().toUpperCase();

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
        status: 'pending',                       // 입금 대기
        paymentMethod: 'manual_bank_transfer',   // 무통장입금
        depositorName: depositorName.trim(),     // 입금자명
        referredBy: validatedReferrer || '',
        referralRewarded: false,                 // 관리자 승인 시 true 전환
        bankSnapshot: bankInfo,                  // 안내했던 계좌 정보 스냅샷
        createdAt: serverTimestamp(),
      });

      setSubmittedOrderId(orderId);
    } catch (err: any) {
      console.error('주문 생성 오류:', err);
      setError(err.message || '주문 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /* ===================================================================
   * === 토스페이먼츠 결제 (심사 통과 후 복구용 · 현재 미사용 · 주석 처리) ===
   *
   * const handleTossPayment = async () => {
   *   if (!termsAgreed) return;
   *   if (!clientKey) {
   *     setError('결제 설정을 찾을 수 없습니다. 페이지를 새로고침 해주세요.');
   *     return;
   *   }
   *
   *   const validatedReferrer = (user?.referredBy || '').trim().toUpperCase();
   *   setLoading(true); setError('');
   *
   *   try {
   *     const tossPayments = await loadTossPayments(clientKey);
   *     const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
   *     const fullProductName = `${productName} — ${selectedPackage.label} ${selectedPackage.sessions}회${selectedPackage.bonus > 0 ? ` +${selectedPackage.bonus}회` : ''}`;
   *
   *     if (auth.currentUser) {
   *       await setDoc(doc(db, 'payments', orderId), {
   *         orderId,
   *         userId: auth.currentUser.uid,
   *         amount: finalAmount,
   *         originalAmount: packageAmount,
   *         creditsUsed: useCredits ? Math.floor(creditDiscount / CREDIT_VALUE) : 0,
   *         productId,
   *         productName: fullProductName,
   *         packageKey: selectedPackage.key,
   *         packageSessions: selectedPackage.sessions,
   *         packageBonus: selectedPackage.bonus,
   *         totalSessions,
   *         status: 'pending',
   *         paymentMethod: 'toss_card',
   *         referredBy: validatedReferrer || '',
   *         createdAt: serverTimestamp(),
   *       });
   *     }
   *
   *     await tossPayments.requestPayment('카드', {
   *       amount: finalAmount,
   *       orderId,
   *       orderName: fullProductName,
   *       customerName: user?.name || '회원',
   *       successUrl: `${window.location.origin}/payment/success`,
   *       failUrl: `${window.location.origin}/payment/fail`,
   *     });
   *   } catch (err: any) {
   *     console.error('Toss Payment Error:', err);
   *     setError(err.message || '결제 진행 중 오류가 발생했습니다.');
   *   } finally {
   *     setLoading(false);
   *   }
   * };
   * ================================================================== */

  const resetAndClose = () => {
    setSubmittedOrderId(null);
    setError('');
    setDepositorName('');
    setTermsAgreed(false);
    setUseCredits(false);
    setPackageKey('8');
    onClose();
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
                <button onClick={resetAndClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* 주문 제출 완료 화면 */}
              {submittedOrderId ? (
                <div className="p-10 text-center space-y-6">
                  <div className="mx-auto w-20 h-20 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <CheckCircle2 size={42} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">입금 확인을 기다리고 있습니다</h3>
                    <p className="mt-3 text-slate-600 leading-relaxed">
                      주문이 정상적으로 접수되었습니다.<br />
                      아래 계좌로 <strong className="text-slate-900">{finalAmount.toLocaleString()}원</strong>을
                      <strong className="text-slate-900"> {depositorName}</strong> 명의로 입금해주세요.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">입금 계좌</p>
                    <p className="text-base font-bold text-slate-900">
                      {bankInfo.bankName} {bankInfo.accountNumber}
                    </p>
                    <p className="text-sm text-slate-600">예금주 · {bankInfo.accountHolder}</p>
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                      관리자가 입금을 확인하는 즉시 <strong>내 강의실에서 수강권이 자동으로 활성화</strong>됩니다.
                      보통 영업시간 내 1~2시간 이내 처리됩니다.
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    주문번호 · <code className="font-mono">{submittedOrderId}</code>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link to="/dashboard" className="flex-1">
                      <Button variant="outline" className="w-full py-4 rounded-2xl">내 강의실로 이동</Button>
                    </Link>
                    <Button onClick={resetAndClose} className="flex-1 py-4 rounded-2xl">닫기</Button>
                  </div>
                </div>
              ) : (
                <div className="p-8 space-y-6">
                  {/* Product Info */}
                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                    <p className="text-sm text-blue-600 font-bold mb-1">선택한 튜터</p>
                    <h3 className="text-lg font-bold text-slate-900">{productName}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      이 튜터가 설정한 <strong className="text-slate-700">8회 기준 수강료 {price}</strong>
                    </p>
                  </div>

                  {/* 통신판매중개자 고지 */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">[통신판매중개자 고지]</strong>{' '}
                    EnglishBites는 통신판매중개자이며, 통신판매의 당사자가 아닙니다.
                    수강권의 상품·가격·수업 내용 등에 관한 일체의 의무와 책임은
                    <strong className="text-slate-800"> 해당 튜터(판매자)</strong>에게 있습니다.
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
                        <span className="text-sm text-slate-600">
                          전액 사용 (최대 -{(availableCredits * CREDIT_VALUE).toLocaleString()}원)
                        </span>
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                          checked={useCredits}
                          onChange={(e) => setUseCredits(e.target.checked)}
                        />
                      </label>
                    </div>
                  )}

                  {/* 추천인 안내 */}
                  <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="text-blue-600" size={20} />
                      <span className="font-bold text-slate-900">등록된 추천인</span>
                    </div>
                    {user?.referredBy ? (
                      <p className="text-sm text-slate-700 leading-relaxed">
                        회원가입 시 등록한 추천인 코드{' '}
                        <code className="mx-1 px-2 py-0.5 rounded-md bg-white text-blue-700 font-mono font-bold">
                          {user.referredBy}
                        </code>{' '}
                        이(가) 자동으로 적용됩니다. 관리자가 입금을 확인하면 해당 회원에게{' '}
                        <strong>20 포인트</strong>가 지급됩니다.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        가입 시 추천인 코드를 입력하지 않으셨습니다. 추천 보상은 가입 시점에만 설정 가능합니다.
                      </p>
                    )}
                  </div>

                  {/* 무통장입금 안내 */}
                  <div className="rounded-2xl p-6 border-2 border-green-200 bg-green-50/60">
                    <div className="flex items-center gap-2 mb-4">
                      <Banknote className="text-green-600" size={22} />
                      <span className="font-bold text-slate-900">무통장입금 안내</span>
                      <span className="ml-auto text-[10px] font-black uppercase tracking-widest bg-green-600 text-white px-2 py-0.5 rounded-full">
                        현재 결제 수단
                      </span>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-green-100 space-y-3">
                      <InfoRow
                        label="은행"
                        value={bankInfo.bankName}
                      />
                      <InfoRow
                        label="계좌번호"
                        value={bankInfo.accountNumber}
                        copyable
                        copied={copiedField === 'account'}
                        onCopy={() => copyToClipboard(bankInfo.accountNumber, 'account')}
                      />
                      <InfoRow label="예금주" value={bankInfo.accountHolder} />
                      <div className="pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">최종 입금 금액</p>
                        <p className="text-2xl font-black text-slate-900">
                          {finalAmount.toLocaleString()}원
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        입금자명 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={depositorName}
                        onChange={(e) => setDepositorName(e.target.value)}
                        placeholder="실제 입금하는 분의 이름"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                        입금자명이 주문자명과 다르면 확인이 지연될 수 있어요.
                        관리자가 은행 앱에서 실제 입금을 확인한 뒤 수강권이 활성화됩니다.
                      </p>
                    </div>
                  </div>

                  {/* 약관 및 환불정책 */}
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

                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                        서비스 이용약관 · 수강자 유의사항
                      </p>
                      <div className="h-48 overflow-y-auto bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-600 leading-relaxed">
                        <TermsContent compact />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">환불 정책 전문</p>
                      <div className="h-48 overflow-y-auto bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-600 leading-relaxed">
                        <RefundPolicyContent compact />
                      </div>
                    </div>

                    <label className="flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-100 cursor-pointer transition-all">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all ${
                        termsAgreed ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200'
                      }`}>
                        {termsAgreed && <Check size={16} />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                      />
                      <span className="text-sm font-bold text-slate-700">
                        위 이용약관 및 환불정책을 확인하였으며 이에 동의합니다 (필수)
                      </span>
                    </label>
                  </div>

                  {/* 최종 버튼 */}
                  <div className="pt-2">
                    {error && (
                      <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-2">
                        <AlertCircle size={16} /> {error}
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-4 px-2">
                      <span className="text-sm text-slate-500">입금하실 금액</span>
                      <span className="text-2xl font-black text-slate-900">{finalAmount.toLocaleString()}원</span>
                    </div>

                    <Button
                      className="w-full py-6 rounded-2xl gap-2 text-lg shadow-lg"
                      onClick={handleManualPayment}
                      disabled={loading || !termsAgreed || !depositorName.trim()}
                    >
                      {loading ? '주문 접수 중...' : <><Banknote size={20} /> 주문 접수 (입금 완료 예정)</>}
                    </Button>
                    <p className="text-[11px] text-slate-400 text-center mt-2">
                      버튼을 누르면 주문이 접수됩니다. 안내된 계좌로 입금 후 관리자 확인을 기다려주세요.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

function InfoRow({
  label, value, copyable, copied, onCopy,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  copied?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold text-slate-500 w-16 flex-shrink-0">{label}</span>
      <span className="text-sm font-bold text-slate-900 truncate flex-1">{value}</span>
      {copyable && (
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 whitespace-nowrap"
        >
          {copied ? <><Check size={12} /> 복사됨</> : <><Copy size={12} /> 복사</>}
        </button>
      )}
    </div>
  );
}
