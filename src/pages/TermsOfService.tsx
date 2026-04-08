import { motion } from 'motion/react';

export default function TermsOfService() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 p-8 sm:p-12 shadow-sm"
      >
        <h1 className="text-3xl font-bold text-slate-900 mb-8">서비스 이용약관</h1>
        
        <div className="prose prose-slate max-w-none space-y-8 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">제1조【목적】</h2>
            <p>
              본 약관은 전화영어 중개 서비스를 운영하는 “회사”(이하 “갑”)와 서비스를 이용하는 회원(이하 “회원”) 간의 권리 및 의무를 규정함을 목적으로 한다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">제2조【서비스 내용】</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>“갑”은 회원과 영어 강사를 연결하는 중개 서비스를 제공한다.</li>
              <li>실제 수업은 강사와 회원 간에 진행되며, “갑”은 수업을 직접 제공하지 않는다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">제3조【수업 진행】</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>수업 일정 및 시간은 회원과 강사가 상호 협의하여 결정한다.</li>
              <li>회원은 정해진 시간에 성실히 수업에 참여해야 한다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">제4조【수강료 및 결제】</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>수강료는 사전에 안내된 금액을 기준으로 한다.</li>
              <li>결제 완료 후 수업이 예약 및 진행된다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">제5조【리워드 제도】</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>회원은 지인 추천을 통해 회사로부터 리워드를 받을 수 있다.</li>
              <li>리워드는 현금이 아닌, 서비스 내에서 사용 가능한 할인 크레딧 형태로 지급되며 다음 결제 시 자동 차감된다.</li>
              <li>해당 리워드는 현금으로 환급되거나 타인에게 양도할 수 없다.</li>
              <li>리워드는 추천받은 회원이 결제를 완료하고 최소 1개월 이상 서비스를 유지한 경우에 한하여 지급된다.</li>
              <li>추천 회원이 환불하거나 정상 이용 조건을 충족하지 못한 경우 리워드는 지급되지 않는다.</li>
              <li>회사는 다음과 같은 경우 이미 지급된 리워드를 회수할 수 있다.
                <ul className="list-circle pl-5 mt-2 space-y-1">
                  <li>1. 추천 회원의 환불 발생</li>
                  <li>2. 허위 또는 부정한 방법으로 추천이 이루어진 경우</li>
                  <li>3. 동일인의 중복 계정 생성이 확인된 경우</li>
                  <li>4. 기타 서비스 정책을 위반한 경우</li>
                </ul>
              </li>
              <li>지급된 리워드는 지급일로부터 3개월간 유효하며, 해당 기간 내 사용되지 않은 리워드는 자동 소멸된다.</li>
              <li>회사는 마케팅 및 운영 정책에 따라 리워드 제도의 내용, 지급 기준 및 혜택을 사전 고지 후 변경 또는 종료할 수 있다.</li>
              <li>회원은 리워드 획득을 목적으로 한 비정상적인 활동(자기 추천, 허위 계정 생성 등)을 해서는 안 되며, 적발 시 서비스 이용 제한 및 리워드 회수 등의 조치가 이루어질 수 있다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">제6조【회원의 의무】</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>회원은 타인의 수업을 방해하거나 부적절한 언행을 해서는 안 된다.</li>
              <li>강사에게 직접 결제 또는 별도 거래를 시도해서는 안 된다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">제7조【직접거래 금지】</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>회원은 “갑”을 통해 연결된 강사와 직접 거래를 할 수 없다.</li>
              <li>이를 위반할 경우 서비스 이용 제한 및 손해배상이 발생할 수 있다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">제8조【서비스 제한】</h2>
            <p className="mb-2">다음의 경우 “갑”은 서비스 이용을 제한할 수 있다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>1. 반복적인 노쇼(무단 결석)</li>
              <li>2. 강사 또는 타 회원에게 피해를 주는 행위</li>
              <li>3. 약관 위반</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">제9조【면책사항】</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>“갑”은 중개 플랫폼으로서 수업의 내용 및 결과에 대한 직접적인 책임을 지지 않는다.</li>
              <li>다만, 서비스 품질 유지를 위해 관리 및 중재를 수행할 수 있다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">제10조【약관 변경】</h2>
            <p>본 약관은 필요 시 변경될 수 있으며, 변경 시 사전 공지한다.</p>
          </section>

          <div className="pt-12 border-t border-slate-100">
            <p className="font-bold text-slate-900">부칙</p>
            <p className="text-slate-500">본 약관은 2026년 4월 8일부터 시행한다.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
