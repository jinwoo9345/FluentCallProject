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
      q: "환불이 가능한가요?",
      a: "네, 수업 시작 전에는 100% 환불이 가능하며, 수업이 진행된 이후에는 잔여 횟수에 대해 공정하게 환불해 드립니다."
    },
    {
      q: "수업 시간 변경이 가능한가요?",
      a: "네, 튜터와 상의하여 자유롭게 시간을 조정할 수 있습니다. 최소 24시간 전에 말씀해 주시면 원활한 변경이 가능합니다."
    },
    {
      q: "강사 변경이 가능한가요?",
      a: "네, 수업 진행 중 본인과 더 잘 맞는 스타일의 강사로 변경을 원하실 경우 언제든 고객센터를 통해 요청하실 수 있습니다."
    }
  ];

  return (
    <div className="flex flex-col font-sans overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center bg-white pt-20 pb-32 overflow-hidden">
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
                <img src="/logo.png" alt="EnglishBites" className="h-5 w-5 object-contain" />
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
                  <span>첫 상담 무료 진행</span>
                </div>
              </div>
              
              <div className="mt-12 flex items-center gap-8 border-t border-slate-100 pt-8">
                <div>
                  <p className="text-2xl font-bold text-slate-900">100%</p>
                  <p className="text-sm text-slate-500">원어민 강사진</p>
                </div>
                <div className="w-px h-10 bg-slate-100" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">25-30m</p>
                  <p className="text-sm text-slate-500">수업 시간</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative"
            >
              <div className="relative z-10 aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
                <img
                  src="https://picsum.photos/seed/expression/800/1000"
                  alt="Expressing thoughts"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
              </div>
              
              {/* Floating elements */}
              <motion.div 
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-10 -right-10 z-20 bg-white p-6 rounded-3xl shadow-2xl border border-slate-50 max-w-[200px]"
              >
                <div className="flex items-center gap-3 mb-2">
                  <img src="/logo.png" alt="EnglishBites" className="h-4 w-4 object-contain" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">EnglishBites</span>
                </div>
                <p className="text-sm font-bold text-slate-800 leading-snug">
                  "머릿속에 맴도는 단어들, 이제 바로 내뱉으세요!"
                </p>
              </motion.div>

              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-400/10 blur-[120px] -z-10 rounded-full" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Differentiation Section */}
      <section className="py-32 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black text-slate-900 mb-6 font-display">왜 EnglishBites 인가요?</h2>
            <p className="text-lg text-slate-600">기존의 비싸고 딱딱한 원어민 수업과는 차원이 다른 경험을 제공합니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Globe className="text-blue-600" size={32} />,
                title: "미국/유럽 원어민 강사",
                desc: "검증된 발음과 문화를 가진 북미 및 유럽 출신 튜터들로만 구성되어 있습니다."
              },
              {
                icon: <MessageCircle className="text-indigo-600" size={32} />,
                title: "실제 회화 중심 수업",
                desc: "교재에 갇힌 영어가 아닌, 오늘 바로 쓸 수 있는 생생한 일상 대화를 나눕니다."
              },
              {
                icon: <Calendar className="text-purple-600" size={32} />,
                title: "자유로운 시간 조정",
                desc: "고정된 시간이 아닌, 튜터와 상의하여 매주 유연하게 수업 시간을 정할 수 있습니다."
              }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -10 }}
                className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-8">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 bg-white relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black text-slate-900 mb-6 font-display">거품 없는 합리적인 가격</h2>
            <p className="text-lg text-slate-600">"원어민 수업은 비싸다"는 편견을 깼습니다. <br />부담 없는 가격으로 꾸준히 영어를 즐기세요.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end">
            {/* Basic Plan */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl relative">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-2">8회 베이직</h3>
                <p className="text-slate-500 text-sm">주 2회, 한 달 완성</p>
              </div>
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">179,000</span>
                  <span className="text-slate-500 font-bold">원</span>
                </div>
                <p className="text-blue-600 font-bold text-sm mt-2">회당 약 22,000원</p>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-slate-600 text-sm">
                  <Check size={18} className="text-blue-600" />
                  <span>25~30분 1:1 수업</span>
                </li>
                <li className="flex items-center gap-3 text-slate-600 text-sm">
                  <Check size={18} className="text-blue-600" />
                  <span>자유로운 주제 선정</span>
                </li>
                <li className="flex items-center gap-3 text-slate-600 text-sm">
                  <Check size={18} className="text-blue-600" />
                  <span>튜터와 시간 상의 가능</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full py-6 rounded-2xl font-bold" onClick={() => setIsTutorFinderOpen(true)}>선택하기</Button>
            </div>

            {/* Popular Plan */}
            <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative scale-105 z-20 text-white border-4 border-blue-500">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest">
                Most Popular
              </div>
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">친구 초대 특별가</h3>
                <p className="text-slate-400 text-sm">지인 추천 시 적용되는 혜택</p>
              </div>
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-white">159,000</span>
                  <span className="text-slate-400 font-bold">원</span>
                </div>
                <p className="text-blue-400 font-bold text-sm mt-2">최대 2만원 할인 적용</p>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={18} className="text-blue-400" />
                  <span>8회 베이직 모든 혜택 포함</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={18} className="text-blue-400" />
                  <span>친구와 함께 성장하는 즐거움</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={18} className="text-blue-400" />
                  <span>지속적인 할인 혜택 제공</span>
                </li>
              </ul>
              <Button className="w-full py-7 rounded-2xl font-black text-lg bg-blue-600 hover:bg-blue-700" onClick={() => setIsTutorFinderOpen(true)}>지금 시작하기</Button>
            </div>

            {/* Bulk Plan */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl relative">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-2">대량 구매 혜택</h3>
                <p className="text-slate-500 text-sm">꾸준한 학습을 위한 보너스</p>
              </div>
              <div className="space-y-6 mb-10">
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                  <p className="text-sm font-bold text-blue-600 mb-1">16회 구매 시</p>
                  <p className="text-lg font-black text-slate-900">+ 1회 추가 제공</p>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                  <p className="text-sm font-bold text-indigo-600 mb-1">24회 구매 시</p>
                  <p className="text-lg font-black text-slate-900">+ 2회 추가 제공</p>
                </div>
              </div>
              <Button variant="outline" className="w-full py-6 rounded-2xl font-bold" onClick={() => setIsTutorFinderOpen(true)}>문의하기</Button>
            </div>
          </div>

          <div className="mt-20 p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Users size={32} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900">친구 초대 시스템</h4>
                <p className="text-slate-600">초대한 친구가 등록을 유지하는 동안 매달 할인이 적용됩니다.</p>
              </div>
            </div>
            <Link to="/tutors" className="text-blue-600 font-bold flex items-center gap-2 hover:underline">
              자세히 알아보기 <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Tutor Section */}
      <section className="py-32 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-4xl font-black text-slate-900 mb-6 font-display">검증된 원어민 튜터</h2>
              <p className="text-lg text-slate-600">당신의 관심사와 목표에 딱 맞는 튜터를 만나보세요. <br />모든 튜터는 북미/유럽 출신의 실력자들입니다.</p>
            </div>
            <Link to="/tutors">
              <Button variant="outline" className="rounded-xl px-8">전체 강사 보기</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {MOCK_TUTORS.slice(0, 4).map((tutor) => (
              <motion.div 
                key={tutor.id}
                whileHover={{ y: -5 }}
                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 group"
              >
                <div className="aspect-square overflow-hidden relative">
                  <img src={tutor.avatar} alt={tutor.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-bold text-slate-900">{tutor.rating}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="text-lg font-bold text-slate-900 mb-1">{tutor.name}</h4>
                  <p className="text-xs text-blue-600 font-bold mb-4 uppercase tracking-wider">{tutor.location}</p>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {tutor.bio}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tutor.specialties.slice(0, 2).map((s, i) => (
                      <span key={i} className="text-[10px] font-bold bg-slate-50 text-slate-400 px-2 py-1 rounded-md">#{s}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-6 font-display">자주 묻는 질문</h2>
            <p className="text-lg text-slate-600">궁금하신 점을 확인해 보세요.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-slate-100 rounded-2xl overflow-hidden">
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left bg-white hover:bg-slate-50 transition-colors"
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

      {/* Final CTA */}
      <section className="py-32 bg-blue-600 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-8 font-display">
            지금 바로 당신의 첫 번째 <br />
            EnglishBite를 시작하세요.
          </h2>
          <Button 
            size="lg" 
            variant="secondary" 
            className="px-12 py-8 text-xl rounded-2xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all"
            onClick={() => setIsTutorFinderOpen(true)}
          >
            무료 상담 신청하기
          </Button>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full border-8 border-white" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full border-8 border-white" />
        </div>
      </section>

      <TutorFinderModal 
        isOpen={isTutorFinderOpen} 
        onClose={() => setIsTutorFinderOpen(false)} 
      />
    </div>
  );
}

