import React from 'react';

interface PolicyContentProps {
  compact?: boolean; // 결제 모달 등 작은 영역에서 축소 표시
}

const sectionTitle = (compact: boolean) =>
  compact
    ? 'text-sm font-bold text-slate-900 mb-2 mt-4 first:mt-0'
    : 'text-xl font-bold text-slate-900 mb-4';

const listClass = (compact: boolean) =>
  compact
    ? 'list-disc pl-4 space-y-1 text-[11px] text-slate-600 leading-relaxed'
    : 'list-disc pl-5 space-y-2 text-slate-600 leading-relaxed';

const paragraphClass = (compact: boolean) =>
  compact ? 'text-[11px] text-slate-600 leading-relaxed' : 'text-slate-600 leading-relaxed';

const rootClass = (compact: boolean) =>
  compact ? 'space-y-1' : 'space-y-10';

export function RefundPolicyContent({ compact = false }: PolicyContentProps) {
  return (
    <div className={rootClass(compact)}>
      {!compact && (
        <p className="text-lg font-medium text-slate-800 bg-blue-50 p-6 rounded-2xl border border-blue-100">
          본 환불 정책은 EnglishBites 수강권 결제 및 수업 이용 전반에 적용되는 표준 가이드라인입니다.
          서비스 이용 전 아래 내용을 반드시 확인해주시기 바랍니다.
        </p>
      )}

      <section>
        <h2 className={sectionTitle(compact)}>1. 수업 이용 기본 규정</h2>
        <ul className={listClass(compact)}>
          <li>모든 수업은 1:1 원어민 회화로 진행됩니다.</li>
          <li>수업 시간은 25~30분이며, 강사와 협의를 통해 조정 가능합니다.</li>
          <li>수업 일정은 사전 협의된 시간을 기준으로 진행됩니다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>2. 결제 및 상품 구성</h2>
        <ul className={listClass(compact)}>
          <li>상품 구성: 8회 / 16회(+1회) / 24회(+2회)</li>
          <li>모든 수업은 선결제 후 이용 가능합니다.</li>
          <li>프로모션, 할인, 이벤트는 별도 조건에 따라 적용될 수 있습니다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>3. 환불 정책</h2>

        <p className={`${paragraphClass(compact)} ${compact ? 'mt-1' : 'mt-2'} font-bold text-slate-800`}>
          ✅ 환불 금액 산정 방식
        </p>
        <p className={`${paragraphClass(compact)} mb-2`}>환불 금액은 아래 기준에 따라 계산됩니다.</p>
        <div
          className={
            compact
              ? 'bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2'
              : 'bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-4'
          }
        >
          <p className={compact ? 'text-[11px] font-bold text-slate-900 text-center' : 'font-bold text-slate-900 text-center'}>
            환불금 = 총 결제금액 − (정상가 기준 1회 수업료 × 이용 횟수) − 실제 발생한 결제 수수료(PG·카드 등)
          </p>
        </div>
        <ul className={listClass(compact)}>
          <li>환불 시 이용한 수업은 할인 적용 전 정상가 기준 단가로 계산됩니다.</li>
          <li>프로모션 및 이벤트 혜택이 적용된 상품은 혜택이 회수될 수 있습니다.</li>
          <li>결제 수수료에는 PG 결제 수수료, 카드 결제 수수료, 부가세(VAT) 등 실제 결제 과정에서 발생한 비용이 포함될 수 있습니다.</li>
          <li>결제 방식(카드, 간편결제, 계좌이체 등)에 따라 실제 공제 금액은 달라질 수 있습니다.</li>
        </ul>

        <p className={`${paragraphClass(compact)} ${compact ? 'mt-3' : 'mt-6'} font-bold text-slate-800`}>
          ✅ 환불 예시 (8회 상품 기준)
        </p>
        <div
          className={
            compact
              ? 'mt-2 p-2 text-[11px] bg-slate-50 rounded text-slate-600'
              : 'mt-2 p-4 text-sm bg-slate-50 rounded-xl'
          }
        >
          <p className="font-bold text-slate-800">8회 상품: 179,000원 결제</p>
          <p className="mt-1">· 정상가 기준 1회 수업료: 22,375원 (179,000원 ÷ 8회)</p>
          <p className={`${compact ? 'mt-2' : 'mt-3'} font-bold text-slate-800`}>예시) 3회 수업 후 환불 요청 시</p>
          <p className="mt-1">· 이용 수업 차감: 22,375원 × 3회 = 67,125원</p>
          <p className="mt-1">· 환불 예정 금액: 179,000원 − 67,125원 − 실제 결제 수수료 = 최종 환불 금액</p>
        </div>

        <p className={`${paragraphClass(compact)} ${compact ? 'mt-3' : 'mt-6'} font-bold text-slate-800`}>
          ✅ 세부 환불 기준
        </p>
        <p className={`${paragraphClass(compact)} ${compact ? 'mt-1' : 'mt-2'} font-bold text-slate-700`}>① 수업 시작 전</p>
        <ul className={listClass(compact)}>
          <li>실제 발생한 PG 및 카드 결제 수수료를 제외한 금액 환불 가능</li>
        </ul>
        <p className={`${paragraphClass(compact)} ${compact ? 'mt-2' : 'mt-3'} font-bold text-slate-700`}>② 수업 일부 이용 후</p>
        <ul className={listClass(compact)}>
          <li>이용한 수업은 정상가 기준 단가로 계산됩니다.</li>
          <li>사용한 수업 횟수 차감 후 잔여 금액 기준 환불됩니다.</li>
          <li>환불 가능 금액이 0원 이하일 경우 환불이 불가능할 수 있습니다.</li>
          <li>전체 수업의 70% 이상 이용 시 환불 가능 금액이 없을 수 있습니다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>4. 수업 취소 및 노쇼 정책</h2>
        <ul className={listClass(compact)}>
          <li><strong>수업 시작 3시간 전 취소:</strong> 횟수 차감 없음</li>
          <li><strong>수업 시작 3시간 이내 취소:</strong> 1회 차감</li>
          <li><strong>사전 연락 없는 불참(노쇼):</strong> 1회 차감</li>
          <li>반복적인 노쇼 발생 시 서비스 이용이 제한될 수 있습니다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>5. 강사 변경 정책</h2>
        <ul className={listClass(compact)}>
          <li>수업 진행 중 강사 변경 요청이 가능합니다.</li>
          <li>운영팀 협의 후 진행됩니다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>6. 서비스 문제 발생 시</h2>
        <p className={`${paragraphClass(compact)} mb-2`}>다음의 경우 환불 또는 보상이 제공될 수 있습니다.</p>
        <ul className={listClass(compact)}>
          <li>강사 사정으로 수업 진행이 어려운 경우</li>
          <li>운영상 문제로 정상적인 서비스 제공이 어려운 경우</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>7. 이용 기간 (서비스 제공기간)</h2>
        <ul className={listClass(compact)}>
          <li>8회 수강권: 결제일로부터 <strong>최대 2달</strong></li>
          <li>16회(+1회) 수강권: 결제일로부터 <strong>최대 3달</strong></li>
          <li>24회(+2회) 수강권: 결제일로부터 <strong>최대 4달</strong></li>
          <li>이용 기간 경과 후 미사용 수업은 자동 종료될 수 있습니다.</li>
          <li>내부 운영 정책에 따라 기간 연장이 가능할 수 있습니다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>8. 정책 목적</h2>
        <ul className={listClass(compact)}>
          <li>공정한 환불 기준 제공</li>
          <li>안정적인 수업 운영</li>
          <li>이용자와 운영자 간 분쟁 최소화</li>
        </ul>
      </section>

      {!compact && (
        <div className="pt-12 border-t border-slate-100 flex justify-between items-center text-sm text-slate-400">
          <span>최종 수정일: 2026년 5월 17일</span>
          <span>EnglishBites 운영팀</span>
        </div>
      )}
    </div>
  );
}

