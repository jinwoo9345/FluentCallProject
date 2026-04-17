# EnglishBites Project Guide & Full Feature Specification

이 문서는 EnglishBites 프로젝트의 기술 스택, 아키텍처, 그리고 현재 구현된 **모든 세부 기능**을 정의합니다. 모든 AI 에이전트 및 협업자는 작업 시 이 명세서를 최우선 참조합니다.

최종 갱신: 2026-04-17 · main 브랜치 기준.

---

## 🛠 1. Tech Stack

- **Frontend:** React 19, TypeScript, Vite, React Router 7
- **Styling:** Tailwind CSS 4, Framer Motion (애니메이션), Lucide React (아이콘)
- **Backend / DB:** Firebase (Auth, Firestore), Cloudflare Pages Functions
- **Integrations:** EmailJS (상담 알림 발송), Toss Payments SDK (결제), Kakao JS SDK (로그인·공유)
- **Deployment:** Cloudflare Pages (프론트 + Functions), Firebase (Firestore)
- **CI/CD:** GitHub Actions — `firestore.rules` 변경 시 `main` push에서 자동 배포 (`.github/workflows/firebase-rules-deploy.yml`)

---

## 🎨 2. Coding Standards & Architecture

### 2.1 Service-Hook Pattern

- **Services (`src/services/`):** Firestore 직접 접근 및 외부 API 호출 로직을 집약.
  - `sessionService`, `tutorService`, `paymentService`
- **Hooks (`src/hooks/`):** 서비스를 컴포넌트에서 사용하기 쉽게 추상화 + 상태 관리.
  - `useSessions`, `useTutors`
- **Rules:** 컴포넌트 내부에서 Firebase SDK(`getDocs`, `addDoc` 등)를 직접 호출하지 않는 것을 원칙으로 한다. 단, 관리자 페이지처럼 앱 전역 서비스로 뽑기 애매한 대시보드형 화면은 예외적으로 컴포넌트에서 직접 사용.

### 2.2 Role-Based Access Control (RBAC)

- `users` 컬렉션의 `role` 필드 (`student` / `tutor` / `admin`)에 따라 페이지 접근 및 UI 노출을 제어.
- **Hard Blocker:** `role === 'student'` 이고 `hasCompletedConsultation: false`인 유저가 `/dashboard` 진입 시 상담 신청 폼만 노출.
- **관리자 전용 라우트:** `/admin` (권한이 없으면 차단 화면 노출).

### 2.3 데이터 타입 규칙

- **`src/types.ts`** 인터페이스를 엄격히 준수.
  - `User.uid`는 Firestore 문서 ID와 동일한 값.
  - 카카오 로그인 유저의 UID 포맷: `kakao:{카카오고유번호}` (예: `kakao:1234567890`).
  - 이메일/구글 로그인은 Firebase가 부여하는 랜덤 UID.

### 2.4 Firestore 보안 모델 (`firestore.rules`)

- **users**: 본인 또는 admin만 읽기 가능. 본인·admin은 전체 수정 가능, 타인 문서는 **credits 필드만** 수정 허용 (포인트 선물용).
- **consultations**: 생성은 누구나, 조회는 본인 또는 admin, 업데이트는 본인·admin·신규 linking 상황(카카오 로그인 후 userId 붙이기).
- **payments**: 본인·admin 조회, 생성은 본인 uid로만, 업데이트는 본인·admin.
- **point_transfers**: 생성자가 fromId 본인일 때만 create, 본인이 관련된 거래만 조회.
- **tutors**: 누구나 읽기, 쓰기는 admin만.
- **sessions**: 참여자(userId/tutorId) 또는 admin만 조회, 목록 list는 admin.

### 2.5 배포 파이프라인

- **프론트·Functions:** `main` 브랜치 push → Cloudflare Pages 자동 배포.
- **Firestore Rules:** `firestore.rules` 변경 포함 push → GitHub Actions가 `firebase deploy --only firestore:rules` 실행.

---

## 📝 3. 상세 기능 명세 (Detailed Feature Specification)

### 3.1 인증 및 가입 시스템 (Auth & Onboarding)

