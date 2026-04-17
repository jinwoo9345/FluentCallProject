import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { db } from '@/src/firebase';
import { doc, updateDoc, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { useAuth } from '@/src/contexts/AuthContext';

interface ConsultationFormProps {
  userId?: string;
  onComplete: () => void;
}

export const ConsultationForm = ({ userId, onComplete }: ConsultationFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverConfig, setServerConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    contactType: 'kakao' as 'kakao' | 'discord' | 'phone',
    contactValue: '',
    availableTime: '',
    motivation: '',
  });

  // Load config for EmailJS
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        setServerConfig(data);
      } catch (err) {
        console.error("Failed to fetch EmailJS config:", err);
      }
    };
    loadConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Firestore 저장 (userId가 있으면 포함, 없으면 일단 없이 저장)
      const docRef = await addDoc(collection(db, 'consultations'), {
        ...formData,
        userId: userId || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // 2. EmailJS 발송
      const serviceId = serverConfig?.emailjsServiceId || (import.meta as any).env.VITE_EMAILJS_SERVICE_ID;
      const templateId = serverConfig?.emailjsTemplateId || (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = serverConfig?.emailjsPublicKey || (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY;

      if (serviceId && templateId && publicKey) {
        await emailjs.send(
          serviceId,
          templateId,
          {
            from_name: formData.name,
            contact_type: formData.contactType,
            contact_value: formData.contactValue,
            available_time: formData.availableTime,
            motivation: formData.motivation,
            user_id: userId || 'GUEST',
          },
          publicKey
        );
      }

      // 3. 로컬 스토리지에 임시 저장 (로그인 후 연결을 위해)
      localStorage.setItem('pendingConsultationId', docRef.id);
      localStorage.setItem('pendingConsultationName', formData.name);

      // 4. 유저 상태 업데이트 (로그인 된 상태인 경우에만)
      if (userId) {
        await updateDoc(doc(db, 'users', userId), {
          hasCompletedConsultation: true,
        });
      }

      setSubmitted(true);
      if (userId) {
        setTimeout(() => onComplete(), 2000);
      }
    } catch (error) {
      console.error('Error submitting consultation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if already completed
  if (user?.hasCompletedConsultation && !submitted) {
    return (
      <Card className="max-w-2xl mx-auto p-12 text-center">
        <div className="mb-6 rounded-full bg-blue-50 p-4 text-blue-600 inline-block">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">상담 신청이 완료된 상태입니다</h2>
        <p className="mt-4 text-slate-600 leading-relaxed">
          이미 상담 신청을 완료하셨습니다. <br />
          매니저가 신청하신 시간대에 맞춰 연락드릴 예정입니다.
        </p>
        <Button className="mt-8 px-10" onClick={onComplete}>대시보드로 가기</Button>
      </Card>
    );
  }

  if (submitted && !userId) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center px-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-6 rounded-full bg-blue-100 p-4 text-blue-600"
        >
          <CheckCircle size={48} />
        </motion.div>
        <h2 className="text-2xl font-bold text-slate-900">상담 신청이 완료되었습니다!</h2>
        <p className="mt-4 text-slate-600 leading-relaxed">
          {formData.name}님에게 딱 맞는 튜터를 추천해 드릴게요.<br />
          <strong>신청하신 시간대</strong>에 맞춰 매니저가 연락드립니다.<br />
          첫 수업을 예약하려면 지금 가입해 주세요!
        </p>
        <div className="mt-10 w-full space-y-3">
          <Button className="w-full py-6 text-lg rounded-2xl shadow-lg" onClick={onComplete}>
            카카오로 3초 만에 시작하기
          </Button>
          <p className="text-xs text-slate-400">가입 즉시 튜터 목록을 확인하실 수 있습니다.</p>
        </div>
      </Card>
    );
  }

  if (submitted && userId) {
    return (
      <Card className="flex flex-col items-center justify-center py-20 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-6 rounded-full bg-green-100 p-4 text-green-600"
        >
          <CheckCircle size={48} />
        </motion.div>
        <h2 className="text-2xl font-bold text-slate-900">상담 신청 완료!</h2>
        <p className="mt-2 text-slate-600">신청하신 시간대에 맞춰 곧 연락드리겠습니다.</p>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto p-8 border-t-4 border-t-blue-600 shadow-xl">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900">무료 학습 상담 신청</h2>
        <p className="mt-2 text-slate-600">신청하신 시간대에 맞춰 전문 매니저가 직접 연락드립니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">성함</label>
          <input
            required
            type="text"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">연락 수단</label>
            <select
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              value={formData.contactType}
              onChange={(e) => setFormData({ ...formData, contactType: e.target.value as any })}
            >
              <option value="kakao">카카오톡</option>
              <option value="discord">디스코드</option>
              <option value="phone">전화번호</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">ID 또는 번호</label>
            <input
              required
              type="text"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              value={formData.contactValue}
              onChange={(e) => setFormData({ ...formData, contactValue: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">상담 희망 시간</label>
          <input
            required
            type="text"
            placeholder="예: 월/수 저녁 8시 이후"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            value={formData.availableTime}
            onChange={(e) => setFormData({ ...formData, availableTime: e.target.value })}
          />
          <p className="text-[10px] text-blue-500 font-bold mt-2 flex items-center gap-1">
            <AlertCircle size={10} /> 작성해주신 시간대에 맞춰 매니저가 연락드립니다.
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">학습 목표 및 특이사항</label>
          <textarea
            required
            rows={4}
            placeholder="예: 해외 여행을 앞두고 프리토킹 연습을 하고 싶어요."
            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none transition-all"
            value={formData.motivation}
            onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
          />
        </div>

        <Button type="submit" className="w-full py-5 gap-2 text-lg font-black shadow-lg shadow-blue-100" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          {loading ? '제출 중...' : '상담 신청 완료하고 시작하기'}
        </Button>
      </form>
    </Card>
  );
};
