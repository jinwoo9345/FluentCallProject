import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Star, Search, PenSquare, Trash2, Edit3, Info, Loader2, X, Check,
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
  isSample?: boolean;
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

// 예시 후기 (실제 유저 데이터가 쌓이기 전 이해를 돕기 위한 샘플 · isSample=true)
const SAMPLE_REVIEWS: PlatformReview[] = [
  {
    id: 'sample-1', userId: '', userName: '대학생', userTag: '대학생',
    rating: 5, isSample: true,
    content: '영어 면접 준비 때문에 시작했는데, 확실히 일반 학원보다 실전 느낌이 좋아요. 특히 예상 질문 피드백도 자연스럽게 이어지는 연습이 많이 됐습니다. 아직 완벽하진 않지만, 영어로 말하는 게 덜 부담스러워졌어요.',
  },
  {
    id: 'sample-2', userId: '', userName: '직장인', userTag: '직장인',
    rating: 5, isSample: true,
    content: '퇴근하고 30분 정도 부담 없이 할 수 있어서 시작했어요. 딱딱한 수업이 아니라 그냥 대화하는 느낌이라 꾸준히 하게 되는 것 같아요. 표현도 하나씩 자연스럽게 늘고 있습니다.',
  },
  {
    id: 'sample-3', userId: '', userName: '초보자', userTag: '초보자',
    rating: 5, isSample: true,
    content: '영어 거의 못하는 상태에서 시작했는데 생각보다 편했어요. 튜터도 제 속도에 맞춰 유도해줘서 부담이 덜합니다. 처음엔 긴장했는데 몇 번 하니까 익숙해졌어요.',
  },
  {
    id: 'sample-4', userId: '', userName: '여행 준비', userTag: '여행 준비',
    rating: 5, isSample: true,
    content: '여행 가기 전에 간단한 회화라도 하려고 시작했는데, 실제로 쓸만한 표현 위주로 알려줘서 좋았어요. 공항·카페·길 물어보기 같은 상황별로 나눠서 연습할 수 있어서 만족스럽습니다.',
  },
  {
    id: 'sample-5', userId: '', userName: '꾸준형 수강생', userTag: '꾸준형 수강생',
    rating: 5, isSample: true,
    content: '한 번에 확 늘진 않지만, 꾸준히 하니까 확실히 달라지긴 해요. 예전에는 한 문장도 겁났는데 지금은 일단 뱉고 보는 습관이 생겼습니다. 튜터 바꿔가면서 다양한 스타일 경험한 것도 좋았어요.',
  },
  {
    id: 'sample-6', userId: '', userName: '자기계발', userTag: '자기계발',
    rating: 5, isSample: true,
    content: '업무상 영어 써야 할 일이 많아지는데 따로 공부할 시간이 부족해서 시작했어요. 출퇴근 시간에도 연습이 가능해서 효율이 좋습니다. 실용적인 문장 위주로 반복하니까 확실히 입에 붙어요.',
  },
];

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

  const combined = useMemo(() => {
    if (reviews.length === 0) return SAMPLE_REVIEWS;
    return [...reviews, ...SAMPLE_REVIEWS];
  }, [reviews]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return combined;
    return combined.filter(
      (r) =>
        (r.userName || '').toLowerCase().includes(q) ||
        (r.content || '').toLowerCase().includes(q) ||
        (r.userTag || '').toLowerCase().includes(q)
    );
  }, [combined, searchQuery]);

  const pager = usePaginated(filtered, PAGE_SIZE);

  const avgRating = useMemo(() => {
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, r) => acc + (r.rating || 0), 0);
    return Math.round((sum / filtered.length) * 10) / 10;
  }, [filtered]);

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
            <div className="mt-6 inline-flex items-start gap-2 text-[11px] text-amber-100/90 bg-amber-400/10 border border-amber-300/30 rounded-xl px-4 py-3 leading-relaxed text-left">
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                * 아래 후기는 이해를 돕기 위한 예시입니다.<br />
                * 현재 실제 수강생 후기를 순차적으로 업데이트 중입니다.
              </span>
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
                const isMine = !r.isSample && !!firebaseUser && r.userId === firebaseUser.uid;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Card className="h-full p-6 hover:shadow-lg transition-all relative bg-white border border-slate-100 hover:border-amber-200">
                      {r.isSample && (
                        <span className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          예시
                        </span>
                      )}
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
