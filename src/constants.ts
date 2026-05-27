import { Tutor } from './types';

/**
 * 통일된 수강권 가격표.
 * 모든 튜터에게 동일하게 적용되며, UI에는 총 결제 금액만 노출한다.
 */
export const PACKAGE_PRICES = {
  basic: 179000,      // 8회
  standard: 329000,   // 16 + 1회
  premium: 419000,    // 24 + 2회
} as const;

export type PackageKey = 'basic' | 'standard' | 'premium';

export interface PackageInfo {
  key: PackageKey;
  label: string;
  sessions: number;
  bonus: number;
  price: number;
  /** 결제일로부터 수강권을 사용할 수 있는 최대 기간(개월). 토스 PG 심사에서 상품 구매페이지에 명시 필요. */
  durationMonths: number;
  /** 강사 일정액 지급(관리자 전용 · UI 비공개) */
  tutorPayout: number;
}

export const PACKAGES: PackageInfo[] = [
  { key: 'basic',    label: '베이직',   sessions: 8,  bonus: 0, price: PACKAGE_PRICES.basic,    durationMonths: 2, tutorPayout: 120700 },
  { key: 'standard', label: '스탠다드', sessions: 16, bonus: 1, price: PACKAGE_PRICES.standard, durationMonths: 3, tutorPayout: 221700 },
  { key: 'premium',  label: '프리미엄', sessions: 24, bonus: 2, price: PACKAGE_PRICES.premium,  durationMonths: 4, tutorPayout: 282400 },
];

/** 기본 노출용 수강권(8회). 카드·상세 모달에서 대표 금액으로 사용. */
export const DEFAULT_PACKAGE: PackageInfo = PACKAGES[0];

export const MOCK_TUTORS: Tutor[] = [
  {
    id: 'tutor-kev',
    name: 'Kev',
    avatar: 'https://picsum.photos/seed/kev/200/200',
    rating: 0.0,
    reviewCount: 0,
    specialties: ['Casual Conversation', 'Business English', 'Interviewing', 'Document Translation'],
    bio: 'For those who want to be fluent in casual convo and business english.',
    longBio: `For those who want to be fluent in casual convo and business english.

- 8+ years experience in document translation, business meeting translation.
- Former military interpreter (Korea Defense Intelligence Command)
- 990 TOEIC, AL OpiC`,
    availability: ['월 09:00', '월 10:00', '수 15:00', '금 11:00'],
    languages: ['English (Native)', 'Korean'],
    tier: 'Leader',
    location: 'In Korea',
    reviews: []
  },
  {
    id: 'tutor-esther',
    name: 'Esther',
    avatar: 'https://picsum.photos/seed/esther/200/200',
    rating: 0.0,
    reviewCount: 0,
    specialties: ['Casual', 'Basics', 'Finance', 'High Level'],
    bio: 'Do you freeze up when you have to talk to someone? I can help you.',
    longBio: `Do you freeze up when you have to talk to someone?
I can help you get through the basics, clear up the questions you might have and lift u up to the next level.
If you are looking for some more specific subjects I'm quite familiar with the world of finances.`,
    availability: ['화 10:00', '목 14:00', '토 09:00'],
    languages: ['English (Fluent)', 'Hungarian (Native)'],
    tier: 'Leader',
    location: 'In Korea',
    reviews: []
  },
  {
    id: 'tutor-derrick',
    name: 'Derrick',
    avatar: 'https://picsum.photos/seed/derrick/200/200',
    rating: 0.0,
    reviewCount: 0,
    specialties: ['Native', 'Any level of English', 'Non Korean speaker'],
    bio: 'USA citizen, native speaker comfortable with any level of English.',
    longBio: '미국 출신 원어민 튜터 Derrick입니다. 초보자부터 상급자까지 모든 레벨의 학생들을 환영합니다. 단순히 문법을 배우는 것이 아니라, 실제 미국인들이 사용하는 생생한 표현과 문화를 함께 익힐 수 있도록 도와드리겠습니다.',
    availability: ['월 18:00', '수 18:00', '금 18:00'],
    languages: ['English (Native)'],
    tier: 'Leader',
    location: 'Overseas',
    reviews: []
  },
  {
    id: 'tutor-lexi',
    name: 'Lexi',
    avatar: 'https://picsum.photos/seed/lexi/200/200',
    rating: 0.0,
    reviewCount: 0,
    specialties: ['Native', 'Any level of English', 'Non Korean speaker'],
    bio: 'USA citizen, native speaker comfortable with any level of English.',
    longBio: '밝고 긍정적인 에너지로 수업을 이끄는 Lexi입니다! 영어가 두려운 분들도 편안하게 대화할 수 있는 분위기를 만들어 드립니다. 저와 함께 수다 떨듯 즐겁게 공부하다 보면 어느새 영어가 자연스러워진 자신을 발견하실 거예요.',
    availability: ['목 09:00', '금 14:00'],
    languages: ['English (Native)'],
    tier: 'Leader',
    location: 'Overseas',
    reviews: []
  },
];
