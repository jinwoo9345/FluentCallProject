import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Calendar, Clock, User as UserIcon, School, Link as LinkIcon,
  Trash2, Edit3, Loader2, Save, Check, StickyNote,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/src/lib/utils';
import { personalEventService } from '../../services/personalEventService';
import type { CalendarEvent } from './ScheduleCalendar';
import type { PersonalEvent } from '../../types';

interface Props {
  event: CalendarEvent | null;
  onClose: () => void;
  /** 본인 소유 개인 일정만 편집 가능 — 호출 측에서 판정 */
  canEdit: boolean;
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
  // datetime-local 입력값 (yyyy-MM-ddTHH:mm)
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventDetailModal({ event, onClose, canEdit }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');
  const [color, setColor] = useState<NonNullable<PersonalEvent['color']>>('green');

  useEffect(() => {
    if (!event) return;
    setEditMode(false);
    setTitle(event.title);
    const raw = event.raw as PersonalEvent | undefined;
    setNotes(raw?.notes || '');
    setStartStr(toLocalInputValue(event.start));
    setEndStr(event.end ? toLocalInputValue(event.end) : '');
    setColor((raw?.color as any) || (event.kind === 'lesson' ? 'blue' : 'green'));
  }, [event]);

  if (!event) return null;

  const raw = event.raw;
  const isLesson = event.kind === 'lesson';

  const handleSave = async () => {
    if (!event.raw?.id) return;
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
      await personalEventService.update(event.raw.id, {
        title: title.trim(),
        notes: notes.trim(),
        startTime: personalEventService.toTimestamp(start),
        endTime: end ? personalEventService.toTimestamp(end) : null,
        color,
      });
      onClose();
    } catch (err: any) {
      alert('저장 실패: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event.raw?.id) return;
    if (!confirm('이 일정을 삭제하시겠어요?')) return;
    setSubmitting(true);
    try {
      await personalEventService.remove(event.raw.id);
      onClose();
    } catch (err: any) {
      alert('삭제 실패: ' + (err.message || '알 수 없는 오류'));
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
            {/* 헤더 */}
            <div className={cn(
              'p-6 border-b border-slate-100 flex items-start justify-between',
              isLesson ? 'bg-blue-50/60' : 'bg-emerald-50/60'
            )}>
              <div>
                <p className={cn(
                  'text-[10px] font-black uppercase tracking-widest mb-1',
                  isLesson ? 'text-blue-600' : 'text-emerald-600'
                )}>
                  {isLesson ? '수업' : '개인 일정'}
                </p>
                <h2 className="text-xl font-bold text-slate-900">{editMode ? '일정 수정' : event.title}</h2>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={22} />
              </button>
            </div>

            {/* 본문 */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {!editMode ? (
                <>
                  <DetailRow icon={Calendar} label="날짜">
                    {event.start.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                  </DetailRow>
                  <DetailRow icon={Clock} label="시간">
                    {event.start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    {event.end && ` ~ ${event.end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
                    {isLesson && raw?.duration && ` (${raw.duration}분)`}
                  </DetailRow>

                  {isLesson && (
                    <>
                      {raw?.tutorName && (
                        <DetailRow icon={School} label="강사">{raw.tutorName}</DetailRow>
                      )}
                      {raw?.userName && (
                        <DetailRow icon={UserIcon} label="수강생">{raw.userName}</DetailRow>
                      )}
                      {raw?.meetingLink && (
                        <DetailRow icon={LinkIcon} label="수업 링크">
                          <a
                            href={raw.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {raw.meetingLink}
                          </a>
                        </DetailRow>
                      )}
                    </>
                  )}

                  {!isLesson && raw?.notes && (
                    <DetailRow icon={StickyNote} label="메모">
                      <span className="whitespace-pre-wrap">{raw.notes}</span>
                    </DetailRow>
                  )}

                  {isLesson && (
                    <div className="text-[11px] text-slate-400 italic">
                      수업 일정은 관리자만 등록·수정할 수 있습니다.
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <FormField label="제목">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={100}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm"
                    />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="시작">
                      <input
                        type="datetime-local"
                        value={startStr}
                        onChange={(e) => setStartStr(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm"
                      />
                    </FormField>
                    <FormField label="종료 (선택)">
                      <input
                        type="datetime-local"
                        value={endStr}
                        onChange={(e) => setEndStr(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm"
                      />
                    </FormField>
                  </div>
                  <FormField label="메모">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm resize-none"
                    />
                  </FormField>
                  <FormField label="색상">
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
                  </FormField>
                </div>
              )}
            </div>

            {/* 하단 액션 */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between gap-2">
              {canEdit && !editMode && (
                <>
                  <button
                    onClick={handleDelete}
                    disabled={submitting}
                    className="px-3 py-2 rounded-xl text-rose-600 text-sm font-bold hover:bg-rose-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} /> 삭제
                  </button>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onClose}>닫기</Button>
                    <Button size="sm" onClick={() => setEditMode(true)} className="gap-1">
                      <Edit3 size={14} /> 수정
                    </Button>
                  </div>
                </>
              )}
              {canEdit && editMode && (
                <>
                  <span />
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditMode(false)} disabled={submitting}>
                      취소
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={submitting} className="gap-1">
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 저장
                    </Button>
                  </div>
                </>
              )}
              {!canEdit && (
                <>
                  <span />
                  <Button size="sm" onClick={onClose}>닫기</Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

function DetailRow({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-sm text-slate-800 mt-0.5">{children}</p>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
