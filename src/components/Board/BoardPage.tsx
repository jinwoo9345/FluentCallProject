import { Fragment, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Search, PenSquare, Trash2, Edit3, X, Check, Loader2, ChevronLeft,
  Lock, Eye, EyeOff, MessageCircle, Shield, Clock, Calendar,
  Globe, LockKeyhole, Info,
} from 'lucide-react';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Pagination, usePaginated } from '../ui/Pagination';
import { cn } from '@/src/lib/utils';
import { BoardComments } from './BoardComments';
import { relativeTime, fullTime } from './boardUtils';

const PAGE_SIZE = 10;

export type BoardPost = {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  title: string;
  content: string;
  isPrivate?: boolean;
  commentCount?: number;
  createdAt?: any;
  updatedAt?: any;
};

interface BoardPageProps {
  collectionName: 'qna_posts' | 'info_posts';
  title: string;
  description: string;
  accentColor: 'blue' | 'emerald';
  enableComments?: boolean;
}

const ACCENTS = {
  blue: {
    hero: 'from-slate-900 via-blue-900 to-indigo-900',
    pill: 'bg-blue-500/15 text-blue-200 border-blue-400/30',
    button: 'bg-white text-slate-900 hover:bg-slate-100',
    focus: 'focus-within:border-blue-400',
    badge: 'bg-blue-600 text-white',
    ring: 'ring-blue-500/30',
  },
  emerald: {
    hero: 'from-slate-900 via-emerald-900 to-teal-900',
    pill: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
    button: 'bg-white text-slate-900 hover:bg-slate-100',
    focus: 'focus-within:border-emerald-400',
    badge: 'bg-emerald-600 text-white',
    ring: 'ring-emerald-500/30',
  },
};

