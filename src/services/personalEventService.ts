import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, Timestamp, getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { PersonalEvent } from '../types';

const COLLECTION = 'personal_events';

export const personalEventService = {
  // 본인 일정 실시간 구독 (정렬은 클라이언트에서)
  subscribeForOwner(ownerId: string, callback: (events: PersonalEvent[]) => void) {
    const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
    return onSnapshot(
      q,
      (snap) => {
        const events = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as PersonalEvent));
        events.sort((a, b) => {
          const ta = a.startTime?.toMillis?.() ?? new Date(a.startTime).getTime();
          const tb = b.startTime?.toMillis?.() ?? new Date(b.startTime).getTime();
          return ta - tb;
        });
        callback(events);
      },
      (err) => {
        console.error('[personalEventService] subscribe failed:', err);
        callback([]);
      }
    );
  },

  // 관리자: 전체 일정 1회 조회 (집계 화면용)
  async fetchAll(): Promise<PersonalEvent[]> {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as PersonalEvent));
  },

  async create(input: Omit<PersonalEvent, 'id' | 'createdAt' | 'updatedAt'>) {
    return await addDoc(collection(db, COLLECTION), {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  async update(id: string, patch: Partial<Omit<PersonalEvent, 'id' | 'ownerId' | 'createdAt'>>) {
    return await updateDoc(doc(db, COLLECTION, id), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  },

  async remove(id: string) {
    return await deleteDoc(doc(db, COLLECTION, id));
  },

  toTimestamp(date: Date) {
    return Timestamp.fromDate(date);
  },
};
