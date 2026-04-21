import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar, Clock, Plus, Loader2, Trash2, Check, X,
  Link as LinkIcon, User as UserIcon, School, CalendarPlus,
  Search, ChevronDown,
} from 'lucide-react';
import {
  collection, query, where, orderBy, getDocs, addDoc,
  updateDoc, deleteDoc, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Button } from '../ui/Button';
import { cn } from '@/src/lib/utils';

type SessionDoc = {
  id: string;
  userId: string;
  userName?: string;
  tutorId: string;
  tutorName?: string;
  startTime: any;
  duration: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  meetingLink?: string;
  createdAt?: any;
};

interface SessionRegisterSectionProps {
  userId: string;
  userName: string;
  tutors: any[];
  autoOpenForm?: boolean;
}

const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateTime(ts: any): string {
  if (!ts) return '-';
  const d: Date = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return '-';
  return `${d.toLocaleDateString('ko-KR')} (${WEEKDAY_KR[d.getDay()]}) ${d.toLocaleTimeString(
    'ko-KR',
    { hour: '2-digit', minute: '2-digit' }
  )}`;
}

export function SessionRegisterSection({ userId, userName, tutors, autoOpenForm = false }: SessionRegisterSectionProps) {
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(autoOpenForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (autoOpenForm) setShowForm(true);
  }, [autoOpenForm]);

  const [form, setForm] = useState({
    tutorId: '',
    date: '', // yyyy-mm-dd
    time: '', // HH:MM
    duration: 25,
    meetingLink: '',
  });

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'sessions'),
          where('userId', '==', userId),
          orderBy('startTime', 'desc')
        )
      );
      setSessions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch (err) {
      console.warn('sessions fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchSessions();
  }, [userId]);

  const selectedTutor = tutors.find((t) => t.id === form.tutorId);

  const upcoming = useMemo(
    () => sessions.filter((s) => s.status === 'upcoming'),
    [sessions]
  );
  const past = useMemo(
    () => sessions.filter((s) => s.status !== 'upcoming'),
    [sessions]
  );

  const resetForm = () => {
    setForm({ tutorId: '', date: '', time: '', duration: 25, meetingLink: '' });
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!form.tutorId) {
      alert('강사를 선택해주세요.');
      return;
    }
    if (!form.date || !form.time) {
      alert('날짜와 시간을 모두 입력해주세요.');
      return;
    }
    const startDate = new Date(`${form.date}T${form.time}`);
    if (isNaN(startDate.getTime())) {
      alert('올바른 날짜·시간 형식이 아닙니다.');
      return;
    }
    if (!Number.isFinite(form.duration) || form.duration <= 0) {
      alert('수업 시간(분)을 올바르게 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'sessions'), {
        userId,
        userName,
        tutorId: form.tutorId,
        tutorName: selectedTutor?.name || '',
        startTime: Timestamp.fromDate(startDate),
        duration: form.duration,
        status: 'upcoming',
        meetingLink: form.meetingLink.trim() || '',
        createdAt: serverTimestamp(),
      });
      resetForm();
      await fetchSessions();
    } catch (err: any) {
      alert('수업 등록 실패: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (s: SessionDoc, status: SessionDoc['status']) => {
    try {
      await updateDoc(doc(db, 'sessions', s.id), { status });
      await fetchSessions();
    } catch (err: any) {
      alert('상태 변경 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const handleDelete = async (s: SessionDoc) => {
    if (!confirm('이 수업을 삭제하시겠어요? 해당 회원·강사의 일정에서도 제거됩니다.')) return;
    try {
      await deleteDoc(doc(db, 'sessions', s.id));
      await fetchSessions();
    } catch (err: any) {
      alert('삭제 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">
            수업 일정
          </p>
          <span className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            다가오는 {upcoming.length} · 지난 {past.length}
          </span>
        </div>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5"
          >
            <CalendarPlus size={14} /> 수업 등록
          </Button>
        )}
      </div>

      {/* 등록 폼 */}
      {showForm && (
        <div className="mb-5 rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Plus size={16} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">새 수업 등록</p>
              <p className="text-[11px] text-slate-500">
                강사와 수강생이 사전에 협의한 일정을 관리자가 입력합니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                <School size={12} className="inline mr-1" /> 강사
              </label>
              <TutorPicker
                tutors={tutors}
                selectedId={form.tutorId}
                onSelect={(id) => setForm({ ...form, tutorId: id })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                <UserIcon size={12} className="inline mr-1" /> 수강생
              </label>
              <input
                type="text"
                value={userName}
                disabled
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                <Calendar size={12} className="inline mr-1" /> 수업 날짜
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                <Clock size={12} className="inline mr-1" /> 시작 시간
              </label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                수업 시간 (분)
              </label>
              <input
                type="number"
                value={form.duration}
                onChange={(e) =>
                  setForm({ ...form, duration: Number(e.target.value) })
                }
                min={10}
                step={5}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                <LinkIcon size={12} className="inline mr-1" /> 수업 링크 (선택)
              </label>
              <input
                type="url"
                value={form.meetingLink}
                onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                placeholder="https://zoom.us/..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetForm}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={submitting}
              className="flex-1 gap-1"
            >
              {submitting ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
              수업 등록
            </Button>
          </div>
        </div>
      )}

      {/* 세션 목록 */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-slate-300" size={22} />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          등록된 수업이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.length > 0 && (
            <p className="text-[11px] font-black uppercase tracking-widest text-blue-600">
              다가오는 수업
            </p>
          )}
          {upcoming.map((s) => (
            <Fragment key={s.id}>
              <SessionRow
                session={s}
                tutors={tutors}
                onComplete={() => handleStatusChange(s, 'completed')}
                onCancel={() => handleStatusChange(s, 'cancelled')}
                onDelete={() => handleDelete(s)}
              />
            </Fragment>
          ))}

          {past.length > 0 && (
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mt-4">
              지난 수업
            </p>
          )}
          {past.map((s) => (
            <Fragment key={s.id}>
              <SessionRow
                session={s}
                tutors={tutors}
                past
                onComplete={() => handleStatusChange(s, 'completed')}
                onCancel={() => handleStatusChange(s, 'cancelled')}
                onDelete={() => handleDelete(s)}
              />
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionRow({
  session, tutors, past, onComplete, onCancel, onDelete,
}: {
  session: SessionDoc;
  tutors: any[];
  past?: boolean;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const tutor = tutors.find((t) => t.id === session.tutorId);
  const label = formatDateTime(session.startTime);
  const statusStyle =
    session.status === 'upcoming'
      ? 'bg-blue-100 text-blue-700'
      : session.status === 'completed'
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-rose-100 text-rose-700';

  return (
    <div
      className={cn(
        'rounded-xl border p-3 flex items-center gap-3',
        past ? 'bg-slate-50 border-slate-100 opacity-80' : 'bg-white border-blue-100'
      )}
    >
      <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
        <Calendar size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full', statusStyle)}>
            {session.status === 'upcoming' ? '예정' : session.status === 'completed' ? '완료' : '취소'}
          </span>
          <span className="text-sm font-bold text-slate-900 truncate">
            {tutor?.name || session.tutorName || '강사'}
          </span>
          <span className="text-[11px] text-slate-500 truncate">
            · {session.duration}분
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{label}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {session.status === 'upcoming' && (
          <>
            <button
              onClick={onComplete}
              title="완료로 표시"
              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
            >
              <Check size={14} />
            </button>
            <button
              onClick={onCancel}
              title="취소로 표시"
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
            >
              <X size={14} />
            </button>
          </>
        )}
        <button
          onClick={onDelete}
          title="삭제"
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// 강사 커스텀 피커 — 클릭 시 목록 패널이 펼쳐지고, 검색·아바타·전공 정보 표시
// ────────────────────────────────────────────────────────────────────
function TutorPicker({
  tutors, selectedId, onSelect,
}: {
  tutors: any[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = tutors.find((t) => t.id === selectedId);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tutors;
    return tutors.filter((t) => {
      const hay = [t.name, ...(t.specialties || []), t.tier, t.location]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [search, tutors]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left bg-white transition-colors',
          open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
        )}
      >
        {selected ? (
          <>
            <img
              src={selected.avatar || `https://picsum.photos/seed/${selected.id}/100/100`}
              alt={selected.name}
              className="h-8 w-8 rounded-lg object-cover border border-slate-100"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{selected.name}</p>
              <p className="text-[11px] text-slate-500 truncate">
                {(selected.specialties || []).slice(0, 2).join(' · ') || '전공 미등록'}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center">
              <School size={16} />
            </div>
            <span className="flex-1 text-sm text-slate-400">강사 입력창을 눌러 선택하세요</span>
          </>
        )}
        <ChevronDown
          size={16}
          className={cn('text-slate-400 transition-transform flex-shrink-0', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute z-40 left-0 right-0 mt-2 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <Search size={14} className="text-slate-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름·전공·지역 검색"
                className="flex-1 bg-transparent text-sm outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                검색 결과가 없습니다.
              </div>
            ) : (
              filtered.map((t) => {
                const isSelected = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelect(t.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-slate-50 last:border-none',
                      isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'
                    )}
                  >
                    <img
                      src={t.avatar || `https://picsum.photos/seed/${t.id}/100/100`}
                      alt={t.name}
                      className="h-9 w-9 rounded-lg object-cover border border-slate-100 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{t.name}</p>
                        {t.tier && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                            {t.tier}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {(t.specialties || []).slice(0, 3).join(' · ') || '전공 미등록'}
                        {t.location && <span className="text-slate-400"> · {t.location}</span>}
                      </p>
                    </div>
                    {isSelected && (
                      <Check size={16} className="text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-500 text-center">
            총 {tutors.length}명의 강사 중 {filtered.length}명 표시
          </div>
        </div>
      )}
    </div>
  );
}
