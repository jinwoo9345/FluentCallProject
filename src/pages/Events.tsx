import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Megaphone, Sparkles, Flame, Gift, PlusCircle, Pencil, Trash2, X, Loader2, Check,
  ArrowLeft, ChevronRight, ExternalLink,
} from 'lucide-react';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { cn } from '@/src/lib/utils';
import {
  RichContentEditor, RichContentView, plainTextPreview,
  extractImageUrls, deleteStorageImagesByUrl,
} from '../components/ui/RichContent';

type EventDoc = {
  id: string;
  title: string;
  summary: string;
  content: string;
  badge?: string;
  badgeAccent?: 'red' | 'blue' | 'amber' | 'emerald' | 'violet';
  ctaLabel?: string;
  ctaLink?: string;
  /** 설정 시 카드 클릭이 상세 모달 대신 이 경로로 바로 이동 (예: 친구추천 → /referral) */
  directLink?: string;
  isActive: boolean;
  order: number;
  createdAt?: any;
  updatedAt?: any;
};

const BADGE_COLORS: Record<NonNullable<EventDoc['badgeAccent']>, string> = {
  red: 'bg-red-100 text-red-700 border-red-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
};

const CARD_ACCENT_BAR: Record<NonNullable<EventDoc['badgeAccent']>, string> = {
  red: 'border-l-red-500',
  blue: 'border-l-blue-500',
  amber: 'border-l-amber-500',
  emerald: 'border-l-emerald-500',
  violet: 'border-l-violet-500',
};

/**
 * Firestore `events` 컬렉션이 비어 있을 때 보여줄 기본 이벤트 2건.
 * 관리자가 한 건이라도 추가하면 이 fallback은 더 이상 사용되지 않는다.
 */
const FALLBACK_EVENTS: EventDoc[] = [
  {
    id: 'fallback-promo',
    title: '프로모션 기간 한정 — 30명 선착순',
    summary:
      '지금 결제 시 전 패키지 정상가 그대로! 30명 선착순 마감 이후에는 모든 수강권이 10% 인상될 예정입니다.',
    content:
      '전 회원 대상 플랫폼 프로모션이 진행 중입니다.\n\n· 8회 179,000원 · 16+1회 329,000원 · 24+2회 419,000원\n· 30명 선착순 마감 후 모든 수강권 10% 인상\n\n원하는 튜터를 선택하시고 결제 화면에서 수강권을 선택해주세요. 결제 순서대로 30명까지만 현재 가격이 보장됩니다.',
    badge: '프로모션',
    badgeAccent: 'red',
    ctaLabel: '튜터 둘러보기',
    ctaLink: '/tutors',
    isActive: true,
    order: 1,
  },
  {
    id: 'fallback-referral',
    title: '친구 추천하고 20,000P 받기',
    summary:
      '친구가 결제를 완료하면 추천인에게 20,000포인트(=20,000원)가 즉시 지급됩니다. 다음 결제 시 자동 할인.',
    content: '',
    badge: '추천 보상',
    badgeAccent: 'blue',
    directLink: '/referral',
    isActive: true,
    order: 2,
  },
];

