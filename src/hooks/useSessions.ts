import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { sessionService } from '../services/sessionService';
import { Session, UserRole } from '../types';

export function useSessions(userId: string | undefined, role: UserRole | undefined) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !role) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 관리자는 모든 sessions 구독 (본인 강의실 캘린더에 전체 수업 보임)
    if (role === 'admin') {
      const qAll = query(collection(db, 'sessions'));
      const unsub = onSnapshot(
        qAll,
        (snap) => {
          setSessions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Session)));
          setLoading(false);
        },
        (err) => {
          console.error('[useSessions] admin all-sessions query failed:', err);
          setLoading(false);
        }
      );
      return () => unsub();
    }

    const unsubscribe = sessionService.subscribeToSessions(userId, role, (data) => {
      setSessions(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, role]);

  return { sessions, loading };
}
