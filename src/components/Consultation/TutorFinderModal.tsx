import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronLeft, Send, CheckCircle, Loader2,
  MessageCircle, Phone, MessageSquare
} from 'lucide-react';
import { db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import emailjs from '@emailjs/browser';
import { Button } from '../ui/Button';

interface TutorFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ContactType = 'kakao' | 'phone' | 'discord';

type FormData = {
  goals: string[];             // 공부 목적 (다중)
  duration: string;            // 수강 기간 (단일)
  level: string;               // 회화 레벨 (단일)
  styles: string[];            // 원하는 수업 스타일 (다중)
  companion: string;           // 친구 동행 여부 (단일)
  availableTime: string;       // 상담 가능 시간 카테고리 (단일)
  availableDetail: string;     // 세부 시간 메모
  name: string;                // 성함
  contactType: ContactType;    // 연락수단
  contactValue: string;        // 연락처 값
  notes: string;               // 기타 자유 메모
};

const INITIAL_DATA: FormData = {
  goals: [],
  duration: '',
  level: '',
  styles: [],
  companion: '',
  availableTime: '',
  availableDetail: '',
  name: '',
  contactType: 'kakao',
  contactValue: '',
  notes: '',
};

// 각 스텝 옵션 정의
const GOAL_OPTIONS = [
  '일상 회화',
  '비즈니스 영어',
  '여행 준비',
  '시험 대비 (IELTS/TOEFL/TOEIC/OPIc)',
  '발음 / 억양 교정',
  '면접 준비',
  '유학 / 해외 이주 준비',
  '자녀 영어 교육',
  '취미 / 자기계발',
];

const DURATION_OPTIONS = [
  '1개월 이내 단기',
  '1~3개월',
  '3~6개월',
  '6개월 이상 장기',
  '꾸준히 무기한',
];

const LEVEL_OPTIONS = [
  '왕초보 (알파벳부터 시작)',
  '초급 (단어 위주, 간단한 문장)',
  '중급 (일상 대화 가능)',
  '중상급 (주제 토론 가능)',
  '고급 (원어민과 자연스러운 소통)',
];

const STYLE_OPTIONS = [
  '자유로운 프리토킹',
  '주제가 있는 토론',
  '교재 중심 체계 학습',
  '역할극 / 상황 시뮬레이션',
  '발음 / 억양 집중 교정',
  '문법 설명 중심',
  '비즈니스 상황극',
  '친구처럼 편안한 대화',
  '엄격한 피드백 / 교정',
];

const COMPANION_OPTIONS = [
  '혼자 시작할게요',
  '친구와 함께 시작할 예정이에요',
  '아직 고민 중이에요',
];

const AVAILABLE_TIME_OPTIONS = [
  '평일 오전 (9–12시)',
  '평일 오후 (12–18시)',
  '평일 저녁 (18–22시)',
  '주말 오전',
  '주말 오후',
  '주말 저녁',
  '언제든 가능',
];

const TOTAL_STEPS = 8;

export function TutorFinderModal({ isOpen, onClose }: TutorFinderModalProps) {
  const { setIsAuthModalOpen, setAuthMode, user } = useAuth();
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
        console.error('Failed to fetch EmailJS config:', err);
      }
    };
    fetchConfig();
  }, []);

  const updateFields = (fields: Partial<FormData>) => setFormData(prev => ({ ...prev, ...fields }));
  const nextStep = () => setStep(s => Math.min(TOTAL_STEPS, s + 1));
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const toggleInArray = (field: 'goals' | 'styles', value: string) => {
    const current = formData[field];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    updateFields({ [field]: next } as any);
  };

  const canAdvance: Record<number, boolean> = {
    1: formData.goals.length > 0,
    2: !!formData.duration,
    3: !!formData.level,
    4: formData.styles.length > 0,
    5: !!formData.companion,
    6: !!formData.availableTime,
    7: !!formData.name.trim() && !!formData.contactValue.trim(),
    8: true,
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.contactValue.trim()) {
      setError('성함과 연락처는 필수 입력 항목입니다.');
      setStep(7);
      return;
    }
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        contactType: formData.contactType,
        contactValue: formData.contactValue.trim(),
        goals: formData.goals,
        duration: formData.duration,
        level: formData.level,
        styles: formData.styles,
        companion: formData.companion,
        availableTime: formData.availableTime,
        availableDetail: formData.availableDetail.trim(),
        notes: formData.notes.trim(),
        userId: auth.currentUser?.uid || null,
        type: 'finder_survey',
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'consultations'), payload);

      if (auth.currentUser) {
        try {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), { hasCompletedConsultation: true });
        } catch (err) {
          console.warn('hasCompletedConsultation update skipped:', err);
        }
      } else {
        localStorage.setItem('pendingConsultationId', docRef.id);
        localStorage.setItem('pendingConsultationName', formData.name);
      }

      // EmailJS 발송
      const serviceId = serverConfig?.emailjsServiceId || (import.meta as any).env.VITE_EMAILJS_SERVICE_ID;
      const templateId = serverConfig?.emailjsTemplateId || (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = serverConfig?.emailjsPublicKey || (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY;

      if (serviceId && templateId && publicKey) {
        const contactLabel =
          formData.contactType === 'kakao' ? '카카오톡 ID' :
          formData.contactType === 'phone' ? '전화번호' : '디스코드 ID';

        await emailjs.send(serviceId, templateId, {
          type: '상담 신청 (상세 설문)',
          to_name: '관리자',
          from_name: formData.name,
          contact_label: contactLabel,
          contact_value: formData.contactValue,
          available_time: `${formData.availableTime}${formData.availableDetail ? ` / ${formData.availableDetail}` : ''}`,
          motivation: [
            `공부 목적: ${formData.goals.join(', ') || '-'}`,
            `수강 기간: ${formData.duration || '-'}`,
            `회화 레벨: ${formData.level || '-'}`,
            `수업 스타일: ${formData.styles.join(', ') || '-'}`,
            `친구 동행: ${formData.companion || '-'}`,
            `기타 메모: ${formData.notes || '없음'}`,
          ].join('\n'),
          summary: `${formData.name} | ${contactLabel}: ${formData.contactValue}`,
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
    if (loading) return;
    setStep(1);
    setFormData(INITIAL_DATA);
    setSuccess(false);
    setError('');
    onClose();
  };

  const isAlreadyConsulted = user?.hasCompletedConsultation;

  // 공통 다중선택 버튼 그룹
  const MultiGroup = ({
    options, values, onToggle,
  }: { options: string[]; values: string[]; onToggle: (v: string) => void }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onToggle(opt)}
          className={`p-4 rounded-2xl border-2 text-left text-sm transition-all ${
            values.includes(opt)
              ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
              : 'border-slate-100 hover:border-slate-200 text-slate-600'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  // 공통 단일선택 버튼 그룹
  const SingleGroup = ({
    options, value, onSelect, autoAdvance = true,
  }: { options: string[]; value: string; onSelect: (v: string) => void; autoAdvance?: boolean }) => (
    <div className="grid grid-cols-1 gap-3">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => {
            onSelect(opt);
            if (autoAdvance) setTimeout(() => nextStep(), 150);
          }}
          className={`p-4 rounded-2xl border-2 text-left text-sm transition-all ${
            value === opt
              ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
              : 'border-slate-100 hover:border-slate-200 text-slate-600'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">1. 어떤 목적으로 영어를 공부하시나요?</h3>
            <p className="text-sm text-slate-500">해당되는 항목을 모두 선택해주세요. (다중 선택 가능)</p>
            <MultiGroup options={GOAL_OPTIONS} values={formData.goals} onToggle={(v) => toggleInArray('goals', v)} />
            <Button className="w-full py-4 mt-4" onClick={nextStep} disabled={!canAdvance[1]}>다음 단계로</Button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">2. 어느 정도 기간을 생각하고 계세요?</h3>
            <SingleGroup options={DURATION_OPTIONS} value={formData.duration} onSelect={(v) => updateFields({ duration: v })} />
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">3. 현재 영어 회화 레벨은 어느 정도인가요?</h3>
            <SingleGroup options={LEVEL_OPTIONS} value={formData.level} onSelect={(v) => updateFields({ level: v })} />
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">4. 어떤 스타일의 수업을 원하세요?</h3>
            <p className="text-sm text-slate-500">원하는 수업 방식을 모두 골라주세요. (다중 선택 가능)</p>
            <MultiGroup options={STYLE_OPTIONS} values={formData.styles} onToggle={(v) => toggleInArray('styles', v)} />
            <Button className="w-full py-4 mt-4" onClick={nextStep} disabled={!canAdvance[4]}>다음 단계로</Button>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">5. 친구와 함께 시작할 계획이 있으신가요?</h3>
            <p className="text-xs text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-full font-bold">
              ※ 친구 추천 시 20,000포인트 혜택 제공
            </p>
            <SingleGroup options={COMPANION_OPTIONS} value={formData.companion} onSelect={(v) => updateFields({ companion: v })} />
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">6. 상담 가능 시간을 알려주세요</h3>
            <SingleGroup
              options={AVAILABLE_TIME_OPTIONS}
              value={formData.availableTime}
              onSelect={(v) => updateFields({ availableTime: v })}
              autoAdvance={false}
            />
            <div className="pt-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">세부 시간대 (선택)</label>
              <input
                type="text"
                placeholder="예: 화/목 저녁 8시 이후 가능"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
                value={formData.availableDetail}
                onChange={(e) => updateFields({ availableDetail: e.target.value })}
              />
            </div>
            <Button className="w-full py-4 mt-4" onClick={nextStep} disabled={!canAdvance[6]}>다음 단계로</Button>
          </div>
        );
      case 7:
        return (
          <div className="space-y-5">
            <h3 className="text-xl font-bold text-slate-900">7. 성함과 연락처를 알려주세요</h3>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">성함</label>
              <input
                type="text"
                required
                placeholder="홍길동"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
                value={formData.name}
                onChange={(e) => updateFields({ name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">연락 수단</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => updateFields({ contactType: 'kakao' })}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    formData.contactType === 'kakao'
                      ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                      : 'border-slate-100 bg-white text-slate-500'
                  }`}
                >
                  <MessageCircle size={18} />
                  <span className="text-sm font-bold">카카오톡</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateFields({ contactType: 'phone' })}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    formData.contactType === 'phone'
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-slate-100 bg-white text-slate-500'
                  }`}
                >
                  <Phone size={18} />
                  <span className="text-sm font-bold">전화번호</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateFields({ contactType: 'discord' })}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    formData.contactType === 'discord'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-100 bg-white text-slate-500'
                  }`}
                >
                  <MessageSquare size={18} />
                  <span className="text-sm font-bold">디스코드</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                {formData.contactType === 'kakao' ? '카카오톡 아이디' :
                  formData.contactType === 'phone' ? '전화번호' : '디스코드 아이디'}
              </label>
              <input
                type={formData.contactType === 'phone' ? 'tel' : 'text'}
                required
                placeholder={
                  formData.contactType === 'kakao' ? '카카오톡 아이디를 입력해주세요' :
                  formData.contactType === 'phone' ? '010-1234-5678' :
                  '디스코드 아이디를 입력해주세요'
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
                value={formData.contactValue}
                onChange={(e) => updateFields({ contactValue: e.target.value })}
              />
            </div>

            <Button className="w-full py-4 mt-2" onClick={nextStep} disabled={!canAdvance[7]}>다음 단계로</Button>
          </div>
        );
      case 8:
        return (
          <div className="space-y-5">
            <h3 className="text-xl font-bold text-slate-900">8. 마지막으로 남기고 싶은 말이 있으신가요?</h3>
            <p className="text-sm text-slate-500">Q&amp;A, 상세한 본인 상황, 요청 사항 등 자유롭게 적어주세요. (선택)</p>
            <textarea
              rows={5}
              placeholder="예) 특정 튜터와 매칭되고 싶어요 / 비즈니스 회화 중에서도 IT 분야에 특화된 수업을 원합니다 / 발표 준비 중이라 30일 내 집중 학습이 필요해요"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm resize-none"
              value={formData.notes}
              onChange={(e) => updateFields({ notes: e.target.value })}
            />

            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
              <p className="text-sm text-blue-700 leading-relaxed">
                <strong>전송해주신 정보를 바탕으로 작성하신 상담 가능 시간대</strong>에
                전문 매니저가 직접 연락드려 최적의 튜터 매칭을 도와드립니다.
              </p>
            </div>

            <Button
              className="w-full py-6 gap-2 text-lg shadow-blue-200 shadow-xl font-black"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              {loading ? '전송 중...' : '분석 완료하고 상담 신청하기'}
            </Button>
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
              Safe &amp; Confidential
            </p>
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
                      style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                    />
                  </div>
                </div>
                <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8">
                {isAlreadyConsulted && !success ? (
                  <div className="text-center space-y-6 py-8">
                    <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle size={40} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-slate-900">이미 상담이 완료되었습니다</h3>
                      <p className="text-slate-600 leading-relaxed">
                        신청하신 정보를 바탕으로 매니저가 연락드릴 예정입니다.<br />
                        대시보드에서 수업 일정을 확인해 보세요!
                      </p>
                    </div>
                    <Button onClick={handleClose} className="w-full py-4 rounded-2xl">닫기</Button>
                  </div>
                ) : success ? (
                  <div className="text-center space-y-6 py-4">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle size={40} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-slate-900">맞춤 튜터 분석 완료!</h3>
                      <p className="text-slate-600 leading-relaxed">
                        딱 맞는 튜터를 찾았습니다. <strong>작성하신 시간대</strong>에 맞춰<br />
                        매니저가 연락드려 상담을 확정해 드릴게요.
                      </p>
                    </div>
                    <div className="space-y-3 pt-4">
                      {auth.currentUser ? (
                        <Button onClick={handleClose} className="w-full py-6 rounded-2xl text-lg shadow-lg">대시보드로 가기</Button>
                      ) : (
                        <Button onClick={handleStartAuth} className="w-full py-6 rounded-2xl text-lg shadow-lg">결과 확인하고 가입하기</Button>
                      )}
                      <button onClick={handleClose} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                        나중에 할게요
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {error && <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-medium">{error}</div>}
                    <div className="min-h-[320px]">{renderStep()}</div>
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
