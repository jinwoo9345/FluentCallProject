import { motion } from 'motion/react';

export default function RefundPolicy() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 p-8 sm:p-12 shadow-sm"
      >
        <h1 className="text-3xl font-bold text-slate-900 mb-8 font-display">EnglishBites 이용약관 및 환불 정책 안내</h1>
        
        <div className="prose prose-slate max-w-none space-y-10 text-slate-600 leading-relaxed">
          <p className="text-lg font-medium text-slate-800 bg-blue-50 p-6 rounded-2xl border border-blue-100">
            본 서비스는 강사와 회원을 연결하는 중개 플랫폼으로, 수업 진행 및 운영 관리가 포함된 서비스입니다. 
            서비스 이용 전 아래 내용을 반드시 확인해주시기 바랍니다.
          </p>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. 수업 이용 기본 규정</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>모든 수업은 1:1 원어민 회화로 진행됩니다.</li>
              <li>수업 시간은 25~30분이며, 강사와 협의를 통해 조정 가능합니다.</li>
              <li>수업 일정은 사전에 협의된 시간을 기준으로 진행됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">2. 결제 및 이용 횟수</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>상품 구성: 8회 / 16회(+1회) / 24회(+2회)</li>
              <li>모든 수업은 선결제 후 이용 가능합니다.</li>
              <li>친구 초대 할인 및 기타 프로모션은 조건 충족 시 적용됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">3. 환불 기준</h2>
            <p className="mb-4">환불 금액은 아래 기준에 따라 산정됩니다.</p>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-4">
              <p className="font-bold text-slate-900 text-center">환불 금액 = (결제 금액 ÷ 총 제공 횟수) × 남은 횟수</p>
            </div>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>수업이 1회도 진행되지 않은 경우:</strong> 전액 환불</li>
              <li><strong>일부 수업이 진행된 경우:</strong> 잔여 횟수 기준으로 환불</li>
            </ul>
            <div className="mt-4 p-4 text-sm bg-slate-50 rounded-xl">
              <span className="font-bold">예시)</span> 179,000원 / 8회 수업 구매 후 4회 이용 시<br />
              → 환불 금액: 179,000 ÷ 8 × 4 = 89,500원
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">4. 서비스 이용료 및 환불 제한</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>본 서비스에는 강사 매칭, 일정 조율, 운영 및 관리 비용(이하 “서비스 이용료”)이 포함되어 있습니다.</li>
              <li>전체 수업의 3/8 이상이 진행된 이후에는 서비스가 실질적으로 제공된 것으로 간주됩니다.</li>
              <li>이에 따라, <span className="text-red-600 font-bold font-sans">3/8 이상 수업 진행 후 환불 요청 시 서비스 이용료(49,000원)는 환불되지 않습니다.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">5. 프로모션 및 할인 적용 시 환불 기준</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>친구 추천 할인 및 기타 프로모션은 서비스 이용료에서 차감되는 방식으로 적용됩니다.</li>
              <li>환불 금액은 할인 적용 후 실제 결제 금액 기준으로 산정됩니다.</li>
              <li>리워드 및 프로모션으로 차감된 금액은 환불 대상에서 제외될 수 있습니다.</li>
              <li>동일 서비스에 대해 할인 혜택과 환불을 통한 이중 혜택은 제공되지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">6. 수업 취소 및 노쇼 정책</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>수업 시작 3시간 전까지 취소 시:</strong> 횟수 차감 없음</li>
              <li><strong>수업 시작 3시간 이내 취소 시:</strong> 1회 차감</li>
              <li><strong>사전 연락 없이 불참(노쇼) 시:</strong> 1회 차감</li>
              <li>반복적인 노쇼 발생 시 서비스 이용이 제한될 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">7. 환불 불가 및 제한 사유</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원의 개인 사정으로 인한 결석(노쇼)</li>
              <li>사전 협의 없이 수업에 참여하지 않은 경우</li>
              <li>이미 진행된 수업에 대한 비용</li>
              <li>단순 변심에 의한 환불 요청</li>
              <li>강사 변경 요청 이후 진행된 수업</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">8. 강사 변경 정책</h2>
            <ul className="list-disc pl-5">
              <li>수업이 맞지 않을 경우 1회 무료 강사 변경이 가능합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">9. 서비스 문제 발생 시</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>강사 사정으로 수업 진행이 불가능한 경우 전액 또는 일부 환불이 가능합니다.</li>
              <li>서비스 제공이 어려운 상황이 발생한 경우 전액 또는 일부 환불이 가능합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">10. 이용 기간</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>구매일 기준 유효기간이 적용됩니다. (예: 8회 수업 기준 2개월)</li>
              <li>유효기간 경과 시 수업은 소멸되거나 별도 정책에 따라 연장될 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">11. 환불 처리</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>환불 요청은 지정된 채널을 통해 접수해야 합니다.</li>
              <li>환불은 접수일 기준 영업일 3~7일 이내 처리됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">12. 서비스의 성격 및 책임 범위</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>본 서비스는 강사와 회원을 연결하는 중개 서비스입니다.</li>
              <li>수업은 강사와 회원 간에 진행되며, 회사는 수업 내용 자체에 대한 직접적인 책임을 지지 않습니다.</li>
              <li>단, 서비스 품질 유지를 위해 중재 및 관리 역할을 수행할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">13. 동의 및 효력</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>회원은 결제 진행 시 본 이용약관 및 환불 정책에 동의한 것으로 간주됩니다.</li>
              <li>본 정책은 관련 법령 및 소비자 보호 기준을 준수합니다.</li>
            </ul>
          </section>

          <div className="pt-12 border-t border-slate-100 flex justify-between items-center text-sm text-slate-400">
            <span>최종 수정일: 2026년 4월 17일</span>
            <span>EnglishBites 운영팀</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
