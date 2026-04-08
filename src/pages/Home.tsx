import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Globe, Zap, ShieldCheck, CheckCircle2, Clock, CreditCard, MessageCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { TutorFinderModal } from '../components/Consultation/TutorFinderModal';

export default function Home() {
  const [isTutorFinderOpen, setIsTutorFinderOpen] = useState(false);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex flex-col items-start gap-3 mb-10">
                {[
                  "영어 공부는 하는데 말이 안 나온다",
                  "학원은 비싸고 시간 맞추기 어렵다",
                  "꾸준히 하기 힘들다"
                ].map((text, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-50 text-slate-600 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm sm:text-base font-bold tracking-tight">{text}</span>
                  </motion.div>
                ))}
              </div>
              
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl leading-tight">
                그래서 우리는 <br />
                <span className="text-blue-600">‘간단하게, 꾸준히 할 수 있는 영어’</span>를 만들었습니다.
              </h1>
              
              <div className="mt-8 space-y-4">
                <p className="text-xl font-bold text-slate-800">
                  원어민과 1:1 전화영어, 부담 없이 시작하세요
                </p>
                <p className="text-lg text-blue-600 font-semibold">
                  “주 2회 20분으로 영어가 달라집니다”
                </p>
                <p className="text-slate-600">
                  내 수준에 맞는 강사 매칭 · 원하는 시간 자유 예약
                </p>
              </div>

              <div className="mt-10 flex items-center gap-x-6">
                <Button size="lg" className="gap-2 px-8 py-6 text-lg rounded-2xl shadow-lg shadow-blue-200" onClick={() => setIsTutorFinderOpen(true)}>
                  나에게 맞는 튜터 찾기 <ArrowRight size={20} />
                </Button>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-square rounded-3xl bg-blue-50 p-8">
                <img
                  src="https://picsum.photos/seed/fluent/800/800"
                  alt="영어 학습"
                  className="h-full w-full rounded-2xl object-cover shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -right-6 rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                    <MessageCircle size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">지인 소개로 시작된</p>
                    <p className="text-lg font-bold text-slate-900">검증된 수업</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              복잡한 과정 없음
            </h2>
            <p className="mt-4 text-slate-600">간단하게 시작하고 꾸준하게 이어가세요</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { step: '01', title: '간단 상담 & 레벨 확인', desc: '나의 현재 실력과 목표를 확인합니다.' },
              { step: '02', title: '나에게 맞는 강사 매칭', desc: '목적에 가장 적합한 튜터를 연결해 드립니다.' },
              { step: '03', title: '원하는 시간에 1:1 수업 진행', desc: '자유로운 스케줄로 수업을 시작합니다.' },
            ].map((item, idx) => (
              <div key={idx} className="relative p-8 bg-white rounded-3xl shadow-sm border border-slate-100">
                <span className="text-4xl font-black text-blue-100 absolute top-6 right-8">{item.step}</span>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing & Points Section */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-slate-900">100% 1:1 맞춤 수업</h2>
              <ul className="space-y-4">
                {[
                  '시간 완전 자유 (학생-강사 조율)',
                  '실력 있는 원어민 강사',
                  '거품 없는 부담 없는 가격',
                  '나만을 위한 맞춤형 커리큘럼'
                ].map((point, i) => (
                  <li key={i} className="flex items-center gap-3 text-lg text-slate-700 font-medium">
                    <CheckCircle2 className="text-blue-600" size={24} />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-blue-400 mb-2">베이직 플랜</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-black">179,000원</span>
                  <span className="text-slate-400">/ 8회 수업</span>
                </div>
                <div className="space-y-4 border-t border-slate-800 pt-6 mb-8">
                  <div className="flex items-center gap-3 text-slate-300">
                    <Clock size={20} />
                    <span>회당 20분 집중 수업</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <CreditCard size={20} />
                    <span>추가 비용 없음 / 숨겨진 비용 없음</span>
                  </div>
                </div>
                <Button variant="secondary" size="lg" className="w-full py-6 rounded-2xl font-bold text-lg" onClick={() => setIsTutorFinderOpen(true)}>
                  지금 바로 시작하기
                </Button>
                <div className="mt-6 text-center space-y-2">
                  <p className="text-sm text-slate-400">수업 전 100% 환불 가능</p>
                  <p className="text-sm text-slate-400">진행된 수업 제외 후 환불 보장</p>
                  <Link to="/refund-policy" className="text-[10px] text-slate-500 hover:text-blue-400 underline decoration-dotted">
                    (이용약관 및 환불정책 참고)
                  </Link>
                </div>
              </div>
              {/* Decorative background elements */}
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
              <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      <TutorFinderModal 
        isOpen={isTutorFinderOpen} 
        onClose={() => setIsTutorFinderOpen(false)} 
      />
    </div>
  );
}

