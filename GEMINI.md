# EnglishBites Project Guidelines

이 파일은 EnglishBites 프로젝트의 아키텍처, 코딩 표준 및 개발 워크플로우를 정의합니다. Gemini CLI는 이 가이드를 최우선으로 준수해야 합니다.

## 🛠 Tech Stack
- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS 4, Framer Motion
- **Routing:** React Router 7
- **Backend/DB:** Firebase (Auth, Firestore), Express (Local Dev Server)
- **Deployment:** Cloudflare Pages & Functions
- **State Management:** React Context API (Auth) + Custom Hooks
- **Payments:** Toss Payments SDK

## 📁 Project Structure
- `src/components/ui/`: 재사용 가능한 원자 단위 컴포넌트 (Button, Card 등)
- `src/components/[Feature]/`: 특정 기능 전용 컴포넌트 (Auth, Payment, Consultation 등)
- `src/pages/`: 페이지 레벨 컴포넌트 (Dashboard, Tutors 등)
- `src/services/`: Firestore 데이터 접근 및 비즈니스 로직 추상화 (tutorService, sessionService 등)
- `src/hooks/`: 서비스 로직을 컴포넌트에서 쉽게 사용하기 위한 커스텀 훅 (useTutors, useSessions)
- `src/contexts/`: React Context Providers (AuthContext)
- `src/lib/`: 유틸리티 및 공통 로직 (`cn` utility 등)
- `functions/api/`: 백엔드 API 로직 (Cloudflare Pages Functions)

## 🎨 Coding Standards

### 1. Architecture: Service-Hook Pattern
- 컴포넌트에서 Firestore SDK를 직접 호출하지 않습니다.
- 모든 데이터 요청은 `src/services/`의 전용 서비스 함수를 거쳐야 합니다.
- 컴포넌트는 `src/hooks/`에 정의된 커스텀 훅을 통해 데이터를 구독하거나 명령을 내립니다.

### 2. Role-Based Dashboard
- **Student:** `hasCompletedConsultation`이 `false`인 경우 상담 신청 폼(`ConsultationForm`)만 노출됩니다 (Hard Blocker).
- **Tutor:** 자신의 수업 가능 시간(`availability`)을 설정하고 관리할 수 있습니다.
- **Schedule Management:** `ScheduleManager` 컴포넌트를 사용하여 각 역할에 맞는 시간표 데이터를 관리합니다.

### 3. Referral & Payment System
- 친구 초대 코드로 가입한 유저가 **첫 결제**를 완료하면 초대자와 가입자 모두에게 크레딧이 보상으로 지급됩니다.
- 결제 시 `PaymentModal`에서 보유한 크레딧을 적용하여 할인을 받을 수 있습니다 (1크레딧 = 1000원 기준).

### 4. Styling (Tailwind CSS)
- 클래스 결합 시 `src/lib/utils.ts`의 `cn()` 유틸리티를 반드시 사용합니다.
- 반응형 디자인(Mobile-First)을 기본으로 합니다.

## 🚀 Commands
- `npm run dev`: 로컬 개발 서버 실행
- `npm run build`: 프로덕션 빌드
- `npx tsx scripts/migrateTutors.ts`: Mock 데이터를 Firestore로 마이그레이션

## ⚠️ Important Rules
- 새로운 데이터를 추가할 때는 반드시 `src/types.ts`에 타입을 정의하세요.
- 비동기 작업 시 적절한 로딩 상태(`Loader2` 등)와 에러 처리를 포함하세요.
- 위시리스트(찜) 기능은 Firestore의 `users` 컬렉션과 `tutors` 컬렉션을 실시간으로 연동하여 대시보드와 탐색 페이지가 동기화되도록 합니다.
