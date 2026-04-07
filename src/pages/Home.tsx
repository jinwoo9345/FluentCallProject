import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Globe, Zap, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { ConsultationModal } from '../components/Consultation/ConsultationModal';

export default function Home() {
  const [isConsultationOpen, setIsConsultationOpen] = useState(false);

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
              <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
                나에게 딱 맞는<br></br><span className="text-blue-600">튜터</span>를 만나보세요
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                실력 있는 원어민 강사들과 함께 영어를 시작하세요. 
                나만의 학습 스케줄을 스마트하게 관리할 수 있습니다.
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <Link to="/tutors">
                  <Button size="lg" className="gap-2">
                    튜터 찾기 <ArrowRight size={20} />
                  </Button>
                </Link>
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
                  src="https://picsum.photos/seed/learning/800/800"
                  alt="영어 학습"
                  className="h-full w-full rounded-2xl object-cover shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold uppercase tracking-wider text-blue-600">왜 플루언트콜인가요?</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              가장 스마트한 영어 마스터 방법
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: '원어민 튜터',
                desc: '실력 있는 원어민 강사로부터 직접 영어를 배워보세요.',
                icon: Globe,
              },
              {
                title: '유연한 스케줄',
                desc: '바쁜 일상에 맞춰 유연하게 학습 스케줄을 관리하세요.',
                icon: Zap,
              },
              {
                title: '안전하고 확실한 시스템',
                desc: '안전한 시스템으로 안심하고 영어 학습에만 집중하세요.',
                icon: ShieldCheck,
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -5 }}
                className="flex flex-col items-center text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                  <feature.icon size={32} />
                </div>
                <h3 className="mt-6 text-xl font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-slate-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-blue-600 px-8 py-16 text-center shadow-2xl sm:px-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              지금 바로 시작해볼까요?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-blue-100">
              무료 전화상담을 통해 나에게 맞는 학습 방향을 찾아보세요.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Button variant="secondary" size="lg" onClick={() => setIsConsultationOpen(true)}>
                무료 전화상담 신청하기
              </Button>
            </div>
            {/* Decorative circles */}
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20" />
            <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/20" />
          </div>
        </div>
      </section>

      <ConsultationModal 
        isOpen={isConsultationOpen} 
        onClose={() => setIsConsultationOpen(false)} 
      />
    </div>
  );
}
