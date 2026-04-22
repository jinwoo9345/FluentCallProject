import { Fragment } from 'react';
import {
  Calendar, Clock, ChevronRight, Award, BookOpen,
  User as UserIcon, Settings, School, Sparkles, Bell, DollarSign,
  Heart, CreditCard, Share2, Copy, Check, Gift, Loader2,
  Star, MessageSquare,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { useSessions } from '../hooks/useSessions';
import { useTutors } from '../hooks/useTutors';
import { PointTransferModal } from '../components/Payment/PointTransferModal';
import { ProfileEditModal } from '../components/Dashboard/ProfileEditModal';
import { ConsultationForm } from '../components/Consultation/ConsultationForm';
import { Pagination, usePaginated } from '../components/ui/Pagination';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { shareReferralCode } from '../lib/kakao';
import { SERVICE_FEE } from '../constants';

const USER_PAGE_SIZE = 10;

type TabType = 'sessions' | 'payments' | 'consultations';

export default function Dashboard() {
  const { user, firebaseUser, loading: authLoading, isAuthReady } = useAuth();
  const { sessions, loading: sessionsLoading } = useSessions(firebaseUser?.uid, user?.role);
  const { tutors, loading: tutorsLoading } = useTutors();
  
  const [activeTab, setActiveTab] = useState<TabType>('sessions');
  const [payments, setPayments] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [tutorApp, setTutorApp] = useState<any | null>(null);

  // 매칭/결제 완료 실시간 알림 (학생·튜터 공통)
  const [matchAlert, setMatchAlert] = useState<null | {
    role: 'student' | 'tutor';
    payment: any;
  }>(null);
  const seenCompletedIds = useRef<Set<string>>(new Set());

  // 강사 본인 hourlyRate 편집용
  const [myTutorDoc, setMyTutorDoc] = useState<any | null>(null);
  const [rateInput, setRateInput] = useState('');
  const [rateSaving, setRateSaving] = useState(false);

  // Safety: Ensure user and wishlist exist before filtering
  const wishlistedTutors = tutors.filter(t => user?.wishlist?.includes(t.id) || false);

  // 내가 결제한 강사 (payments → tutorId)
  const registeredTutors = (() => {
    const ids = new Set<string>();
    for (const p of payments) {
      if (p.tutorId) ids.add(p.tutorId);
    }
    return tutors.filter((t) => ids.has(t.id));
  })();

  // 내가 남긴 후기 (플랫폼 + 튜터)
  const [myPlatformReviews, setMyPlatformReviews] = useState<any[]>([]);
  const [myTutorReviews, setMyTutorReviews] = useState<any[]>([]);
  const [myReviewsLoading, setMyReviewsLoading] = useState(false);

  const paymentsPage = usePaginated(payments, USER_PAGE_SIZE);
  const consultsPage = usePaginated(consultations, USER_PAGE_SIZE);

  // Fetch Payment & Consultation History
  useEffect(() => {
    if (!firebaseUser || !isAuthReady) return;
    
    async function fetchHistory() {
      setLoadingHistory(true);
      try {
        // Fetch Payments — 대기/완료 모두 노출 (취소·실패는 제외)
        const pQuery = query(
          collection(db, 'payments'),
          where('userId', '==', firebaseUser.uid),
          orderBy('createdAt', 'desc')
        );
        const pSnap = await getDocs(pQuery);
        setPayments(
          pSnap.docs
            .map(d => ({ id: d.id, ...(d.data() as any) }))
            .filter(p => p.status === 'completed' || p.status === 'pending' || !p.status)
        );

        // Fetch Consultations
        const cQuery = query(
          collection(db, 'consultations'), 
          where('userId', '==', firebaseUser.uid),
          orderBy('createdAt', 'desc')
        );
        const cSnap = await getDocs(cQuery);
        setConsultations(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching dashboard history:', err);
      } finally {
        setLoadingHistory(false);
      }
    }

    fetchHistory();
  }, [firebaseUser, isAuthReady]);

  // 결제 상태 실시간 구독 — 학생: 내 결제 / 튜터: 나에게 매칭된 결제
  useEffect(() => {
    if (!firebaseUser || !isAuthReady) return;

    const isTutor = user?.role === 'tutor';
    const field = isTutor ? 'tutorId' : 'userId';
    const q = query(
      collection(db, 'payments'),
      where(field, '==', firebaseUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        const visible = all.filter(p =>
          p.status === 'completed' || p.status === 'pending' || !p.status
        );

        // 첫 로드 시 현재 completed IDs를 '이미 본 것'으로 초기화 (알림 폭탄 방지)
        if (seenCompletedIds.current.size === 0) {
          all.forEach(p => {
            if (p.status === 'completed') seenCompletedIds.current.add(p.id);
          });
        } else {
          // 새롭게 completed가 된 결제를 감지 → 알림
          const newlyCompleted = all.find(
            (p) => p.status === 'completed' && !seenCompletedIds.current.has(p.id)
          );
          if (newlyCompleted) {
            seenCompletedIds.current.add(newlyCompleted.id);
            setMatchAlert({
              role: isTutor ? 'tutor' : 'student',
              payment: newlyCompleted,
            });
            // 10초 뒤 자동 닫힘
            setTimeout(() => setMatchAlert(null), 10000);
          }
        }

        // 학생인 경우 결제 내역 상태도 실시간으로 갱신
        if (!isTutor) setPayments(visible);
      },
      (err) => console.warn('payments subscription failed:', err)
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, isAuthReady, user?.role]);

  // 내가 남긴 후기 (플랫폼 + 튜터) 실시간 구독
  useEffect(() => {
    if (!firebaseUser || !isAuthReady) return;
    setMyReviewsLoading(true);

    const qPlatform = query(
      collection(db, 'platform_reviews'),
      where('userId', '==', firebaseUser.uid)
    );
    const qTutor = query(
      collection(db, 'tutor_reviews'),
      where('userId', '==', firebaseUser.uid)
    );

    const unsub1 = onSnapshot(
      qPlatform,
      (snap) => {
        setMyPlatformReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setMyReviewsLoading(false);
      },
      () => setMyReviewsLoading(false)
    );
    const unsub2 = onSnapshot(
      qTutor,
      (snap) => {
        setMyTutorReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      }
    );
    return () => {
      unsub1();
      unsub2();
    };
  }, [firebaseUser, isAuthReady]);

  const handleDeleteMyReview = async (type: 'platform' | 'tutor', id: string) => {
    if (!confirm('이 후기를 삭제하시겠어요?')) return;
    try {
      const col = type === 'platform' ? 'platform_reviews' : 'tutor_reviews';
      await deleteDoc(doc(db, col, id));
    } catch (err: any) {
      alert('삭제 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  // 튜터 본인 문서 조회 (수업료 편집용)
  useEffect(() => {
    if (!firebaseUser || user?.role !== 'tutor') {
      setMyTutorDoc(null);
      return;
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'tutors', firebaseUser.uid));
        if (snap.exists()) {
          const data = { id: snap.id, ...(snap.data() as any) };
          setMyTutorDoc(data);
          setRateInput(String(data.hourlyRate || ''));
        }
      } catch (err) {
        console.warn('내 튜터 문서 조회 실패:', err);
      }
    })();
  }, [firebaseUser, user?.role]);

  const handleSaveMyRate = async () => {
    if (!firebaseUser || !myTutorDoc) return;
    const rate = Number(rateInput);
    if (!Number.isFinite(rate) || rate <= 0) {
      alert('올바른 회당 가격을 입력해주세요.');
      return;
    }
    setRateSaving(true);
    try {
      await updateDoc(doc(db, 'tutors', firebaseUser.uid), { hourlyRate: rate });
      setMyTutorDoc({ ...myTutorDoc, hourlyRate: rate });
      alert('회당 가격이 저장되었습니다.');
    } catch (err: any) {
      alert('저장 실패: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setRateSaving(false);
    }
  };

  // 강사 신청 상태 조회
  useEffect(() => {
    if (!firebaseUser || !user?.tutorApplicationId) {
      setTutorApp(null);
      return;
    }
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'tutor_applications'), where('userId', '==', firebaseUser.uid))
        );
        if (!snap.empty) {
          // 가장 최근 문서 하나 사용
          const latest = snap.docs
            .map(d => ({ id: d.id, ...(d.data() as any) }))
            .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0];
          setTutorApp(latest);
        }
      } catch (err) {
        console.warn('강사 신청 조회 실패:', err);
      }
    })();
  }, [firebaseUser, user?.tutorApplicationId]);

  const handleCopyCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKakaoShare = () => {
    if (user?.referralCode) {
      shareReferralCode(user.referralCode, user.name || 'EnglishBites 회원');
    }
  };

  // 1. Loading State
  if (authLoading || !isAuthReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium">강의실 입장 중...</p>
      </div>
    );
  }

  // 2. Not Logged In
  if (!firebaseUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="bg-slate-50 p-6 rounded-full mb-6">
          <UserIcon size={48} className="text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">로그인이 필요한 서비스입니다.</h2>
        <p className="mt-2 text-slate-600 mb-8">수업 일정을 확인하려면 로그인해 주세요.</p>
        <Button onClick={() => window.location.href = '/'}>메인으로 가기</Button>
      </div>
    );
  }

  // 3. Consultation Hard Blocker (Real implementation)
  if (user?.role === 'student' && !user?.hasCompletedConsultation) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">환영합니다, {user?.name || '수강생'}님!</h1>
          <p className="text-slate-600 font-medium bg-blue-50 inline-block px-4 py-2 rounded-full border border-blue-100 text-sm">
            본격적인 수업 시작 전, 먼저 학습 상담을 완료해 주세요.
          </p>
        </div>
        <ConsultationForm 
          userId={firebaseUser.uid} 
          onComplete={() => window.location.reload()} 
        />
      </div>
    );
  }

  const stats = [
    { label: '완료 수업', value: sessions.filter(s => s.status === 'completed').length.toString(), icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '학습 시간', value: `${sessions.filter(s => s.status === 'completed').length * 25}m`, icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '보유 포인트', value: (user?.credits || 0).toLocaleString(), icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* 매칭 완료 실시간 알림 (결제 확정 직후) */}
      {matchAlert && (
        <div className="mb-6">
          <Card className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none shadow-2xl relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                {matchAlert.role === 'tutor' ? <Bell size={22} /> : <Sparkles size={22} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-blue-200 mb-1">
                  {matchAlert.role === 'tutor' ? '새로운 학생 매칭' : '결제 확정 · 매칭 진행'}
                </p>
                {matchAlert.role === 'tutor' ? (
                  <p className="text-base font-bold leading-relaxed">
                    <strong>{matchAlert.payment.depositorName || '수강생'}</strong>님이
                    <strong> {matchAlert.payment.productName}</strong>을(를) 결제 완료했습니다.
                    곧 상담 매니저가 수업 일정을 전달드립니다.
                  </p>
                ) : (
                  <p className="text-base font-bold leading-relaxed">
                    입금이 확인되어 <strong>{matchAlert.payment.productName}</strong>이(가)
                    활성화되었습니다. 튜터와의 수업 매칭이 곧 진행됩니다!
                  </p>
                )}
              </div>
              <button
                onClick={() => setMatchAlert(null)}
                className="text-white/60 hover:text-white text-lg"
                aria-label="닫기"
              >
                ×
              </button>
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Main Content */}
        <div className="flex-1 space-y-8">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">대시보드</h1>
              <p className="mt-1 text-slate-600">수업 일정과 내역을 관리하세요.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-100 flex items-center justify-center">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon size={20} className="text-slate-400" />
                )}
              </div>
              <span className="font-bold text-slate-900">{user?.name || '회원'}님</span>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs"
                onClick={() => setIsProfileEditOpen(true)}
              >
                <Settings size={14} /> 프로필 수정
              </Button>
            </div>
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat, idx) => (
              <Card key={idx} className="flex items-center gap-4 py-6">
                <div className={cn('rounded-2xl p-3', stat.bg, stat.color)}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Detailed Tabs Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
              {['sessions', 'payments', 'consultations'].map((t) => (
                <button 
                  key={t}
                  onClick={() => setActiveTab(t as TabType)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-sm font-bold transition-all capitalize",
                    activeTab === t ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {t === 'sessions' ? '수업 일정' : t === 'payments' ? '결제 내역' : '상담 내역'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {loadingHistory ? (
                <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-slate-200" size={32} /></div>
              ) : (
                <>
                  {activeTab === 'sessions' && (
                    <SessionsPanel sessions={sessions} tutors={tutors} />
                  )}

                  {activeTab === 'payments' && (
                    <div className="space-y-4">
                      {payments.length === 0 ? (
                        <Card className="p-12 text-center text-slate-500 border-dashed">
                          결제 내역이 없습니다.
                        </Card>
                      ) : (
                        paymentsPage.sliced.map((p) => {
                          const isPending = p.status === 'pending' || !p.status;
                          return (
                            <Card key={p.id} className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  'h-12 w-12 rounded-xl flex items-center justify-center',
                                  isPending ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                                )}>
                                  <CreditCard size={24} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-900">{p.productName}</h3>
                                    <span className={cn(
                                      'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full',
                                      isPending ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                    )}>
                                      {isPending ? '입금 대기' : '완료'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-500">
                                    {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : '날짜 미상'}
                                    {isPending && p.depositorName && ` · 입금자: ${p.depositorName}`}
                                  </p>
                                </div>
                              </div>
                              <span className="text-lg font-black text-slate-900">{(p.amount || 0).toLocaleString()}원</span>
                            </Card>
                          );
                        })
                      )}
                      <Pagination
                        currentPage={paymentsPage.page}
                        totalItems={payments.length}
                        pageSize={USER_PAGE_SIZE}
                        onPageChange={paymentsPage.setPage}
                        className="rounded-2xl border border-slate-100 bg-white"
                      />
                    </div>
                  )}

                  {activeTab === 'consultations' && (
                    <div className="space-y-4">
                      {consultations.length === 0 ? (
                        <Card className="p-12 text-center text-slate-500 border-dashed">
                          상담 신청 내역이 없습니다.
                        </Card>
                      ) : (
                        consultsPage.sliced.map((c) => (
                          <Card key={c.id} className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                                  c.status === 'pending' ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
                                )}>
                                  {c.status === 'pending' ? '상담 대기 중' : '상담 완료'}
                                </span>
                                <h3 className="text-lg font-bold text-slate-900 mt-2">무료 학습 상담</h3>
                              </div>
                              <p className="text-xs text-slate-400">
                                {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString() : ''}
                              </p>
                            </div>
                            <div className="space-y-2 text-sm text-slate-600">
                              <p><strong>연락수단:</strong> {c.contactType} ({c.contactValue})</p>
                              <p><strong>희망시간:</strong> {c.availableTime}</p>
                              <p className="line-clamp-2"><strong>학습목표:</strong> {c.motivation}</p>
                            </div>
                          </Card>
                        ))
                      )}
                      <Pagination
                        currentPage={consultsPage.page}
                        totalItems={consultations.length}
                        pageSize={USER_PAGE_SIZE}
                        onPageChange={consultsPage.setPage}
                        className="rounded-2xl border border-slate-100 bg-white"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* 등록한 강사 Section */}
          {user?.role === 'student' && (
            <section className="pt-4">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <School size={20} className="text-indigo-600" /> 등록한 강사
              </h2>
              {registeredTutors.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 border-dashed">
                  아직 결제한 수업이 없습니다. 튜터를 둘러보고 수업을 시작해 보세요.
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {registeredTutors.map((tutor) => {
                    const hasReview = myTutorReviews.some((r) => r.tutorId === tutor.id);
                    return (
                      <Card key={tutor.id} className="flex items-center gap-4 p-4 hover:shadow-md transition-shadow">
                        <img
                          src={tutor.avatar}
                          alt={tutor.name}
                          className="h-12 w-12 rounded-xl object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm truncate">{tutor.name}</h3>
                          <p className="text-[10px] text-slate-500 line-clamp-1 uppercase tracking-tight font-bold">
                            {tutor.specialties.slice(0, 2).join(' · ')}
                          </p>
                          {hasReview ? (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                              <Check size={10} /> 리뷰 작성 완료
                            </span>
                          ) : (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600">
                              <Star size={10} /> 리뷰 미작성
                            </span>
                          )}
                        </div>
                        <ChevronRight size={18} className="text-slate-300" />
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* 내가 남긴 후기 Section */}
          {user?.role === 'student' && (
            <section className="pt-4">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MessageSquare size={20} className="text-blue-600" /> 내가 남긴 후기
              </h2>
              {myReviewsLoading ? (
                <Card className="p-8 flex justify-center border-dashed">
                  <Loader2 className="animate-spin text-slate-300" size={20} />
                </Card>
              ) : myPlatformReviews.length === 0 && myTutorReviews.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 border-dashed">
                  아직 작성한 후기가 없습니다. 수강생 후기·튜터 리뷰를 남겨보세요.
                </Card>
              ) : (
                <div className="space-y-3">
                  {myTutorReviews.map((r) => {
                    const tutor = tutors.find((t) => t.id === r.tutorId);
                    return (
                      <Card key={`tr-${r.id}`} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                튜터 리뷰
                              </span>
                              <span className="text-sm font-bold text-slate-800 truncate">
                                {tutor?.name || '튜터'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-amber-500 mb-1">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <Star
                                  key={n}
                                  size={12}
                                  className={n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                                />
                              ))}
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2 whitespace-pre-wrap">
                              {r.content}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteMyReview('tutor', r.id)}
                            className="text-[10px] font-bold text-slate-400 hover:text-red-600 flex-shrink-0"
                          >
                            삭제
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                  {myPlatformReviews.map((r) => (
                    <Card key={`pr-${r.id}`} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              플랫폼 후기
                            </span>
                            {r.userTag && (
                              <span className="text-xs text-slate-500">#{r.userTag}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-amber-500 mb-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                size={12}
                                className={n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                              />
                            ))}
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2 whitespace-pre-wrap">
                            {r.content}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteMyReview('platform', r.id)}
                          className="text-[10px] font-bold text-slate-400 hover:text-red-600 flex-shrink-0"
                        >
                          삭제
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Live Wishlist Section */}
          <section className="pt-4">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Heart size={20} className="text-red-500 fill-current" /> 찜한 강사
            </h2>
            {wishlistedTutors.length === 0 ? (
              <Card className="p-8 text-center text-slate-500 border-dashed">
                마음에 드는 튜터를 하트로 표시해 보세요.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {wishlistedTutors.map(tutor => (
                  <Card key={tutor.id} className="flex items-center gap-4 p-4 hover:shadow-md transition-shadow">
                    <img src={tutor.avatar} alt={tutor.name} className="h-12 w-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 text-sm">{tutor.name}</h3>
                      <p className="text-[10px] text-slate-500 line-clamp-1 uppercase tracking-tight font-bold">{tutor.specialties.slice(0, 2).join(' · ')}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          {/* My Info Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <UserIcon size={18} className="text-blue-600" /> 내 정보
              </h3>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => setIsProfileEditOpen(true)}>
                수정
              </Button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <img
                src={user?.avatar || `https://picsum.photos/seed/${firebaseUser.uid}/200/200`}
                alt="프로필"
                className="w-14 h-14 rounded-2xl object-cover border border-slate-100"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="font-bold text-slate-900">{user?.name || '회원'}</p>
                <p className="text-xs text-slate-500 truncate max-w-[160px]">{user?.email || '이메일 미등록'}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                <span className="font-bold text-slate-500">실명</span>
                <span className="font-bold text-slate-900">{user?.realName || user?.name || '-'}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                <span className="font-bold text-slate-500">회원 구분</span>
                <span className="font-bold text-slate-800">
                  {user?.role === 'tutor' ? '강사' : user?.role === 'admin' ? '관리자' : '수강생'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                <span className="font-bold text-slate-500">내 추천 코드</span>
                <span className="font-mono font-bold text-slate-900">{user?.referralCode || '-'}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                <span className="font-bold text-slate-500">상담 완료</span>
                <span className="font-bold text-slate-800">{user?.hasCompletedConsultation ? '예' : '아니오'}</span>
              </div>
            </div>
          </Card>

          {/* 튜터 전용 — 내 수업료 카드 */}
          {user?.role === 'tutor' && myTutorDoc && (
            <Card className="p-5">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <DollarSign size={18} className="text-green-600" /> 내 수업료
              </h3>
              <div className="space-y-2 mb-3">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  회당 가격 (원)
                </label>
                <input
                  type="number"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  placeholder="예: 15000"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
                {Number(rateInput) > 0 && (
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    8회 기준 수강자 결제 금액:{' '}
                    <strong className="text-slate-900">
                      {(Number(rateInput) * 8 + SERVICE_FEE).toLocaleString()}원
                    </strong>
                    <br />
                    <span className="text-slate-400">
                      수업료 {(Number(rateInput) * 8).toLocaleString()}원 + 서비스 이용료 {SERVICE_FEE.toLocaleString()}원
                    </span>
                  </p>
                )}
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={handleSaveMyRate}
                disabled={rateSaving || Number(rateInput) === Number(myTutorDoc.hourlyRate || 0)}
              >
                {rateSaving ? '저장 중...' : '수업료 저장'}
              </Button>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                서비스 이용료 {SERVICE_FEE.toLocaleString()}원은 플랫폼에서 자동 가산되며 결제 금액에 포함됩니다.
              </p>
            </Card>
          )}

          {/* 강사 신청 상태 카드 */}
          {tutorApp && (
            <Card className="p-5">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <School size={18} className="text-indigo-600" /> 강사 신청 현황
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={cn(
                    'inline-flex items-center text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full',
                    tutorApp.status === 'pending' && 'bg-amber-100 text-amber-700',
                    tutorApp.status === 'approved' && 'bg-green-100 text-green-700',
                    tutorApp.status === 'rejected' && 'bg-red-100 text-red-700'
                  )}
                >
                  {tutorApp.status === 'pending' ? '대기 중' : tutorApp.status === 'approved' ? '승인됨' : '거절됨'}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {tutorApp.status === 'pending' &&
                  '관리자 승인을 기다리고 있어요. 검토 완료 시 결과가 이곳에 표시됩니다.'}
                {tutorApp.status === 'approved' &&
                  '축하드려요! 강사 승인이 완료되어 역할이 업데이트되었습니다. 페이지를 새로고침 해주세요.'}
                {tutorApp.status === 'rejected' && (
                  <>
                    <strong className="block text-red-600 mb-1">거절 사유</strong>
                    <span className="block p-2 rounded-lg bg-red-50 text-red-700 whitespace-pre-wrap">
                      {tutorApp.rejectionReason || '(사유 미입력)'}
                    </span>
                  </>
                )}
              </p>
            </Card>
          )}

          {/* Credits Card */}
          <Card className="bg-slate-900 text-white border-none shadow-xl">
            <h3 className="font-bold text-lg mb-2">보유 포인트</h3>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">{(user?.credits || 0).toLocaleString()}</span>
              <span className="text-slate-400 mb-1">P</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-6">
              <Button className="bg-blue-600 hover:bg-blue-500 border-none text-xs py-5 px-0 font-bold">
                포인트 충전
              </Button>
              <Button 
                variant="outline" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs py-5 px-0 gap-1 font-bold"
                onClick={() => setIsTransferModalOpen(true)}
              >
                <Gift size={14} /> 선물하기
              </Button>
            </div>
          </Card>

          {/* Referral Card */}
          <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-2xl relative overflow-hidden group p-6 rounded-3xl">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Gift size={20} /> 친구 초대하고 2만점 받기
              </h3>
              <p className="text-sm text-blue-100 mb-6 leading-relaxed">
                친구가 결제하면 <span className="font-black text-white">20,000포인트</span>가 즉시 지급되어 다음 결제에서 자동으로 할인됩니다!
              </p>
              <div className="space-y-4">
                <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2">내 추천 코드</p>
                  <div className="flex items-center justify-between">
                    <code className="text-xl font-black tracking-widest">{user?.referralCode || '------'}</code>
                    <button onClick={handleCopyCode} className="hover:text-blue-200 transition-colors">
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>
                <Button 
                  onClick={handleKakaoShare}
                  className="w-full bg-[#FEE500] hover:bg-[#FADA0A] text-[#3C1E1E] font-black border-none gap-2 py-6 rounded-2xl shadow-lg"
                >
                  <Share2 size={18} /> 카카오톡 초대 보내기
                </Button>
              </div>
            </div>
          </Card>

        </div>
      </div>
      
      <PointTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />

      {user && (
        <ProfileEditModal
          isOpen={isProfileEditOpen}
          onClose={() => setIsProfileEditOpen(false)}
          user={user}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// 수업 일정 패널 — 다가오는 / 완료된 수업 분리
// ────────────────────────────────────────────────────────────────────
const SESSIONS_PAGE_SIZE = 6;
const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];

function toDateSafe(ts: any): Date | null {
  if (!ts) return null;
  try {
    const d: Date = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function SessionsPanel({ sessions, tutors }: { sessions: any[]; tutors: any[] }) {
  const now = Date.now();

  const { upcoming, past } = (() => {
    const up: any[] = [];
    const pt: any[] = [];
    for (const s of sessions) {
      if (s.status === 'cancelled') {
        pt.push(s);
        continue;
      }
      const d = toDateSafe(s.startTime);
      const isFuture = d ? d.getTime() > now : false;
      if (s.status === 'completed' || !isFuture) {
        pt.push(s);
      } else {
        up.push(s);
      }
    }
    // 다가오는: 가까운 시간 순 (오름차순)
    up.sort((a, b) => {
      const da = toDateSafe(a.startTime)?.getTime() || 0;
      const db = toDateSafe(b.startTime)?.getTime() || 0;
      return da - db;
    });
    // 지난: 최근 순 (내림차순)
    pt.sort((a, b) => {
      const da = toDateSafe(a.startTime)?.getTime() || 0;
      const db = toDateSafe(b.startTime)?.getTime() || 0;
      return db - da;
    });
    return { upcoming: up, past: pt };
  })();

  const pastPage = usePaginated(past, SESSIONS_PAGE_SIZE);

  return (
    <div className="space-y-8">
      {/* 다가오는 수업 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-600">
              다가오는 수업
            </h3>
            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {upcoming.length}
            </span>
          </div>
        </div>

        {upcoming.length === 0 ? (
          <Card className="p-10 text-center border-dashed">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Calendar size={22} />
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">예정된 수업이 없습니다</p>
            <p className="text-xs text-slate-500">
              강사와 수업 일정을 협의하신 뒤 관리자에게 전달해 주세요. 관리자가 등록하면 이 곳에 자동으로 표시됩니다.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {upcoming.map((s) => (
              <Fragment key={s.id}>
                <UpcomingSessionCard session={s} tutors={tutors} />
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {/* 완료된/지난 수업 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
              완료된 수업
            </h3>
            <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {past.length}
            </span>
          </div>
        </div>

        {past.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 text-sm border-dashed">
            아직 완료된 수업이 없습니다.
          </Card>
        ) : (
          <div className="space-y-2">
            {pastPage.sliced.map((s) => (
              <Fragment key={s.id}>
                <PastSessionRow session={s} tutors={tutors} />
              </Fragment>
            ))}
            <Pagination
              currentPage={pastPage.page}
              totalItems={past.length}
              pageSize={SESSIONS_PAGE_SIZE}
              onPageChange={pastPage.setPage}
              className="rounded-2xl border border-slate-100 bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function UpcomingSessionCard({ session, tutors }: { session: any; tutors: any[] }) {
  const d = toDateSafe(session.startTime);
  const tutor = tutors.find((t) => t.id === session.tutorId);
  const weekday = d ? WEEKDAY_KR[d.getDay()] : '-';
  const dateStr = d ? d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '일정 미정';
  const timeStr = d ? d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const now = Date.now();
  const diffMin = d ? Math.floor((d.getTime() - now) / 60000) : 0;
  const isSoon = diffMin > 0 && diffMin <= 60;

  return (
    <Card className="relative overflow-hidden border border-blue-100 hover:border-blue-300 hover:shadow-lg transition-all p-0">
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-blue-100/40 blur-2xl pointer-events-none" />
      <div className="relative p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white px-2 py-1 rounded-full">
            <Calendar size={10} /> 예정
          </span>
          {isSoon && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full animate-pulse">
              곧 시작
            </span>
          )}
        </div>

        <p className="text-[11px] font-bold text-slate-500 tracking-widest uppercase mb-1">
          {weekday}요일
        </p>
        <p className="text-2xl font-black text-slate-900 leading-tight">{dateStr}</p>
        <p className="mt-1 text-3xl font-black text-blue-600 tracking-tight">
          {timeStr}
        </p>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
          <img
            src={tutor?.avatar || `https://picsum.photos/seed/${session.tutorId}/100/100`}
            alt={tutor?.name || '강사'}
            className="h-11 w-11 rounded-2xl object-cover border border-slate-100"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">강사</p>
            <p className="font-bold text-slate-900 truncate">
              {tutor?.name || session.tutorName || '강사'}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">수업</p>
            <p className="text-sm font-black text-slate-900">{session.duration || 25}분</p>
          </div>
        </div>

        {session.meetingLink && (
          <a
            href={session.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block w-full text-center py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors"
          >
            수업 입장하기
          </a>
        )}
      </div>
    </Card>
  );
}

function PastSessionRow({ session, tutors }: { session: any; tutors: any[] }) {
  const d = toDateSafe(session.startTime);
  const tutor = tutors.find((t) => t.id === session.tutorId);
  const label = d
    ? `${d.toLocaleDateString('ko-KR')} (${WEEKDAY_KR[d.getDay()]}) ${d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
    : '일정 미상';

  const statusBadge =
    session.status === 'completed'
      ? { text: '완료', cls: 'bg-emerald-100 text-emerald-700' }
      : session.status === 'cancelled'
        ? { text: '취소', cls: 'bg-rose-100 text-rose-700' }
        : { text: '지남', cls: 'bg-slate-100 text-slate-600' };

  return (
    <Card className="flex items-center gap-3 p-3 border border-slate-100">
      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
        <Calendar size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full', statusBadge.cls)}>
            {statusBadge.text}
          </span>
          <span className="text-sm font-bold text-slate-800 truncate">
            {tutor?.name || session.tutorName || '강사'}
          </span>
          <span className="text-[11px] text-slate-400">· {session.duration || 25}분</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{label}</p>
      </div>
    </Card>
  );
}
