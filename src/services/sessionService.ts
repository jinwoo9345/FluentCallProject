import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Session } from '../types';

const SESSIONS_COLLECTION = 'sessions';

export const sessionService = {
  subscribeToSessions(userId: string, role: 'student' | 'tutor', callback: (sessions: Session[]) => void) {
    const field = role === 'student' ? 'userId' : 'tutorId'; // Consistent with types.ts which uses userId/tutorId
    const q = query(
      collection(db, SESSIONS_COLLECTION),
      where(field, '==', userId),
      orderBy('startTime', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const sessions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Session));
        callback(sessions);
      },
      (error) => {
        // 권한 오류·인덱스 누락 등이 조용히 실패하지 않도록 콘솔에 표면화
        console.error('[sessionService] subscribeToSessions failed:', error);
        callback([]);
      }
    );
  },

  async createSession(sessionData: Omit<Session, 'id'>) {
    return await addDoc(collection(db, SESSIONS_COLLECTION), {
      ...sessionData,
      createdAt: serverTimestamp()
    });
  },

  async updateSession(id: string, patch: Partial<Omit<Session, 'id' | 'userId' | 'tutorId'>>) {
    return await updateDoc(doc(db, SESSIONS_COLLECTION, id), {
      ...patch,
      updatedAt: serverTimestamp(),
    } as any);
  },

  async deleteSession(id: string) {
    return await deleteDoc(doc(db, SESSIONS_COLLECTION, id));
  },

  toTimestamp(date: Date) {
    return Timestamp.fromDate(date);
  },
};
