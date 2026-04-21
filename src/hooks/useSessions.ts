import { useState, useEffect } from 'react';
import { sessionService } from '../services/sessionService';
import { Session, UserRole } from '../types';

export function useSessions(userId: string | undefined, role: UserRole | undefined) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[useSessions] invoked', { userId, role });

    if (!userId || !role) {
      console.warn('[useSessions] skipping: userId or role missing', { userId, role });
      setLoading(false);
      return;
    }

    if (role !== 'student' && role !== 'tutor') {
      console.warn('[useSessions] skipping: role not student/tutor', { role });
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = sessionService.subscribeToSessions(userId, role, (data) => {
      console.log('[useSessions] received', { count: data.length, userId, role });
      setSessions(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, role]);

  return { sessions, loading };
}
