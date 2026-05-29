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

    // 관리자가 본인 계정으로 수강생/강사로 참여한 수업도 보이도록 userId / tutorId 둘 다 구독
    if (role === 'admin') {
      const merged = new Map<string, Session>();
      const emit = () => setSessions(Array.from(merged.values()));

      const qStudent = query(collection(db, 'sessions'), where('userId', '==', userId));
      const qTutor = query(collection(db, 'sessions'), where('tutorId', '==', userId));

      const unsub1 = onSnapshot(qStudent, (snap) => {
        // 이전 결과에서 이 쿼리의 결과를 비우기 위해 단순히 추가/덮어쓰기. dedup은 Map 키로 처리.
        snap.docs.forEach((d) => merged.set(d.id, { id: d.id, ...(d.data() as any) }));
        emit();
        setLoading(false);
      }, (err) => {
        console.error('[useSessions] admin/student query failed:', err);
        setLoading(false);
      });
      const unsub2 = onSnapshot(qTutor, (snap) => {
        snap.docs.forEach((d) => merged.set(d.id, { id: d.id, ...(d.data() as any) }));
        emit();
        setLoading(false);
      }, (err) => {
        console.error('[useSessions] admin/tutor query failed:', err);
      });
      return () => {
        unsub1();
        unsub2();
      };
    }

    const unsubscribe = sessionService.subscribeToSessions(userId, role, (data) => {
      setSessions(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, role]);

  return { sessions, loading };
}
