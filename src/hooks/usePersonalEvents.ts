import { useEffect, useState } from 'react';
import { personalEventService } from '../services/personalEventService';
import { PersonalEvent } from '../types';

export function usePersonalEvents(ownerId: string | undefined) {
  const [events, setEvents] = useState<PersonalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = personalEventService.subscribeForOwner(ownerId, (data) => {
      setEvents(data);
      setLoading(false);
    });
    return () => unsub();
  }, [ownerId]);

  return { events, loading };
}
