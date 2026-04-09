import { Tutor } from './types';

export const TUTOR_TIERS = {
  LEADER: 120000,
  MANAGER: 39000,
  OG: 10000,
};

export const MOCK_TUTORS: Tutor[] = [
  {
    id: 'tutor-kev',
    name: 'Kev',
    avatar: 'https://picsum.photos/seed/kev/200/200',
    rating: 5.0,
    reviewCount: 0,
    specialties: ['Business course', 'Interviewing', 'Test (TOEIC Speaking)', 'Professional English', 'Korean'],
    bio: 'Business English and test preparation expert based in Korea.',
    longBio: '안녕하세요! 한국에 거주하며 비즈니스 영어와 각종 시험 대비를 전문으로 하고 있는 Kev입니다. 10년 이상의 교육 경험을 바탕으로 실무에서 바로 활용 가능한 영어를 가르쳐 드립니다. 면접 준비부터 프레젠테이션까지, 여러분의 커리어 성장을 돕겠습니다.',
    hourlyRate: 179000,
    availability: ['월 09:00', '월 10:00', '수 15:00', '금 11:00'],
    languages: ['English (Native)', 'Korean'],
    tier: 'Leader',
    location: 'In Korea',
    reviews: []
  },
  {
    id: 'tutor-ezeter',
    name: 'Ezeter',
    avatar: 'https://picsum.photos/seed/ezeter/200/200',
    rating: 4.9,
    reviewCount: 0,
    specialties: ['Hungarian', 'Casual', 'High Level'],
    bio: 'High-level casual conversation and Hungarian language expert.',
    longBio: '일상 회화부터 고급 비즈니스 대화까지, 자연스러운 영어 구사를 목표로 하는 Ezeter입니다. 언어는 즐거워야 한다는 신념으로 지루하지 않은 수업을 약속드립니다. 헝가리어 수업도 가능하니 관심 있으신 분들은 언제든 문의주세요!',
    hourlyRate: 179000,
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
    rating: 5.0,
    reviewCount: 0,
    specialties: ['Native', 'Any level of English', 'Non Korean speaker'],
    bio: 'USA citizen, native speaker comfortable with any level of English.',
    longBio: '미국 출신 원어민 튜터 Derrick입니다. 초보자부터 상급자까지 모든 레벨의 학생들을 환영합니다. 단순히 문법을 배우는 것이 아니라, 실제 미국인들이 사용하는 생생한 표현과 문화를 함께 익힐 수 있도록 도와드리겠습니다.',
    hourlyRate: 179000,
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
    rating: 4.9,
    reviewCount: 0,
    specialties: ['Native', 'Any level of English', 'Non Korean speaker'],
    bio: 'USA citizen, native speaker comfortable with any level of English.',
    longBio: '밝고 긍정적인 에너지로 수업을 이끄는 Lexi입니다! 영어가 두려운 분들도 편안하게 대화할 수 있는 분위기를 만들어 드립니다. 저와 함께 수다 떨듯 즐겁게 공부하다 보면 어느새 영어가 자연스러워진 자신을 발견하실 거예요.',
    hourlyRate: 179000,
    availability: ['목 09:00', '금 14:00'],
    languages: ['English (Native)'],
    tier: 'Leader',
    location: 'Overseas',
    reviews: []
  },
];
