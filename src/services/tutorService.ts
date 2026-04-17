import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Tutor } from '../types';

const TUTORS_COLLECTION = 'tutors';

export const tutorService = {
  async getAllTutors(): Promise<Tutor[]> {
    const tutorRef = collection(db, TUTORS_COLLECTION);
    const snapshot = await getDocs(tutorRef);
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as Tutor & { hidden?: boolean }))
      .filter(t => !t.hidden) as Tutor[];
  },

  async getTutorById(id: string): Promise<Tutor | null> {
    const tutorRef = doc(db, TUTORS_COLLECTION, id);
    const snapshot = await getDoc(tutorRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Tutor;
    }
    return null;
  },

  async getTutorsByIds(ids: string[]): Promise<Tutor[]> {
    if (!ids || ids.length === 0) return [];

    // 개별 doc 조회: Firestore documentId() in 쿼리도 가능하지만 10개 제한이 있어 병렬 로 안전하게
    const results = await Promise.all(ids.map((id) => this.getTutorById(id)));
    return results.filter((t): t is Tutor => t !== null);
  }
};
