import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { db } from '@/src/firebase';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';

interface ConsultationFormProps {
  userId?: string;
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

  // ... (useEffect for config remains same)

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

      // 2. EmailJS 발송 (동일)
      // ... (emailjs.send logic remains same)

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

  if (submitted && !userId) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center px-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-6 rounded-full bg-blue-100 p-4 text-blue-600"
        >
          <CheckCircle2 size={48} />
        </motion.div>
        <h2 className="text-2xl font-bold text-slate-900">상담 신청이 완료되었습니다!</h2>
        <p className="mt-4 text-slate-600 leading-relaxed">
          {formData.name}님에게 딱 맞는 튜터를 추천해 드릴게요.<br />
          추천 결과를 확인하고 첫 수업을 예약하려면 지금 가입해 주세요!
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
          <CheckCircle2 size={48} />
        </motion.div>
        <h2 className="text-2xl font-bold text-slate-900">상담 신청 완료!</h2>
        <p className="mt-2 text-slate-600">대시보드로 이동합니다...</p>
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
