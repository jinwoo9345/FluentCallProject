import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Search, AlertCircle, CheckCircle2, User as UserIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { db, auth } from '../../firebase';
import {
  collection, query, where, getDocs, runTransaction, doc,
  serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

interface PointTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PointTransferModal({ isOpen, onClose }: PointTransferModalProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [recipient, setRecipient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Find recipient by email
  const handleSearchRecipient = async () => {
    if (!email || email === user?.email) {
      setError('본인 이메일이 아닌 올바른 상대방 이메일을 입력해주세요.');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setError('해당 이메일을 사용하는 회원을 찾을 수 없습니다.');
        setRecipient(null);
      } else {
        const doc = snapshot.docs[0];
        setRecipient({ id: doc.id, ...doc.data() });
      }
    } catch (err) {
      setError('회원 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Execute point transfer
  const handleTransfer = async () => {
    const currentUid = auth.currentUser?.uid;
    if (!recipient || amount <= 0 || !user || !currentUid) return;
    if (!Number.isInteger(amount)) {
      setError('정수 단위의 포인트만 전송할 수 있습니다.');
      return;
    }
    if (user.credits < amount) {
      setError('보유 포인트가 부족합니다.');
      return;
    }
    if (currentUid === recipient.id) {
      setError('본인에게는 포인트를 전송할 수 없습니다.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await runTransaction(db, async (transaction) => {
        const senderRef = doc(db, 'users', currentUid);
        const recipientRef = doc(db, 'users', recipient.id);
        const historyRef = doc(collection(db, 'point_transfers'));

        const senderDoc = await transaction.get(senderRef);
        const recipientDoc = await transaction.get(recipientRef);
        if (!senderDoc.exists()) throw new Error('보내는 분의 정보를 찾을 수 없습니다.');
        if (!recipientDoc.exists()) throw new Error('받는 분의 정보를 찾을 수 없습니다.');

        const senderCredits = senderDoc.data().credits || 0;
        const recipientCredits = recipientDoc.data().credits || 0;
        if (senderCredits < amount) throw new Error('보유 포인트가 부족합니다.');

        transaction.update(senderRef, { credits: senderCredits - amount });
        transaction.update(recipientRef, { credits: recipientCredits + amount });

        transaction.set(historyRef, {
          fromId: currentUid,
          fromName: user.name,
          toId: recipient.id,
          toName: recipient.name,
          amount,
          createdAt: serverTimestamp(),
        });
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Transfer Error:', err);
      setError(err.message || '전송 실패');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setEmail('');
    setAmount(0);
    setRecipient(null);
    setError('');
    setSuccess(false);
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
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Send className="text-blue-600" size={24} /> 포인트 선물하기
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
                        {recipient.name}님에게 {amount.toLocaleString()}포인트가 <br />
                        성공적으로 전달되었습니다.
                      </p>
                    </div>
                    <Button onClick={resetAndClose} className="w-full py-4 rounded-2xl">닫기</Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Search Recipient */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">받는 분 이메일</label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="example@email.com"
                          className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 outline-none"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <Button variant="outline" onClick={handleSearchRecipient} disabled={loading}>
                          <Search size={18} />
                        </Button>
                      </div>
                    </div>

                    {recipient && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3"
                      >
                        <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-blue-600 border border-blue-100">
                          <UserIcon size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 font-bold uppercase">받는 분 확인</p>
                          <p className="text-sm font-bold text-slate-900">{recipient.name} ({recipient.email})</p>
                        </div>
                      </motion.div>
                    )}

                    {/* Amount Input */}
                    {recipient && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-bold text-slate-700">선물할 포인트 (보유: {user?.credits || 0})</label>
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="0"
                            className="w-full rounded-xl border border-slate-200 px-4 py-4 text-2xl font-black text-slate-900 focus:border-blue-500 outline-none pr-12"
                            value={amount || ''}
                            onChange={(e) => setAmount(Number(e.target.value))}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">P</span>
                        </div>
                      </motion.div>
                    )}

                    {error && (
                      <div className="p-4 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-2">
                        <AlertCircle size={16} /> {error}
                      </div>
                    )}

                    <Button 
                      className="w-full py-6 rounded-2xl text-lg font-black gap-2 shadow-lg"
                      disabled={loading || !recipient || amount <= 0 || amount > (user?.credits || 0)}
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