- **카카오 간편 로그인:** Cloudflare Functions (`/api/auth/kakao`)가 카카오 token 교환 후 Firebase **Custom Token** 발급 → 클라이언트가 `signInWithCustomToken`.
  - 요청 scope: `profile_nickname` (프로필 이미지 / 이메일 scope는 **사용하지 않음**).
  - 닉네임은 재로그인 시마다 Firestore `users.name`에 최신값으로 갱신 (단, 수동으로 변경한 이름은 덮어쓰지 않도록 예외 처리).
  - 아바타는 카카오 프로필 사진을 사용하지 않고, `https://picsum.photos/seed/{uid}` 기본 이미지를 저장.
- **구글 로그인:** `signInWithPopup`. 신규 가입 시 프로필 이미지는 사용하지 않고 기본 picsum 이미지를 저장.
- **이메일 회원가입:** `createUserWithEmailAndPassword` + `updateProfile(displayName)`.
- **가입 정책:**
  - **초기 크레딧 = 0** (모든 가입 경로 공통).
  - **추천 코드:** 6자리 고유 `referralCode`를 자동 생성. 친구 초대를 통해서만 크레딧을 획득 가능.
  - **referredBy 필드는 가입 시 비워둠.** 추천 코드는 결제 시점에 `payments.referredBy`에 저장.

### 3.2 상담 신청 시스템 (Consultation)

#### 3.2.1 TutorFinderModal — "지금 시작하기" (8단계 설문)

| Step | 항목 | 선택 방식 | 주요 옵션 |
|---|---|---|---|
| 1 | **공부 목적** | 다중 | 일상 회화 · 비즈니스 영어 · 여행 준비 · 시험 대비(IELTS/TOEFL/TOEIC/OPIc) · 발음 교정 · 면접 준비 · 유학 준비 · 자녀 교육 · 취미 |
| 2 | **수강 기간** | 단일 | 1개월 이내 / 1~3개월 / 3~6개월 / 6개월 이상 / 무기한 |
| 3 | **회화 레벨** | 단일 | 왕초보 / 초급 / 중급 / 중상급 / 고급 |
| 4 | **수업 스타일** | 다중 | 프리토킹, 토론, 교재중심, 역할극, 발음 교정, 문법 중심, 비즈니스 상황극, 편안한 대화, 엄격 피드백 |
| 5 | **친구 동행** | 단일 | 혼자 / 친구와 함께 / 고민 중 — 추천인 혜택 안내 |
| 6 | **상담 가능 시간** | 단일 + 세부 메모 | 평일/주말 × 오전/오후/저녁 또는 언제든, 세부 시간대 freeform |
| 7 | **성함 + 연락처** | 이름 + 카카오톡/전화/디스코드 선택 + 값 | — |
| 8 | **기타 자유 입력** | textarea (선택) | Q&A·상세 상황·요청사항 |

- 제출 시 `consultations` 컬렉션에 `status: 'pending'`, `userId` (로그인 상태일 경우)와 함께 저장.
- 로그인 상태라면 `users.hasCompletedConsultation`을 true로 세팅.
- **EmailJS 연동:** 신청 즉시 관리자 메일로 요약 + 상세 항목 발송.
- 비로그인 상태로 제출 시 `pendingConsultationId`를 localStorage에 저장했다가 로그인 후 자동으로 `consultations/{id}.userId`에 링크.

#### 3.2.2 ConsultationForm / ConsultationModal (레거시 진입점)

- 간단 버전 폼(이름/연락수단/상담시간/학습목표). Dashboard의 Hard Blocker 화면과 일반 문의 모달에서 사용. 동일하게 `status: 'pending'` + `userId`로 저장.

### 3.3 강사 탐색 및 관리 (Tutor Management)

- **강사 프로필:** 이름, 아바타, 지역, 시간당 수강료(`hourlyRate`), 전문 분야(`specialties[]`), 언어(`languages[]`), 한줄/상세 소개(`bio`, `longBio`), 가용 시간(`availability[]`), 티어(`tier`).
- **/tutors 페이지:** 이름/전문 분야 검색, 필터 사이드바, 카드 리스트 + 상세 모달.
- **숨김 처리:** `tutors.hidden === true`인 튜터는 `tutorService.getAllTutors()`에서 자동 제외 → 공개 리스트에 노출되지 않음. (관리자 페이지에서만 확인·편집 가능)
- **위시리스트 (Wishlist):** `users.wishlist[]`와 하트 버튼으로 동기화. Dashboard 사이드에서 별도 표시.

### 3.4 결제 시스템 (Payment)

