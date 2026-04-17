import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Sparkles, Target, Globe2, Users,
  MessageSquareText, Briefcase, FileText, PenLine, Languages,
  CheckCircle2, Clock, Award,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const CORE_VALUES = [
  {
    icon: Globe2,
    title: '북미·유럽 원어민 매칭',
    desc: '각자 다른 지역·문화·전공 배경을 가진 검증된 원어민 및 원어민급 튜터를 만나볼 수 있습니다.',
    color: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50',
    fg: 'text-blue-600',
  },
  {
    icon: MessageSquareText,
    title: '실전 커뮤니케이션 중심',
    desc: '단순한 문법 중심 학습이 아니라, 실제 현지에서 쓰이는 자연스러운 표현과 대화를 통해 말문을 엽니다.',
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    fg: 'text-emerald-600',
  },
  {
    icon: Target,
    title: '목표 기반 맞춤 매칭',
    desc: '사용자의 목적·수준·시간대를 바탕으로 가장 적합한 튜터를 연결해 드립니다.',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    fg: 'text-amber-600',
  },
];

const USE_CASES = [
  { icon: MessageSquareText, title: '일상 회화', desc: '친구처럼 편하게, 매일 쓰는 생활 영어' },
  { icon: Briefcase, title: '면접 준비', desc: '해외 취업·이직 영어 인터뷰 대비' },
  { icon: FileText, title: '에세이 첨삭', desc: 'SOP·Cover Letter·학업 에세이 리뷰' },
  { icon: PenLine, title: '영어 일기 피드백', desc: '매일 쓰는 일기로 자연스러운 라이팅 교정' },
  { icon: Languages, title: '비즈니스 영어', desc: '회의·프레젠테이션·이메일 영어' },
  { icon: Award, title: '시험 / 자격증', desc: 'IELTS · TOEFL · OPIc 스피킹 트레이닝' },
];

const STEPS = [
  {
    step: '01',
    title: '목적과 수준 진단',
    desc: '짧은 설문을 통해 학습 목적, 현재 레벨, 선호하는 수업 스타일을 알려주세요.',
  },
  {
    step: '02',
    title: '맞춤 튜터 추천',
    desc: '수백 명의 튜터 중 회원님의 목표·시간대·성향에 맞는 후보를 매니저가 추려드립니다.',
  },
  {
    step: '03',
    title: '1:1 세션 시작',
    desc: '튜터 프로필·리뷰를 비교한 뒤 원하는 튜터와 직접 수강권을 결제하고 수업을 시작하세요.',
  },
  {
    step: '04',
    title: '지속 가능한 성장',
    desc: '친구 추천으로 포인트를 쌓고, 튜터 변경·일정 조정도 자유롭게 이어가며 꾸준히 성장합니다.',
  },
];

export default function About() {
  return (
    <div className="bg-brand-cream pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-blue-600 mb-8 transition-colors"
          >
            <ArrowLeft size={16} /> 홈으로 돌아가기
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-xs font-black uppercase tracking-widest mb-6">
              <Sparkles size={14} /> About EnglishBites
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight font-display">
              목표에 맞는 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">원어민 튜터</span>와<br />
              실전 영어 대화를 시작하세요
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl">
              <strong className="text-slate-900">EnglishBites</strong>는 북미·유럽 원어민 및 원어민급 튜터와의
              1:1 영어 커뮤니케이션 매칭 서비스를 제공합니다.
              단순한 문법 수업이 아닌, 실제 현지에서 쓰이는 표현과 대화 중심으로 학습을 이어갑니다.
            </p>
          </motion.div>
        </div>
        <div className="absolute -top-20 -right-24 w-[30rem] h-[30rem] bg-blue-200/40 blur-[140px] rounded-full -z-0" />
        <div className="absolute top-40 -left-20 w-[24rem] h-[24rem] bg-indigo-200/40 blur-[130px] rounded-full -z-0" />
      </section>

      {/* 핵심 가치 3개 카드 */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-black text-slate-900 mb-3 font-display">EnglishBites의 약속</h2>
          <p className="text-slate-600">무엇이 다른가, 무엇을 약속하는가</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CORE_VALUES.map((v, idx) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
            >
              <Card className="p-8 h-full hover:shadow-xl transition-shadow">
                <div className={`w-14 h-14 rounded-2xl ${v.bg} ${v.fg} flex items-center justify-center mb-5`}>
                  <v.icon size={26} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{v.title}</h3>
                <p className="text-slate-600 leading-relaxed">{v.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 이렇게 활용하세요 (Use Cases) */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-black text-slate-900 mb-3 font-display">이런 목적으로 사용돼요</h2>
          <p className="text-slate-600">일상 회화부터 면접 준비·에세이 첨삭·영어 일기 피드백까지, 목적에 맞는 튜터를 연결합니다</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {USE_CASES.map((uc, idx) => (
            <motion.div
              key={uc.title}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="p-6 rounded-3xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <uc.icon size={22} />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">{uc.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{uc.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 매칭 프로세스 */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-black text-slate-900 mb-3 font-display">매칭은 이렇게 진행돼요</h2>
          <p className="text-slate-600">네 번의 단계만으로 맞춤 튜터와 바로 연결됩니다</p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-7 top-4 bottom-4 w-px bg-slate-200 hidden md:block" />
          <div className="space-y-6">
            {STEPS.map((s, idx) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="flex gap-5 items-start relative"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-blue-200">
                  {s.step}
                </div>
                <Card className="flex-1 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-1.5">{s.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{s.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 강조 메시지 */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-28">
        <Card className="p-10 sm:p-14 bg-slate-900 text-white border-none relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-12 w-96 h-96 bg-indigo-500/25 rounded-full blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-200 text-xs font-black uppercase tracking-widest mb-6">
              <Users size={12} /> Our Commitment
            </div>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight mb-6 leading-tight font-display">
              지속 가능한 영어 사용 환경을<br />함께 만들어갑니다
            </h3>
            <p className="text-lg leading-relaxed text-slate-300 mb-4">
              EnglishBites는 사용자의 목적과 수준, 시간대에 맞춰 맞춤형 튜터 매칭을 제공하며,
              <br className="hidden sm:inline" />
              보다 <strong className="text-white">실용적이고 지속 가능한 영어 사용 환경</strong>을 만들어갑니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              {[
                { icon: CheckCircle2, label: '검증된 튜터 프로필' },
                { icon: Clock, label: '유연한 시간 매칭' },
                { icon: Users, label: '매니저 직접 상담' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-slate-200">
                  <item.icon size={18} className="text-blue-300 flex-shrink-0" />
                  <span className="text-sm font-bold">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-16">
        <div className="text-center">
          <h3 className="text-2xl font-black text-slate-900 mb-4 font-display">
            당신에게 맞는 튜터를 찾아보세요
          </h3>
          <p className="text-slate-600 mb-8">설문 5분이면 맞춤 튜터 추천을 받을 수 있어요.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/tutors">
              <Button className="px-10 py-6 rounded-2xl font-black text-lg gap-2 shadow-xl">
                튜터 둘러보기 <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/referral">
              <Button variant="outline" className="px-10 py-6 rounded-2xl font-bold text-lg">
                친구 추천 프로그램
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
