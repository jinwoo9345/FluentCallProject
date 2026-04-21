import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Gift, Users, AlertTriangle, Lightbulb, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function ReferralProgram() {
  return (
    <div className="bg-brand-cream">
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24">
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
              <Sparkles size={14} /> Referral Program
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight font-display">
              🎁 친구 추천 할인<br />프로그램 안내
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl">
              함께하면 더 즐거워지는 영어 공부. 친구와 함께 시작하고
              <strong className="text-slate-900"> 포인트 혜택</strong>까지 챙겨가세요.
            </p>
          </motion.div>
        </div>
        <div className="absolute top-20 right-0 w-96 h-96 bg-blue-200/30 blur-[120px] rounded-full -z-0" />
      </section>

      {/* 본문 */}
      <section className="pb-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* 수강료 안내 — 튜터별 맞춤 금액 */}
          <Card className="p-10 border-l-4 border-l-blue-600 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-2">수강료</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900">튜터별 맞춤 금액</span>
            </div>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              각 튜터가 자신의 경력·전공에 따라 <strong className="text-slate-700">회당 가격</strong>을 직접 설정합니다.
              최종 결제 금액은 선택한 튜터의 수강료와 수강권(8/16/24회)에 따라 달라집니다.
            </p>
          </Card>

          {/* 친구 추천 혜택 */}
          <Card className="p-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 bg-white/15 rounded-2xl flex items-center justify-center">
                  <Users size={24} />
                </div>
                <h2 className="text-2xl font-black tracking-tight">👥 친구 추천 혜택</h2>
              </div>

              <p className="text-lg leading-relaxed text-blue-50 mb-6">
                수강생이 친구를 추천하고, 해당 친구가 <strong className="text-white">실제 결제를 완료할 경우</strong>
                <br />
                <span className="text-white font-black text-xl">추천인에게 다음 달 사용 가능한 20,000 포인트</span>가 지급됩니다.
              </p>

              <div className="space-y-3 bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-white flex-shrink-0" />
                  <p className="text-sm text-blue-50">
                    <strong className="text-white">1 포인트 = 1원</strong>으로 사용 가능합니다. (20,000포인트 = 20,000원 할인)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-white flex-shrink-0" />
                  <p className="text-sm text-blue-50">
                    지급된 포인트는 다음 결제 시 자동 차감되어
                    <strong className="text-white"> 최대 20,000원까지 할인</strong>됩니다.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* 유의사항 */}
          <Card className="p-10 border-t-4 border-t-amber-400">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={22} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">⚠️ 유의사항</h2>
            </div>

            <ul className="space-y-4 text-slate-700">
              <li className="flex gap-4">
                <div className="h-2 w-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                <p className="leading-relaxed">
                  포인트는 <strong className="text-slate-900">수강을 유지하는 경우에만 사용 가능</strong>합니다.
                </p>
              </li>
              <li className="flex gap-4">
                <div className="h-2 w-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                <p className="leading-relaxed">
                  추천받은 친구는 별도의 할인 없이
                  <strong className="text-slate-900"> 선택한 튜터가 설정한 정상 수강료</strong>로 결제됩니다.
                </p>
              </li>
              <li className="flex gap-4">
                <div className="h-2 w-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                <p className="leading-relaxed">
                  단, 추천인과 친구 간 협의하여
                  <strong className="text-slate-900"> 포인트를 나누어 사용하는 것은 가능</strong>합니다.
                </p>
              </li>
            </ul>
          </Card>

          {/* 이런 분들께 추천 */}
          <Card className="p-10 bg-slate-900 text-white border-none">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 bg-blue-500/20 text-blue-300 rounded-2xl flex items-center justify-center">
                <Lightbulb size={22} />
              </div>
              <h2 className="text-2xl font-black tracking-tight">💡 이런 분들께 추천드려요</h2>
            </div>
            <p className="text-lg leading-relaxed text-slate-300">
              친구와 함께 시작하고, 꾸준히 이어가면서
              <br />
              <strong className="text-white">실질적인 비용 절감 혜택까지 챙기고 싶은 분들께 적합한 프로그램입니다.</strong>
            </p>
          </Card>

          {/* 포인트 지급 절차 */}
          <Card className="p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <Gift size={22} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">포인트 지급 절차</h2>
            </div>

            <ol className="space-y-4">
              {[
                '내 대시보드에서 개인 추천 코드를 확인하고 친구에게 공유',
                '초대받은 친구가 회원가입 후, 결제 화면에서 추천 코드를 입력',
                '친구의 결제가 완료되는 즉시 추천인 포인트가 20,000점 증가',
                '지급된 포인트는 다음 결제 시 자동으로 차감되어 할인 적용',
              ].map((text, i) => (
                <li key={i} className="flex gap-4">
                  <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-100">
                    {i + 1}
                  </div>
                  <p className="pt-1 text-slate-700 leading-relaxed">{text}</p>
                </li>
              ))}
            </ol>
          </Card>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link to="/dashboard" className="flex-1">
              <Button className="w-full py-6 rounded-2xl text-lg font-black shadow-xl gap-2">
                내 추천 코드 확인하기 <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/tutors" className="flex-1">
              <Button variant="outline" className="w-full py-6 rounded-2xl text-lg font-bold">
                튜터 둘러보기
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
