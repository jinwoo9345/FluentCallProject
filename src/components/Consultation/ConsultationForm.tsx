import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { db } from '@/src/firebase';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';

interface ConsultationFormProps {
  userId: string;
  onComplete: () => void;
}

export const ConsultationForm = ({ userId, onComplete }: ConsultationFormProps) => {
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
      // 1. Firestore 저장
      await addDoc(collection(db, 'consultations'), {
        ...formData,
        userId,
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
            user_id: userId,
          },
          publicKey
        );
        console.log('EmailJS 발송 성공');
      }

      // 3. 유저 상태 업데이트
      await updateDoc(doc(db, 'users', userId), {
        hasCompletedConsultation: true,
      });

      setSubmitted(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Error submitting consultation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="flex flex-col items-center justify-center py-20 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-6 rounded-full bg-green-100 p-4 text-green-600"
        >
          <CheckCircle2 size={48} />
        </motion.div>
        <h2 className="text-2xl font-bold text-slate-900">상담 신청이 완료되었습니다!</h2>
        <p className="mt-2 text-slate-600">곧 매니저가 연락드릴 예정입니다. 잠시만 기다려 주세요.</p>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto p-8">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900">무료 학습 상담 신청</h2>
        <p className="mt-2 text-slate-600">나에게 딱 맞는 튜터를 추천받고 학습 플랜을 짜보세요.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">성함</label>
          <input
            required
            type="text"
            className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">연락 수단</label>
            <select
              className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              value={formData.contactType}
              onChange={(e) => setFormData({ ...formData, contactType: e.target.value as any })}
            >
              <option value="kakao">카카오톡</option>
              <option value="discord">디스코드</option>
              <option value="phone">전화번호</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ID 또는 번호</label>
            <input
              required
              type="text"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              value={formData.contactValue}
              onChange={(e) => setFormData({ ...formData, contactValue: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">상담 가능 시간</label>
          <input
            required
            type="text"
            placeholder="예: 평일 저녁 7시 이후"
            className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            value={formData.availableTime}
            onChange={(e) => setFormData({ ...formData, availableTime: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">학습 목표 및 특이사항</label>
          <textarea
            required
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
            value={formData.motivation}
            onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
          />
        </div>

        <Button type="submit" className="w-full py-4 gap-2" disabled={loading}>
          <Send size={18} />
          {loading ? '제출 중...' : '상담 신청하고 시작하기'}
        </Button>
      </form>
    </Card>
  );
};
