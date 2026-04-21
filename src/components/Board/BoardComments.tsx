import { useEffect, useMemo, useState } from 'react';
import {
  MessageCircle, Pin, Shield, Lock, Edit3, Trash2, Check, Loader2, Send, EyeOff,
} from 'lucide-react';
import {
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, orderBy,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { cn } from '@/src/lib/utils';
import { relativeTime } from './boardUtils';

export type BoardComment = {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  content: string;
  isPrivate?: boolean;
  isAdminComment?: boolean;
  createdAt?: any;
  updatedAt?: any;
};

interface BoardCommentsProps {
  collectionName: string; // e.g. "qna_posts"
  postId: string;
  postOwnerId: string; // 게시글 작성자 (비공개 댓글 열람 권한 판정용)
}

export function BoardComments({ collectionName, postId, postOwnerId }: BoardCommentsProps) {
  const { user, firebaseUser, setIsAuthModalOpen, setAuthMode } = useAuth();
  const isAdmin = user?.role === 'admin';
  const myUid = firebaseUser?.uid;

  const [comments, setComments] = useState<BoardComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [draftPrivate, setDraftPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editDraftPrivate, setEditDraftPrivate] = useState(false);

  useEffect(() => {
    const ref = collection(db, collectionName, postId, 'comments');
    const q = query(ref, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setComments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [collectionName, postId]);

  // 관리자 댓글 상단 고정, 이후 시간순
  const ordered = useMemo(() => {
    const admin = comments.filter((c) => c.isAdminComment);
    const rest = comments.filter((c) => !c.isAdminComment);
    return [...admin, ...rest];
  }, [comments]);

  const canSeePrivate = (c: BoardComment) => {
    if (!c.isPrivate) return true;
    if (!myUid) return false;
    return c.userId === myUid || postOwnerId === myUid || isAdmin;
  };

  const handleSubmit = async () => {
    if (!firebaseUser || !user) {
      setAuthMode('signin');
      setIsAuthModalOpen(true);
      return;
    }
    if (draft.trim().length < 2) {
      alert('댓글은 2자 이상 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, collectionName, postId, 'comments'), {
        userId: firebaseUser.uid,
        userName: user.name || '회원',
        userRole: user.role || 'student',
        content: draft.trim(),
        isPrivate: draftPrivate,
        isAdminComment: user.role === 'admin',
        createdAt: serverTimestamp(),
      });
      setDraft('');
      setDraftPrivate(false);
    } catch (err: any) {
      alert('댓글 등록 실패: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (c: BoardComment) => {
    setEditingId(c.id);
    setEditDraft(c.content);
    setEditDraftPrivate(!!c.isPrivate);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
    setEditDraftPrivate(false);
  };

  const saveEdit = async (c: BoardComment) => {
    if (editDraft.trim().length < 2) {
      alert('댓글은 2자 이상 입력해주세요.');
      return;
    }
    try {
      await updateDoc(doc(db, collectionName, postId, 'comments', c.id), {
        content: editDraft.trim(),
        isPrivate: editDraftPrivate,
        updatedAt: serverTimestamp(),
      });
      cancelEdit();
    } catch (err: any) {
      alert('저장 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const handleDelete = async (c: BoardComment) => {
    if (!confirm('이 댓글을 삭제하시겠어요?')) return;
    try {
      await deleteDoc(doc(db, collectionName, postId, 'comments', c.id));
    } catch (err: any) {
      alert('삭제 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  return (
    <section className="mt-10 pt-8 border-t border-slate-100">
      <header className="flex items-center justify-between mb-5">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <MessageCircle size={18} className="text-slate-500" />
          댓글
          <span className="text-sm font-bold text-slate-400">{comments.length}</span>
        </h3>
      </header>

      {/* 댓글 목록 */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-slate-300" size={22} />
          </div>
        ) : ordered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            첫 댓글을 남겨보세요.
          </div>
        ) : (
          ordered.map((c) => {
            const isMine = myUid && c.userId === myUid;
            const canDelete = isMine || isAdmin;
            const visible = canSeePrivate(c);
            const isEditing = editingId === c.id;

            return (
              <article
                key={c.id}
                className={cn(
                  'rounded-2xl border p-4 sm:p-5 transition-shadow',
                  c.isAdminComment
                    ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm'
                    : 'bg-white border-slate-100'
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={c.userName} isAdmin={c.isAdminComment} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-sm">{c.userName}</span>
                      {c.isAdminComment && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white px-2 py-0.5 rounded-full">
                          <Shield size={10} /> 관리자 답변
                        </span>
                      )}
                      {c.isAdminComment && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600">
                          <Pin size={10} /> 상단 고정
                        </span>
                      )}
                      {c.isPrivate && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          <Lock size={10} /> 비공개
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 ml-auto">
                        {relativeTime(c.createdAt)}
                        {c.updatedAt && <span className="ml-1 text-slate-300">(수정됨)</span>}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 resize-none bg-white"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editDraftPrivate}
                              onChange={(e) => setEditDraftPrivate(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Lock size={12} /> 비공개 (작성자·관리자만)
                          </label>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              취소
                            </Button>
                            <Button size="sm" onClick={() => saveEdit(c)} className="gap-1">
                              <Check size={14} /> 저장
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : visible ? (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {c.content}
                      </p>
                    ) : (
                      <p className="inline-flex items-center gap-1.5 text-sm text-slate-400 italic bg-slate-50 px-3 py-2 rounded-lg">
                        <EyeOff size={12} /> 작성자와 관리자만 볼 수 있는 비공개 댓글입니다.
                      </p>
                    )}

                    {!isEditing && (isMine || canDelete) && visible && (
                      <div className="mt-3 flex items-center gap-3">
                        {isMine && (
                          <button
                            onClick={() => startEdit(c)}
                            className="text-[11px] font-bold text-slate-500 hover:text-blue-600 inline-flex items-center gap-1"
                          >
                            <Edit3 size={11} /> 수정
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(c)}
                            className="text-[11px] font-bold text-slate-500 hover:text-red-600 inline-flex items-center gap-1"
                          >
                            <Trash2 size={11} /> 삭제
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* 입력 */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white overflow-hidden focus-within:border-blue-500 transition-colors">
        {firebaseUser ? (
          <>
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
              <Avatar name={user?.name || '회원'} isAdmin={isAdmin} size="sm" />
              <span className="text-xs font-bold text-slate-700">{user?.name || '회원'}</span>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  <Shield size={10} /> 관리자
                </span>
              )}
              <span className="text-[11px] text-slate-400 ml-auto">
                관리자 댓글은 자동으로 상단에 고정됩니다
              </span>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="댓글을 입력하세요"
              className="w-full p-4 text-sm outline-none resize-none"
            />
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/40">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={draftPrivate}
                  onChange={(e) => setDraftPrivate(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <Lock size={12} /> 비공개로 등록 (작성자·관리자만 열람)
              </label>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || draft.trim().length < 2}
                className="gap-1.5 px-4"
              >
                {submitting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                등록
              </Button>
            </div>
          </>
        ) : (
          <div className="p-5 text-center">
            <p className="text-sm text-slate-500 mb-3">댓글을 작성하려면 로그인이 필요합니다.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAuthMode('signin');
                setIsAuthModalOpen(true);
              }}
            >
              로그인
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function Avatar({
  name, isAdmin, size = 'md',
}: {
  name: string;
  isAdmin?: boolean;
  size?: 'sm' | 'md';
}) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const px = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
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
