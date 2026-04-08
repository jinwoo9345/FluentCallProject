import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Check, Phone, MessageCircle, MessageSquare, Send } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { Button } from '../ui/Button';

interface TutorFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FormData = {
  purpose: string;
  duration: string;
  level: string;
  availableTime: string;
  frequency: string;
  specificGoals: string[];
  contact: string;
  consultationPref: string;
};

const INITIAL_DATA: FormData = {
  purpose: '',
  duration: '',
  level: '',
  availableTime: '',
  frequency: '',
  specificGoals: [],
  contact: '',
  consultationPref: '',
};

export function TutorFinderModal({ isOpen, onClose }: TutorFinderModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 8;

  const updateFields = (fields: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...fields }));
  };

  const nextStep = () => {
    if (step < totalSteps) setStep(s => s + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Save to Firestore
      await addDoc(collection(db, 'tutor_requests'), {
        ...formData,
        createdAt: serverTimestamp()
      });

      // 2. Send email via EmailJS
      try {
        const serviceId = (import.meta as any).env.VITE_EMAILJS_SERVICE_ID;
        const templateId = (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID;
        const publicKey = (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY;

        if (!serviceId || !templateId || !publicKey) {
          console.warn('EmailJS 설정이 누락되었습니다. 환경 변수를 확인해주세요.');
        } else {
          await emailjs.send(
            serviceId,
            templateId,
            {
              to_name: '관리자',
              from_name: '튜터 찾기 신청자',
              contact_label: '연락처',
              contact_value: formData.contact,
              purpose: formData.purpose,
              duration: formData.duration,
              level: formData.level,
              available_time: formData.availableTime,
              frequency: formData.frequency,
              specific_goals: formData.specificGoals.join(', '),
              consultation_pref: formData.consultationPref,
              summary: `
                목적: ${formData.purpose}
                기간: ${formData.duration}
                레벨: ${formData.level}
                시간: ${formData.availableTime}
                빈도: ${formData.frequency}
                구체적 목표: ${formData.specificGoals.join(', ')}
                연락처: ${formData.contact}
                상담 여부: ${formData.consultationPref}
              `
            },
            publicKey
          );
        }
      } catch (emailErr) {
        console.error('EmailJS 발송 실패:', emailErr);
        // 메일 발송 실패가 전체 프로세스를 막지 않도록 함 (DB 저장은 성공했으므로)
      }

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError('신청 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setStep(1);
      setFormData(INITIAL_DATA);
      setSuccess(false);
      onClose();
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">1. 수업의 목적이 무엇인가요?</h3>
            <div className="grid grid-cols-1 gap-3">
              {['캐주얼 회화', '비즈니스 회화', '자격증(IELTS/TOEFL 등)'].map(opt => (
                <button
                  key={opt}
                  onClick={() => { updateFields({ purpose: opt }); nextStep(); }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.purpose === opt ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">2. 목표 달성 기간은 어느 정도인가요?</h3>
            <div className="grid grid-cols-1 gap-3">
              {['1달', '1~3달', '3~6달', '6개월 이상'].map(opt => (
                <button
                  key={opt}
                  onClick={() => { updateFields({ duration: opt }); nextStep(); }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.duration === opt ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">3. 현재 영어 레벨은 어느 정도인가요?</h3>
            <div className="grid grid-cols-1 gap-3">
              {['상 (자유로운 의사소통 가능)', '중 (기본적인 대화 가능)', '하 (기초부터 시작)'].map(opt => (
                <button
                  key={opt}
                  onClick={() => { updateFields({ level: opt }); nextStep(); }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.level === opt ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">4. 선호하는 수업 시간대는 언제인가요?</h3>
            <div className="grid grid-cols-2 gap-3">
              {['아침', '낮', '저녁', '밤'].map(opt => (
                <button
                  key={opt}
                  onClick={() => { updateFields({ availableTime: opt }); nextStep(); }}
                  className={`p-4 rounded-2xl border-2 text-center transition-all ${formData.availableTime === opt ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">5. 일주일에 몇 번 수업을 원하시나요?</h3>
            <div className="grid grid-cols-1 gap-3">
              {['주 1회', '주 2회', '주 3회 이상'].map(opt => (
                <button
                  key={opt}
                  onClick={() => { updateFields({ frequency: opt }); nextStep(); }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.frequency === opt ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">6. 구체적으로 어떤 목표가 있으신가요? (복수 선택)</h3>
            <div className="grid grid-cols-2 gap-3">
              {['해외여행 회화', '면접 준비', '발음 교정', '프리토킹', '시험 준비'].map(opt => (
                <button
                  key={opt}
                  onClick={() => {
                    const current = formData.specificGoals;
                    const next = current.includes(opt) ? current.filter(i => i !== opt) : [...current, opt];
                    updateFields({ specificGoals: next });
                  }}
                  className={`p-4 rounded-2xl border-2 text-center transition-all ${formData.specificGoals.includes(opt) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <Button className="w-full py-4 mt-4" onClick={nextStep} disabled={formData.specificGoals.length === 0}>
              다음 단계로
            </Button>
          </div>
        );
      case 7:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">7. 연락처를 남겨주세요</h3>
            <input
              type="text"
              placeholder="전화번호 또는 카카오톡 ID"
              className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              value={formData.contact}
              onChange={(e) => updateFields({ contact: e.target.value })}
            />
            <Button className="w-full py-4 mt-4" onClick={nextStep} disabled={!formData.contact}>
              마지막 단계로
            </Button>
          </div>
        );
      case 8:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">8. 바로 시작하시겠어요?</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: '바로 시작할게요', val: '바로 시작' },
                { label: '상담 먼저 받고 싶어요', val: '상담 희망' }
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => { updateFields({ consultationPref: opt.val }); }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.consultationPref === opt.val ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button 
              className="w-full py-4 mt-6 gap-2" 
              onClick={handleSubmit} 
              disabled={loading || !formData.consultationPref}
            >
              {loading ? '전송 중...' : <><Send size={18} /> 정보 전송하고 튜터 추천받기</>}
            </Button>
          </div>
        );
      default:
        return null;
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
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {step}
                  </div>
                  <div className="h-1.5 w-32 rounded-full bg-slate-200 overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300" 
                      style={{ width: `${(step / totalSteps) * 100}%` }}
                    />
                  </div>
                </div>
                <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8">
                {success ? (
                  <div className="text-center space-y-6 py-4">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                      <Check size={40} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-slate-900">신청이 완료되었습니다!</h3>
                      <p className="text-slate-600">
                        남겨주신 연락처로 나에게 딱 맞는 튜터를 추천해 드릴게요.<br />
                        잠시만 기다려주세요!
                      </p>
                    </div>
                    <Button onClick={handleClose} className="w-full py-4 rounded-2xl">
                      확인
                    </Button>
                  </div>
                ) : (
                  <>
                    {error && (
                      <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-medium">
                        {error}
                      </div>
                    )}
                    
                    <div className="min-h-[300px]">
                      {renderStep()}
                    </div>

                    {!success && step > 1 && (
                      <button 
                        onClick={prevStep}
                        className="mt-8 flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <ChevronLeft size={16} /> 이전 단계로
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
