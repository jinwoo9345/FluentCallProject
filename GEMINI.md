# EnglishBites Project Guide & Full Feature Specification

이 문서는 EnglishBites 프로젝트의 기술 스택, 아키텍처, 그리고 현재 구현된 **모든 세부 기능**을 정의합니다. Gemini CLI는 모든 작업 시 이 명세서를 최우선 참조해야 합니다.

---

## 🛠 1. Tech Stack
- **Frontend:** React 19, TypeScript, Vite, React Router 7
- **Styling:** Tailwind CSS 4, Framer Motion (애니메이션), Lucide React (아이콘)
- **Backend/DB:** Firebase (Auth, Firestore), Cloudflare Pages Functions
- **Infrastructure:** EmailJS (상담 알림 발송), Toss Payments SDK (결제)
- **Deployment:** Cloudflare Pages

---

## 🎨 2. Coding Standards & Architecture

### 2.1 Service-Hook Pattern
- **Services (`src/services/`):** Firestore 직접 접근 및 외부 API 호출 로직 집약.
- **Hooks (`src/hooks/`):** 서비스를 컴포넌트에서 사용하기 쉽게 추상화하고 상태 관리.
- **Rules:** 컴포넌트 내부에서 `collection()`, `getDocs()` 등 Firebase SDK 함수를 직접 호출하지 않음.

### 2.2 Role-Based Access Control (RBAC)
- `users` 컬렉션의 `role` 필드 (`student`, `tutor`, `admin`)에 따라 페이지 접근 및 UI 노출 제어.
- **Hard Blocker:** 학생 유저 중 `hasCompletedConsultation: false`인 유저는 대시보드 진입 시 상담 신청 폼만 노출됨.

---

## 📝 3. 상세 기능 명세 (Detailed Feature Specification)

### 3.1 인증 및 가입 시스템 (Auth & Onboarding)
- **카카오 간편 로그인:** Cloudflare Functions를 통한 토큰 검증 및 Firebase Auth 연동.
- **가입 정책:**
  - **초기 크레딧 0원:** 신규 가입 시 기본 지급되는 크레딧은 없습니다.
  - **추천 시스템:** 6자리 고유 `referralCode`가 생성되며, 오직 친구 초대를 통해서만 크레딧을 획득할 수 있습니다.

### 3.2 상담 신청 시스템 (Consultation)
- **입력 항목:** 성함, 연락 수단(카카오톡/디스코드/전화번호), 상세 연락처, 상담 가능 시간, 학습 목표/특이사항.
- **EmailJS 연동:** 상담 신청 즉시 지정된 관리자 메일로 신청 상세 내용 알림 발송.
- **상태 업데이트:** 신청 완료 시 `users.hasCompletedConsultation`을 `true`로 변경하여 서비스 잠금 해제.

### 3.3 강사 탐색 및 관리 (Tutor Management)
- **강사 프로필:** 실시간 요금(hourlyRate), 전문 분야(specialties), 소개글(bio, longBio), 리뷰 목록, 사용 가능 언어 표시.
- **위시리스트 (Wishlist):** 유저 문서의 `wishlist` 배열과 연동하여 대시보드와 동기화.

### 3.4 결제 및 크레딧 시스템 (Payment & Credits)
- **토스페이먼츠 통합:** 카드 결제창 호출 및 `/api/payments/confirm`을 통한 최종 승인 처리.
- **고정 수강료:** 기본 8회 기준 **179,000원**으로 단일화.
- **상세 환불 규정:**
  - 수업 시작 전: 100% 전액 환불.
  - 수업 시작 후: 진행 횟수 제외 후 잔여 횟수만큼 환불 (공식: `결제금액 ÷ 총횟수 × 남은횟수`).
  - **운영비 공제:** 전체 수업의 **3/8 이상**이 진행된 후 환불 요청 시, 서비스 이용료(**49,000원**)는 환불되지 않음.
- **크레딧 획득:** 친구 한 명 초대 시 10,000원 상당의 크레딧 지급 (초대 무제한).
- **결제 내역 조회:** 대시보드 내 '결제 내역' 탭에서 과거 결제 기록을 실시간으로 확인 가능.

### 3.5 스케줄링 및 대시보드 (Scheduling)
- **카카오톡 공유:** 자신의 초대 코드를 카카오톡 메시지로 즉시 전송하는 공유 유틸리티(`src/lib/kakao.ts`) 연동.
- **내역 통합 관리:** [수업 일정 / 결제 내역 / 상담 내역] 탭 시스템을 통해 모든 활동 데이터를 한눈에 파악 가능.
- **세션 관리:** `upcoming`, `completed`, `cancelled` 상태를 가진 수업 데이터 관리.

---

## 🚀 4. 운영 및 개발 명령어
- `npm run dev`: 로컬 개발 서버 및 Cloudflare Functions 시뮬레이션.
- `npm run build`: 프로덕션 빌드.
- `npx tsx scripts/migrateTutors.ts`: 강사 데이터 초기화 스크립트 실행.

---

## ⚠️ 5. 주의 사항 및 핵심 규칙
- **데이터 타입:** 모든 객체는 `src/types.ts`의 인터페이스를 엄격히 준수할 것.
- **에러 핸들링:** 사용자 경험을 위해 에러 발생 시 명확한 사유를 알릴 것.
- **반응형 디자인:** 모바일 최우선(Mobile-First) 원칙을 지키며 Tailwind CSS 클래스를 구성할 것.
