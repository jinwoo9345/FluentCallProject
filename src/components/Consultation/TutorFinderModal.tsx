import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Check, Phone, MessageCircle, MessageSquare, Send, Sparkles } from 'lucide-react';
import { db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
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
  const { setIsAuthModalOpen, setAuthMode } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [serverConfig, setServerConfig] = useState<any>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/config?t=${Date.now()}`);
        const data = await res.json();
        setServerConfig(data);
      } catch (err) {
        console.error("Failed to fetch EmailJS config:", err);
      }
    };
    fetchConfig();
  }, []);

  const totalSteps = 8;
  const updateFields = (fields: Partial<FormData>) => setFormData(prev => ({ ...prev, ...fields }));
  const nextStep = () => { if (step < totalSteps) setStep(s => s + 1); };
  const prevStep = () => { if (step > 1) setStep(s => s - 1); };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Firestore 저장 (userId가 있으면 포함, 없으면 null)
      const docRef = await addDoc(collection(db, 'consultations'), {
        ...formData,
        userId: auth.currentUser?.uid || null,
        type: 'finder_survey',
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // 비로그인 시 나중에 계정 연결을 위해 ID 저장
      if (!auth.currentUser) {
        localStorage.setItem('pendingConsultationId', docRef.id);
        localStorage.setItem('pendingConsultationName', '튜터 찾기 신청자');
      }

      // 2. EmailJS 발송 (동일 로직 생략하지 않고 포함)
      const serviceId = serverConfig?.emailjsServiceId || (import.meta as any).env.VITE_EMAILJS_SERVICE_ID;
      const templateId = serverConfig?.emailjsTemplateId || (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = serverConfig?.emailjsPublicKey || (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY;

      if (serviceId && templateId && publicKey) {
        await emailjs.send(serviceId, templateId, {
          from_name: '튜터 찾기 신청자',
          contact_type: 'direct',
          contact_value: formData.contact,
          available_time: formData.availableTime,
          motivation: `${formData.purpose} | ${formData.level} | ${formData.specificGoals.join(', ')}`,
          user_id: auth.currentUser?.uid || 'guest',
        }, publicKey);
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Submit Error:', err);
      setError(err.message || '신청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAuth = () => {
    onClose();
    setAuthMode('signup');
    setIsAuthModalOpen(true);
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
                <button key={opt} onClick={() => { updateFields({ purpose: opt }); nextStep(); }} className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.purpose === opt ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}>
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
                <button key={opt} onClick={() => { updateFields({ duration: opt }); nextStep(); }} className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.duration === opt ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}>
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
                <button key={opt} onClick={() => { updateFields({ level: opt }); nextStep(); }} className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.level === opt ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}>
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
                <button key={opt} onClick={() => { updateFields({ availableTime: opt }); nextStep(); }} className={`p-4 rounded-2xl border-2 text-center transition-all ${formData.availableTime === opt ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}>
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
                <button key={opt} onClick={() => { updateFields({ frequency: opt }); nextStep(); }} className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.frequency === opt ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}>
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
                <button key={opt} onClick={() => {
                  const current = formData.specificGoals;
                  const next = current.includes(opt) ? current.filter(i => i !== opt) : [...current, opt];
                  updateFields({ specificGoals: next });
                }} className={`p-4 rounded-2xl border-2 text-center transition-all ${formData.specificGoals.includes(opt) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}>
                  {opt}
                </button>
              ))}
            </div>
            <Button className="w-full py-4 mt-4" onClick={nextStep} disabled={formData.specificGoals.length === 0}>다음 단계로</Button>
          </div>
        );
      case 7:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">7. 연락처를 남겨주세요</h3>
            <input type="text" placeholder="전화번호 또는 카카오톡 ID" className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all" value={formData.contact} onChange={(e) => updateFields({ contact: e.target.value })} />
            <Button className="w-full py-4 mt-4" onClick={nextStep} disabled={!formData.contact}>마지막 단계로</Button>
          </div>
        );
      case 8:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">8. 신청을 완료할까요?</h3>
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <p className="text-sm text-blue-700 leading-relaxed">
                전송해주신 정보를 바탕으로 <strong>작성하신 상담 가능 시간대</strong>에 <br />
                전문 매니저가 연락드려 최적의 튜터 매칭을 도와드립니다.
              </p>
            </div>
            <Button 
              className="w-full py-6 mt-6 gap-2 text-lg shadow-blue-200 shadow-xl" 
              onClick={handleSubmit} 
              disabled={loading}
            >
              {loading ? '전송 중...' : <><Send size={20} /> 분석 완료하고 상담 신청하기</>}
            </Button>
            <p className="text-center text-xs text-slate-400">정보는 매칭 목적으로만 사용됩니다.</p>
          </div>
        );
      default: return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{step}</div>
                  <div className="h-1.5 w-32 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }} />
                  </div>
                </div>
                <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>

              <div className="p-8">
                {success ? (
                  <div className="text-center space-y-6 py-4">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={40} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-slate-900">맞춤 튜터 분석 완료!</h3>
                      <p className="text-slate-600">
                        {formData.contact}님에게 딱 맞는 튜터들을 찾았습니다.<br />
                        결과를 확인하고 무료 상담을 확정하려면 지금 가입해 주세요!
                      </p>
                    </div>
                    <div className="space-y-3">
                      <Button onClick={handleStartAuth} className="w-full py-6 rounded-2xl text-lg shadow-lg">
                        결과 확인하고 시작하기
                      </Button>
                      <button onClick={handleClose} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                        나중에 할게요
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {error && <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-medium">{error}</div>}
                    <div className="min-h-[300px]">{renderStep()}</div>
                    {!success && step > 1 && (
                      <button onClick={prevStep} className="mt-8 flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
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
