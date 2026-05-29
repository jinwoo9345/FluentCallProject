import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Calendar, Clock, Plus, Loader2, User as UserIcon, Link as LinkIcon,
  Mail, Search, ChevronDown, Check,
} from 'lucide-react';
import {
  collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Button } from '../ui/Button';
import { cn } from '@/src/lib/utils';

interface Props {
  open: boolean;
  tutorId: string;
  tutorName: string;
  onClose: () => void;
  onCreated?: () => void;
}

interface StudentOption {
  userId: string;
  userName: string;
  userEmail: string;
  remainingSessions: number; // 결제한 총 회차 (간단 표시)
}

export function TutorSessionRegisterModal({ open, tutorId, tutorName, onClose, onCreated }: Props) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(25);
  const [meetingLink, setMeetingLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 결제 학생 목록 로드 (강사 본인의 completed 결제 기준)
  useEffect(() => {
    if (!open || !tutorId) return;
    setLoadingStudents(true);
    setError('');
    (async () => {
      try {
        const q = query(
          collection(db, 'payments'),
          where('tutorId', '==', tutorId),
          where('status', '==', 'completed'),
        );
        const snap = await getDocs(q);
        // userId 기준 합산
        const map = new Map<string, StudentOption>();
        snap.docs.forEach((d) => {
          const data = d.data() as any;
          if (!data.userId) return;
          const totalSessions = (data.packageSessions || 0) + (data.packageBonus || 0);
          const existing = map.get(data.userId);
          if (existing) {
            existing.remainingSessions += totalSessions;
          } else {
            // 기존 결제 doc 에 userName snapshot 이 없으면 uid 끝자리로 식별 보조
            const fallbackName = `학생 (uid 끝 6자: ${String(data.userId).slice(-6)})`;
            map.set(data.userId, {
              userId: data.userId,
              userName: data.userName || fallbackName,
              userEmail: data.userEmail || '',
              remainingSessions: totalSessions,
            });
          }
        });
        setStudents(Array.from(map.values()));
      } catch (err: any) {
        console.error('[TutorSessionRegister] payments fetch failed:', err);
        setError('학생 목록을 불러오지 못했습니다: ' + (err.message || ''));
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, [open, tutorId]);

  // 모달 열릴 때 폼 초기화
  useEffect(() => {
    if (!open) return;
    setSelectedStudent(null);
    setStudentSearch('');
    setStudentPickerOpen(false);
    setDate('');
    setTime('');
    setDuration(25);
    setMeetingLink('');
    setError('');
  }, [open]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.userName, s.userEmail].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  if (!open) return null;

  const handleCreate = async () => {
    setError('');
    if (!selectedStudent) {
      setError('학생을 선택해주세요.');
      return;
    }
    if (!date || !time) {
      setError('날짜와 시간을 모두 입력해주세요.');
      return;
    }
    const startDate = new Date(`${date}T${time}`);
    if (isNaN(startDate.getTime())) {
      setError('올바른 날짜·시간 형식이 아닙니다.');
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0 || duration > 240) {
      setError('수업 시간은 1~240분 사이여야 합니다.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'sessions'), {
        userId: selectedStudent.userId,
        userName: selectedStudent.userName,
        userEmail: selectedStudent.userEmail,
        tutorId,
        tutorName,
        startTime: Timestamp.fromDate(startDate),
        duration,
        status: 'upcoming',
        meetingLink: meetingLink.trim() || '',
        createdBy: tutorId,         // 누가 등록한 수업인지 (관리자 추적용)
        createdByRole: 'tutor',
        createdAt: serverTimestamp(),
      });
      onCreated?.();
      onClose();
    } catch (err: any) {
      console.error('[TutorSessionRegister] create failed:', err);
      setError('수업 등록 실패: ' + (err.message || '알 수 없는 오류'));
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
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-blue-50/60">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">강사 수업 등록</p>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Calendar size={18} /> 새 수업 등록
                </h2>
                <p className="text-[11px] text-slate-500 mt-1">
                  나에게 결제한 학생만 선택 가능합니다. 등록 시 학생·관리자에게도 동일하게 노출됩니다.
                </p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={22} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{error}</div>
              )}

              {/* 학생 선택 */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  <UserIcon size={12} className="inline mr-1" /> 학생
                </label>
                {loadingStudents ? (
                  <div className="rounded-xl border border-slate-200 px-3 py-2.5 flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 size={14} className="animate-spin" /> 학생 목록 불러오는 중...
                  </div>
                ) : students.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-3 py-3 text-xs text-amber-700 leading-relaxed">
                    아직 결제한 학생이 없습니다. 결제가 완료된 학생만 수업 등록이 가능합니다.
                    무통장입금이라면 관리자 승인 후 노출됩니다.
                  </div>
                ) : (
                  <StudentPicker
                    students={filteredStudents}
                    selected={selectedStudent}
                    onSelect={(s) => {
                      setSelectedStudent(s);
                      setStudentPickerOpen(false);
                      setStudentSearch('');
                    }}
                    open={studentPickerOpen}
                    setOpen={setStudentPickerOpen}
                    search={studentSearch}
                    setSearch={setStudentSearch}
                    totalCount={students.length}
                  />
                )}
              </div>

              {/* 날짜/시간 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    <Calendar size={12} className="inline mr-1" /> 날짜
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    <Clock size={12} className="inline mr-1" /> 시간
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 길이 */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">수업 시간 (분)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={10}
                  max={240}
                  step={5}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* 링크 */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  <LinkIcon size={12} className="inline mr-1" /> 수업 링크 (선택)
                </label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://zoom.us/..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>취소</Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={submitting || students.length === 0}
                className="gap-1"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 수업 등록
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

function StudentPicker({
  students, selected, onSelect, open, setOpen, search, setSearch, totalCount,
}: {
  students: StudentOption[];
  selected: StudentOption | null;
  onSelect: (s: StudentOption) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  search: string;
  setSearch: (v: string) => void;
  totalCount: number;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left bg-white transition-colors',
          open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
        )}
      >
        {selected ? (
          <>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <UserIcon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{selected.userName}</p>
              <p className="text-[11px] text-slate-500 truncate">{selected.userEmail || '이메일 없음'}</p>
            </div>
          </>
        ) : (
          <>
            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center">
              <UserIcon size={14} />
            </div>
            <span className="flex-1 text-sm text-slate-400">학생을 선택하세요</span>
          </>
        )}
        <ChevronDown size={16} className={cn('text-slate-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
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
                placeholder="이름·이메일 검색"
                className="flex-1 bg-transparent text-sm outline-none"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {students.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">검색 결과가 없습니다.</div>
            ) : (
              students.map((s) => {
                const isSelected = s.userId === selected?.userId;
                return (
                  <button
                    key={s.userId}
                    type="button"
                    onClick={() => onSelect(s)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-slate-50 last:border-none',
                      isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'
                    )}
                  >
                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <UserIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{s.userName}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {s.userEmail ? (
                          <>
                            <Mail size={10} className="inline mr-0.5" /> {s.userEmail}
                          </>
                        ) : '이메일 없음'}
                        <span className="ml-2 text-slate-400">· 결제 총 {s.remainingSessions}회</span>
                      </p>
                    </div>
                    {isSelected && <Check size={16} className="text-blue-600 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-500 text-center">
            총 {totalCount}명의 학생 중 {students.length}명 표시
          </div>
        </div>
      )}
    </div>
  );
}
