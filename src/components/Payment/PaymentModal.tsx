import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Check, ExternalLink, CreditCard, AlertCircle, Ticket, Gift, Award,
  Banknote, Copy, CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';
// === Toss Payments v2 결제위젯 SDK ===
// 심사 통과 전이라도 테스트 키로 위젯 전체 흐름을 검증할 수 있다.
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { db, auth } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { paymentApi, rememberPayment, forgetPayment } from '../../services/paymentService';
import { useAuth } from '../../contexts/AuthContext';
import { RefundPolicyContent, TermsContent } from '../policy/PolicyContents';
import { cn } from '@/src/lib/utils';
import { PACKAGES, PackageKey } from '../../constants';
import { paymentOrderAction } from '../../lib/paymentOrderState';
import { inspectPointBalance } from '../../lib/pointBalance';

type PaymentMethodTab = 'bank' | 'toss';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  tutorId?: string;
  tutorName?: string;
}

// 계좌 정보 기본값 (app_settings/main 에서 덮어씀)
const DEFAULT_BANK = {
  bankName: '(은행명 미설정)',
  accountNumber: '(계좌번호 미설정)',
  accountHolder: '(예금주 미설정)',
};

export function PaymentModal({ isOpen, onClose, productId, productName, tutorId, tutorName }: PaymentModalProps) {
  const { user, requireVerifiedEmail } = useAuth();
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useCredits, setUseCredits] = useState(true);
  const [serverPointWarning, setServerPointWarning] = useState('');
  const [packageKey, setPackageKey] = useState<PackageKey>('basic');
  const [depositorName, setDepositorName] = useState('');
  const [bankInfo, setBankInfo] = useState(DEFAULT_BANK);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);

  // === 결제수단 탭 (무통장입금 ↔ 토스 결제위젯) ===
  const [paymentTab, setPaymentTab] = useState<PaymentMethodTab>('bank');

  // === Toss v2 위젯 상태 ===
  const [tossClientKey, setTossClientKey] = useState('');
  const [tossReady, setTossReady] = useState(false);
  const widgetsRef = useRef<any>(null);
  const paymentMethodWidgetRef = useRef<any>(null);
  const agreementWidgetRef = useRef<any>(null);
  const widgetAmountSync = useRef<Promise<unknown>>(Promise.resolve());

  const selectedPackage = PACKAGES.find(p => p.key === packageKey)!;
  const totalSessions = selectedPackage.sessions + selectedPackage.bonus;
  const packageAmount = selectedPackage.price;

  // Point discount logic: 1 point = 1 won
  const CREDIT_VALUE = 1;
  const pointState = inspectPointBalance(user?.credits);
  const pointWarning = pointState.warning || serverPointWarning;
  const availableCredits = pointWarning ? 0 : pointState.balance;
  const creditDiscount = useCredits ? Math.min(availableCredits * CREDIT_VALUE, packageAmount) : 0;
  const finalAmount = packageAmount - creditDiscount;

  useEffect(() => {
    if (!isOpen) return;

    // Toss 클라이언트 키 로드 (서버 /api/config — VITE_TOSS_CLIENT_KEY 가 비어도 graceful fallback)
    (async (retries = 2) => {
      try {
        const url = `/api/config?t=${Date.now()}`;
        const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
        const data: any = await res.json();
        const key = (data?.tossClientKey || '').trim();
        // 빌드 시 주입된 VITE_TOSS_CLIENT_KEY 도 fallback 으로 시도
        const envKey = ((import.meta as any).env?.VITE_TOSS_CLIENT_KEY || '').trim();
        setTossClientKey(key || envKey || '');
      } catch (err) {
        if (retries > 0) setTimeout(() => (async () => {})(), 1000);
        const envKey = ((import.meta as any).env?.VITE_TOSS_CLIENT_KEY || '').trim();
        setTossClientKey(envKey);
      }
    })();

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

  // === Toss 위젯 라이프사이클 ===
  // 모달이 열려있고, '카드·간편결제' 탭이 활성화되었으며, 클라이언트 키와 로그인 사용자가 있을 때만 초기화.
  useEffect(() => {
    if (!isOpen) return;
    if (paymentTab !== 'toss') return;
    if (!tossClientKey) return;
    if (!auth.currentUser) return;

    let cancelled = false;
    setTossReady(false);

    (async () => {
      try {
        const tossPayments = await loadTossPayments(tossClientKey);
        // customerKey 규격: 영문/숫자/-_=.@ 만 허용, 2~50자.
        // 카카오 OAuth 사용자는 uid 가 'kakao:<id>' 형태라 콜론을 _ 로 치환해야 함.
        const sanitizedUid = (auth.currentUser!.uid || '').replace(/[^a-zA-Z0-9\-_=.@]/g, '_');
        const customerKey = `eb_${sanitizedUid}`.slice(0, 50);
        const widgets = tossPayments.widgets({ customerKey });

        await widgets.setAmount({ currency: 'KRW', value: finalAmount });

        const paymentMethodWidget = await widgets.renderPaymentMethods({
          selector: '#toss-payment-method',
          variantKey: 'DEFAULT',
        });
        // variantKey 미지정 시 어드민 기본 국문 약관 UI 가 렌더링됨.
        // 별도 variantKey 약관을 어드민에 만들었다면 { variantKey: '<키>' } 로 지정.
        const agreementWidget = await widgets.renderAgreement({
          selector: '#toss-agreement',
        });

        if (cancelled) {
          try { await paymentMethodWidget.destroy(); } catch {}
          try { await agreementWidget.destroy(); } catch {}
          return;
        }

        widgetsRef.current = widgets;
        paymentMethodWidgetRef.current = paymentMethodWidget;
        agreementWidgetRef.current = agreementWidget;
        setTossReady(true);
      } catch (err: any) {
        console.error('[Toss] widget init failed:', err);
        if (!cancelled) {
          setError(err?.message || '결제 위젯 초기화에 실패했습니다.');
        }
      }
    })();

    return () => {
      cancelled = true;
      setTossReady(false);
      // 다음 마운트에서 새 위젯 인스턴스를 만들 수 있도록 정리
      const pm = paymentMethodWidgetRef.current;
      const ag = agreementWidgetRef.current;
      paymentMethodWidgetRef.current = null;
      agreementWidgetRef.current = null;
      widgetsRef.current = null;
      try { pm?.destroy?.(); } catch {}
      try { ag?.destroy?.(); } catch {}
    };
  }, [isOpen, paymentTab, tossClientKey]);

  // 금액(패키지/포인트) 변경 시 위젯의 결제금액 동기화
  useEffect(() => {
    const widgets = widgetsRef.current;
    if (!widgets || !tossReady || loading || paymentLock.current) return;
    widgetAmountSync.current = widgets.setAmount({ currency: 'KRW', value: finalAmount }).catch((err: any) => {
      console.warn('[Toss] setAmount failed:', err);
    });
  }, [finalAmount, tossReady, loading]);

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

  const operationRef = useRef<string | null>(null);
  const paymentLock = useRef(false);
  const [submittedAmount, setSubmittedAmount] = useState(0);
  const [submittedComplete, setSubmittedComplete] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  useEffect(() => {
    if (!isOpen || !auth.currentUser) return;
    paymentApi('/api/payments/recover', {})
      .then(result => setRecoveryError(result.results?.some((r: any) => r.pending) ? '이전 결제 상태를 확인 중입니다. 일부 포인트는 확인 완료 후 반환됩니다.' : ''))
      .catch(() => setRecoveryError('이전 결제 상태 확인에 실패했습니다. 잠시 후 다시 확인해주세요.'));
  }, [isOpen]);

  const submitPayment = async (method: PaymentMethodTab) => {
    if (paymentLock.current || !requireVerifiedEmail()) return;
    if (!termsAgreed) { setError('약관에 동의해주세요.'); return; }
    if (!auth.currentUser) { setError('로그인 후 이용해주세요.'); return; }
    if (method === 'bank' && finalAmount > 0 && !depositorName.trim()) { setError('입금자명을 입력해주세요.'); return; }
    if (method === 'toss' && finalAmount > 0 && (!widgetsRef.current || !tossReady)) { setError('결제 위젯이 아직 준비되지 않았습니다.'); return; }
    paymentLock.current = true;
    setLoading(true);
    setError('');
    const orderId = operationRef.current || `order_${crypto.randomUUID().replace(/-/g, '')}`;
    operationRef.current = orderId;
    let created = false;
    try {
      const order = await paymentApi('/api/payments/orders', {
        orderId, packageKey, tutorId, useCredits, termsAgreed,
        paymentMethod: method === 'bank' ? 'manual_bank_transfer' : 'toss_widget',
        depositorName: depositorName.trim(),
      });
      setServerPointWarning(order.pointWarning || '');
      const action = paymentOrderAction(order);
      if (action === 'cancelled') {
        // 취소된 요청 번호를 버린다. 다음 클릭은 새 주문을 명시적으로 생성한다.
        forgetPayment(orderId);
        operationRef.current = null;
        setSubmittedOrderId(null);
        setSubmittedComplete(false);
        setSubmittedAmount(0);
        setError('취소되었거나 실패한 주문입니다. 입금하지 마시고, 신청 버튼을 다시 눌러 새 주문을 만들어주세요.');
        return;
      }
      if (action === 'waiting') {
        // 확인 중인 주문은 자동 취소하거나 새 주문으로 바꾸지 않는다.
        setError('주문 상태를 확인 중입니다. 입금하지 마시고 잠시 후 같은 주문을 다시 확인해주세요.');
        return;
      }
      created = true;
      setSubmittedAmount(order.amount);
      setSubmittedComplete(order.status === 'completed');
      if (order.bankSnapshot) setBankInfo(order.bankSnapshot);
      if (action === 'completed' || action === 'bank_pending') {
        setSubmittedOrderId(orderId);
        operationRef.current = null;
        return;
      }
      // Store the recovery ID before handing off to a redirect; never lose it on tab close.
      rememberPayment(orderId);
      if (order.pointWarning && order.amount !== finalAmount && !window.confirm(`${order.pointWarning}\n결제 금액은 ${Number(order.amount).toLocaleString()}원입니다. 포인트 없이 결제할까요?`)) {
        await paymentApi('/api/payments/cancel', { orderId, reason: '포인트 미사용 금액 확인 후 신청 중단' });
        forgetPayment(orderId);
        operationRef.current = null;
        return;
      }
      // 잔액 실시간 갱신으로 위젯 금액이 원래 가격으로 되돌아가는 경합을 방지한다.
      await widgetAmountSync.current;
      await widgetsRef.current.setAmount({ currency: 'KRW', value: order.amount });
      await widgetsRef.current.requestPayment({
        orderId, orderName: order.productName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail?orderId=${orderId}`,
        customerEmail: user?.email || undefined,
        customerName: user?.realName || user?.name || '회원',
      });
    } catch (err: any) {
      if (!created && [400, 401, 403, 404].includes(err.status)) operationRef.current = null;
      let returned = false;
      if (method === 'toss' && created) {
        try {
          const result = await paymentApi('/api/payments/cancel', { orderId, reason: '결제창 중단 또는 요청 오류' });
          if (result.status === 'cancelled') { returned = true; forgetPayment(orderId); operationRef.current = null; }
          if (result.status === 'completed') { forgetPayment(orderId); operationRef.current = null; setSubmittedComplete(true); setSubmittedOrderId(orderId); }
        } catch { rememberPayment(orderId); }
      }
      setError((err.message || '결제 요청 중 오류가 발생했습니다.') + (returned ? ' 사용 포인트는 반환되었습니다.' : created && method === 'toss' ? ' 결제 상태 확인 후 포인트가 반환됩니다.' : ' 같은 주문으로 다시 시도해주세요.'));
    } finally {
      setLoading(false);
      paymentLock.current = false;
    }
  };
  const handleManualPayment = () => submitPayment('bank');
  const handleTossPayment = () => submitPayment('toss');

  const resetAndClose = async () => {
    if (paymentLock.current) return;
    if (operationRef.current) {
      try {
        await paymentApi('/api/payments/cancel', { orderId: operationRef.current, reason: '주문 화면 닫기' });
        operationRef.current = null;
      } catch (error: any) {
        if (error.status === 404) operationRef.current = null;
        else {
          setError('주문 상태 확인이 필요합니다. 같은 주문으로 재시도하거나 잠시 후 다시 닫아주세요.');
          if (!window.confirm('주문 상태를 확인하지 못했습니다. 닫아도 주문 기록은 유지되며, 미완료 카드 결제는 재방문 시 다시 확인합니다. 무통장 주문은 관리자 확인이 필요할 수 있습니다. 그래도 닫을까요?')) return;
          rememberPayment(operationRef.current!);
          operationRef.current = null;
        }
      }
    }
    setSubmittedOrderId(null);
    setError('');
    setDepositorName('');
    setTermsAgreed(false);
    setUseCredits(true);
    setServerPointWarning('');
    setSubmittedComplete(false);
    setPackageKey('basic');
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
                  {pointWarning && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{pointWarning}</p>}
                  <div className="mx-auto w-20 h-20 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <CheckCircle2 size={42} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{submittedComplete ? '결제가 완료되었습니다' : '입금 확인을 기다리고 있습니다'}</h3>
                    <p className="mt-3 text-slate-600 leading-relaxed">
                      주문이 정상적으로 접수되었습니다.<br />
                      {submittedComplete ? (submittedAmount === 0 ? '포인트로 전액 결제되어 별도 입금이 필요하지 않습니다.' : '결제 승인 확인이 완료되었습니다. 내 강의실에서 확인해주세요.') : <>
                        아래 계좌로 <strong className="text-slate-900">{submittedAmount.toLocaleString()}원</strong>을
                        <strong className="text-slate-900"> {depositorName}</strong> 명의로 입금해주세요.
                      </>}
                    </p>
                  </div>

                  {!submittedComplete && <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">입금 계좌</p>
                    <p className="text-base font-bold text-slate-900">
                      {bankInfo.bankName} {bankInfo.accountNumber}
                    </p>
                    <p className="text-sm text-slate-600">예금주 · {bankInfo.accountHolder}</p>
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                      관리자가 입금을 확인하는 즉시 <strong>내 강의실에서 수강권이 자동으로 활성화</strong>됩니다.
                      보통 영업시간 내 1~2시간 이내 처리됩니다.
                    </p>
                  </div>}

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
                  {recoveryError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{recoveryError}</p>}
                  {/* Product Info */}
                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                    <p className="text-sm text-blue-600 font-bold mb-1">선택한 튜터</p>
                    <h3 className="text-lg font-bold text-slate-900">
                      {productName} - {selectedPackage.label} 플랜
                    </h3>
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
                        const total = pkg.sessions + pkg.bonus;
                        const isSelected = packageKey === pkg.key;
                        return (
                          <button
                            key={pkg.key}
                            type="button"
                            disabled={loading || !!operationRef.current}
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
                            <div className="mt-3 pt-3 border-t border-slate-100">
                              <p className="text-sm font-bold text-slate-900">
                                {pkg.price.toLocaleString()}원
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {/* 서비스 제공기간 안내 (토스 PG 심사 요건: 상품 구매페이지에 명확히 표기) */}
                    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-xs font-bold text-amber-900 leading-relaxed">
                        위 상품의 최대 이용기간은{' '}
                        <span className="text-amber-700 underline underline-offset-2">
                          {selectedPackage.durationMonths}달
                        </span>
                        입니다.
                      </p>
                      <p className="text-[10px] text-amber-700/80 mt-1 leading-relaxed">
                        결제일로부터 {selectedPackage.durationMonths}달 이내에 전 회차를 사용해주세요.
                        기간 경과 후 남은 수업은 자동 종료될 수 있습니다.
                      </p>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                      표시된 금액은 모든 비용이 포함된 총 결제 금액이며, 보너스 수업은 추가 비용 없이 무료로 제공됩니다.
                    </p>
                  </div>

                  {/* Points Discount */}
                  <div>
                    <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Ticket className="text-amber-600" size={20} />
                          <span className="font-bold text-slate-900">보유 포인트 자동 적용</span>
                        </div>
                        <span className="text-sm font-bold text-amber-700">{pointWarning ? '사용 불가' : `${availableCredits.toLocaleString()} 포인트 보유`}</span>
                      </div>
                      <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200 cursor-pointer">
                        <span className="text-sm text-slate-600">
                          자동 적용 (최대 -{Math.min(availableCredits, packageAmount).toLocaleString()}원, 1P = 1원)
                        </span>
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                          checked={useCredits && !pointWarning}
                          disabled={loading || !!operationRef.current || !!pointWarning || availableCredits <= 0}
                          onChange={(e) => setUseCredits(e.target.checked)}
                        />
                      </label>
                      {pointWarning && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{pointWarning}</p>}
                    </div>
                  </div>

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
                        <strong>20,000 포인트</strong>(=20,000원)가 지급됩니다.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        가입 시 추천인 코드를 입력하지 않으셨습니다. 추천 보상은 가입 시점에만 설정 가능합니다.
                      </p>
                    )}
                  </div>

                  {/* 결제수단 선택 탭 */}
                  <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100">
                    <button
                      type="button"
                      disabled={loading || !!operationRef.current}
                      onClick={() => setPaymentTab('bank')}
                      className={cn(
                        'py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
                        paymentTab === 'bank'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      <Banknote size={16} /> 무통장입금
                    </button>
                    <button
                      type="button"
                      disabled={loading || !!operationRef.current}
                      onClick={() => setPaymentTab('toss')}
                      className={cn(
                        'py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
                        paymentTab === 'toss'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      <CreditCard size={16} /> 카드·간편결제
                      <span className="text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                        Toss
                      </span>
                    </button>
                  </div>

                  {/* 무통장입금 안내 */}
                  {paymentTab === 'bank' && (
                  <div className="rounded-2xl p-6 border-2 border-green-200 bg-green-50/60">
                    <div className="flex items-center gap-2 mb-4">
                      <Banknote className="text-green-600" size={22} />
                      <span className="font-bold text-slate-900">무통장입금 안내</span>
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
                        <div className="space-y-3 mb-3">
                          {/* 수강권 합계 (모든 비용 포함된 단일 금액) */}
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {selectedPackage.label} 수강권 ({totalSessions}회)
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                모든 비용 포함 · VAT 포함
                              </p>
                            </div>
                            <p className="text-sm font-bold text-slate-900">
                              {packageAmount.toLocaleString()}원
                            </p>
                          </div>

                          {creditDiscount > 0 && (
                            <div className="flex justify-between text-amber-600 font-bold text-sm">
                              <span>포인트 사용</span>
                              <span>− {creditDiscount.toLocaleString()}원</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-end justify-between">
                          <p className="text-xs text-slate-500">
                            총 결제 금액
                            <span className="ml-1 text-[10px] text-slate-400">(VAT 포함)</span>
                          </p>
                          <p className="text-2xl font-black text-slate-900">
                            {finalAmount.toLocaleString()}원
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        입금자명 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={depositorName}
                        disabled={loading || !!operationRef.current}
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
                  )}

                  {/* 토스 결제위젯 영역 */}
                  {paymentTab === 'toss' && (
                    <div className="rounded-2xl p-6 border-2 border-blue-200 bg-blue-50/40">
                      <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="text-blue-600" size={22} />
                        <span className="font-bold text-slate-900">카드·간편결제</span>
                      </div>

                      {/* 클라이언트 키 미설정 안내 */}
                      {!tossClientKey && (
                        <div className="mb-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                          결제 위젯 설정이 아직 적용되지 않았습니다. 잠시 후 다시 시도해주세요.
                          <br />
                          <span className="text-[11px] text-amber-700">
                            (관리자 안내: <code className="font-mono">VITE_TOSS_CLIENT_KEY</code> · <code className="font-mono">TOSS_SECRET_KEY</code> 환경변수가 비어 있을 수 있습니다.)
                          </span>
                        </div>
                      )}

                      {/* 결제수단 위젯 (토스 SDK가 렌더링) */}
                      <div id="toss-payment-method" className="min-h-[180px] bg-white rounded-xl" />

                      {/* 약관 위젯 (토스 SDK가 렌더링) */}
                      <div id="toss-agreement" className="mt-3" />

                      {/* 금액 요약 */}
                      <div className="mt-4 bg-white rounded-xl p-4 border border-blue-100">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {selectedPackage.label} 수강권 ({totalSessions}회)
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                모든 비용 포함 · VAT 포함
                              </p>
                            </div>
                            <p className="text-sm font-bold text-slate-900">
                              {packageAmount.toLocaleString()}원
                            </p>
                          </div>
                          {creditDiscount > 0 && (
                            <div className="flex justify-between text-amber-600 font-bold text-sm">
                              <span>포인트 사용</span>
                              <span>− {creditDiscount.toLocaleString()}원</span>
                            </div>
                          )}
                          <div className="pt-3 border-t border-blue-100 flex items-end justify-between">
                            <p className="text-xs text-slate-500">
                              총 결제 금액
                              <span className="ml-1 text-[10px] text-slate-400">(VAT 포함)</span>
                            </p>
                            <p className="text-2xl font-black text-slate-900">
                              {finalAmount.toLocaleString()}원
                            </p>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                        결제 진행 시 안전을 위해 토스페이먼츠의 결제창이 새로 열립니다.
                        결제 완료 후 자동으로 수강권이 활성화됩니다.
                      </p>
                    </div>
                  )}

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
                        disabled={loading}
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
                      <span className="text-sm text-slate-500">
                        {paymentTab === 'bank' ? '입금하실 금액' : '결제 금액'}
                        <span className="ml-1 text-[10px] text-slate-400">(VAT 포함)</span>
                      </span>
                      <span className="text-2xl font-black text-slate-900">{finalAmount.toLocaleString()}원</span>
                    </div>

                    {paymentTab === 'bank' ? (
                      <>
                        <Button
                          className="w-full py-6 rounded-2xl gap-2 text-lg shadow-lg"
                          onClick={handleManualPayment}
                          disabled={loading || !termsAgreed || (finalAmount > 0 && !depositorName.trim())}
                        >
                          {loading ? '주문 접수 중...' : finalAmount === 0 ? '포인트로 전액 결제' : <><Banknote size={20} /> 주문 접수 (입금 완료 예정)</>}
                        </Button>
                        <p className="text-[11px] text-slate-400 text-center mt-2">
                          {finalAmount === 0 ? '별도 입금 없이 포인트로 결제가 완료됩니다.' : '버튼을 누르면 주문이 접수됩니다. 안내된 계좌로 입금 후 관리자 확인을 기다려주세요.'}
                        </p>
                      </>
                    ) : (
                      <>
                        <Button
                          className="w-full py-6 rounded-2xl gap-2 text-lg shadow-lg"
                          onClick={handleTossPayment}
                          disabled={loading || !termsAgreed || (finalAmount > 0 && (!tossReady || !tossClientKey))}
                        >
                          {loading
                            ? '결제 진행 중...'
                            : finalAmount === 0 ? '포인트로 전액 결제' : !tossClientKey
                              ? '결제 위젯 설정 대기'
                              : !tossReady
                                ? '결제 위젯 준비 중...'
                                : <><CreditCard size={20} /> {finalAmount.toLocaleString()}원 결제하기</>}
                        </Button>
                        <p className="text-[11px] text-slate-400 text-center mt-2">
                          결제 진행 시 토스페이먼츠의 안전한 결제창이 열립니다.
                        </p>
                      </>
                    )}
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