#### 3.4.1 결제 플로우

1. `/tutors` → 튜터 카드의 "등록하기" 클릭 → **PaymentModal** 오픈.
2. 옵션 설정 — 보유 크레딧 전액 사용 / 추천인 코드 입력.
3. 약관 동의 체크 → `requestPayment('카드', ...)` 호출.
4. `/payment/success` 또는 `/payment/fail`로 리다이렉트.
5. `/payment/success`:
   - `/api/payments/confirm` 호출 (Toss Secret Key, 금액 검증 포함).
   - 성공 시 `payments/{orderId}` 문서를 `completed`로 업데이트(기존 pending 문서에 merge).
   - 입력된 `referredBy`가 있다면 `paymentService.handleReferralReward`로 추천인에게 포인트 지급.
6. `/payment/fail`: 해당 `orderId` 문서를 `cancelled`로 업데이트.

#### 3.4.2 가격 정책

- **기본 수강료:** 월 **179,000원** (주 2회 · 회당 25~30분 · 월 8회 기준).
- **패키지 구성:** 8회 / 16회(+1) / 24회(+2).
- **크레딧 가치:** 1 포인트 = 1,000원. 결제 시 전액 사용 가능.

#### 3.4.3 환불 규정 (`RefundPolicyContent` 전문)

- 수업 시작 전 → 100% 전액 환불.
- 일부 수업 진행 후 → `결제금액 ÷ 총 횟수 × 남은 횟수`.
- **3/8 이상 진행 시 서비스 이용료 49,000원은 환불되지 않음.**
- 수업 취소 3시간 전 초과 시 횟수 차감, 노쇼 1회 차감.
- 결제 모달 내 **환불정책 전문 + 이용약관 전문**이 각각 독립 스크롤 박스로 표시됨. 외부 탭 링크(`/refund-policy`, `/terms-of-service`)도 제공.

### 3.5 크레딧 & 포인트 선물 시스템

#### 3.5.1 크레딧 획득 경로 (유일하게 **추천인 보상**만 허용)

- 내 추천 코드를 공유 → 친구가 결제 화면에서 해당 코드를 입력하고 결제를 완료 → 내 계정에 **20 포인트(=20,000원)** 즉시 지급.
- **결제자 본인은 크레딧을 받지 않음** (자동 적립 정책 제거).
- **본인 코드 자체 사용 금지** — `payerUserId === referrerId`일 경우 지급하지 않음.

#### 3.5.2 포인트 선물 (PointTransferModal)

- 받는 분 **이메일 또는 추천 코드**로 수신자 검색 (카카오 로그인 유저는 이메일이 없으므로 **추천 코드로 검색** 필수).
- Firestore `runTransaction`으로 송금자·수신자 잔액을 동시에 읽고 업데이트 → race condition 방지.
- 이체 내역은 `point_transfers` 컬렉션에 `transaction.set()`으로 함께 기록.
- 본인에게는 전송 불가, 정수 단위만 허용.

#### 3.5.3 `/referral` 페이지 (친구 추천 프로그램 상세)

- 홈 Pricing 섹션의 "프로그램 자세히 보기" 버튼 → `/referral` 라우트.
- 섹션 구성: 기본 수강료 179,000원 · 👥 친구 추천 혜택 · ⚠️ 유의사항 · 💡 이런 분들께 추천 · 포인트 지급 절차 · CTA(내 추천 코드 확인 / 튜터 둘러보기).

### 3.6 스케줄링 및 대시보드 (Student Dashboard)

- **카카오톡 공유:** `shareReferralCode()` — 자신의 추천 코드를 카카오톡 피드 메시지로 즉시 전송.
- **탭 시스템:** 수업 일정 / 결제 내역 / 상담 내역 3개 탭. 결제 내역은 **`status === 'completed'`만 노출**.
- **세션 관리:** `upcoming`, `completed`, `cancelled` 상태 (`sessionService.subscribeToSessions`로 실시간 구독).
- **내 정보 카드 (사이드바 최상단):** 아바타·이름·이메일·역할·추천코드·상담완료 여부 한눈에 표시, "프로필 수정" 진입.
- **ProfileEditModal (프로필 수정):** 이름, 이메일, 아바타 URL 편집. UID / 역할 / 추천 코드 / 크레딧은 읽기 전용 표시.
- **ScheduleManager:** 학생은 `users.studentAvailability[]`, 튜터는 `users.availability[]` + `tutors.{uid}.availability[]` 동시 동기화.

