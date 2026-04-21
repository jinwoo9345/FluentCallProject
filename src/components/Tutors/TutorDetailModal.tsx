import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Star, MapPin, Globe, Heart, PenSquare, Loader2, Check, Edit3, Trash2,
} from 'lucide-react';
import { Tutor } from '../../types';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, getDocs, limit, orderBy,
} from 'firebase/firestore';
import { cn } from '@/src/lib/utils';

interface TutorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutor: Tutor;
  onRegister: () => void;
}

type TutorReview = {
  id: string;
  tutorId: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  createdAt?: any;
};

function StarRow({ rating, size = 14, interactive = false, onChange }: {
  rating: number; size?: number; interactive?: boolean; onChange?: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(n)}
          className={cn(interactive && 'cursor-pointer hover:scale-110 transition-transform', 'p-0.5')}
        >
          <Star
            size={size}
            className={cn(n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200')}
          />
        </button>
      ))}
    </div>
  );
}

export function TutorDetailModal({ isOpen, onClose, tutor, onRegister }: TutorDetailModalProps) {
  const { user, firebaseUser, toggleWishlist } = useAuth();
  const isWishlisted = user?.wishlist?.includes(tutor.id);
  const canSeePriceBreakdown = user?.role === 'admin' || user?.role === 'tutor';

  const [reviews, setReviews] = useState<TutorReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [myReview, setMyReview] = useState<TutorReview | null>(null);
  const [isWriting, setIsWriting] = useState(false);

  // 실시간 리뷰 구독
  useEffect(() => {
    if (!isOpen) return;
    setReviewsLoading(true);
    const q = query(
      collection(db, 'tutor_reviews'),
      where('tutorId', '==', tutor.id),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as TutorReview[];
        setReviews(list);
        if (firebaseUser) {
          setMyReview(list.find((r) => r.userId === firebaseUser.uid) || null);
        } else {
          setMyReview(null);
        }
        setReviewsLoading(false);
      },
      () => setReviewsLoading(false)
    );
    return () => unsub();
  }, [isOpen, tutor.id, firebaseUser]);

  // 완료된 수업이 있는지 확인 (리뷰 작성 권한)
  useEffect(() => {
    if (!isOpen || !firebaseUser) {
      setCanReview(false);
      return;
    }
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'sessions'),
            where('userId', '==', firebaseUser.uid),
            where('tutorId', '==', tutor.id),
            where('status', '==', 'completed'),
            limit(1)
          )
        );
        setCanReview(!snap.empty);
      } catch {
        setCanReview(false);
      }
    })();
  }, [isOpen, firebaseUser, tutor.id]);

  const handleDeleteMyReview = async () => {
    if (!myReview) return;
    if (!confirm('작성한 리뷰를 삭제하시겠어요?')) return;
    try {
      await deleteDoc(doc(db, 'tutor_reviews', myReview.id));
    } catch (err: any) {
      alert('삭제 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-6 top-6 z-10 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="max-h-[80vh] overflow-y-auto p-8 sm:p-10">
              <div className="flex flex-col sm:flex-row gap-8">
                <div className="shrink-0">
                  <img
                    src={tutor.avatar}
                    alt={tutor.name}
                    className="h-32 w-32 rounded-3xl object-cover shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold text-slate-900">{tutor.name}</h2>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(tutor.id);
                      }}
                      className={`rounded-full p-2 transition-colors ${
                        isWishlisted ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400 hover:text-red-400'
                      }`}
                    >
                      <Heart size={24} fill={isWishlisted ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                      {tutor.tier}
                    </span>
                    <div className="flex items-center gap-1 text-sm font-medium text-amber-500">
                      <Star size={16} fill="currentColor" />
                      {tutor.rating} ({(tutor.reviewCount || 0) + reviews.length} 리뷰)
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={16} />
                      {tutor.location}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Globe size={16} />
                      {tutor.languages.join(', ')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 space-y-8">
                <section>
                  <h3 className="text-lg font-bold text-slate-900">자기소개</h3>
                  <p className="mt-3 text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {tutor.longBio || tutor.bio}
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-slate-900">전문 분야</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tutor.specialties.map((s) => (
                      <span key={s} className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </section>

                {/* 수업 리뷰 */}
                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">수업 리뷰</h3>
                    {firebaseUser && canReview && !myReview && !isWriting && (
                      <Button size="sm" className="gap-1" onClick={() => setIsWriting(true)}>
                        <PenSquare size={14} /> 리뷰 작성
                      </Button>
                    )}
                  </div>

                  {firebaseUser && !canReview && !myReview && (
                    <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                      이 튜터와의 수업을 완료한 뒤에 리뷰를 남길 수 있어요.
                    </p>
                  )}

                  {isWriting && (
                    <TutorReviewForm
                      tutorId={tutor.id}
                      userId={firebaseUser?.uid || ''}
                      userName={user?.name || '회원'}
                      initial={null}
                      onClose={() => setIsWriting(false)}
                    />
                  )}

                  {myReview && !isWriting && (
                    <MyReviewCard
                      review={myReview}
                      onEdit={() => setIsWriting(true)}
                      onDelete={handleDeleteMyReview}
                    />
                  )}

                  <div className="mt-4 space-y-4">
                    {reviewsLoading ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="animate-spin text-slate-300" size={24} />
                      </div>
                    ) : reviews.length > 0 ? (
                      reviews
                        .filter((r) => !myReview || r.id !== myReview.id)
                        .map((review) => (
                          <div key={review.id} className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{review.userName}</span>
                              <StarRow rating={review.rating} />
                            </div>
                            <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{review.content}</p>
                            <span className="mt-2 block text-[10px] text-slate-400">
                              {review.createdAt?.toDate
                                ? review.createdAt.toDate().toLocaleDateString()
                                : ''}
                            </span>
                          </div>
                        ))
                    ) : tutor.reviews && tutor.reviews.length > 0 ? (
                      tutor.reviews.map((review) => (
                        <div key={review.id} className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{review.userName}</span>
                            <StarRow rating={review.rating} />
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{review.comment}</p>
                          <span className="mt-2 block text-[10px] text-slate-400">{review.date}</span>
                        </div>
                      ))
                    ) : !myReview ? (
                      <div className="rounded-2xl bg-slate-50 p-8 text-center border border-slate-100">
                        <p className="text-sm text-slate-500">아직 등록된 리뷰가 없습니다.</p>
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 p-6 sm:px-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">8회 수강권</p>
                  <p className="text-2xl font-black text-slate-900">
                    {((tutor.hourlyRate || 0) * 8 + 69000).toLocaleString()}원
                  </p>
                  {canSeePriceBreakdown && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      회당 {(tutor.hourlyRate || 0).toLocaleString()}원 × 8회 + 서비스 이용료 69,000원
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-0.5">16회 · 24회 패키지는 결제 화면에서 선택</p>
                </div>
                {tutor.enrollDisabled ? (
                  <div className="px-6 py-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">
                      등록 대기
                    </p>
                    <p className="text-sm font-bold text-amber-800">
                      {tutor.disabledMessage || '현재 대기 중'}
                    </p>
                  </div>
                ) : (
                  <Button size="lg" className="px-10 py-6 text-lg font-bold rounded-2xl shadow-lg shadow-blue-200" onClick={onRegister}>
                    등록하기
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function MyReviewCard({
  review, onEdit, onDelete,
}: {
  review: TutorReview;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mt-4 rounded-2xl bg-blue-50 p-4 border border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900">{review.userName}</span>
          <span className="text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white px-2 py-0.5 rounded-full">
            내 리뷰
          </span>
        </div>
        <StarRow rating={review.rating} />
      </div>
      <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{review.content}</p>
      <div className="mt-3 pt-2 border-t border-blue-200/60 flex items-center gap-2 justify-end">
        <button
          onClick={onEdit}
          className="text-xs font-bold text-slate-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Edit3 size={12} /> 수정
        </button>
        <button
          onClick={onDelete}
          className="text-xs font-bold text-slate-600 hover:text-red-600 flex items-center gap-1"
        >
          <Trash2 size={12} /> 삭제
        </button>
      </div>
    </div>
  );
}

function TutorReviewForm({
  tutorId, userId, userName, initial, onClose,
}: {
  tutorId: string;
  userId: string;
  userName: string;
  initial: TutorReview | null;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(initial?.rating || 5);
  const [content, setContent] = useState(initial?.content || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (content.trim().length < 5) {
      alert('리뷰는 5자 이상 작성해주세요.');
      return;
    }
    setSaving(true);
    try {
      if (initial) {
        await updateDoc(doc(db, 'tutor_reviews', initial.id), {
          rating,
          content: content.trim(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'tutor_reviews'), {
          tutorId,
          userId,
          userName,
          rating,
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
    <div className="mt-4 rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-5 space-y-4">
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
          별점
        </label>
        <StarRow rating={rating} size={26} interactive onChange={setRating} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
          수업 후기
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="튜터와의 수업 경험을 자유롭게 남겨주세요. (5자 이상)"
          className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 resize-none bg-white"
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          취소
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
          {initial ? '수정 저장' : '리뷰 등록'}
        </Button>
      </div>
    </div>
  );
}
