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
          본 서비스는 <strong>통신판매중개자</strong>로서 튜터와 학습자를 연결하는 플랫폼이며, 수업의 직접 제공 주체는 각 튜터입니다.
          본 환불 정책은 플랫폼 차원의 표준 가이드라인이며, 실제 환불 이행 및 책임은 튜터(판매자)와 협의하여 진행됩니다.
          서비스 이용 전 아래 내용을 반드시 확인해주시기 바랍니다.
        </p>
      )}

      <section>
        <h2 className={sectionTitle(compact)}>1. 수업 이용 기본 규정</h2>
        <ul className={listClass(compact)}>
          <li>모든 수업은 1:1 원어민 회화로 진행됩니다.</li>
          <li>수업 시간은 25~30분이며, 강사와 협의를 통해 조정 가능합니다.</li>
          <li>수업 일정은 사전에 협의된 시간을 기준으로 진행됩니다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>2. 결제 및 이용 횟수</h2>
        <ul className={listClass(compact)}>
          <li>상품 구성: 8회 / 16회(+1회) / 24회(+2회)</li>
          <li>모든 수업은 선결제 후 이용 가능합니다.</li>
          <li>친구 초대 할인 및 기타 프로모션은 조건 충족 시 적용됩니다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>3. 환불 기준</h2>
        <p className={`${paragraphClass(compact)} mb-2`}>환불 금액은 아래 기준에 따라 산정됩니다.</p>
        <div
          className={
            compact
              ? 'bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2'
              : 'bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-4'
          }
        >
          <p className={compact ? 'text-[11px] font-bold text-slate-900 text-center' : 'font-bold text-slate-900 text-center'}>
            환불 금액 = (결제 금액 ÷ 총 제공 횟수) × 남은 횟수
          </p>
        </div>
        <ul className={listClass(compact)}>
          <li><strong>수업이 1회도 진행되지 않은 경우:</strong> 전액 환불</li>
          <li><strong>일부 수업이 진행된 경우:</strong> 잔여 횟수 기준으로 환불</li>
        </ul>
        <div
          className={
            compact
              ? 'mt-2 p-2 text-[11px] bg-slate-50 rounded text-slate-600'
              : 'mt-4 p-4 text-sm bg-slate-50 rounded-xl'
          }
        >
          <span className="font-bold">예시)</span> 튜터가 설정한 수강료로 240,000원(8회)을 결제한 뒤 4회 이용한 경우<br />
          → 환불 금액: 240,000 ÷ 8 × 4 = 120,000원<br />
          <span className="text-[10px] text-slate-400">※ 실제 결제 금액은 선택한 튜터가 설정한 수강료에 따라 달라집니다.</span>
        </div>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>4. 서비스 이용료 및 환불 제한</h2>
        <ul className={listClass(compact)}>
          <li>본 서비스에는 강사 매칭, 일정 조율, 운영 및 관리 비용(이하 "서비스 이용료")이 포함되어 있습니다.</li>
          <li>전체 수업의 3/8 이상이 진행된 이후에는 서비스가 실질적으로 제공된 것으로 간주됩니다.</li>
          <li>
            이에 따라, <span className="text-red-600 font-bold">3/8 이상 수업 진행 후 환불 요청 시 서비스 이용료(49,000원)는 환불되지 않습니다.</span>
          </li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>5. 프로모션 및 할인 적용 시 환불 기준</h2>
        <ul className={listClass(compact)}>
          <li>친구 추천 할인 및 기타 프로모션은 서비스 이용료에서 차감되는 방식으로 적용됩니다.</li>
          <li>환불 금액은 할인 적용 후 실제 결제 금액 기준으로 산정됩니다.</li>
          <li>리워드 및 프로모션으로 차감된 금액은 환불 대상에서 제외될 수 있습니다.</li>
          <li>동일 서비스에 대해 할인 혜택과 환불을 통한 이중 혜택은 제공되지 않습니다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>6. 수업 취소 및 노쇼 정책</h2>
        <ul className={listClass(compact)}>
          <li><strong>수업 시작 3시간 전까지 취소 시:</strong> 횟수 차감 없음</li>
          <li><strong>수업 시작 3시간 이내 취소 시:</strong> 1회 차감</li>
          <li><strong>사전 연락 없이 불참(노쇼) 시:</strong> 1회 차감</li>
          <li>반복적인 노쇼 발생 시 서비스 이용이 제한될 수 있습니다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>7. 환불 불가 및 제한 사유</h2>
        <ul className={listClass(compact)}>
          <li>회원의 개인 사정으로 인한 결석(노쇼)</li>
          <li>사전 협의 없이 수업에 참여하지 않은 경우</li>
          <li>이미 진행된 수업에 대한 비용</li>
          <li>단순 변심에 의한 환불 요청</li>
          <li>강사 변경 요청 이후 진행된 수업</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>8. 강사 변경 정책</h2>
        <ul className={listClass(compact)}>
          <li>수업이 맞지 않을 경우 1회 무료 강사 변경이 가능합니다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>9. 서비스 문제 발생 시</h2>
        <ul className={listClass(compact)}>
          <li>강사 사정으로 수업 진행이 불가능한 경우 전액 또는 일부 환불이 가능합니다.</li>
          <li>서비스 제공이 어려운 상황이 발생한 경우 전액 또는 일부 환불이 가능합니다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>10. 이용 기간</h2>
        <ul className={listClass(compact)}>
          <li>구매일 기준 유효기간이 적용됩니다. (예: 8회 수업 기준 2개월)</li>
          <li>유효기간 경과 시 수업은 소멸되거나 별도 정책에 따라 연장될 수 있습니다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>11. 환불 처리</h2>
        <ul className={listClass(compact)}>
          <li>환불 요청은 지정된 채널을 통해 접수해야 합니다.</li>
          <li>환불은 접수일 기준 영업일 3~7일 이내 처리됩니다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>12. 서비스의 성격 및 책임 범위</h2>
        <ul className={listClass(compact)}>
          <li>본 서비스는 강사와 회원을 연결하는 중개 서비스입니다.</li>
          <li>수업은 강사와 회원 간에 진행되며, 회사는 수업 내용 자체에 대한 직접적인 책임을 지지 않습니다.</li>
          <li>단, 서비스 품질 유지를 위해 중재 및 관리 역할을 수행할 수 있습니다.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle(compact)}>13. 동의 및 효력</h2>
        <ul className={listClass(compact)}>
          <li>회원은 결제 진행 시 본 이용약관 및 환불 정책에 동의한 것으로 간주됩니다.</li>
          <li>본 정책은 관련 법령 및 소비자 보호 기준을 준수합니다.</li>
        </ul>
      </section>

      {!compact && (
        <div className="pt-12 border-t border-slate-100 flex justify-between items-center text-sm text-slate-400">
          <span>최종 수정일: 2026년 4월 17일</span>
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
          <li>리워드는 현금이 아닌, 서비스 내에서 사용 가능한 할인 크레딧 형태로 지급되며 다음 결제 시 자동 차감된다.</li>
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
