import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Star, Search, PenSquare, Trash2, Edit3, Loader2, X, Check,
  Briefcase, GraduationCap, Plane, Sparkles, BookOpen, Sprout,
} from 'lucide-react';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, getDocs, where, limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Pagination, usePaginated } from '../components/ui/Pagination';
import { cn } from '@/src/lib/utils';

const PAGE_SIZE = 9;

type PlatformReview = {
  id: string;
  userId: string;
  userName: string;
  userTag: string;
  rating: number;
  content: string;
  createdAt?: any;
};

const TAG_OPTIONS = [
  { label: '대학생', icon: GraduationCap },
  { label: '직장인', icon: Briefcase },
  { label: '초보자', icon: Sprout },
  { label: '여행 준비', icon: Plane },
  { label: '꾸준형 수강생', icon: BookOpen },
  { label: '자기계발', icon: Sparkles },
];

const TAG_ICON: Record<string, any> = Object.fromEntries(
  TAG_OPTIONS.map((t) => [t.label, t.icon])
);

function StarRow({ rating, size = 14, className }: { rating: number; size?: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={cn(n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600/40')}
        />
      ))}
    </div>
  );
}

export default function Reviews() {
  const { user, firebaseUser, setIsAuthModalOpen, setAuthMode } = useAuth();
  const [reviews, setReviews] = useState<PlatformReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformReview | null>(null);
  const [hasPaid, setHasPaid] = useState<boolean | null>(null);

  // 실시간 구독
  useEffect(() => {
    const q = query(collection(db, 'platform_reviews'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  // 결제 이력 체크 (작성 권한)
  useEffect(() => {
    if (!firebaseUser) {
      setHasPaid(false);
      return;
    }
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'payments'),
            where('userId', '==', firebaseUser.uid),
            limit(1)
          )
        );
        setHasPaid(!snap.empty);
      } catch {
        setHasPaid(false);
      }
    })();
  }, [firebaseUser]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter(
      (r) =>
        (r.userName || '').toLowerCase().includes(q) ||
        (r.content || '').toLowerCase().includes(q) ||
        (r.userTag || '').toLowerCase().includes(q)
    );
  }, [reviews, searchQuery]);

  const pager = usePaginated(filtered, PAGE_SIZE);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const handleOpenWrite = () => {
    if (!firebaseUser) {
      setAuthMode('signin');
      setIsAuthModalOpen(true);
      return;
    }
    if (hasPaid !== true) {
      alert('후기는 1회 이상 수강권을 결제하신 회원만 작성하실 수 있어요.');
      return;
    }
    setEditing(null);
    setIsWriteOpen(true);
  };

  const handleEdit = (review: PlatformReview) => {
    setEditing(review);
    setIsWriteOpen(true);
  };

  const handleDelete = async (review: PlatformReview) => {
    if (!confirm('이 후기를 삭제하시겠어요?')) return;
    try {
      await deleteDoc(doc(db, 'platform_reviews', review.id));
    } catch (err: any) {
      alert('삭제 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* 다크 네이비 × 앰버 히어로 (후기 테스티모니얼 톤) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white">
        {/* 앰버 글로우 악센트 */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-1/3 h-64 w-[30rem] rounded-full bg-rose-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-block text-[11px] font-black uppercase tracking-[0.3em] text-amber-300/90 mb-3">
              Real Voices
            </span>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              수강생들의 리얼 후기
            </h1>
            <div className="mt-5 flex flex-col items-center gap-2">
              <StarRow rating={Math.round(avgRating)} size={28} />
              <p className="text-sm font-bold text-amber-100/90">
                평균 만족도 {avgRating.toFixed(1)}/5.0
              </p>
            </div>
          </motion.div>

          {/* 검색 + 작성 */}
          <div className="mt-10 flex flex-col md:flex-row gap-3 items-stretch md:items-center max-w-3xl mx-auto">
            <div className="flex-1 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 backdrop-blur px-5 py-3 focus-within:border-amber-300/60">
              <Search className="text-amber-200/70" size={18} />
              <input
                type="text"
                placeholder="후기 내용·작성자로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 outline-none"
              />
            </div>
            <Button
              onClick={handleOpenWrite}
              className="gap-2 px-6 py-6 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold border-none shadow-lg shadow-amber-500/20"
            >
              <PenSquare size={16} /> 후기 작성
            </Button>
          </div>
        </div>
      </section>

      {/* 카드 그리드 */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pager.sliced.map((r) => {
                const Icon = TAG_ICON[r.userTag] || GraduationCap;
                const isMine = !!firebaseUser && r.userId === firebaseUser.uid;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Card className="h-full p-6 hover:shadow-lg transition-all relative bg-white border border-slate-100 hover:border-amber-200">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm">{r.userTag || r.userName}</p>
                          <p className="text-[11px] text-slate-500 truncate">{r.userName}</p>
                        </div>
                      </div>
                      <StarRow rating={r.rating || 5} />
                      <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {r.content}
                      </p>
                      {isMine && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(r)}
                            className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1"
                          >
                            <Edit3 size={12} /> 수정
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            className="text-xs font-bold text-slate-500 hover:text-red-600 flex items-center gap-1"
                          >
                            <Trash2 size={12} /> 삭제
                          </button>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-10">
              <Pagination
                currentPage={pager.page}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={pager.setPage}
                className="rounded-2xl border border-slate-100 bg-white"
              />
            </div>
          </>
        )}
      </section>

      {isWriteOpen && (
        <ReviewWriteModal
          initial={editing}
          onClose={() => {
            setIsWriteOpen(false);
            setEditing(null);
          }}
          userName={user?.name || '회원'}
          userId={firebaseUser?.uid || ''}
        />
      )}
    </div>
  );
}

function ReviewWriteModal({
  initial, onClose, userName, userId,
}: {
  initial: PlatformReview | null;
  onClose: () => void;
  userName: string;
  userId: string;
}) {
  const [rating, setRating] = useState(initial?.rating || 5);
  const [tag, setTag] = useState(initial?.userTag || TAG_OPTIONS[0].label);
  const [content, setContent] = useState(initial?.content || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (trimmed.length < 10) {
      alert('후기는 10자 이상 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      if (initial) {
        await updateDoc(doc(db, 'platform_reviews', initial.id), {
          rating,
          userTag: tag,
          content: trimmed,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'platform_reviews'), {
          userId,
          userName,
          userTag: tag,
          rating,
          content: trimmed,
          createdAt: serverTimestamp(),
        });
      }
      onClose();
    } catch (err: any) {
      alert('저장 실패: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            {initial ? '후기 수정' : '후기 작성'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              별점
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="p-1"
                >
                  <Star
                    size={32}
                    className={cn(
                      n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                    )}
                  />
                </button>
              ))}
              <span className="ml-3 text-sm font-bold text-slate-700">{rating}.0</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              내 상황 태그
            </label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => {
                const Icon = t.icon;
                const selected = tag === t.label;
                return (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => setTag(t.label)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition',
                      selected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    )}
                  >
                    <Icon size={13} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              후기 내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="수업을 들으며 달라진 점, 가장 도움이 됐던 부분 등을 자유롭게 남겨주세요. (최소 10자)"
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 py-5 rounded-xl" onClick={onClose}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-5 rounded-xl gap-2"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Check size={16} />
              )}
              {initial ? '수정하기' : '후기 등록'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
