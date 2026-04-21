import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Tutor } from '../types';

const TUTORS_COLLECTION = 'tutors';
const REVIEWS_COLLECTION = 'tutor_reviews';

// 리뷰가 없을 때 기본 별점 (관리자 정책)
const DEFAULT_RATING_NO_REVIEWS = 5.0;

type AggregatedStats = { rating: number; reviewCount: number };

/**
 * 여러 튜터의 집계(평균 별점·리뷰 갯수)를 한 번의 조회로 계산.
 * tutor_reviews 컬렉션 전체를 읽어 tutorId 기준 그룹 집계 (작은 규모 가정).
 */
async function buildAggregatesForAll(): Promise<Map<string, AggregatedStats>> {
  const snap = await getDocs(collection(db, REVIEWS_COLLECTION));
  const buckets = new Map<string, number[]>();
  snap.forEach((d) => {
    const data = d.data() as any;
    const tid = String(data.tutorId || '');
    const r = Number(data.rating);
    if (!tid || !Number.isFinite(r)) return;
    const arr = buckets.get(tid) || [];
    arr.push(r);
    buckets.set(tid, arr);
  });
  const out = new Map<string, AggregatedStats>();
  for (const [tid, ratings] of buckets) {
    const avg = ratings.reduce((s, v) => s + v, 0) / ratings.length;
    out.set(tid, {
      rating: Math.round(avg * 10) / 10, // 소수 1자리
      reviewCount: ratings.length,
    });
  }
  return out;
}

/**
 * 특정 튜터 1명에 대한 집계만 필요할 때 사용.
 */
async function buildAggregateFor(tutorId: string): Promise<AggregatedStats> {
  const q = query(collection(db, REVIEWS_COLLECTION), where('tutorId', '==', tutorId));
  const snap = await getDocs(q);
  const ratings: number[] = [];
  snap.forEach((d) => {
    const r = Number((d.data() as any).rating);
    if (Number.isFinite(r)) ratings.push(r);
  });
  if (ratings.length === 0) {
    return { rating: DEFAULT_RATING_NO_REVIEWS, reviewCount: 0 };
  }
  const avg = ratings.reduce((s, v) => s + v, 0) / ratings.length;
  return {
    rating: Math.round(avg * 10) / 10,
    reviewCount: ratings.length,
  };
}

function attachStats(tutor: Tutor, stats: AggregatedStats | undefined): Tutor {
  if (!stats) {
    return { ...tutor, rating: DEFAULT_RATING_NO_REVIEWS, reviewCount: 0 };
  }
  return { ...tutor, rating: stats.rating, reviewCount: stats.reviewCount };
}

export const tutorService = {
  async getAllTutors(): Promise<Tutor[]> {
    const tutorRef = collection(db, TUTORS_COLLECTION);
    // 튜터 문서와 리뷰 집계를 병렬로 조회
    const [snapshot, aggregates] = await Promise.all([
      getDocs(tutorRef),
      buildAggregatesForAll(),
    ]);
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as Tutor & { hidden?: boolean }))
      .filter(t => !t.hidden)
      .map((t) => attachStats(t as Tutor, aggregates.get(t.id))) as Tutor[];
  },

  async getTutorById(id: string): Promise<Tutor | null> {
    const tutorRef = doc(db, TUTORS_COLLECTION, id);
    const [snapshot, stats] = await Promise.all([
      getDoc(tutorRef),
      buildAggregateFor(id),
    ]);
    if (!snapshot.exists()) return null;
    const base = { id: snapshot.id, ...snapshot.data() } as Tutor;
    return attachStats(base, stats);
  },

  async getTutorsByIds(ids: string[]): Promise<Tutor[]> {
    if (!ids || ids.length === 0) return [];
    // 전체 집계를 한 번만 로드 후 각 튜터에 부착 (N+1 회피)
    const [aggregates, tutors] = await Promise.all([
      buildAggregatesForAll(),
      Promise.all(ids.map(async (id) => {
        const tutorRef = doc(db, TUTORS_COLLECTION, id);
        const snap = await getDoc(tutorRef);
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() } as Tutor;
      })),
    ]);
    return tutors
      .filter((t): t is Tutor => t !== null)
      .map((t) => attachStats(t, aggregates.get(t.id)));
  }
};