export default function Events() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [docs, setDocs] = useState<EventDoc[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EventDoc | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('order', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as EventDoc[];
        setDocs(list);
        setLoading(false);
      },
      (err) => {
        console.warn('events fetch failed:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // 관리자가 등록한 이벤트가 한 건도 없으면 fallback 사용 (비활성화는 숨김)
  const events = useMemo<EventDoc[]>(() => {
    const list = docs && docs.length > 0 ? docs : FALLBACK_EVENTS;
    return list.filter((e) => e.isActive !== false);
  }, [docs]);

  const selected = useMemo(
    () => (selectedId ? events.find((e) => e.id === selectedId) || null : null),
    [selectedId, events]
  );

  const handleCreate = () => {
    setEditing(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (e: EventDoc) => {
    setEditing(e);
    setIsEditorOpen(true);
  };

  const handleDelete = async (e: EventDoc) => {
    if (!confirm(`"${e.title}" 이벤트를 삭제하시겠어요? 본문 이미지도 함께 삭제됩니다.`)) return;
    try {
      const urls = extractImageUrls(e.content);
      await deleteDoc(doc(db, 'events', e.id));
      // Storage 이미지는 best-effort 정리 (실패해도 진행)
      deleteStorageImagesByUrl(urls);
      if (selectedId === e.id) setSelectedId(null);
    } catch (err: any) {
      alert('삭제 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  // 상세 보기 모드
  if (selected) {
    return (
      <EventDetail
        event={selected}
        canManage={isAdmin && !selected.id.startsWith('fallback-')}
        onBack={() => setSelectedId(null)}
        onEdit={() => handleEdit(selected)}
        onDelete={() => handleDelete(selected)}
      />
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* 히어로 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
        <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/5 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.25em] border border-blue-400/30 bg-blue-500/15 text-blue-200 rounded-full px-3 py-1 mb-4">
              <Sparkles size={12} /> Events
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center gap-3">
              <Megaphone size={32} className="text-blue-300" />
              현재 진행중인 이벤트
            </h1>
            <p className="mt-3 text-sm text-white/80 leading-relaxed max-w-2xl">
              지금 EnglishBites에서 받을 수 있는 혜택을 한눈에 확인하세요.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {isAdmin && (
          <div className="mb-6 flex items-center justify-between gap-3 p-4 rounded-2xl bg-purple-50 border border-purple-100">
            <div>
              <p className="text-sm font-black text-purple-900">관리자 모드</p>
              <p className="text-xs text-purple-700 mt-0.5">
                새 이벤트를 작성하거나 기존 이벤트를 수정·삭제할 수 있습니다.
                {docs?.length === 0 && ' (현재 등록된 이벤트가 없어 기본 안내가 표시되고 있습니다)'}
              </p>
            </div>
            <Button onClick={handleCreate} className="gap-2 bg-purple-600 hover:bg-purple-700 whitespace-nowrap">
              <PlusCircle size={16} /> 새 이벤트
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        ) : events.length === 0 ? (
          <Card className="p-20 text-center text-slate-400 text-sm border-dashed">
            현재 진행 중인 이벤트가 없습니다.
          </Card>
        ) : (
          <div className="space-y-4">
            {events.map((e, idx) => (
              <EventCard
                key={e.id}
                event={e}
                index={idx}
                canManage={isAdmin && !e.id.startsWith('fallback-')}
                onOpen={() => {
                  // directLink가 설정된 이벤트는 상세 모달 대신 해당 페이지로 바로 이동
                  if (e.directLink) {
                    if (e.directLink.startsWith('http')) {
                      window.open(e.directLink, '_blank', 'noopener,noreferrer');
                    } else {
                      navigate(e.directLink);
                    }
                    return;
                  }
                  setSelectedId(e.id);
                }}
                onEdit={() => handleEdit(e)}
                onDelete={() => handleDelete(e)}
              />
            ))}
          </div>
        )}
      </section>

      {isEditorOpen && (
        <EventEditorModal
          initial={editing}
          onClose={() => {
            setIsEditorOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// 이벤트 카드
// ────────────────────────────────────────────────────────────────────
interface EventCardProps {
  // React JSX 의 reserved key 를 props 타입에 명시해두면 TS strict 검사에서 누락 에러를 피할 수 있다.
  key?: import('react').Key;
  event: EventDoc;
  index: number;
  canManage: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function EventCard({
  event, index, canManage, onOpen, onEdit, onDelete,
}: EventCardProps) {
  const accent = event.badgeAccent || 'blue';
  const badgeClass = BADGE_COLORS[accent];
  const barClass = CARD_ACCENT_BAR[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
    >
      <Card
        className={cn(
          'p-6 sm:p-7 border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all bg-white border-l-4 cursor-pointer',
          barClass
        )}
        onClick={onOpen}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            {index === 0 ? <Flame size={22} /> : <Gift size={22} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {event.badge && (
                <span className={cn('text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border', badgeClass)}>
                  {event.badge}
                </span>
              )}
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                #{index + 1} 진행 중
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
              {event.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-2">
              {event.summary || plainTextPreview(event.content)}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen();
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                자세히 보기 <ChevronRight size={14} />
              </button>
              {canManage && (
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={onEdit}
                    className="text-[11px] font-bold text-slate-500 hover:text-blue-600 inline-flex items-center gap-1"
                  >
                    <Pencil size={11} /> 수정
                  </button>
                  <button
                    onClick={onDelete}
                    className="text-[11px] font-bold text-slate-500 hover:text-red-600 inline-flex items-center gap-1"
                  >
                    <Trash2 size={11} /> 삭제
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────
// 이벤트 상세
// ────────────────────────────────────────────────────────────────────
function EventDetail({
  event, canManage, onBack, onEdit, onDelete,
}: {
  event: EventDoc;
  canManage: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const accent = event.badgeAccent || 'blue';
  const badgeClass = BADGE_COLORS[accent];

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800 mb-5 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> 이벤트 목록으로
        </button>

        <Card className="overflow-hidden p-0">
          <header className="p-8 sm:p-10 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50/60">
            {event.badge && (
              <span className={cn('inline-flex text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border mb-4', badgeClass)}>
                {event.badge}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
              {event.title}
            </h1>
            {event.summary && (
              <p className="mt-4 text-base text-slate-600 leading-relaxed">{event.summary}</p>
            )}

            {canManage && (
              <div className="mt-6 flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={onEdit}>
                  <Pencil size={13} /> 수정
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={onDelete}
                >
                  <Trash2 size={13} /> 삭제
                </Button>
              </div>
            )}
          </header>

          <div className="p-8 sm:p-10">
            <RichContentView content={event.content} />

            {event.ctaLink && (
              <div className="mt-10 pt-6 border-t border-slate-100">
                {event.ctaLink.startsWith('http') ? (
                  <a href={event.ctaLink} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full sm:w-auto gap-2 px-8 py-5 rounded-2xl font-bold shadow-lg shadow-blue-200">
                      {event.ctaLabel || '바로가기'} <ExternalLink size={16} />
                    </Button>
                  </a>
                ) : (
                  <Link to={event.ctaLink}>
                    <Button className="w-full sm:w-auto gap-2 px-8 py-5 rounded-2xl font-bold shadow-lg shadow-blue-200">
                      {event.ctaLabel || '바로가기'} <ChevronRight size={16} />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// 이벤트 작성/수정 모달 (관리자 전용)
// ────────────────────────────────────────────────────────────────────
function EventEditorModal({
  initial, onClose,
}: {
  initial: EventDoc | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [summary, setSummary] = useState(initial?.summary || '');
  const [content, setContent] = useState(initial?.content || '');
  const [badge, setBadge] = useState(initial?.badge || '');
  const [badgeAccent, setBadgeAccent] = useState<EventDoc['badgeAccent']>(initial?.badgeAccent || 'blue');
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel || '');
  const [ctaLink, setCtaLink] = useState(initial?.ctaLink || '');
  const [directLink, setDirectLink] = useState(initial?.directLink || '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [order, setOrder] = useState<number>(initial?.order ?? 10);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (!summary.trim()) {
      alert('카드에 표시될 요약을 입력해주세요.');
      return;
    }
    // directLink가 설정된 경우 상세 본문은 표시되지 않으므로 검증을 완화한다.
    if (!directLink.trim() && !content.trim()) {
      alert('상세 본문을 입력하거나, 카드 클릭 시 이동할 링크(상세 페이지 직접 이동)를 지정해주세요.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        badge: badge.trim() || null,
        badgeAccent: badgeAccent || 'blue',
        ctaLabel: ctaLabel.trim() || null,
        ctaLink: ctaLink.trim() || null,
        directLink: directLink.trim() || null,
        isActive,
        order: Number(order) || 10,
        updatedAt: serverTimestamp(),
      };
      if (initial) {
        await updateDoc(doc(db, 'events', initial.id), payload);
      } else {
        await addDoc(collection(db, 'events'), {
          ...payload,
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
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {initial ? '이벤트 수정' : '새 이벤트 작성'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                본문에는 원하는 위치에 이미지를 끼워 넣을 수 있습니다.
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <X size={22} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  뱃지 라벨 (선택)
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="예: 프로모션 / 추천 보상"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  뱃지 색상
                </label>
                <select
                  value={badgeAccent}
                  onChange={(e) => setBadgeAccent(e.target.value as EventDoc['badgeAccent'])}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="blue">Blue</option>
                  <option value="red">Red</option>
                  <option value="amber">Amber</option>
                  <option value="emerald">Emerald</option>
                  <option value="violet">Violet</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="한 문장으로 이벤트를 표현해주세요"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-bold outline-none focus:border-blue-500"
                maxLength={120}
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                카드 요약 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                placeholder="카드에 표시될 짧은 요약 (1~2문장)"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm leading-relaxed outline-none focus:border-blue-500 resize-none"
                maxLength={200}
              />
              <p className="text-[10px] text-slate-400 mt-1 text-right">{summary.length} / 200</p>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                상세 본문 <span className="text-red-500">*</span>
              </label>
              <RichContentEditor
                value={content}
                onChange={setContent}
                storagePathPrefix="events"
                placeholder="상세 본문을 입력하세요. 본문 원하는 위치에 이미지를 끼워 넣을 수 있습니다."
                rows={10}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  CTA 버튼 라벨 (선택)
                </label>
                <input
                  type="text"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="예: 튜터 둘러보기"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  CTA 링크 (선택)
                </label>
                <input
                  type="text"
                  value={ctaLink}
                  onChange={(e) => setCtaLink(e.target.value)}
                  placeholder="예: /tutors 또는 https://..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                카드 클릭 시 바로 이동할 링크 (선택)
              </label>
              <input
                type="text"
                value={directLink}
                onChange={(e) => setDirectLink(e.target.value)}
                placeholder="예: /referral (지정 시 상세 모달 대신 해당 페이지로 직접 이동)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                값이 있으면 사용자가 카드를 클릭할 때 이 페이지로 바로 이동하고, 위 상세 본문/CTA는 사용되지 않습니다.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  노출 순서 (낮을수록 위)
                </label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  공개 상태
                </label>
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">활성화 (목록에 노출)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/60 flex gap-2">
            <Button variant="outline" className="flex-1 py-5 rounded-xl" onClick={onClose}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-5 rounded-xl gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              {initial ? '수정 저장' : '등록하기'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
