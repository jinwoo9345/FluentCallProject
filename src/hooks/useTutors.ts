import { useState, useEffect } from 'react';
import { tutorService } from '../services/tutorService';
import { Tutor } from '../types';

export function useTutors() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTutors() {
      try {
        const data = await tutorService.getAllTutors();
        setTutors(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTutors();
  }, []);

  return { tutors, loading, error };
}
