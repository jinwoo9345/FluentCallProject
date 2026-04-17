import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, MessageCircle, MessageSquare } from 'lucide-react';
import { db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import emailjs from '@emailjs/browser';
import { Button } from '../ui/Button';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConsultationModal({ isOpen, onClose }: ConsultationModalProps) {
  const [name, setName] = useState('');
  const [contactType, setContactType] = useState<'kakao' | 'discord' | 'phone'>('kakao');
  const [contactValue, setContactValue] = useState('');
  const [availableTime, setAvailableTime] = useState('');
  const [motivation, setMotivation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [serverConfig, setServerConfig] = useState<any>(null);

  React.useEffect(() => {
    // 서버에서 실시간 환경변수 가져오기
    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/config?t=${Date.now()}`);
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        setServerConfig(data);
      } catch (err) {
        console.error("Failed to fetch EmailJS config:", err);
      }
    };
    fetchConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Save to Firestore (consultations collection)
      const path = 'consultations';
      const currentUid = auth.currentUser?.uid || null;
      let createdId: string | null = null;
      try {
        const docRef = await addDoc(collection(db, path), {
          name,
          contactType,
          contactValue,
          availableTime,
          motivation,
          notes,
          userId: currentUid,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        createdId = docRef.id;

        if (currentUid) {
          try {
            await updateDoc(doc(db, 'users', currentUid), { hasCompletedConsultation: true });
          } catch (err) {
            console.warn('hasCompletedConsultation update skipped:', err);
          }
        } else {
          localStorage.setItem('pendingConsultationId', createdId);
          localStorage.setItem('pendingConsultationName', name);
        }
      } catch (fsErr: any) {
        handleFirestoreError(fsErr, OperationType.CREATE, path);
      }

      // 2. Send email via EmailJS (Free Tier)
      try {
        const serviceId = serverConfig?.emailjsServiceId || (import.meta as any).env.VITE_EMAILJS_SERVICE_ID;
        const templateId = serverConfig?.emailjsTemplateId || (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID;
        const publicKey = serverConfig?.emailjsPublicKey || (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY;

        console.log("[Client] EmailJS Config Attempt (Consultation):", { 
          source: serverConfig ? 'server' : 'inline',
          hasServiceId: !!serviceId,
          hasTemplateId: !!templateId,
          hasPublicKey: !!publicKey
        });

        if (!serviceId || !templateId || !publicKey) {
          console.error('EmailJS 설정 누락:', { serviceId: !!serviceId, templateId: !!templateId, publicKey: !!publicKey });
          console.warn('설정(Settings) 메뉴에서 EmailJS 환경 변수를 입력해주세요.');
        } else {
          await emailjs.send(
            serviceId,
            templateId,
            {
              type: '무료 전화상담',
              to_name: '관리자',
              from_name: name,
              contact_label: contactType === 'kakao' ? '카카오톡 아이디' : contactType === 'discord' ? '디스코드 아이디' : '전화번호',
              contact_value: contactValue,
              details: `
                • 상담 가능 시간: ${availableTime}
                • 신청 동기: ${motivation}
                • 기타 사항: ${notes || '없음'}
              `,
              summary: `이름:${name} | 연락처:${contactValue}`
            },
            publicKey
          );
          console.log('EmailJS 발송 성공');
        }
      } catch (emailErr) {
        console.error('EmailJS 발송 실패:', emailErr);
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Submit Error:', err);
      setError(err.message || '신청 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSuccess(false);
      setName('');
      setContactValue('');
      setAvailableTime('');
      setMotivation('');
      setNotes('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">무료 전화상담 신청하기</h2>
                <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              {success ? (
                <div className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">신청이 완료되었습니다!</h3>
                  <p className="text-slate-600">
                    작성해주신 연락처로 빠른 시일 내에 연락드리겠습니다.
                  </p>
                  <Button onClick={handleClose} className="mt-6 w-full py-4 rounded-xl">
                    확인
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">이름</label>
                    <input
                      type="text"
                      required
                      placeholder="홍길동"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">연락 수단</label>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <button
                        type="button"
                        onClick={() => setContactType('kakao')}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          contactType === 'kakao'
                            ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                            : 'border-slate-100 bg-white text-slate-500'
                        }`}
                      >
                        <MessageCircle size={18} />
                        <span className="text-sm font-bold">카카오톡</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactType('discord')}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          contactType === 'discord'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-slate-100 bg-white text-slate-500'
                        }`}
                      >
                        <MessageSquare size={18} />
                        <span className="text-sm font-bold">디스코드</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactType('phone')}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          contactType === 'phone'
                            ? 'border-blue-600 bg-blue-50 text-blue-600'
                            : 'border-slate-100 bg-white text-slate-500'
                        }`}
                      >
                        <Phone size={18} />
                        <span className="text-sm font-bold">전화번호</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder={
                        contactType === 'kakao' ? '카카오톡 아이디를 입력해주세요' :
                        contactType === 'discord' ? '디스코드 아이디를 입력해주세요' :
                        '전화번호를 입력해주세요 (예: 010-1234-5678)'
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      value={contactValue}
                      onChange={(e) => setContactValue(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">상담 가능 시간</label>
                    <input
                      type="text"
                      required
                      placeholder="예: 평일 오후 6시 이후, 주말 언제나"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      value={availableTime}
                      onChange={(e) => setAvailableTime(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">신청 이유 / 동기 / 목적</label>
                    <textarea
                      required
                      placeholder="전화영어를 시작하시려는 이유나 목표를 간단히 적어주세요."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none h-24"
                      value={motivation}
                      onChange={(e) => setMotivation(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">기타 (선택)</label>
                    <textarea
                      placeholder="기타 문의사항이나 남기고 싶은 말씀을 적어주세요."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none h-20"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full py-4 rounded-xl" disabled={loading}>
                    {loading ? '신청 중...' : '무료 상담 신청하기'}
                  </Button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