export function BoardPage({
  collectionName, title, description, accentColor, enableComments = false,
}: BoardPageProps) {
  const { user, firebaseUser, setIsAuthModalOpen, setAuthMode } = useAuth();
  const isAdmin = user?.role === 'admin';
  const myUid = firebaseUser?.uid;

  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [editing, setEditing] = useState<BoardPost | null>(null);

  const accent = ACCENTS[accentColor];

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPosts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [collectionName]);

  const canSeePostContent = (p: BoardPost) =>
    !p.isPrivate || (!!myUid && (p.userId === myUid || isAdmin));

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => {
      const hay = [p.title, p.userName, canSeePostContent(p) ? p.content : '']
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [posts, searchQuery, myUid, isAdmin]);

  const pager = usePaginated(filtered, PAGE_SIZE);
  const selected = selectedId ? posts.find((p) => p.id === selectedId) : null;

  const handleOpenWrite = () => {
    if (!firebaseUser) {
      setAuthMode('signin');
      setIsAuthModalOpen(true);
      return;
    }
    setEditing(null);
    setIsWriteOpen(true);
  };

  const handleEdit = (post: BoardPost) => {
    setEditing(post);
    setIsWriteOpen(true);
  };

  const handleDelete = async (post: BoardPost) => {
    if (!confirm('이 글을 삭제하시겠어요? 삭제된 글은 복구할 수 없습니다.')) return;
    try {
      await deleteDoc(doc(db, collectionName, post.id));
      if (selectedId === post.id) setSelectedId(null);
    } catch (err: any) {
      alert('삭제 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  if (selected) {
    return (
      <BoardDetail
        post={selected}
        collectionName={collectionName}
        enableComments={enableComments}
        onBack={() => setSelectedId(null)}
        onEdit={() => handleEdit(selected)}
        onDelete={() => handleDelete(selected)}
        canEdit={!!myUid && selected.userId === myUid}
        canDelete={(!!myUid && selected.userId === myUid) || isAdmin}
        canViewContent={canSeePostContent(selected)}
        accent={accent}
      />
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* 히어로 */}
      <section className={cn('relative overflow-hidden bg-gradient-to-br text-white', accent.hero)}>
        <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/5 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <span
              className={cn(
                'inline-block text-[11px] font-black uppercase tracking-[0.25em] border rounded-full px-3 py-1 mb-4',
                accent.pill
              )}
            >
              {collectionName === 'qna_posts' ? 'Q & A' : 'Community'}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{title}</h1>
            <p className="mt-3 text-sm text-white/80 leading-relaxed max-w-2xl">{description}</p>
          </motion.div>

          <div className="mt-8 flex flex-col md:flex-row gap-3">
            <div
              className={cn(
                'flex-1 flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur px-5 py-3.5',
                accent.focus
              )}
            >
              <Search className="text-white/70" size={18} />
              <input
                type="text"
                placeholder="제목·본문·작성자로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-white/60 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-white/70 hover:text-white"
                  title="검색어 지우기"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <Button
              onClick={handleOpenWrite}
              className={cn(
                'gap-2 px-6 py-6 rounded-full font-bold border-none shadow-lg',
                accent.button
              )}
            >
              <PenSquare size={16} /> 글쓰기
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-slate-500">
            전체 <strong className="text-slate-800">{filtered.length.toLocaleString()}</strong>건
            {searchQuery && <span className="ml-1 text-slate-400">· "{searchQuery}" 검색 결과</span>}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        ) : pager.sliced.length === 0 ? (
          <Card className="p-20 text-center text-slate-400 text-sm border-dashed">
            {searchQuery ? '검색 결과가 없습니다.' : '아직 등록된 글이 없습니다. 첫 글을 남겨보세요.'}
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {pager.sliced.map((p: BoardPost) => (
                <Fragment key={p.id}>
                  <PostRow
                    post={p}
                    myUid={myUid}
                    isAdmin={isAdmin}
                    canViewContent={canSeePostContent(p)}
                    accent={accent}
                    onClick={() => setSelectedId(p.id)}
                    onEdit={() => handleEdit(p)}
                    onDelete={() => handleDelete(p)}
                  />
                </Fragment>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-white">
              <Pagination
                currentPage={pager.page}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={pager.setPage}
              />
            </div>
          </>
        )}
      </section>

      {isWriteOpen && (
        <BoardWriteModal
          collectionName={collectionName}
          initial={editing}
          userId={myUid || ''}
          userName={user?.name || '회원'}
          userRole={user?.role}
          userAvatar={user?.avatar}
          accentBadge={accent.badge}
          onClose={() => {
            setIsWriteOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// 목록 행
// ────────────────────────────────────────────────────────────────────
function PostRow({
  post, myUid, isAdmin, canViewContent, accent, onClick, onEdit, onDelete,
}: {
  post: BoardPost;
  myUid?: string;
  isAdmin: boolean;
  canViewContent: boolean;
  accent: typeof ACCENTS[keyof typeof ACCENTS];
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isMine = !!myUid && post.userId === myUid;
  const isAdminAuthor = post.userRole === 'admin';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <Card className="p-5 border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all bg-white">
        <div className="flex items-start gap-4">
          <Avatar name={post.userName} isAdmin={isAdminAuthor} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-sm font-bold text-slate-800">{post.userName}</span>
              {isAdminAuthor && (
                <span className={cn('text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-flex items-center gap-1', accent.badge)}>
                  <Shield size={10} /> 관리자
                </span>
              )}
              <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                <Clock size={11} />
                {relativeTime(post.createdAt)}
              </span>
              {post.updatedAt && <span className="text-[11px] text-slate-300">· 수정됨</span>}
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold">
                {post.isPrivate ? (
                  <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Lock size={10} /> 비공개
                  </span>
                ) : (
                  <span className="text-slate-400 inline-flex items-center gap-1">
                    <Globe size={10} /> 공개
                  </span>
                )}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug line-clamp-1 group-hover:text-blue-700 transition-colors">
              {post.title}
            </h3>
            <p className="mt-1.5 text-sm text-slate-500 line-clamp-2 leading-relaxed">
              {canViewContent
                ? post.content
                : '비공개 글입니다. 작성자와 관리자만 내용을 확인할 수 있어요.'}
            </p>

            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <MessageCircle size={11} />
                  댓글 {post.commentCount || 0}
                </span>
              </div>
              {(isMine || isAdmin) && (
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isMine && (
                    <button
                      onClick={onEdit}
                      className="text-[11px] font-bold text-slate-500 hover:text-blue-600 inline-flex items-center gap-1"
                    >
                      <Edit3 size={11} /> 수정
                    </button>
                  )}
                  {(isMine || isAdmin) && (
                    <button
                      onClick={onDelete}
                      className="text-[11px] font-bold text-slate-500 hover:text-red-600 inline-flex items-center gap-1"
                    >
                      <Trash2 size={11} /> 삭제
                    </button>
                  )}
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
// 상세
// ────────────────────────────────────────────────────────────────────
function BoardDetail({
  post, collectionName, enableComments, onBack, onEdit, onDelete, canEdit, canDelete, canViewContent, accent,
}: {
  post: BoardPost;
  collectionName: string;
  enableComments: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
  canViewContent: boolean;
  accent: typeof ACCENTS[keyof typeof ACCENTS];
}) {
  const isAdminAuthor = post.userRole === 'admin';

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800 mb-5 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> 목록으로
        </button>

        <Card className="overflow-hidden p-0">
          {/* 헤더 (상태 + 타이틀 + 메타) */}
          <header className="p-8 sm:p-10 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50/60">
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full',
                  post.isPrivate
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                )}
              >
                {post.isPrivate ? <LockKeyhole size={11} /> : <Globe size={11} />}
                {post.isPrivate ? '비공개' : '공개'}
              </span>
              {isAdminAuthor && (
                <span className={cn('inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full', accent.badge)}>
                  <Shield size={11} /> 관리자 공지
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
              {post.title}
            </h1>

            <div className="mt-5 flex items-center gap-3">
              <Avatar name={post.userName} isAdmin={isAdminAuthor} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">{post.userName}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1" title={fullTime(post.createdAt)}>
                    <Calendar size={11} />
                    {fullTime(post.createdAt)}
                  </span>
                  {post.updatedAt && (
                    <span className="text-slate-400">· 수정됨 ({relativeTime(post.updatedAt)})</span>
                  )}
                </div>
              </div>
              {(canEdit || canDelete) && (
                <div className="flex items-center gap-2 self-start">
                  {canEdit && (
                    <Button variant="outline" size="sm" className="gap-1" onClick={onEdit}>
                      <Edit3 size={13} /> 수정
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={onDelete}
                    >
                      <Trash2 size={13} /> 삭제
                    </Button>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* 본문 */}
          <div className="p-8 sm:p-10">
            {canViewContent ? (
              <article className="prose prose-slate max-w-none text-slate-700 leading-[1.8] whitespace-pre-wrap text-[15px]">
                {post.content}
              </article>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/60 p-10 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                  <EyeOff size={22} />
                </div>
                <p className="font-bold text-slate-800 mb-1">비공개 글입니다</p>
                <p className="text-sm text-slate-500">작성자와 관리자만 내용을 확인할 수 있어요.</p>
              </div>
            )}

            {/* 댓글 */}
            {enableComments && canViewContent && (
              <BoardComments
                collectionName={collectionName}
                postId={post.id}
                postOwnerId={post.userId}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// 글쓰기 모달
// ────────────────────────────────────────────────────────────────────
function BoardWriteModal({
  collectionName, initial, userId, userName, userRole, userAvatar, accentBadge, onClose,
}: {
  collectionName: 'qna_posts' | 'info_posts';
  initial: BoardPost | null;
  userId: string;
  userName: string;
  userRole?: string;
  userAvatar?: string;
  accentBadge: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(new Date());

  // 작성 시간 실시간 업데이트 (1분 단위)
  useEffect(() => {
    if (initial) return;
    const t = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(t);
  }, [initial]);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (content.trim().length < 5) {
      alert('내용은 5자 이상 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      if (initial) {
        await updateDoc(doc(db, collectionName, initial.id), {
          title: title.trim(),
          content: content.trim(),
          isPrivate,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, collectionName), {
          userId,
          userName,
          userRole: userRole || 'student',
          title: title.trim(),
          content: content.trim(),
          isPrivate,
          commentCount: 0,
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* 헤더 */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {initial ? '글 수정' : '새 글 작성'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              게시판 운영 규칙에 맞지 않는 글은 관리자에 의해 삭제될 수 있습니다.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={22} />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* 작성자·시간 프리뷰 */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center flex-shrink-0">
              {userAvatar ? (
                <img src={userAvatar} alt="me" className="h-full w-full object-cover" />
              ) : (
                <span className="font-black text-slate-500">
                  {(userName || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-slate-900 text-sm">{userName}</p>
                {userRole === 'admin' && (
                  <span className={cn('inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full', accentBadge)}>
                    <Shield size={10} /> 관리자
                  </span>
                )}
                {userRole === 'tutor' && (
                  <span className="inline-flex text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    강사
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 inline-flex items-center gap-1">
                <Clock size={11} />
                {initial ? '수정 시각은 저장 시 자동 기록됩니다' : `작성 시각 · ${now.toLocaleString('ko-KR')}`}
              </p>
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="한 문장으로 요약해 주세요"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-bold outline-none focus:border-blue-500"
              maxLength={120}
            />
            <p className="text-[10px] text-slate-400 mt-1 text-right">{title.length} / 120</p>
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder="구체적인 상황과 질문을 남겨주시면 정확한 답변을 받을 수 있어요."
              className="w-full rounded-xl border border-slate-200 p-4 text-sm leading-relaxed outline-none focus:border-blue-500 resize-y"
            />
          </div>

          {/* 공개/비공개 */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              공개 설정
            </label>
            <div className="grid grid-cols-2 gap-2">
              <VisibilityOption
                selected={!isPrivate}
                icon={Eye}
                title="공개"
                desc="모든 방문자가 읽을 수 있어요"
                onClick={() => setIsPrivate(false)}
              />
              <VisibilityOption
                selected={isPrivate}
                icon={Lock}
                title="비공개"
                desc="작성자·관리자만 열람 가능"
                onClick={() => setIsPrivate(true)}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-start gap-1">
              <Info size={11} className="mt-0.5 flex-shrink-0" />
              비공개 글이어도 관리자는 열람·답변이 가능합니다.
            </p>
          </div>
        </div>

        {/* 푸터 */}
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
  );
}

function VisibilityOption({
  selected, icon: Icon, title, desc, onClick,
}: {
  selected: boolean;
  icon: any;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left p-4 rounded-2xl border-2 transition-all',
        selected
          ? 'border-blue-600 bg-blue-50 shadow-sm'
          : 'border-slate-100 bg-white hover:border-slate-200'
      )}
    >
      <div
        className={cn(
          'inline-flex h-8 w-8 rounded-xl items-center justify-center mb-2',
          selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
        )}
      >
        <Icon size={16} />
      </div>
      <p className={cn('font-bold text-sm', selected ? 'text-blue-700' : 'text-slate-800')}>
        {title}
      </p>
      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
    </button>
  );
}

function Avatar({
  name, isAdmin, size = 'md',
}: {
  name: string;
  isAdmin?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const px = size === 'sm' ? 'h-7 w-7 text-xs' : size === 'lg' ? 'h-11 w-11 text-base' : 'h-9 w-9 text-sm';
  return (
    <div
      className={cn(
        'flex-shrink-0 rounded-full flex items-center justify-center font-black',
        px,
        isAdmin
          ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
          : 'bg-slate-200 text-slate-600'
      )}
    >
      {initial}
    </div>
  );
}
