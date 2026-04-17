import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, MessageCircle, Clock, ShieldCheck, AlertCircle,
  HelpCircle, ExternalLink, Sparkles, Lock,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_englishbites/chat';

export default function ConsultationRequest() {
  const { firebaseUser, isAuthReady, setIsAuthModalOpen, setAuthMode } = useAuth();
  const [kakaoUrl, setKakaoUrl] = useState(DEFAULT_KAKAO_CHANNEL_URL);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'app_settings', 'main'));
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data.kakaoChannelUrl) setKakaoUrl(data.kakaoChannelUrl);
        }
      } catch (err) {
        console.warn('app_settings fetch failed, using default URL:', err);
      }
    })();
  }, []);

  // 회원 전용 접근 제한
  if (!isAuthReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-slate-500 animate-pulse font-bold">불러오는 중...</p>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-100 p-12 shadow-sm"
        >
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-6">
            <Lock size={36} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">회원 전용 상담 채널</h1>
          <p className="text-slate-500 leading-relaxed mb-8">
            카카오톡 상담 채널은 <strong>EnglishBites 회원만</strong> 이용할 수 있습니다.<br />
            아직 가입하지 않으셨다면 가입 후 이용해주세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => {
                setAuthMode('signin');
                setIsAuthModalOpen(true);
              }}
            >
              로그인
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAuthMode('signup');
                setIsAuthModalOpen(true);
              }}
            >
              회원가입
            </Button>
          </div>
          <Link to="/" className="block mt-8 text-xs text-slate-400 hover:text-slate-600">
            홈으로 돌아가기
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-brand-cream min-h-screen pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-blue-600 mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> 홈으로 돌아가기
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 text-yellow-800 text-xs font-black uppercase tracking-widest mb-5">
              <Sparkles size={14} /> 수강생 전용 상담 채널
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight font-display">
              카카오톡으로 바로<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-500">
                1:1 상담
              </span>
              을 시작하세요
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl">
              이미 EnglishBites를 이용 중인 수강생을 위한 <strong className="text-slate-900">추가 상담 채널</strong>입니다.
              수업 일정 변경, 튜터 매칭 수정, 결제·환불 문의 등 운영 관련 모든 사항을 매니저가 카카오톡으로 빠르게 도와드립니다.
            </p>
          </motion.div>
        </div>
        <div className="absolute top-10 right-0 w-[28rem] h-[28rem] bg-yellow-200/40 blur-[130px] rounded-full -z-0" />
      </section>

      {/* 채널 오픈 CTA */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Card className="p-10 bg-gradient-to-br from-[#FEE500] to-[#FADA0A] text-[#3C1E1E] border-none shadow-2xl relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-60 h-60 bg-white/30 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-8 justify-between">
            <div className="flex items-start gap-5">
              <div className="h-16 w-16 bg-[#3C1E1E] text-[#FEE500] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <MessageCircle size={30} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">Kakao Talk Channel</p>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
                  EnglishBites 상담 채널
                </h2>
                <p className="text-sm leading-relaxed opacity-80 max-w-md">
                  아래 버튼을 누르면 카카오톡이 열리며 곧바로 매니저와 1:1 채팅이 시작됩니다.
                </p>
              </div>
            </div>
            <a
              href={kakaoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-[#3C1E1E] hover:bg-black text-[#FEE500] font-black px-8 py-5 rounded-2xl text-lg shadow-xl transition-all hover:scale-[1.02]"
            >
              상담 채널 열기 <ExternalLink size={18} />
            </a>
          </div>
        </Card>
      </section>

      {/* 안내 섹션 */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-12 space-y-6">
        <SectionCard
          icon={<Clock size={22} />}
          iconBg="bg-blue-50 text-blue-600"
          title="상담 가능 시간"
        >
          <ul className="space-y-2 text-slate-700 leading-relaxed">
            <li>• <strong>평일</strong> 오전 10:00 ~ 오후 7:00</li>
            <li>• <strong>점심시간</strong> (12:30 ~ 13:30)에는 응답이 지연될 수 있습니다.</li>
            <li>• 주말·공휴일에는 상담이 운영되지 않으며, 메시지는 다음 영업일에 순차적으로 답변드립니다.</li>
            <li>• 평균 응답 시간: <strong>업무 시간 기준 1시간 이내</strong> (복잡한 확인이 필요한 건은 영업일 1~2일 소요).</li>
          </ul>
        </SectionCard>

        <SectionCard
          icon={<HelpCircle size={22} />}
          iconBg="bg-green-50 text-green-600"
          title="상담 가능 주제"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
            {[
              '수업 일정 변경 / 취소',
              '튜터 매칭 변경 요청',
              '결제 · 환불 · 포인트 관련 문의',
              '추가 수강권 구매 상담',
              '학습 진도 · 커리큘럼 조정',
              '서비스 이용 중 기술 문제',
              '친구 추천 혜택 안내',
              '기타 운영 관련 문의',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-sm font-medium">{t}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          icon={<ShieldCheck size={22} />}
          iconBg="bg-indigo-50 text-indigo-600"
          title="원활한 상담을 위한 안내"
        >
          <ol className="space-y-3 text-slate-700 leading-relaxed list-decimal list-inside">
            <li>첫 문의 시 <strong>가입 이메일 또는 닉네임</strong>을 함께 남겨주시면 빠르게 확인이 가능합니다.</li>
            <li>결제·환불 관련 문의는 <strong>주문번호 또는 결제일</strong>을 함께 적어주세요.</li>
            <li>예정된 수업 30분 이내 긴급 건은 메시지 첫 줄에 <strong>"[긴급]"</strong>을 붙여주시면 우선 응대해 드립니다.</li>
            <li>튜터 개인과의 직접 거래나 사적 연락처 교환은 서비스 정책상 도와드릴 수 없습니다.</li>
          </ol>
        </SectionCard>

        <SectionCard
          icon={<AlertCircle size={22} />}
          iconBg="bg-amber-50 text-amber-600"
          title="유의 사항"
        >
          <ul className="space-y-2 text-slate-700 leading-relaxed">
            <li>• 본 채널은 <strong>추가 상담 전용</strong>입니다. 아직 수강을 시작하지 않으신 경우 <Link to="/" className="text-blue-600 font-bold hover:underline">홈의 "지금 시작하기"</Link>에서 첫 상담을 먼저 진행해주세요.</li>
            <li>• 개인정보·카드번호·비밀번호 등 민감한 정보는 카카오톡에 <strong>절대 남기지 마세요</strong>. 필요한 경우 매니저가 보안 링크로 안내드립니다.</li>
            <li>• 욕설·비방·부적절한 언행이 확인될 경우 상담이 제한되거나 서비스 이용이 중지될 수 있습니다.</li>
            <li>• 장기 미응답 시 채널 운영 정책에 따라 티켓이 자동 종료될 수 있습니다.</li>
          </ul>
        </SectionCard>

        {/* 첫 상담 유도 */}
        <Card className="p-8 bg-slate-900 text-white border-none">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-blue-300 mb-2">처음이신가요?</p>
              <h3 className="text-2xl font-bold mb-2">아직 수강을 시작하지 않으셨다면</h3>
              <p className="text-slate-300 leading-relaxed">
                8단계 간단 설문으로 <strong className="text-white">맞춤 튜터 매칭 상담</strong>을 먼저 진행해 드립니다.
                <br />전문 매니저가 작성하신 시간대에 직접 연락드립니다.
              </p>
            </div>
            <Link to="/">
              <Button size="lg" className="px-8 py-5 rounded-2xl font-black gap-2 flex-shrink-0">
                첫 상담 시작하기
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}

function SectionCard({
  icon, iconBg, title, children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </Card>
  );
}
