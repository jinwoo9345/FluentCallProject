import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Search, PenSquare, Trash2, Edit3, X, Check, Loader2, ChevronLeft,
  MessageSquare, ArrowUpDown,
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

const PAGE_SIZE = 10;

export type BoardPost = {
  id: string;
  userId: string;
  userName: string;
  title: string;
  content: string;
  createdAt?: any;
  updatedAt?: any;
};

interface BoardPageProps {
  collectionName: 'qna_posts' | 'info_posts';
  title: string;
  description: string;
  accentColor: 'blue' | 'emerald';
}

export function BoardPage({ collectionName, title, description, accentColor }: BoardPageProps) {
  const { user, firebaseUser, setIsAuthModalOpen, setAuthMode } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [editing, setEditing] = useState<BoardPost | null>(null);

  const accent = {
    blue: {
      bgBand: 'from-blue-600 to-indigo-700',
      badge: 'bg-blue-50 text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-500',
    },
    emerald: {
      bgBand: 'from-emerald-600 to-teal-700',
      badge: 'bg-emerald-50 text-emerald-600',
      button: 'bg-emerald-600 hover:bg-emerald-500',
    },
  }[accentColor];

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

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.content || '').toLowerCase().includes(q) ||
        (p.userName || '').toLowerCase().includes(q)
    );
  }, [posts, searchQuery]);

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
    if (!confirm('이 글을 삭제하시겠어요?')) return;
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
        onBack={() => setSelectedId(null)}
        onEdit={() => handleEdit(selected)}
        onDelete={() => handleDelete(selected)}
        canEdit={!!firebaseUser && selected.userId === firebaseUser.uid}
        canDelete={(!!firebaseUser && selected.userId === firebaseUser.uid) || isAdmin}
      />
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className={cn('bg-gradient-to-br text-white', accent.bgBand)}>
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{title}</h1>
            <p className="mt-3 text-sm text-white/80 leading-relaxed max-w-2xl">{description}</p>
          </motion.div>

          <div className="mt-8 flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur px-5 py-3 focus-within:border-white/50">
              <Search className="text-white/70" size={18} />
              <input
                type="text"
                placeholder="제목·본문·작성자로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-white/60 outline-none"
              />
            </div>
            <Button
              onClick={handleOpenWrite}
              className="gap-2 px-6 py-6 rounded-full bg-white text-slate-900 hover:bg-slate-100 font-bold border-none shadow-lg"
            >
              <PenSquare size={16} /> 글쓰기
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        ) : (
          <>
            <Card className="overflow-hidden p-0">
              <div className="hidden md:grid grid-cols-[1fr_120px_120px_120px] gap-4 px-6 py-3 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">
                <span>제목</span>
                <span>작성자</span>
                <span>작성일</span>
                <span className="flex items-center gap-1">
                  <ArrowUpDown size={12} /> 관리
                </span>
              </div>

              {pager.sliced.length === 0 ? (
                <div className="p-16 text-center text-slate-400 text-sm">
                  {searchQuery ? '검색 결과가 없습니다.' : '아직 등록된 글이 없습니다. 첫 글을 남겨보세요.'}
                </div>
              ) : (
                pager.sliced.map((p) => {
                  const isMine = !!firebaseUser && p.userId === firebaseUser.uid;
                  const canDelete = isMine || isAdmin;
                  return (
                    <div
                      key={p.id}
                      className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_120px] gap-2 md:gap-4 px-6 py-4 border-b border-slate-100 last:border-none hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => setSelectedId(p.id)}
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{p.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 md:hidden">
                          {p.userName} ·{' '}
                          {p.createdAt?.toDate
                            ? p.createdAt.toDate().toLocaleDateString()
                            : ''}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{p.content}</p>
                      </div>
                      <span className="hidden md:block text-sm text-slate-600 font-medium truncate">
                        {p.userName}
                      </span>
                      <span className="hidden md:block text-xs text-slate-400 self-center">
                        {p.createdAt?.toDate
                          ? p.createdAt.toDate().toLocaleDateString()
                          : '-'}
                      </span>
                      <div
                        className="hidden md:flex items-center gap-2 self-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isMine && (
                          <button
                            onClick={() => handleEdit(p)}
                            className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1"
                          >
                            <Edit3 size={12} /> 수정
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(p)}
                            className="text-xs font-bold text-slate-500 hover:text-red-600 flex items-center gap-1"
                          >
                            <Trash2 size={12} /> 삭제
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              <Pagination
                currentPage={pager.page}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={pager.setPage}
              />
            </Card>
          </>
        )}
      </section>

      {isWriteOpen && (
        <BoardWriteModal
          collectionName={collectionName}
          initial={editing}
          userId={firebaseUser?.uid || ''}
          userName={user?.name || '회원'}
          buttonClassName={accent.button}
          onClose={() => {
            setIsWriteOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function BoardDetail({
  post, onBack, onEdit, onDelete, canEdit, canDelete,
}: {
  post: BoardPost;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800 mb-5"
        >
          <ChevronLeft size={16} /> 목록으로
        </button>

        <Card className="p-8 sm:p-10">
          <header className="border-b border-slate-100 pb-5 mb-5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
              {post.title}
            </h1>
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <MessageSquare size={14} /> {post.userName}
              </span>
              <span>·</span>
              <span>
                {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : ''}
              </span>
              {post.updatedAt && (
                <>
                  <span>·</span>
                  <span className="text-slate-400">수정됨</span>
                </>
              )}
            </div>
          </header>

          <article className="text-slate-700 leading-relaxed whitespace-pre-wrap text-[15px]">
            {post.content}
          </article>

          {(canEdit || canDelete) && (
            <footer className="mt-10 pt-5 border-t border-slate-100 flex items-center gap-2 justify-end">
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
            </footer>
          )}
        </Card>
      </div>
    </div>
  );
}

function BoardWriteModal({
  collectionName, initial, userId, userName, onClose, buttonClassName,
}: {
  collectionName: 'qna_posts' | 'info_posts';
  initial: BoardPost | null;
  userId: string;
  userName: string;
  onClose: () => void;
  buttonClassName: string;
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      if (initial) {
        await updateDoc(doc(db, collectionName, initial.id), {
          title: title.trim(),
          content: content.trim(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, collectionName), {
          userId,
          userName,
          title: title.trim(),
          content: content.trim(),
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
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            {initial ? '글 수정' : '새 글 작성'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder="내용을 입력하세요"
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
              className={cn('flex-1 py-5 rounded-xl gap-2 text-white border-none', buttonClassName)}
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              {initial ? '수정하기' : '등록하기'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