export function TermsContent({ compact = false }: PolicyContentProps) {
  return (
    <div className={rootClass(compact)}>
      <section>
        <h2 className={sectionTitle(compact)}>제1조【목적 및 서비스의 성격】</h2>
        <p className={paragraphClass(compact)}>
          본 약관은 영어 회화 튜터와 학습자를 연결하는 <strong>통신판매중개 서비스</strong>(이하 "서비스")를 운영하는
          "회사"(이하 "갑")와 서비스를 이용하는 회원(이하 "회원") 간의 권리 및 의무를 규정함을 목적으로 한다.
        </p>
        <p className={`${paragraphClass(compact)} mt-2`}>
          <strong>"갑"은 통신판매중개자이며, 통신판매의 당사자가 아니다.</strong>
          수강권의 상품·거래정보·가격 및 수업 내용 등에 관한 일체의 의무와 책임은 개별 튜터(판매자)에게 있으며,
          "갑"은 회원과 튜터 간의 분쟁 발생 시 신의성실하게 조정·중재한다.
        </p>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>제2조【서비스 내용】</h2>
        <ul className={listClass(compact)}>
          <li>"갑"은 회원과 영어 강사를 연결하는 중개 서비스를 제공한다.</li>
          <li>실제 수업은 강사와 회원 간에 진행되며, "갑"은 수업을 직접 제공하지 않는다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>제3조【수업 진행】</h2>
        <ul className={listClass(compact)}>
          <li>수업 일정 및 시간은 회원과 강사가 상호 협의하여 결정한다.</li>
          <li>회원은 정해진 시간에 성실히 수업에 참여해야 한다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>제4조【수강료 및 결제】</h2>
        <ul className={listClass(compact)}>
          <li>수강료는 사전에 안내된 금액을 기준으로 한다.</li>
          <li>결제 완료 후 수업이 예약 및 진행된다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>제5조【리워드 제도】</h2>
        <ul className={listClass(compact)}>
          <li>회원은 지인 추천을 통해 회사로부터 리워드를 받을 수 있다.</li>
          <li>리워드는 현금이 아닌, 서비스 내에서 사용 가능한 할인 포인트(1 포인트 = 1원) 형태로 지급되며 다음 결제 시 자동 차감된다.</li>
          <li>해당 리워드는 현금으로 환급되거나 타인에게 양도할 수 없다.</li>
          <li>리워드는 추천받은 회원이 결제를 완료하고 최소 1개월 이상 서비스를 유지한 경우에 한하여 지급된다.</li>
          <li>추천 회원이 환불하거나 정상 이용 조건을 충족하지 못한 경우 리워드는 지급되지 않는다.</li>
          <li>
            회사는 다음과 같은 경우 이미 지급된 리워드를 회수할 수 있다.
            <ul className={compact ? 'list-[circle] pl-4 mt-1 space-y-0.5' : 'list-[circle] pl-5 mt-2 space-y-1'}>
              <li>추천 회원의 환불 발생</li>
              <li>허위 또는 부정한 방법으로 추천이 이루어진 경우</li>
              <li>동일인의 중복 계정 생성이 확인된 경우</li>
              <li>기타 서비스 정책을 위반한 경우</li>
            </ul>
          </li>
          <li>지급된 리워드는 지급일로부터 3개월간 유효하며, 해당 기간 내 사용되지 않은 리워드는 자동 소멸된다.</li>
          <li>회사는 마케팅 및 운영 정책에 따라 리워드 제도의 내용, 지급 기준 및 혜택을 사전 고지 후 변경 또는 종료할 수 있다.</li>
          <li>회원은 리워드 획득을 목적으로 한 비정상적인 활동(자기 추천, 허위 계정 생성 등)을 해서는 안 되며, 적발 시 서비스 이용 제한 및 리워드 회수 등의 조치가 이루어질 수 있다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>제6조【회원의 의무】</h2>
        <ul className={listClass(compact)}>
          <li>회원은 타인의 수업을 방해하거나 부적절한 언행을 해서는 안 된다.</li>
          <li>강사에게 직접 결제 또는 별도 거래를 시도해서는 안 된다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>제7조【직접거래 금지】</h2>
        <ul className={listClass(compact)}>
          <li>회원은 "갑"을 통해 연결된 강사와 직접 거래를 할 수 없다.</li>
          <li>이를 위반할 경우 서비스 이용 제한 및 손해배상이 발생할 수 있다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>제8조【서비스 제한】</h2>
        <p className={`${paragraphClass(compact)} mb-1`}>다음의 경우 "갑"은 서비스 이용을 제한할 수 있다.</p>
        <ul className={listClass(compact)}>
          <li>반복적인 노쇼(무단 결석)</li>
          <li>강사 또는 타 회원에게 피해를 주는 행위</li>
          <li>약관 위반</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>제9조【면책사항】</h2>
        <ul className={listClass(compact)}>
          <li>"갑"은 중개 플랫폼으로서 수업의 내용 및 결과에 대한 직접적인 책임을 지지 않는다.</li>
          <li>다만, 서비스 품질 유지를 위해 관리 및 중재를 수행할 수 있다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>제10조【약관 변경】</h2>
        <p className={paragraphClass(compact)}>본 약관은 필요 시 변경될 수 있으며, 변경 시 사전 공지한다.</p>
      </section>

      {!compact && (
        <div className="pt-12 border-t border-slate-100">
          <p className="font-bold text-slate-900">부칙</p>
          <p className="text-slate-500">본 약관은 2026년 4월 8일부터 시행한다.</p>
        </div>
      )}
    </div>
  );
}
