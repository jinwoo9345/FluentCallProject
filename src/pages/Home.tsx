import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, Globe, Zap, ShieldCheck, CheckCircle, 
  Clock, CreditCard, MessageCircle, Users, Calendar, 
  Sparkles, HelpCircle, ChevronDown, Star, Check, Gift, X, Info
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { TutorFinderModal } from '../components/Consultation/TutorFinderModal';

export default function Home() {
  const [isTutorFinderOpen, setIsTutorFinderOpen] = useState(false);
  const [isReferralManualOpen, setIsReferralManualOpen] = useState(false);
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
      a: "EnglishBites는 모든 수강생의 학습 효과 극대화를 위해 '상담 필수제'를 운영합니다. '지금 시작하기'를 통해 간단한 설문을 마치시면 전문 매니저가 작성해주신 상담 희망 시간대에 맞춰 직접 연락드려 최적의 튜터를 매칭해 드립니다."
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-bold mb-8 border border-blue-100">
                <span>야금야금 영어가 느는 구조, EnglishBites</span>
              </div>
              
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl leading-[1.2] mb-8 font-display">
                머릿속 단어가 <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">입 밖으로 터지는</span> <br />
                진짜 회화의 시작
              </h1>
              
              <div className="space-y-6 mb-12 text-lg text-slate-600 leading-relaxed">
                 북미/유럽 원어민 튜터와 함께 가장 자유로운 분위기에서 <br/>
                 당신의 일상을 영어로 채워보세요.
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto gap-2 px-10 py-7 text-xl rounded-2xl shadow-2xl shadow-blue-200 bg-blue-600 hover:bg-blue-700 transition-all font-black" 
                  onClick={() => setIsTutorFinderOpen(true)}
                >
                  지금 시작하기 <ArrowRight size={22} />
                </Button>
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <Check size={20} className="text-green-500" />
                  <span>상담 후 튜터 매칭 진행</span>
                </div>
              </div>
            </motion.div>
            
            <div className="relative">
              <div className="relative z-10 aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white bg-white">
                <img src="/logo.png" alt="EnglishBites" className="h-full w-full object-contain p-8" referrerPolicy="no-referrer" />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-400/10 blur-[120px] -z-10 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 bg-white relative overflow-hidden border-t border-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black text-slate-900 mb-6 font-display">합리적인 정가제 시스템</h2>
            <p className="text-lg text-slate-600">모든 수강생에게 동일한 품질의 교육을 투명한 가격으로 제공합니다.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Basic Plan */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col">
              <h3 className="text-xl font-bold text-slate-900 mb-2">8회 베이직</h3>
              <p className="text-slate-500 text-sm mb-8">주 2회 표준 플랜</p>
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">179,000</span>
                  <span className="text-slate-500 font-bold">원</span>
                </div>
                <p className="text-blue-600 font-bold text-sm mt-2">회당 약 22,000원</p>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-slate-600 text-sm"><Check size={18} className="text-blue-600" /> <span>25~30분 1:1 원어민 수업</span></li>
                <li className="flex items-center gap-3 text-slate-600 text-sm"><Check size={18} className="text-blue-600" /> <span>자유로운 주제 & 시간 선정</span></li>
              </ul>
              <Button variant="outline" className="w-full py-6 rounded-2xl font-bold" onClick={() => setIsTutorFinderOpen(true)}>상담 신청하기</Button>
            </div>

            {/* Referral Reward Card (HIGHLIGHT) */}
            <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative z-20 text-white border-4 border-blue-500 flex flex-col scale-105">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest">Referral Reward</div>
              <h3 className="text-xl font-bold mb-2">친구 추천 할인</h3>
              <p className="text-slate-400 text-sm mb-8">함께하면 수강료가 159,000원!</p>
              <div className="mb-8 bg-white/10 p-6 rounded-3xl border border-white/10">
                <p className="text-sm text-blue-400 font-bold mb-2">추천 시 2만점 지급</p>
                <p className="text-lg font-bold leading-tight">초대한 친구 결제 시 <br/><span className="text-2xl text-white font-black">20,000원 할인</span> <br/>포인트를 즉시 지급해 드립니다.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-300 text-sm"><Check size={18} className="text-blue-400" /> <span>포인트 적용 시 159,000원</span></li>
                <li className="flex items-center gap-3 text-slate-300 text-sm"><Check size={18} className="text-blue-400" /> <span>초대 무제한 혜택</span></li>
              </ul>
              <div className="space-y-3">
                <Button className="w-full py-6 rounded-2xl font-black text-lg bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-900/20" onClick={() => setIsReferralManualOpen(true)}>프로그램 자세히 보기</Button>
                <p className="text-[10px] text-slate-500 text-center uppercase font-bold tracking-tighter">※ 자세히 보기를 클릭하여 규정을 확인하세요</p>
              </div>
            </div>

            {/* Bulk Plan */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col">
              <h3 className="text-xl font-bold text-slate-900 mb-2">장기 패키지</h3>
              <p className="text-slate-500 text-sm mb-8">꾸준한 성장을 위한 보너스</p>
              <div className="space-y-4 mb-10 flex-1">
                <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100">
                  <p className="text-sm font-bold text-blue-600 mb-1">16회 패키지</p>
                  <p className="text-xl font-black text-slate-900">+ 1회 무료 수업</p>
                </div>
                <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100">
                  <p className="text-sm font-bold text-indigo-600 mb-1">24회 패키지</p>
                  <p className="text-xl font-black text-slate-900">+ 2회 무료 수업</p>
                </div>
              </div>
              <Button variant="outline" className="w-full py-6 rounded-2xl font-bold" onClick={() => setIsTutorFinderOpen(true)}>패키지 문의하기</Button>
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
              <div key={idx} className="border border-slate-200 rounded-[2rem] overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
                <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full flex items-center justify-between p-7 text-left">
                  <span className="text-lg font-bold text-slate-900">{faq.q}</span>
                  <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="p-7 pt-0 text-slate-600 leading-relaxed border-t border-slate-50">{faq.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Referral Manual Modal */}
      <AnimatePresence>
        {isReferralManualOpen && (
          <div className="fixed inset-0 z-[250] overflow-y-auto bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} className="bg-white rounded-[3rem] max-w-2xl w-full shadow-2xl overflow-hidden">
              <div className="bg-blue-600 p-10 text-white relative">
                <button onClick={() => setIsReferralManualOpen(false)} className="absolute right-8 top-8 hover:rotate-90 transition-transform"><X size={28} /></button>
                <Gift size={56} className="mb-6 opacity-90" />
                <h2 className="text-4xl font-black tracking-tight">친구 추천 혜택 매뉴얼</h2>
                <p className="text-blue-100 mt-2 text-lg">함께 성장하는 즐거움, EnglishBites 리워드</p>
              </div>
              <div className="p-10 sm:p-14 space-y-12 max-h-[75vh] overflow-y-auto">
                <section>
                  <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <CheckCircle size={24} className="text-blue-600" /> 친구 추천 혜택
                  </h3>
                  <div className="bg-blue-50/50 p-8 rounded-[2rem] border border-blue-100/50">
                    <p className="text-slate-800 text-lg leading-relaxed font-medium">
                      수강생이 친구를 추천하고, 해당 친구가 실제 결제를 완료할 경우<br />
                      <span className="text-blue-700 font-black underline decoration-blue-200">추천인(초대한 사람)</span>에게
                      <span className="text-blue-700 font-black"> 20,000 포인트</span>가 즉시 지급됩니다.
                    </p>
                    <ul className="mt-6 space-y-3 text-slate-600">
                      <li>• 1 포인트 = 1,000원으로 사용 가능합니다.</li>
                      <li>• 지급된 포인트는 <strong>다음 결제 시 자동 차감</strong>되며 전액 사용이 가능합니다.</li>
                      <li>• 포인트 적용 시 다음 달 결제 금액은 <strong>159,000원</strong>으로 할인됩니다.</li>
                      <li>• 추천 가능 친구 수에는 <strong>제한이 없습니다</strong>.</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <Gift size={24} className="text-blue-600" /> 지급 및 사용 절차
                  </h3>
                  <ol className="space-y-3 text-slate-700 list-decimal list-inside">
                    <li>내 대시보드에서 <strong>개인 추천 코드</strong>를 확인하고 친구에게 공유합니다.</li>
                    <li>초대받은 친구가 회원가입 후 <strong>결제 화면에서 추천 코드를 입력</strong>합니다.</li>
                    <li>친구의 결제가 완료되는 즉시 <strong>추천인의 포인트가 20,000점 증가</strong>합니다.</li>
                    <li>포인트는 내 대시보드 &gt; 결제 화면에서 전액 사용 가능합니다.</li>
                  </ol>
                </section>

                <section>
                  <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <Info size={24} className="text-amber-500" /> 유의사항
                  </h3>
                  <ul className="space-y-4 text-slate-600">
                    <li className="flex gap-4">
                      <div className="h-2 w-2 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
                      <p>포인트는 <strong>수강을 유지하는 경우에만</strong> 사용 가능합니다. (환불 시 포인트 차감)</p>
                    </li>
                    <li className="flex gap-4">
                      <div className="h-2 w-2 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
                      <p>추천받은 친구는 <strong>별도의 할인 없이 정상가(179,000원)</strong>로 결제합니다.</p>
                    </li>
                    <li className="flex gap-4">
                      <div className="h-2 w-2 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
                      <p>단, 추천인은 "포인트 선물하기" 기능으로 친구에게 일부 포인트를 나눠줄 수 있습니다.</p>
                    </li>
                    <li className="flex gap-4">
                      <div className="h-2 w-2 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
                      <p>본인이 본인의 추천 코드를 사용한 경우 포인트는 <strong>지급되지 않습니다</strong>.</p>
                    </li>
                    <li className="flex gap-4">
                      <div className="h-2 w-2 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
                      <p>부정 사용 또는 자동화된 추천 시도로 판단되는 경우, 당사는 <strong>사전 고지 없이 포인트를 회수</strong>할 수 있습니다.</p>
                    </li>
                    <li className="flex gap-4">
                      <div className="h-2 w-2 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
                      <p>이벤트 정책은 운영상 사정에 따라 <strong>변경 또는 종료</strong>될 수 있습니다.</p>
                    </li>
                  </ul>
                </section>

                <div className="pt-6">
                  <Button onClick={() => setIsReferralManualOpen(false)} className="w-full py-7 text-xl font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-transform">확인했습니다</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TutorFinderModal isOpen={isTutorFinderOpen} onClose={() => setIsTutorFinderOpen(false)} />
    </div>
  );
}
