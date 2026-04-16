import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 직접 파일 읽기
const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Mock 데이터도 직접 정의 (경로 이슈 방지)
const MOCK_TUTORS = [
  {
    id: 'tutor-kev',
    name: 'Kev',
    avatar: 'https://picsum.photos/seed/kev/200/200',
    rating: 0.0,
    reviewCount: 0,
    specialties: ['Casual Conversation', 'Business English', 'Interviewing', 'Document Translation'],
    bio: 'For those who want to be fluent in casual convo and business english.',
    hourlyRate: 179000,
    availability: ['월 09:00', '월 10:00', '수 15:00', '금 11:00'],
    languages: ['English (Native)', 'Korean'],
    tier: 'Leader',
    location: 'In Korea',
  },
  {
    id: 'tutor-esther',
    name: 'Esther',
    avatar: 'https://picsum.photos/seed/esther/200/200',
    rating: 0.0,
    reviewCount: 0,
    specialties: ['Casual', 'Basics', 'Finance', 'High Level'],
    bio: 'Do you freeze up when you have to talk to someone? I can help you.',
    hourlyRate: 179000,
    availability: ['화 10:00', '목 14:00', '토 09:00'],
    languages: ['English (Fluent)', 'Hungarian (Native)'],
    tier: 'Leader',
    location: 'In Korea',
  },
  {
    id: 'tutor-derrick',
    name: 'Derrick',
    avatar: 'https://picsum.photos/seed/derrick/200/200',
    rating: 0.0,
    reviewCount: 0,
    specialties: ['Native', 'Any level of English', 'Non Korean speaker'],
    bio: 'USA citizen, native speaker comfortable with any level of English.',
    hourlyRate: 179000,
    availability: ['월 18:00', '수 18:00', '금 18:00'],
    languages: ['English (Native)'],
    tier: 'Leader',
    location: 'Overseas',
  },
  {
    id: 'tutor-lexi',
    name: 'Lexi',
    avatar: 'https://picsum.photos/seed/lexi/200/200',
    rating: 0.0,
    reviewCount: 0,
    specialties: ['Native', 'Any level of English', 'Non Korean speaker'],
    bio: 'USA citizen, native speaker comfortable with any level of English.',
    hourlyRate: 179000,
    availability: ['목 09:00', '금 14:00'],
    languages: ['English (Native)'],
    tier: 'Leader',
    location: 'Overseas',
  },
];

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId) 
  : getFirestore(app);

async function migrate() {
  console.log('Starting migration...');
  for (const tutor of MOCK_TUTORS) {
    try {
      await setDoc(doc(db, 'tutors', tutor.id), tutor);
      console.log(`Migrated tutor: ${tutor.name}`);
    } catch (error) {
      console.error(`Error migrating ${tutor.name}:`, error);
    }
  }
  console.log('Migration finished!');
  process.exit(0);
}

migrate();
