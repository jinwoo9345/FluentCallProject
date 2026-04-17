import {
  Calendar, Clock, ChevronRight, Award, BookOpen,
  User as UserIcon, Settings, School,
  Heart, CreditCard, Share2, Copy, Check, Gift, Loader2
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useSessions } from '../hooks/useSessions';
import { useTutors } from '../hooks/useTutors';
import { ScheduleManager } from '../components/Dashboard/ScheduleManager';
import { PointTransferModal } from '../components/Payment/PointTransferModal';
import { ProfileEditModal } from '../components/Dashboard/ProfileEditModal';
import { ConsultationForm } from '../components/Consultation/ConsultationForm';
import { Pagination, usePaginated } from '../components/ui/Pagination';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { shareReferralCode } from '../lib/kakao';

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

  // Safety: Ensure user and wishlist exist before filtering
  const wishlistedTutors = tutors.filter(t => user?.wishlist?.includes(t.id) || false);

  const sessionsPage = usePaginated(sessions, USER_PAGE_SIZE);
  const paymentsPage = usePaginated(payments, USER_PAGE_SIZE);
  const consultsPage = usePaginated(consultations, USER_PAGE_SIZE);

  // Fetch Payment & Consultation History
  useEffect(() => {
    if (!firebaseUser || !isAuthReady) return;
    
    async function fetchHistory() {
      setLoadingHistory(true);
      try {
        // Fetch Payments — 사용자에게는 완료된 결제만 노출
        const pQuery = query(
          collection(db, 'payments'),
          where('userId', '==', firebaseUser.uid),
          orderBy('createdAt', 'desc')
        );
        const pSnap = await getDocs(pQuery);
        setPayments(
          pSnap.docs
            .map(d => ({ id: d.id, ...(d.data() as any) }))
            .filter(p => p.status === 'completed')
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
                    <div className="space-y-4">
                      {sessions.length === 0 ? (
                        <Card className="p-12 text-center text-slate-500 border-dashed">
                          아직 예약된 수업이 없습니다.
                        </Card>
                      ) : (
                        sessionsPage.sliced.map((cls) => (
                          <Card key={cls.id} className="flex items-center justify-between p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold uppercase text-lg">
                                {tutors.find(t => t.id === cls.tutorId)?.name.charAt(0) || 'T'}
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900">
                                  {tutors.find(t => t.id === cls.tutorId)?.name || '튜터'}와의 수업
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                  <span className="flex items-center gap-1"><Calendar size={14} /> {cls.startTime instanceof Date ? cls.startTime.toLocaleDateString() : '일정 확인 중'}</span>
                                  <span className="flex items-center gap-1"><Clock size={14} /> {cls.duration}분</span>
                                </div>
                              </div>
                            </div>
                            <Button variant="secondary" size="sm" className="font-bold">입장하기</Button>
                          </Card>
                        ))
                      )}
                      <Pagination
                        currentPage={sessionsPage.page}
                        totalItems={sessions.length}
                        pageSize={USER_PAGE_SIZE}
                        onPageChange={sessionsPage.setPage}
                        className="rounded-2xl border border-slate-100 bg-white"
                      />
                    </div>
                  )}

                  {activeTab === 'payments' && (
                    <div className="space-y-4">
                      {payments.length === 0 ? (
                        <Card className="p-12 text-center text-slate-500 border-dashed">
                          결제 내역이 없습니다.
                        </Card>
                      ) : (
                        paymentsPage.sliced.map((p) => (
                          <Card key={p.id} className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                                <CreditCard size={24} />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900">{p.productName}</h3>
                                <p className="text-sm text-slate-500">
                                  {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : '날짜 미상'} · {p.status === 'completed' ? '결제 완료' : '진행 중'}
                                </p>
                              </div>
                            </div>
                            <span className="text-lg font-black text-slate-900">{(p.amount || 0).toLocaleString()}원</span>
                          </Card>
                        ))
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
                친구가 결제하면 다음 달 수강료가 <span className="font-black text-white">159,000원</span>으로 자동 할인됩니다!
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

          {/* Schedule Manager */}
          <Card>
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" /> 내 수업 가능 시간
            </h3>
            <ScheduleManager 
              userId={firebaseUser.uid} 
              availability={user?.role === 'student' ? (user?.studentAvailability || []) : (tutors.find(t => t.id === firebaseUser.uid)?.availability || [])} 
              role={user?.role}
            />
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