### 3.7 관리자 대시보드 (Admin Dashboard)

#### 3.7.1 접근

- `/admin` 라우트. `user.role === 'admin'`이 아니면 차단.

#### 3.7.2 탭 구성

1. **현황판 (Overview)**
   - KPI 카드: 전체 유저 수 / 누적 매출(completed 결제 합산) / 예정된 수업 수 / 대기 중 상담 수.
   - 최근 상담 신청(대기 중) 5건 목록 + **상세보기 버튼**.
   - 시스템 현황 사이드(Firestore 상태, 가입자 수, 튜터 수).

2. **상담 내역**
   - 전체 상담 테이블 (신청자·연락처·신청시간·희망시간·상태·액션).
   - **상세보기 모달:** 공부 목적(배열) / 수강 기간 / 회화 레벨 / 수업 스타일(배열) / 친구 동행 / 상담 가능 시간 / 구체적 목표 / 학습 동기 / 기타 메모 — 빈 값은 자동 숨김, 배열은 태그 형태, 원본 JSON 펼쳐보기 지원.
   - 상태 토글: "완료 처리" ↔ "대기로 변경".

3. **결제 관리**
   - 전체 결제 테이블 (ID / 결제자 / 상품명 / 금액 / 포인트 사용 / 일시 / 상태).
   - 상태 뱃지: completed / failed / cancelled / pending.

4. **유저 관리**
   - 이름·이메일·추천코드 검색.
   - 각 유저 row에 **+ 지급 / − 회수 / 0으로 초기화 / 상세보기** 버튼.
   - **상세보기 모달:** 아바타, 역할, 크레딧, 추천 코드, 추천받은 코드, 상담 완료 여부, 가입일, wishlist, availability, UID, 원본 JSON.
   - 헤더 우측: **전체 크레딧 회수** (모든 유저 `credits: 0` 일괄, 500개 chunk batch).

5. **강사 관리**
   - 튜터 카드 그리드. 숨김 상태 배지 표시.
   - **정보 수정 모달:** 이름 · 지역 · 시간당 수강료 · 티어 · 전공(쉼표 입력) · 언어(쉼표 입력) · 한줄/상세 소개 · 아바타 URL.
   - **숨기기 / 숨김 해제** 토글 (tutors.hidden).

#### 3.7.3 데이터 fetch 정책

- 각 컬렉션 fetch는 **개별 try/catch**로 감싸서 한 컬렉션이 실패해도 나머지는 동작.
- 시간 표시는 `formatTS()` 헬퍼로 Firestore Timestamp / Date / 문자열 어떤 형식이든 안전 포맷.

### 3.8 라우팅 & 페이지 구조

| 경로 | 컴포넌트 | 권한 | 비고 |
|---|---|---|---|
| `/` | `Home` | public | 히어로, Pricing, FAQ |
| `/tutors` | `Tutors` | public | 검색·필터·결제 진입점 |
| `/dashboard` | `Dashboard` | 로그인 필요 | 학생 Hard Blocker 상담 포함 |
| `/admin` | `AdminDashboard` | admin만 | 5탭 관리자 페이지 |
| `/referral` | `ReferralProgram` | public | 친구 추천 상세 |
| `/refund-policy` | `RefundPolicy` | public | 환불 정책 전문 |
| `/terms-of-service` | `TermsOfService` | public | 이용약관 전문 |
| `/payment/success` | `PaymentSuccess` | 로그인 필요 | Toss 승인·보상 처리 |
| `/payment/fail` | `PaymentFail` | public | orderId 있으면 `cancelled` 마킹 |

### 3.9 정책 콘텐츠 공용화

- `src/components/policy/PolicyContents.tsx`
  - `<RefundPolicyContent compact />` — 환불 정책 전문.
  - `<TermsContent compact />` — 이용약관 전문.
  - `compact` prop으로 결제 모달 내 축소 표시 지원.
- `/refund-policy`, `/terms-of-service` 페이지 + `PaymentModal`이 모두 이 컴포넌트를 공유.

### 3.10 홈 FAQ

- 질문 6개 (친구 추천 혜택 / 추천받은 친구 혜택 / 상담 절차 / 수업 진행 / 환불 / 결제·수강권 구성).
- 각 항목 UI: **Q/A 배지** · 짧은 핵심 답변 한 줄 · "상세 설명 보기" 토글로 상세 JSX · 관련 정책 페이지로 이동 링크.

