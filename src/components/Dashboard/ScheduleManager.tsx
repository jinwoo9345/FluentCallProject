import { useState } from 'react';
import { Button } from '../ui/Button';
import { Plus, X } from 'lucide-react';
import { db } from '@/src/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { UserRole } from '@/src/types';

interface ScheduleManagerProps {
  userId: string;
  availability: string[];
  role: UserRole | undefined;
}

export const ScheduleManager = ({ userId, availability = [], role }: ScheduleManagerProps) => {
  const [newTime, setNewTime] = useState('');
  const [loading, setLoading] = useState(false);

  const isTutor = role === 'tutor';

  const handleAdd = async () => {
    if (!newTime || !role) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', userId);
      const field = isTutor ? 'availability' : 'studentAvailability';
      await updateDoc(userRef, { [field]: arrayUnion(newTime) });

      if (isTutor) {
        // tutors 컬렉션의 동일 ID 문서에도 반영 (탐색용 스케줄 동기화)
        try {
          await updateDoc(doc(db, 'tutors', userId), { availability: arrayUnion(newTime) });
        } catch (err) {
          console.warn('Tutor profile schedule sync skipped:', err);
        }
      }
      setNewTime('');
    } catch (error) {
      console.error('Error adding time:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (time: string) => {
    if (!role) return;
    try {
      const userRef = doc(db, 'users', userId);
      const field = isTutor ? 'availability' : 'studentAvailability';
      await updateDoc(userRef, { [field]: arrayRemove(time) });

      if (isTutor) {
        try {
          await updateDoc(doc(db, 'tutors', userId), { availability: arrayRemove(time) });
        } catch (err) {
          console.warn('Tutor profile schedule sync skipped:', err);
        }
      }
    } catch (error) {
      console.error('Error removing time:', error);
    }
  };

  if (!role) {
    return <p className="text-sm text-slate-400">역할 정보가 확인되지 않아 스케줄을 편집할 수 없습니다.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="예: 월 10:00"
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-500"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
        />
        <Button onClick={handleAdd} disabled={loading} size="sm" className="gap-1">
          <Plus size={16} /> 추가
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {availability.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 시간이 없습니다.</p>
        ) : (
          availability.map((time) => (
            <div
              key={time}
              className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600"
            >
              {time}
              <button onClick={() => handleRemove(time)} className="hover:text-blue-800">
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
