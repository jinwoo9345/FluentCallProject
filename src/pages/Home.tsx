import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Globe, Zap, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

export default function Home() {
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
                검증된 원어민 강사들과 연결해 드립니다. 
                원하는 시간에 예약하고, 나만의 학습 스케줄을 스마트하게 관리하세요.
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <Link to="/tutors">
                  <Button size="lg" className="gap-2">
                    튜터 찾기 <ArrowRight size={20} />
                  </Button>
                </Link>
                <Link to="/pricing" className="text-sm font-semibold leading-6 text-slate-900">
                  가격 안내 보기 <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div className="mt-10 flex items-center gap-4 text-sm text-slate-500">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <img
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-white"
                      src={`https://picsum.photos/seed/user${i}/100/100`}
                      alt="User"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
                <span>전 세계 10,000명 이상의 학생들과 함께하고 있습니다</span>
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
              {/* Floating stats card */}
              <div className="absolute -bottom-6 -left-6 rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-green-100 p-2 text-green-600">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">98%</p>
                    <p className="text-sm text-slate-500">학습 만족도</p>
                  </div>
                </div>
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
                desc: '미국, 영국, 캐나다, 호주의 검증된 원어민 강사로부터 직접 배우세요.',
                icon: Globe,
              },
              {
                title: '유연한 스케줄',
                desc: '바쁜 일상에 맞춰 수업을 예약하세요. 모든 시간대 24/7 이용 가능합니다.',
                icon: Zap,
              },
              {
                title: '안전하고 확실한 시스템',
                desc: '검증된 튜터와 안전한 결제 시스템으로 안심하고 학습에만 집중하세요.',
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
              첫 15분 무료 체험 수업을 신청하세요. 카드 등록이 필요 없습니다.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Button variant="secondary" size="lg">무료 체험 시작하기</Button>
            </div>
            {/* Decorative circles */}
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20" />
            <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/20" />
          </div>
        </div>
      </section>
    </div>
  );
}
