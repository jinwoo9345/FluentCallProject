import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Calendar, Clock, Plus, Loader2, User as UserIcon, School,
  Link as LinkIcon, Mail, Search, ChevronDown, Check,
} from 'lucide-react';
import {
  collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Button } from '../ui/Button';
import { cn } from '@/src/lib/utils';

interface Props {
  open: boolean;
  tutors: any[];
  /** 호출자(관리자) uid — createdBy 추적용 */
  adminId: string;
  onClose: () => void;
  onCreated?: () => void;
}

interface StudentOption {
  userId: string;
  userName: string;
  userEmail: string;
  paidSessions: number;
}

export function AdminSessionRegisterModal({ open, tutors, adminId, onClose, onCreated }: Props) {
  const [tutorPickerOpen, setTutorPickerOpen] = useState(false);
  const [tutorSearch, setTutorSearch] = useState('');
  const [selectedTutorId, setSelectedTutorId] = useState('');

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(25);
  const [meetingLink, setMeetingLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 결제 정합성과 무관하게 임의 학생 등록 허용 토글
  const [overrideEligibility, setOverrideEligibility] = useState(false);
  const [allUsers, setAllUsers] = useState<StudentOption[]>([]);

  // 모달 열릴 때 폼 초기화
  useEffect(() => {
    if (!open) return;
    setSelectedTutorId('');
    setSelectedStudent(null);
    setStudents([]);
    setTutorSearch('');
    setStudentSearch('');
    setDate('');
    setTime('');
    setDuration(25);
    setMeetingLink('');
    setError('');
    setOverrideEligibility(false);
    setTutorPickerOpen(false);
    setStudentPickerOpen(false);
  }, [open]);

  // 강사 선택 시 결제 학생 목록 fetch
  useEffect(() => {
    if (!open || !selectedTutorId) {
      setStudents([]);
      return;
    }
    setStudentsLoading(true);
    setSelectedStudent(null);
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'payments'),
            where('tutorId', '==', selectedTutorId),
          )
        );
        const map = new Map<string, StudentOption>();
        snap.docs.forEach((d) => {
          const data = d.data() as any;
          if (data.status !== 'completed' || !data.userId) return;
          const totalSessions = (data.packageSessions || 0) + (data.packageBonus || 0);
          const existing = map.get(data.userId);
          if (existing) {
            existing.paidSessions += totalSessions;
          } else {
            map.set(data.userId, {
              userId: data.userId,
              userName: data.userName || '학생',
              userEmail: data.userEmail || '',
              paidSessions: totalSessions,
            });
          }
        });
        setStudents(Array.from(map.values()));
      } catch (err: any) {
        console.error('[AdminSessionRegister] payments fetch failed:', err);
        setError('학생 목록을 불러오지 못했습니다: ' + (err.message || ''));
      } finally {
        setStudentsLoading(false);
      }
    })();
  }, [open, selectedTutorId]);

  // override 모드일 때 전체 학생(role=student) 목록 fetch
  useEffect(() => {
    if (!open || !overrideEligibility) return;
    if (allUsers.length > 0) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'student'))
        );
        const list = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            userId: d.id,
            userName: data.name || '학생',
            userEmail: data.email || '',
            paidSessions: 0,
          } as StudentOption;
        });
        setAllUsers(list);
      } catch (err: any) {
        console.error('[AdminSessionRegister] users fetch failed:', err);
      }
    })();
  }, [open, overrideEligibility, allUsers.length]);

  const selectedTutor = tutors.find((t) => t.id === selectedTutorId);

  const candidateStudents = overrideEligibility ? allUsers : students;
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return candidateStudents;
    return candidateStudents.filter((s) =>
      [s.userName, s.userEmail].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [candidateStudents, studentSearch]);

  const filteredTutors = useMemo(() => {
    const q = tutorSearch.trim().toLowerCase();
    if (!q) return tutors;
    return tutors.filter((t) =>
      [t.name, ...(t.specialties || []), t.location].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [tutors, tutorSearch]);

  if (!open) return null;

  const handleCreate = async () => {
    setError('');
    if (!selectedTutorId) {
      setError('강사를 선택해주세요.');
      return;
    }
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
        tutorId: selectedTutorId,
        tutorName: selectedTutor?.name || '',
        startTime: Timestamp.fromDate(startDate),
        duration,
        status: 'upcoming',
        meetingLink: meetingLink.trim() || '',
        createdBy: adminId,
        createdByRole: 'admin',
        createdAt: serverTimestamp(),
      });
      onCreated?.();
      onClose();
    } catch (err: any) {
      console.error('[AdminSessionRegister] create failed:', err);
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
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">관리자 수업 등록</p>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Calendar size={18} /> 새 수업 등록
                </h2>
                <p className="text-[11px] text-slate-500 mt-1">
                  강사 선택 후 그 강사에게 결제 완료한 학생만 표시됩니다.
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

              {/* 강사 선택 */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  <School size={12} className="inline mr-1" /> 강사
                </label>
                <GenericPicker
                  open={tutorPickerOpen}
                  setOpen={setTutorPickerOpen}
                  search={tutorSearch}
                  setSearch={setTutorSearch}
                  placeholder="강사를 선택하세요"
                  selectedLabel={selectedTutor?.name}
                  selectedSubLabel={(selectedTutor?.specialties || []).slice(0, 2).join(' · ')}
                  totalCount={tutors.length}
                  filteredCount={filteredTutors.length}
                  searchPlaceholder="이름·전공 검색"
                  emptyText="검색 결과가 없습니다."
                >
                  {filteredTutors.map((t) => {
                    const isSelected = t.id === selectedTutorId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedTutorId(t.id);
                          setTutorPickerOpen(false);
                          setTutorSearch('');
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
                          <p className="text-sm font-bold text-slate-900 truncate">{t.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {(t.specialties || []).slice(0, 3).join(' · ') || '전공 미등록'}
                          </p>
                        </div>
                        {isSelected && <Check size={16} className="text-blue-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </GenericPicker>
              </div>

              {/* 학생 선택 */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                  <span>
                    <UserIcon size={12} className="inline mr-1" /> 학생
                    {selectedTutorId && !overrideEligibility && (
                      <span className="ml-1 text-[10px] font-normal text-slate-400">
                        ({selectedTutor?.name} 에게 결제 완료한 학생)
                      </span>
                    )}
                  </span>
                  {selectedTutorId && (
                    <button
                      type="button"
                      onClick={() => {
                        setOverrideEligibility((v) => !v);
                        setSelectedStudent(null);
                      }}
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors',
                        overrideEligibility
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      )}
                      title="결제 매칭 무관하게 전체 학생에서 선택"
                    >
                      {overrideEligibility ? '✓ 전체 학생' : '전체 학생 보기'}
                    </button>
                  )}
                </label>

                {!selectedTutorId ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-[11px] text-slate-500">
                    강사를 먼저 선택해주세요.
                  </div>
                ) : studentsLoading ? (
                  <div className="rounded-xl border border-slate-200 px-3 py-2.5 flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 size={14} className="animate-spin" /> 학생 목록 불러오는 중...
                  </div>
                ) : candidateStudents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-3 py-3 text-[11px] text-amber-700 leading-relaxed">
                    이 강사에게 결제 완료한 학생이 없습니다. 무통장입금 승인 전이거나
                    아직 결제 내역이 없을 수 있습니다. 임시 등록이 필요하면
                    오른쪽 위 <strong>전체 학생 보기</strong> 토글을 사용하세요.
                  </div>
                ) : (
                  <GenericPicker
                    open={studentPickerOpen}
                    setOpen={setStudentPickerOpen}
                    search={studentSearch}
                    setSearch={setStudentSearch}
                    placeholder="학생을 선택하세요"
                    selectedLabel={selectedStudent?.userName}
                    selectedSubLabel={selectedStudent?.userEmail}
                    totalCount={candidateStudents.length}
                    filteredCount={filteredStudents.length}
                    searchPlaceholder="이름·이메일 검색"
                    emptyText="검색 결과가 없습니다."
                  >
                    {filteredStudents.map((s) => {
                      const isSelected = s.userId === selectedStudent?.userId;
                      return (
                        <button
                          key={s.userId}
                          type="button"
                          onClick={() => {
                            setSelectedStudent(s);
                            setStudentPickerOpen(false);
                            setStudentSearch('');
                          }}
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
                              {!overrideEligibility && s.paidSessions > 0 && (
                                <span className="ml-2 text-slate-400">· 결제 총 {s.paidSessions}회</span>
                              )}
                            </p>
                          </div>
                          {isSelected && <Check size={16} className="text-blue-600 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </GenericPicker>
                )}
              </div>

              {/* 날짜·시간 */}
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
                disabled={submitting || !selectedTutorId || !selectedStudent}
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

// 강사·학생 픽커 공통 컴포넌트
function GenericPicker({
  open, setOpen, search, setSearch, placeholder, selectedLabel, selectedSubLabel,
  totalCount, filteredCount, searchPlaceholder, emptyText, children,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  search: string;
  setSearch: (v: string) => void;
  placeholder: string;
  selectedLabel?: string;
  selectedSubLabel?: string;
  totalCount: number;
  filteredCount: number;
  searchPlaceholder: string;
  emptyText: string;
  children: React.ReactNode;
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
        {selectedLabel ? (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{selectedLabel}</p>
            {selectedSubLabel && (
              <p className="text-[11px] text-slate-500 truncate">{selectedSubLabel}</p>
            )}
          </div>
        ) : (
          <span className="flex-1 text-sm text-slate-400">{placeholder}</span>
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
                placeholder={searchPlaceholder}
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
            {filteredCount === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">{emptyText}</div>
            ) : (
              children
            )}
          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-500 text-center">
            총 {totalCount}명 중 {filteredCount}명 표시
          </div>
        </div>
      )}
    </div>
  );
}
