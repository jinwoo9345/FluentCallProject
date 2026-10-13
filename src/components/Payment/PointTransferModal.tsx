import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, AlertCircle, CheckCircle2, User as UserIcon, Lock } from 'lucide-react';
import { Button } from '../ui/Button';
import { db, auth } from '../../firebase';
import {
  doc, getDoc,
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { paymentApi } from '../../services/paymentService';

interface PointTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PointTransferModal({ isOpen, onClose }: PointTransferModalProps) {
  const { user, requireVerifiedEmail } = useAuth();
  const [amount, setAmount] = useState<number>(0);
  const [recipient, setRecipient] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const transferId = useRef('');
  const transferLock = useRef(false);

  // 모달이 열리면 내 referredBy 코드의 유저 정보를 자동 조회
  useEffect(() => {
    if (!isOpen) return;
    transferId.current = `gift_${crypto.randomUUID().replace(/-/g, '')}`;
    setRecipient(null);
    setError('');
    setSuccess(false);
    setAmount(0);

    const code = (user?.referredBy || '').trim().toUpperCase();
    if (!code) return;

    setLookupLoading(true);
    (async () => {
      try {
        // referral_codes 인덱스에서 추천인 uid + 표시명 조회 (공개 read, 민감정보 없음)
        const codeSnap = await getDoc(doc(db, 'referral_codes', code));
        if (!codeSnap.exists()) {
          setError('등록된 추천인 계정을 찾을 수 없습니다. 관리자에게 문의해주세요.');
          return;
        }
        const data = codeSnap.data() as any;
        setRecipient({
          id: data.userId,
          name: data.name || '추천인',
          email: '',
          credits: 0,
        });
      } catch (err) {
        setError('추천인 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLookupLoading(false);
      }
    })();
  }, [isOpen, user?.referredBy]);

  const handleTransfer = async () => {
    if (transferLock.current) return;
    if (!requireVerifiedEmail()) return;
    const currentUid = auth.currentUser?.uid;
    if (!recipient || amount <= 0 || !user || !currentUid) return;
    if (!Number.isInteger(amount)) {
      setError('정수 단위의 포인트만 전송할 수 있습니다.');
      return;
    }
    // 실제 잔액과 동일 요청 재시도 여부는 서버에서 함께 확인한다.
    // 응답만 유실된 성공 요청을 변경된 화면 잔액으로 차단하지 않는다.
    if (currentUid === recipient.id) {
      setError('본인에게는 포인트를 전송할 수 없습니다.');
      return;
    }

    transferLock.current = true;
    setLoading(true);
    setError('');

    try {
      const result = await paymentApi('/api/points/transfer', { operationId: transferId.current, amount });
      setRecipient(prev => ({ ...prev, name: result.recipientName }));
      setAmount(result.amount);
      setSuccess(true);
    } catch (err: any) {
      console.error('Transfer Error:', err);
      setError(err.message || '전송 실패');
    } finally {
      transferLock.current = false;
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    if (transferLock.current) return;
    setAmount(0);
    setRecipient(null);
    setError('');
    setSuccess(false);
    onClose();
  };

  const hasReferrer = !!(user?.referredBy);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Send className="text-blue-600" size={24} /> 추천인에게 포인트 선물
                </h2>
                <button onClick={resetAndClose} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8">
                {success ? (
                  <div className="text-center space-y-6">
                    <CheckCircle2 size={64} className="text-green-500 mx-auto" />
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">전달 완료!</h3>
                      <p className="mt-2 text-slate-600">
                        {recipient?.name}님에게 {amount.toLocaleString()}포인트가 <br />
                        성공적으로 전달되었습니다.
                      </p>
                    </div>
                    <Button onClick={resetAndClose} className="w-full py-4 rounded-2xl">닫기</Button>
                  </div>
                ) : !hasReferrer ? (
                  // 추천인 미등록 상태
                  <div className="text-center space-y-6 py-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Lock size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">선물할 대상이 없어요</h3>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        포인트 선물은 <strong>가입 시 등록한 추천인에게만</strong> 보낼 수 있습니다.<br />
                        추천인 코드는 가입 시점에만 설정 가능하며, 이후 변경할 수 없습니다.
                      </p>
                    </div>
                    <Button variant="outline" onClick={resetAndClose} className="w-full py-4 rounded-2xl">
                      닫기
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 고정 수신자 정보 */}
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">
                        내 추천인 (선물 수신자)
                      </p>
                      {lookupLoading ? (
                        <p className="text-sm text-slate-500 animate-pulse">불러오는 중...</p>
                      ) : recipient ? (
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-blue-600 border border-blue-100">
                            <UserIcon size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {recipient.name}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              추천 코드 <code className="font-mono">{user?.referredBy}</code>
                              {recipient.email ? ` · ${recipient.email}` : ''}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">추천인 정보를 불러올 수 없습니다.</p>
                      )}
                      <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
                        포인트는 <strong>가입 시 등록한 추천인에게만</strong> 전송됩니다.
                      </p>
                    </div>

                    {/* 금액 입력 */}
                    {recipient && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-bold text-slate-700">
                          선물할 포인트 (보유: {(user?.credits || 0).toLocaleString()})
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={1}
                            max={100000}
                            step={1}
                            disabled={loading}
                            placeholder="0"
                            className="w-full rounded-xl border border-slate-200 px-4 py-4 text-2xl font-black text-slate-900 focus:border-blue-500 outline-none pr-12"
                            value={amount || ''}
                            onChange={(e) => setAmount(Number(e.target.value))}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">P</span>
                        </div>
                        <p className="text-xs text-slate-500">1회 1~100,000P까지 선물할 수 있습니다. 실제 잔액은 서버에서 확인합니다.</p>
                      </motion.div>
                    )}

                    {error && (
                      <div className="p-4 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-2">
                        <AlertCircle size={16} /> {error}
                      </div>
                    )}

                    <Button
                      className="w-full py-6 rounded-2xl text-lg font-black gap-2 shadow-lg"
                      disabled={loading || !recipient || !Number.isSafeInteger(amount) || amount <= 0 || amount > 100000}
                      onClick={handleTransfer}
                    >
                      {loading ? '전달 처리 중...' : '포인트 선물하기'}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