---

## 🔐 4. Firestore Rules 핵심 규칙

```
users       : 본인/admin read, 본인/admin 전체 write, 타인은 credits만 업데이트 허용
consultations: public create, 본인/admin read, 본인/admin + linking 상황 update
payments    : 본인/admin read·list, 본인 uid로 create, 본인/admin update
point_transfers: 본인 fromId로 create, 본인(fromId·toId)/admin read
tutors      : public read, admin write
sessions    : 참여자/admin read, admin list, 로그인 write
```

`firestore.rules` 수정 후 `main` push 시 GitHub Actions가 자동 배포합니다.

---

## 🚀 5. 운영 및 개발 명령어

| 목적 | 명령어 |
|---|---|
| 로컬 개발 서버 (Functions 시뮬레이션 포함) | `npm run dev` |
| 프로덕션 빌드 | `npm run build` |
| 타입 체크 | `npm run lint` (`tsc --noEmit`) |
| 강사 시드 데이터 | `npx tsx scripts/migrateTutors.ts` |
| Firestore 규칙 수동 배포 | `npx firebase deploy --only firestore:rules` |

---

## ⚠️ 6. 주의 사항 및 핵심 규칙

- **데이터 타입:** 모든 객체는 `src/types.ts`의 인터페이스를 엄격히 준수. `User.uid`는 Firestore 문서 ID와 일치.
- **가입 보너스 없음:** 신규 가입 시 크레딧 기본 지급 금지. 오직 추천인 보상으로만 지급.
- **추천인 보상:** 결제자 본인이 아닌 **추천인(초대한 사람)에게만** 20 포인트 지급.
- **에러 핸들링:** 외부 API(Toss, Kakao, EmailJS, Firestore) 호출은 실패 시 사용자에게 명확한 사유 안내.
- **반응형 디자인:** 모바일 최우선(Mobile-First) 원칙, Tailwind 유틸리티 활용.
- **민감 정보:** `.env`는 `.gitignore`에 포함되어 깃에 올라가지 않음. `FIREBASE_PRIVATE_KEY`, `TOSS_SECRET_KEY` 등은 Cloudflare/Firebase 환경변수에서만 관리.
- **관리자 지정:** Firebase Console에서 대상 `users/{uid}.role = "admin"`으로 수동 설정.
- **destructive 액션:** 관리자의 전체 크레딧 회수, 튜터 숨기기, 강사 삭제 등은 복구가 어렵거나 사용자 경험에 영향을 주므로 `window.confirm`으로 한 번 더 확인.

---

## 📚 7. 주요 디렉토리 지도

```
src/
├── App.tsx                 라우팅, 카카오 OAuth 콜백 처리
├── contexts/AuthContext.tsx   Firebase Auth + Firestore 사용자 프로필 구독
├── components/
│   ├── Auth/               AuthModal (카카오/구글/이메일)
│   ├── Consultation/       ConsultationModal, ConsultationForm, TutorFinderModal (8단계)
│   ├── Dashboard/          ScheduleManager, ProfileEditModal
│   ├── Payment/            PaymentModal (추천인 코드 입력), PointTransferModal (이메일/추천코드 검색)
│   ├── Tutors/             TutorDetailModal
│   ├── layout/             Navbar, Footer
│   ├── policy/             PolicyContents (RefundPolicyContent, TermsContent)
│   └── ui/                 Button, Card, Logo
├── hooks/                  useSessions, useTutors
├── services/               paymentService, sessionService, tutorService
├── lib/                    firestore-errors, kakao, utils
├── pages/                  Home, Tutors, Dashboard, AdminDashboard,
│                           ReferralProgram, RefundPolicy, TermsOfService,
│                           PaymentSuccess, PaymentFail
└── types.ts                User, Tutor, Session, Consultation, Review, UserRole

functions/api/
├── auth/kakao.ts           카카오 token 교환 + Firebase Custom Token 발급
├── payments/confirm.ts     Toss 결제 승인 + 금액 일치 검증
└── config.ts               클라이언트용 공개 환경변수 전달

firestore.rules             역할 기반 보안 규칙
.github/workflows/firebase-rules-deploy.yml   rules 자동 배포
```
