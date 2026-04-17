import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

/**
 * 각 튜터가 경력·전문성에 따라 수강료를 자유롭게 설정하는 플랫폼(중개) 구조.
 * hourlyRate는 "회당 가격" 이며, 실제 결제 금액은
 *   hourlyRate × 패키지 수업 수 + 서비스 이용료(69,000원)
 * 로 계산됩니다.
 */
const MOCK_TUTORS = [
  {
    id: 'tutor-kev',
    name: 'Kev',
    avatar: 'https://picsum.photos/seed/kev/400/400',
    rating: 4.9,
    reviewCount: 184,
    specialties: ['Business English', 'Interview Prep', 'Document Review', 'IT / Tech English'],
    bio: '실리콘밸리 IT 기업 출신. 비즈니스 메일 작성, 영어 면접, 발표까지 실전 회화에 자신 있습니다.',
    longBio: [
      '안녕하세요! 저는 실리콘밸리의 IT 기업에서 7년간 프로덕트 매니저로 근무한 네이티브 튜터 Kev입니다.',
      '',
      '• 전공: 비즈니스 영어, 영어 면접 대비, 테크 업계 특화 커뮤니케이션',
      '• 수업 스타일: 실제 업무에서 쓰이는 표현을 중심으로, 학습자의 발화량을 최대한 끌어올리는 액티브 세션',
      '• 원하는 학생: 영어 면접·해외 근무·테크 업계 이직을 준비 중이거나, 현업에서 영어 메일·회의가 잦은 분',
      '',
      '1:1 맞춤 커리큘럼으로 첫 5회 내에 업무 영어 자신감을 확실히 끌어올려 드립니다.',
    ].join('\n'),
    hourlyRate: 30000, // 회당 가격 (8회 기준 240,000 + 서비스 이용료 69,000 = 309,000원)
    availability: ['월 09:00', '월 10:00', '수 15:00', '금 11:00', '금 20:00'],
    languages: ['English (Native)', 'Korean (Intermediate)'],
    tier: 'Premium',
    location: 'USA / 원격',
    hidden: false,
    enrollDisabled: false,
  },
  {
    id: 'tutor-esther',
    name: 'Esther',
    avatar: 'https://picsum.photos/seed/esther/400/400',
    rating: 4.8,
    reviewCount: 132,
    specialties: ['Casual Conversation', 'Beginner Friendly', 'Finance English', 'Pronunciation'],
    bio: '영어 울렁증 극복 전문. 완전 초보도 편안하게 입을 열 수 있도록 천천히, 하지만 확실히 이끌어드려요.',
    longBio: [
      '안녕하세요, 헝가리 출신 영어 튜터 Esther입니다.',
      '',
      '• 전공: 완전 초보 ~ 중급 회화, 금융 업계 영어, 발음 교정',
      '• 수업 스타일: 문장 1~2개부터 시작해 대화 량을 조금씩 늘려가는 저부담형 레슨',
      '• 추천 대상: 영어로 말하는 것 자체가 부담스러운 분, 금융권 외국인 고객 응대가 잦은 분',
      '',
      '제가 한국에 5년 거주하며 한국어도 꽤 하니, 막히는 부분은 한국어로도 설명해드립니다.',
    ].join('\n'),
    hourlyRate: 22000, // 회당 가격 (8회 176,000 + 69,000 = 245,000원)
    availability: ['화 10:00', '목 14:00', '토 09:00', '토 10:00'],
    languages: ['English (Fluent, C2)', 'Hungarian (Native)', 'Korean (Basic)'],
    tier: 'Standard',
    location: '서울 / 원격',
    hidden: false,
    enrollDisabled: false,
  },
  {
    id: 'tutor-derrick',
    name: 'Derrick',
    avatar: 'https://picsum.photos/seed/derrick/400/400',
    rating: 4.95,
    reviewCount: 267,
    specialties: ['Native Conversation', 'IELTS / TOEFL', 'Academic Writing'],
    bio: '미국 서부 거주 15년 경력 원어민 튜터. 시험 대비부터 에세이 첨삭까지 아카데믹 영어에 강합니다.',
    longBio: [
      'Hello! I\'m Derrick, a UC Berkeley graduate with 15 years of teaching experience.',
      '',
      '• 전공: IELTS 스피킹/라이팅, TOEFL 대비, 대학원 진학 에세이 첨삭',
      '• 수업 스타일: 실제 시험 레벨 문제로 감을 잡은 뒤, 학생 답변을 문장 단위로 리파인',
      '• 추천 대상: 유학 준비생, 영어 공식 시험 고득점 목표자, 대학원 admission 에세이 준비생',
      '',
      '첫 수업에 전체 레벨 진단 및 6주 맞춤 로드맵을 무료로 제공합니다.',
    ].join('\n'),
    hourlyRate: 34000, // 회당 가격 (8회 272,000 + 69,000 = 341,000원)
    availability: ['월 18:00', '수 18:00', '금 18:00', '토 10:00'],
    languages: ['English (Native, US)'],
    tier: 'Premium',
    location: 'USA California',
    hidden: false,
    enrollDisabled: false,
  },
  {
    id: 'tutor-lexi',
    name: 'Lexi',
    avatar: 'https://picsum.photos/seed/lexi/400/400',
    rating: 4.7,
    reviewCount: 89,
    specialties: ['Travel English', 'Casual Conversation', 'Fun Topics'],
    bio: '여행 영어·일상 회화 특화. 친구처럼 편하게 수다 떨면서 영어가 늘게 만들어 드립니다.',
    longBio: [
      'Hi, I\'m Lexi! 캐나다 토론토 출신, 전 세계 30개국을 여행한 프리랜서 여행 크리에이터입니다.',
      '',
      '• 전공: 여행 영어, 공항/호텔/레스토랑 상황극, 일상 프리토킹',
      '• 수업 스타일: 주제 카드 한 장을 뽑고 수다 떨듯이, 분위기는 라이트하게',
      '• 추천 대상: 해외여행·워킹홀리데이·어학연수 준비자, 가볍게 영어 회화를 유지하고 싶은 분',
      '',
      '한국 드라마와 음식 이야기를 가장 좋아해요. 수업 중 잠깐 쉬어가고 싶을 땐 저한테 오세요!',
    ].join('\n'),
    hourlyRate: 20000, // 회당 가격 (8회 160,000 + 69,000 = 229,000원)
    availability: ['목 09:00', '금 14:00', '일 20:00', '일 21:00'],
    languages: ['English (Native, Canada)', 'Spanish (Intermediate)'],
    tier: 'Standard',
    location: 'Canada Toronto',
    hidden: false,
    enrollDisabled: false,
  },
  {
    id: 'tutor-miranda',
    name: 'Miranda',
    avatar: 'https://picsum.photos/seed/miranda/400/400',
    rating: 4.85,
    reviewCount: 156,
    specialties: ['Kids English', 'Phonics', 'Parent-Child Sessions'],
    bio: '6~13세 어린이 영어 전문. 유쾌한 노래·게임·이야기로 아이가 먼저 수업을 기다리게 만듭니다.',
    longBio: [
      'Hello! 영국 출신 아동 영어 전문 튜터 Miranda입니다.',
      '',
      '• 전공: 6~13세 키즈 영어, 파닉스, 동화 낭독, 부모 코칭 세션',
      '• 수업 스타일: 캐릭터 인형·PPT 슬라이드·인터랙티브 게임을 활용해 아이가 지루해하지 않도록',
      '• 추천 대상: 초등 저·고학년 자녀의 영어 친숙도를 높이고 싶은 학부모',
      '',
      '필요 시 학부모님과 짧은 피드백 세션을 무료로 진행합니다.',
    ].join('\n'),
    hourlyRate: 25000, // 회당 가격 (8회 200,000 + 69,000 = 269,000원)
    availability: ['월 16:00', '화 16:00', '수 16:00', '토 11:00'],
    languages: ['English (Native, UK)'],
    tier: 'Standard',
    location: 'UK London',
    hidden: false,
    enrollDisabled: false,
  },
];

const app = initializeApp(firebaseConfig);
const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

async function migrate() {
  console.log('Starting migration...');
  for (const tutor of MOCK_TUTORS) {
    try {
      await setDoc(doc(db, 'tutors', tutor.id), tutor);
      console.log(`Migrated tutor: ${tutor.name} (회당 ₩${tutor.hourlyRate.toLocaleString()})`);
    } catch (error) {
      console.error(`Error migrating ${tutor.name}:`, error);
    }
  }
  console.log('Migration finished!');
  process.exit(0);
}

migrate();
