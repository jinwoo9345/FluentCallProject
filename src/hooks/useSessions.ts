import { useState, useEffect } from 'react';
import { sessionService } from '../services/sessionService';
import { Session, User } from '../types';

export function useSessions(userId: string | undefined, role: 'student' | 'tutor' | undefined) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !role) return;

    const unsubscribe = sessionService.subscribeToSessions(userId, role, (data) => {
      setSessions(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, role]);

  return { sessions, loading };
}
