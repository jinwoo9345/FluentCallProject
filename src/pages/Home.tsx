import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { TutorFinderModal } from '../components/Consultation/TutorFinderModal';

type FaqItem = {
  q: string;
  a: string;                    // 짧은 핵심 답변 1~2문장
  details: React.ReactNode;     // 상세 설명 JSX
  linkTo?: string;              // "더 자세히 보기" 페이지 링크 (선택)
  linkLabel?: string;
};

export default function Home() {
  const [isTutorFinderOpen, setIsTutorFinderOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showDetailIdx, setShowDetailIdx] = useState<number | null>(null);

  const faqs: FaqItem[] = [
    {
      q: '친구 추천 할인 혜택은 어떻게 되나요?',
      a: '추천한 친구가 결제하면, 추천인에게 20,000포인트가 즉시 지급됩니다. 1포인트 = 1원으로 다음 결제 시 최대 20,000원까지 자동 할인됩니다.',
      details: (
        <div className="space-y-3">
          <p><strong>지급 조건</strong> — 내 추천 코드를 친구가 결제 화면에 입력하고 결제를 완료해야 지급됩니다.</p>
          <p><strong>포인트 가치</strong> — 1포인트 = 1원으로, 20,000포인트는 20,000원 할인과 같습니다.</p>
          <p><strong>사용 방법</strong> — 다음 결제 시 자동으로 차감되어 적용됩니다.</p>
          <p><strong>사용 조건</strong> — 포인트는 수강을 유지하고 있을 때만 사용할 수 있으며, 환불 시에는 소멸됩니다.</p>
        </div>
      ),
      linkTo: '/referral',
      linkLabel: '친구 추천 프로그램 전체 보기',
    },
    {
      q: '추천받은 친구도 할인을 받나요?',
      a: '친구 본인은 선택한 튜터가 설정한 정상 수강료로 결제합니다. 단, 추천인이 받은 포인트를 친구와 나눠 쓸 수 있습니다.',
      details: (
        <div className="space-y-3">
          <p>
            추천 보상은 <strong>추천인(초대한 사람)에게만</strong> 지급됩니다.
            따라서 추천을 받은 친구 본인은 별도의 자동 할인을 받지 않습니다.
          </p>
          <p>
            그러나 지급된 20,000포인트를 추천인이 본인 결제 시 사용하거나,
            <strong> 포인트 선물하기 기능</strong>을 통해 친구와 나눠 쓸 수 있습니다.
          </p>
          <p>즉, 친구와 협의하면 실질적으로 두 사람 모두 할인 혜택을 경험할 수 있습니다.</p>
        </div>
      ),
      linkTo: '/referral',
      linkLabel: '추천 프로그램 규정 보기',
    },
    {
      q: '상담 신청 절차가 어떻게 되나요?',
      a: '"지금 시작하기" 설문을 완료하시면 매니저가 신청해주신 시간대에 직접 연락드립니다.',
      details: (
        <ol className="list-decimal pl-5 space-y-2">
          <li>홈페이지의 "지금 시작하기" 버튼을 클릭합니다.</li>
          <li>8단계 설문(목적·기간·레벨·수업 스타일·동행 여부·상담 시간·연락처·기타)을 작성합니다.</li>
          <li>제출 후 전문 매니저가 작성하신 상담 가능 시간대에 맞춰 직접 연락드립니다.</li>
          <li>상담을 통해 학습 목표에 가장 적합한 튜터를 매칭해 드립니다.</li>
          <li>수업 스타일이 맞지 않을 경우 <strong>1회 무료 튜터 변경</strong>도 가능합니다.</li>
        </ol>
      ),
    },
    {
      q: '수업은 어떻게 진행되나요?',
      a: '원어민 강사와 1:1로 회당 25~30분, 주 2회 기준으로 진행되며 일정은 유연하게 조정됩니다.',
      details: (
        <ul className="list-disc pl-5 space-y-2">
          <li>모든 수업은 <strong>1:1 원어민 회화</strong>로 진행됩니다.</li>
          <li>기본 수업 시간은 25~30분이며, 강사와 협의하여 조정할 수 있습니다.</li>
          <li>수업 일정은 사전에 협의된 시간을 기준으로 진행됩니다.</li>
          <li>수업 시작 3시간 전까지는 취소 시 횟수가 차감되지 않습니다.</li>
          <li>노쇼 또는 3시간 이내 취소 시 1회가 차감됩니다.</li>
        </ul>
      ),
    },
    {
      q: '환불 규정이 궁금합니다.',
      a: '수업 시작 전 전액 환불. 일부 이용 후에는 정가 기준 사용 수업료를 차감한 잔여 금액에서 환불 수수료(최대 10%)를 제외하고 환불됩니다.',
      details: (
        <div className="space-y-3">
          <p><strong>수업 전 환불</strong> — 아직 수업을 이용하지 않은 경우 전액 환불 가능합니다. (단, 결제 수수료는 제외될 수 있습니다)</p>
          <p>
            <strong>일부 수업 진행 후</strong> — 아래 공식으로 계산됩니다.
            <br />
            <span className="block mt-2 p-3 bg-slate-100 rounded-lg text-center font-bold text-slate-800">
              환불금 = 총 결제금액 − (정가 기준 1회 수업료 × 이용 횟수) − 환불 수수료
            </span>
          </p>
          <p>
            <strong>예시</strong> — 179,000원 / 8회 결제 후 4회 이용 시
            <br />
            · 1회 정가: 179,000 ÷ 8 = 22,375원
            <br />
            · 사용 금액: 22,375 × 4 = 89,500원
            <br />
            → 환불금: 179,000 − 89,500 − (환불 수수료 최대 10%)
          </p>
          <p className="text-red-600 font-medium">
            환불 수수료는 총 결제금액의 <strong>최대 10% 이내</strong>에서 부과될 수 있으며, 할인·프로모션 적용 상품은 정가 기준으로 사용 금액이 계산됩니다.
          </p>
          <p className="text-slate-500 text-sm">환불은 접수일 기준 영업일 3~7일 이내 처리됩니다.</p>
        </div>
      ),
      linkTo: '/refund-policy',
      linkLabel: '환불 정책 전문 보기',
    },
    {
      q: '결제 방법과 수강권 구성은 어떻게 되나요?',
      a: '8회 / 16회(+1) / 24회(+2) 패키지로 선결제하며, 포인트와 추천인 코드를 결제 시 적용할 수 있습니다.',
      details: (
        <ul className="list-disc pl-5 space-y-2">
          <li>수강권은 <strong>8회 · 16회(+1회 보너스) · 24회(+2회 보너스)</strong> 중 선택 가능합니다.</li>
          <li>모든 수업은 <strong>선결제 후 이용</strong>할 수 있습니다.</li>
          <li>결제 시 <strong>추천인 코드를 입력</strong>하여 추천인에게 포인트를 지급할 수 있습니다.</li>
          <li>본인이 보유한 포인트는 결제 시 전액 사용 가능합니다. (1포인트 = 1원)</li>
          <li>결제는 토스페이먼츠(Toss Payments)를 통해 안전하게 처리됩니다.</li>
        </ul>
      ),
    },
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
                <span>원어민 튜터 매칭 플랫폼, EnglishBites</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl leading-[1.2] mb-8 font-display">
                나에게 맞는 <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">원어민 튜터</span>를 <br />
                직접 찾아보세요
              </h1>

              <div className="space-y-6 mb-12 text-lg text-slate-600 leading-relaxed">
                각 튜터가 자신만의 전문 분야와 수강료를 직접 설정합니다.<br />
                프로필·리뷰·시간표를 비교하고, 마음에 드는 튜터와 바로 1:1 수업을 시작해보세요.
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
            <h2 className="text-4xl font-black text-slate-900 mb-6 font-display">튜터별 맞춤 수강권</h2>
            <p className="text-lg text-slate-600">
              각 수강권은 <strong>1:1 매칭 서비스 금액</strong>과 <strong>플랫폼 서비스 이용료</strong>로 구성됩니다.<br />
              실제 결제 금액은 선택한 튜터·패키지에 따라 달라지며, 결제 화면에서 확인하실 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Basic Plan — 주 전환 카드로 강조 (scale + 그라데이션 + 강조 CTA) */}
            <div className="bg-gradient-to-br from-white to-blue-50/40 p-10 rounded-[3rem] border-4 border-blue-500 shadow-2xl shadow-blue-500/10 flex flex-col relative lg:scale-105 lg:z-10">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/30">
                Most Popular
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">8회 수강권</h3>
              <p className="text-slate-500 text-sm mb-8">가볍게 시작하기 좋은 표준 패키지</p>
              <div className="mb-8 space-y-2">
                <div className="p-5 rounded-2xl bg-white border border-blue-100 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">수강권 구성</p>
                  <p className="text-base font-bold text-slate-900 leading-tight">
                    1:1 매칭 서비스 금액
                  </p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <span className="text-blue-500 font-bold">+</span> 플랫폼 서비스 이용료
                  </p>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  최종 결제 금액은 선택한 튜터·수강권에 따라 달라지며 결제 화면에서 확인하실 수 있습니다.
                </p>
              </div>
              <ul className="space-y-3.5 mb-10 flex-1">
                <li className="flex items-center gap-3 text-slate-700 text-sm"><Check size={18} className="text-blue-600 flex-shrink-0" /> <span>튜터가 정한 시간에 25~30분 1:1 수업</span></li>
                <li className="flex items-center gap-3 text-slate-700 text-sm"><Check size={18} className="text-blue-600 flex-shrink-0" /> <span>프로필·리뷰 확인 후 직접 매칭</span></li>
                <li className="flex items-center gap-3 text-slate-700 text-sm"><Check size={18} className="text-blue-600 flex-shrink-0" /> <span>자유로운 시간·주제 선정</span></li>
              </ul>
              <Link to="/tutors" className="block">
                <Button className="w-full py-7 rounded-2xl font-black text-lg bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20">
                  튜터 찾아보기
                </Button>
              </Link>
            </div>

            {/* Referral Reward Card — 보조 혜택으로 톤 다운 */}
            <div className="bg-slate-900 p-10 rounded-[3rem] shadow-xl text-white border border-slate-800 flex flex-col">
              <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 self-start">
                Referral Reward
              </div>
              <h3 className="text-2xl font-black mb-2">친구 추천 할인</h3>
              <p className="text-slate-400 text-sm mb-8">친구와 함께 시작하고 포인트로 할인 받으세요</p>
              <div className="mb-8 bg-white/5 p-6 rounded-3xl border border-white/10">
                <p className="text-xs text-blue-300 font-bold mb-2 uppercase tracking-widest">추천 시 지급</p>
                <p className="text-3xl font-black text-white leading-tight">20,000 P</p>
                <p className="text-xs text-slate-400 mt-1">(= 20,000원 할인)</p>
              </div>
              <ul className="space-y-3.5 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-300 text-sm"><Check size={18} className="text-blue-400 flex-shrink-0" /> <span>다음 결제 시 최대 20,000원 할인</span></li>
                <li className="flex items-center gap-3 text-slate-300 text-sm"><Check size={18} className="text-blue-400 flex-shrink-0" /> <span>초대 무제한 혜택</span></li>
                <li className="flex items-center gap-3 text-slate-300 text-sm"><Check size={18} className="text-blue-400 flex-shrink-0" /> <span>추천인-친구 포인트 쉐어 가능</span></li>
              </ul>
              <Link to="/referral" className="block">
                <Button variant="outline" className="w-full py-6 rounded-2xl font-bold bg-transparent border-white/20 text-white hover:bg-white/10">
                  프로그램 자세히 보기
                </Button>
              </Link>
            </div>

            {/* Bulk Plan — 장기 보너스, 서브 CTA */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col">
              <h3 className="text-2xl font-black text-slate-900 mb-2">장기 패키지 보너스</h3>
              <p className="text-slate-500 text-sm mb-8">더 많이 배울수록 더 많이 드립니다</p>
              <div className="space-y-4 mb-10 flex-1">
                <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-blue-600">16회 패키지</p>
                    <p className="text-base font-bold text-slate-900 mt-1">+ 1회 무료 수업</p>
                  </div>
                  <div className="text-3xl font-black text-blue-600">+1</div>
                </div>
                <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-indigo-600">24회 패키지</p>
                    <p className="text-base font-bold text-slate-900 mt-1">+ 2회 무료 수업</p>
                  </div>
                  <div className="text-3xl font-black text-indigo-600">+2</div>
                </div>
              </div>
              <Link to="/tutors">
                <Button variant="outline" className="w-full py-6 rounded-2xl font-bold">튜터 프로필 비교하기</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4 font-display">자주 묻는 질문</h2>
            <p className="text-slate-500">자주 문의 주시는 내용을 모았습니다. 질문을 눌러 답변을 확인하세요.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              const isDetailOpen = showDetailIdx === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-[2rem] overflow-hidden bg-white shadow-sm transition-all hover:shadow-md"
                >
                  <button
                    onClick={() => {
                      setOpenFaq(isOpen ? null : idx);
                      if (isOpen) setShowDetailIdx(null);
                    }}
                    className="w-full flex items-start justify-between gap-4 p-7 text-left"
                  >
                    <div className="flex gap-4">
                      <span className="flex-shrink-0 h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                        Q
                      </span>
                      <span className="text-lg font-bold text-slate-900 pt-0.5">{faq.q}</span>
                    </div>
                    <ChevronDown
                      className={`text-slate-400 transition-transform duration-300 flex-shrink-0 mt-1 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-7 pb-6 pt-0 border-t border-slate-100">
                          {/* 핵심 답변 */}
                          <div className="flex gap-4 pt-5">
                            <span className="flex-shrink-0 h-7 w-7 rounded-full bg-slate-100 text-slate-600 text-xs font-black flex items-center justify-center">
                              A
                            </span>
                            <p className="text-slate-700 leading-relaxed pt-0.5">{faq.a}</p>
                          </div>

                          {/* 상세보기 버튼 + 상세 내용 */}
                          <div className="mt-4 pl-11">
                            <button
                              onClick={() => setShowDetailIdx(isDetailOpen ? null : idx)}
                              className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              {isDetailOpen ? '상세 설명 접기' : '상세 설명 보기'}
                              <ChevronDown
                                size={14}
                                className={`transition-transform duration-300 ${isDetailOpen ? 'rotate-180' : ''}`}
                              />
                            </button>

                            <AnimatePresence initial={false}>
                              {isDetailOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700 leading-relaxed">
                                    {faq.details}
                                    {faq.linkTo && (
                                      <div className="mt-5 pt-4 border-t border-slate-200">
                                        <Link
                                          to={faq.linkTo}
                                          className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline"
                                        >
                                          {faq.linkLabel || '자세히 보기'} <ArrowRight size={14} />
                                        </Link>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      
      <TutorFinderModal isOpen={isTutorFinderOpen} onClose={() => setIsTutorFinderOpen(false)} />
    </div>
  );
}
