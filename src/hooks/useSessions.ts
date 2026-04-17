import { useState, useEffect } from 'react';
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

    if (role !== 'student' && role !== 'tutor') {
      // admin 등 참여자가 아닌 역할은 빈 목록으로 처리
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = sessionService.subscribeToSessions(userId, role, (data) => {
      setSessions(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, role]);

  return { sessions, loading };
}
