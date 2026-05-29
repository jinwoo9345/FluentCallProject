import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Plus, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/src/lib/utils';
import { personalEventService } from '../../services/personalEventService';
import type { PersonalEvent } from '../../types';

interface Props {
  open: boolean;
  ownerId: string;
  ownerName?: string;
  /** 모달 열릴 때 기본 선택할 날짜 (시각은 09:00 기본) */
  defaultDate?: Date;
  onClose: () => void;
  onCreated?: () => void;
}

const COLOR_OPTIONS: { value: NonNullable<PersonalEvent['color']>; label: string; cls: string }[] = [
  { value: 'green',  label: '초록', cls: 'bg-emerald-500' },
  { value: 'blue',   label: '파랑', cls: 'bg-blue-500' },
  { value: 'amber',  label: '주황', cls: 'bg-amber-500' },
  { value: 'rose',   label: '분홍', cls: 'bg-rose-500' },
  { value: 'violet', label: '보라', cls: 'bg-violet-500' },
  { value: 'slate',  label: '회색', cls: 'bg-slate-500' },
];

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AddPersonalEventModal({ open, ownerId, ownerName, defaultDate, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');
  const [color, setColor] = useState<NonNullable<PersonalEvent['color']>>('green');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = defaultDate ? new Date(defaultDate) : new Date();
    base.setHours(9, 0, 0, 0);
    setTitle('');
    setNotes('');
    setStartStr(toLocalInputValue(base));
    setEndStr('');
    setColor('green');
  }, [open, defaultDate]);

  if (!open) return null;

  const handleCreate = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    const start = new Date(startStr);
    if (isNaN(start.getTime())) {
      alert('시작 시각이 올바르지 않습니다.');
      return;
    }
    let end: Date | null = null;
    if (endStr) {
      end = new Date(endStr);
      if (isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
        alert('종료 시각은 시작 시각 이후여야 합니다.');
        return;
      }
    }
    setSubmitting(true);
    try {
      await personalEventService.create({
        ownerId,
        ownerName: ownerName || '',
        title: title.trim(),
        notes: notes.trim(),
        startTime: personalEventService.toTimestamp(start),
        endTime: end ? personalEventService.toTimestamp(end) : null,
        color,
      } as any);
      onCreated?.();
      onClose();
    } catch (err: any) {
      alert('일정 생성 실패: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-emerald-50/60">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">개인 일정</p>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Plus size={18} /> 새 일정 추가
                </h2>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={22} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">제목</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder="예: 학습 계획 점검"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">시작</label>
                  <input
                    type="datetime-local"
                    value={startStr}
                    onChange={(e) => setStartStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">종료 (선택)</label>
                  <input
                    type="datetime-local"
                    value={endStr}
                    onChange={(e) => setEndStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">메모 (선택)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="예: 다음 수업 전 복습 / 영작 연습"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">색상</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setColor(opt.value)}
                      aria-label={opt.label}
                      className={cn(
                        'h-7 w-7 rounded-full transition-all flex items-center justify-center',
                        opt.cls,
                        color === opt.value ? 'ring-2 ring-offset-2 ring-slate-700 scale-110' : 'opacity-70 hover:opacity-100'
                      )}
                    >
                      {color === opt.value && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>취소</Button>
              <Button size="sm" onClick={handleCreate} disabled={submitting} className="gap-1">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 일정 추가
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
