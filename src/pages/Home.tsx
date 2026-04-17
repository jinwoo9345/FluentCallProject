import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, Globe, Zap, ShieldCheck, CheckCircle2, 
  Clock, CreditCard, MessageCircle, Users, Calendar, 
  Sparkles, HelpCircle, ChevronDown, Star, Check
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { TutorFinderModal } from '../components/Consultation/TutorFinderModal';
import { MOCK_TUTORS } from '../constants';

export default function Home() {
  const [isTutorFinderOpen, setIsTutorFinderOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "친구 추천 할인 혜택은 어떻게 되나요?",
      a: "수강생이 친구를 추천하고 해당 친구가 결제를 완료하면, 추천인에게 다음 달 사용 가능한 20,000포인트가 지급됩니다. 이 포인트를 사용하면 다음 달 수강료가 159,000원으로 자동 할인됩니다. 포인트는 수강을 유지하는 경우에만 사용 가능합니다."
    },
    {
      q: "추천받은 친구도 할인을 받나요?",
      a: "추천받은 친구는 정상가(179,000원)로 결제하게 됩니다. 하지만 추천인과 친구 간 협의하여 지급된 포인트를 나누어 사용하는 것은 가능합니다. 친구와 함께 시작하여 비용 절감 혜택을 챙겨보세요!"
    },
    {
      q: "상담 신청 절차가 어떻게 되나요?",
      a: "EnglishBites는 모든 수강생의 학습 효과 극대화를 위해 '상담 필수제'를 운영합니다. '지금 시작하기'를 통해 간단한 설문을 마치시면 전문 매니저가 24시간 이내에 연락드려 최적의 튜터를 매칭해 드립니다."
    },
    {
      q: "환불 규정이 궁금합니다.",
      a: "수업 시작 전에는 100% 환불 가능합니다. 수업 진행 후에는 (결제 금액 ÷ 총 제공 횟수) × 남은 횟수 공식에 따라 환불됩니다. 단, 전체 수업의 3/8 이상 진행 시 서비스 이용료(49,000원)는 환불되지 않습니다."
    }
  ];

  return (
    <div className="flex flex-col font-sans overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center bg-brand-cream pt-20 pb-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-bold mb-8 border border-blue-100"
              >
                <span>야금야금 영어가 느는 구조, EnglishBites</span>
              </motion.div>
              
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl leading-[1.2] mb-8 font-display">
                머릿속 단어가 <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">입 밖으로 터지는</span> <br />
                진짜 회화의 시작
              </h1>
              
              <div className="space-y-6 mb-12">
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <div className="h-px w-8 bg-slate-200" />
                  <p className="text-slate-400 font-medium line-through decoration-slate-300">
                    비싼 학원비, 딱딱한 커리큘럼은 이제 그만
                  </p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-slate-50/50 border border-slate-100 p-6 rounded-3xl max-w-lg"
                >
                  <p className="text-lg sm:text-xl text-slate-700 leading-relaxed font-medium">
                    북미/유럽 원어민 튜터와 함께 <br />
                    <span className="text-blue-600 font-bold">가장 자유로운 분위기</span>에서 <br />
                    당신의 일상을 영어로 채워보세요.
                  </p>
                </motion.div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto gap-2 px-10 py-7 text-xl rounded-2xl shadow-2xl shadow-blue-200 bg-blue-600 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95" 
                  onClick={() => setIsTutorFinderOpen(true)}
                >
                  지금 시작하기 <ArrowRight size={22} />
                </Button>
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <CheckCircle2 size={20} className="text-green-500" />
                  <span>학습 상담 후 매칭 진행</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative"
            >
              <div className="relative z-10 aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white bg-white">
                <img
                  src="/logo.png"
                  alt="EnglishBites Logo"
                  className="h-full w-full object-contain p-8"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-400/10 blur-[120px] -z-10 rounded-full" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 bg-white relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black text-slate-900 mb-6 font-display">합리적인 정가제 시스템</h2>
            <p className="text-lg text-slate-600">모든 수강생에게 동일한 품질의 교육을 <br />투명한 가격으로 제공합니다.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Basic Plan */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl relative flex flex-col">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-2">8회 베이직</h3>
                <p className="text-slate-500 text-sm">주 2회 표준 플랜</p>
              </div>
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">179,000</span>
                  <span className="text-slate-500 font-bold">원</span>
                </div>
                <p className="text-blue-600 font-bold text-sm mt-2">회당 약 22,000원</p>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-slate-600 text-sm">
                  <Check size={18} className="text-blue-600" />
                  <span>25~30분 1:1 원어민 수업</span>
                </li>
                <li className="flex items-center gap-3 text-slate-600 text-sm">
                  <Check size={18} className="text-blue-600" />
                  <span>자유로운 주제 & 시간 선정</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full py-6 rounded-2xl font-bold" onClick={() => setIsTutorFinderOpen(true)}>상담 신청하기</Button>
            </div>

            {/* Referral Benefit Card */}
            <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative z-20 text-white border-4 border-blue-500 flex flex-col scale-105">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest">
                Referral Reward
              </div>
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">친구 추천 할인</h3>
                <p className="text-slate-400 text-sm">함께하면 수강료가 159,000원!</p>
              </div>
              <div className="mb-8 bg-white/10 p-6 rounded-2xl border border-white/10">
                <p className="text-sm text-blue-400 font-bold mb-2">추천 시 2만점 지급</p>
                <p className="text-lg font-bold leading-tight">
                  초대한 친구 결제 시 <br />
                  <span className="text-2xl text-white font-black">20,000원 할인</span> <br />
                  포인트를 즉시 지급해 드립니다.
                </p>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={18} className="text-blue-400" />
                  <span>포인트 적용 시 159,000원</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={18} className="text-blue-400" />
                  <span>추천인-친구 포인트 쉐어 가능</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={18} className="text-blue-400" />
                  <span>수강 유지 시 무제한 혜택</span>
                </li>
              </ul>
              <Link to="/tutors" className="w-full">
                <Button className="w-full py-7 rounded-2xl font-black text-lg bg-blue-600 hover:bg-blue-700">지금 친구 초대하기</Button>
              </Link>
            </div>

            {/* Bulk Plan */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl relative flex flex-col">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-2">장기 패키지</h3>
                <p className="text-slate-500 text-sm">꾸준한 성장을 위한 보너스</p>
              </div>
              <div className="space-y-6 mb-10 flex-1">
                <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100">
                  <p className="text-sm font-bold text-blue-600 mb-1">16회 패키지</p>
                  <p className="text-xl font-black text-slate-900">+ 1회 무료 수업</p>
                </div>
                <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100">
                  <p className="text-sm font-bold text-indigo-600 mb-1">24회 패키지</p>
                  <p className="text-xl font-black text-slate-900">+ 2회 무료 수업</p>
                </div>
              </div>
              <Button variant="outline" className="w-full py-6 rounded-2xl font-bold" onClick={() => setIsTutorFinderOpen(true)}>문의하기</Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-6 font-display">궁금한 점이 있으신가요?</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-lg font-bold text-slate-900">{faq.q}</span>
                  <ChevronDown className={`text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 pt-0 text-slate-600 leading-relaxed border-t border-slate-50">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <TutorFinderModal isOpen={isTutorFinderOpen} onClose={() => setIsTutorFinderOpen(false)} />
    </div>
  );
}
