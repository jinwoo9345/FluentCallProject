import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
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

    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Session));
      callback(sessions);
    });
  },

  async createSession(sessionData: Omit<Session, 'id'>) {
    return await addDoc(collection(db, SESSIONS_COLLECTION), {
      ...sessionData,
      createdAt: serverTimestamp()
    });
  }
};
