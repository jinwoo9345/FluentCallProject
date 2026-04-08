import { motion } from 'motion/react';

export default function RefundPolicy() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 p-8 sm:p-12 shadow-sm"
      >
        <h1 className="text-3xl font-bold text-slate-900 mb-8">환불 정책 및 이용 동의 안내</h1>
        
        <div className="prose prose-slate max-w-none space-y-8 text-slate-600 leading-relaxed">
          <p className="text-lg font-medium text-slate-800">
            본 서비스는 강사와 회원을 연결하는 중개 플랫폼으로, 수업 진행 및 운영 관리가 포함된 서비스입니다. 
            아래 환불 정책은 서비스 이용 전 반드시 확인하시기 바랍니다.
          </p>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. 환불 기준</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-800">① 전액 환불</h3>
                <ul className="list-disc pl-5 mt-2">
                  <li>수업이 1회도 진행되지 않은 경우 전액 환불됩니다.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-slate-800">② 부분 환불</h3>
                <ul className="list-disc pl-5 mt-2">
                  <li>수업이 일부 진행된 경우, 진행된 수업 횟수를 제외한 금액이 환불됩니다.</li>
                  <li className="text-slate-500 text-sm">(예: 8회 중 3회 진행 시 → 5회분 환불)</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">2. 매칭비 및 서비스 이용료 (환불 제한)</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>본 서비스에는 강사 매칭, 일정 조율, 운영 및 관리 비용(이하 “서비스 이용료”)이 포함되어 있습니다.</li>
              <li>전체 수업의 3/8 이상이 진행된 이후에는 해당 서비스가 실질적으로 제공된 것으로 간주됩니다. 따라서, 3/8 이상 수업 진행 후 환불 요청 시 서비스 이용료(49,000원)는 환불되지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">3. 프로모션 및 추천 할인 적용 시 환불 기준</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>본 서비스에서 제공되는 친구 추천 할인 및 기타 프로모션은 서비스 이용료(운영비)에서 차감되는 구조입니다.</li>
              <li>추천 할인 구조는 다음과 같습니다:
                <ul className="list-circle pl-5 mt-1 space-y-1">
                  <li>1명 초대 시: 다음 달 결제 리워드 20,000원 제공</li>
                  <li>3명 초대 시: 최대 3개월간 총 60,000원 상당의 리워드 제공</li>
                </ul>
              </li>
              <li>프로모션이 적용된 결제의 경우, 환불 금액은 할인 적용 후 실제 결제 금액을 기준으로 산정됩니다.</li>
              <li>또한, 리워드(프로모션)로 차감된 서비스 이용료(운영비)는 환불 대상에 포함되지 않을 수 있습니다.</li>
              <li>동일 서비스에 대해 할인 혜택과 환불을 통한 이중 혜택은 제공되지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">4. 환불 불가 및 제한 사유</h2>
            <p className="mb-2">다음의 경우 환불이 제한되거나 불가할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원의 개인 사정으로 인한 결석(노쇼)</li>
              <li>사전 협의 없이 수업에 참여하지 않은 경우</li>
              <li>이미 진행된 수업에 대한 비용</li>
              <li>단순 변심에 의한 환불 요청</li>
              <li>강사 변경 요청 이후 진행된 수업</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">5. 환불 금액 산정 기준</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>환불 금액은 정상가 기준으로 산정될 수 있습니다.</li>
              <li>할인, 이벤트, 프로모션 적용 시 환불 금액은 조정될 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">6. 환불 처리</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>환불 요청은 지정된 채널을 통해 접수해야 합니다.</li>
              <li>환불은 접수일 기준 영업일 3~7일 이내 처리됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">7. 서비스의 성격 및 책임 범위</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>본 서비스는 강사와 회원을 연결하는 중개 서비스입니다.</li>
              <li>수업은 강사와 회원 간에 진행되며, 회사는 수업 내용 자체에 대한 직접적인 책임을 지지 않습니다.</li>
              <li>단, 서비스 품질 유지를 위해 중재 및 관리 역할을 수행할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">8. 동의 및 효력</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원은 결제 진행 시 본 환불 정책 및 이용 조건에 동의한 것으로 간주됩니다.</li>
              <li>본 정책은 관련 법령 및 소비자 보호 기준을 준수합니다.</li>
            </ul>
          </section>

          <p className="text-sm text-slate-400 mt-12">
            ※ 본 정책은 서비스 운영 상황에 따라 변경될 수 있으며, 변경 시 사전 공지됩니다.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
