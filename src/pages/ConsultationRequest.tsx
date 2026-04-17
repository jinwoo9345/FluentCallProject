import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { TutorFinderModal } from '../components/Consultation/TutorFinderModal';

export default function ConsultationRequest() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // 진입 즉시 설문 모달을 오픈
  useEffect(() => {
    setIsOpen(true);
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 p-12 shadow-sm"
      >
        <div className="mx-auto w-20 h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
          <MessageSquare size={36} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">무료 학습 상담 신청</h1>
        <p className="text-slate-500 leading-relaxed mb-10">
          몇 가지 간단한 질문을 통해 목표에 맞는 맞춤 튜터를 추천해 드립니다.<br />
          설문 완료 시 전문 매니저가 작성하신 시간대에 직접 연락드립니다.
        </p>
        <Button className="px-10 py-5 text-base" onClick={() => setIsOpen(true)}>
          상담 설문 시작하기
        </Button>
      </motion.div>

      <TutorFinderModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          navigate('/');
        }}
      />
    </div>
  );
}
