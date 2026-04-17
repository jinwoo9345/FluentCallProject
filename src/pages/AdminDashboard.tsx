import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, UserPlus, CreditCard, MessageSquare, TrendingUp,
  Clock, Shield, Star, School, Settings
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy, where, doc, updateDoc, writeBatch, increment, addDoc, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';
import { Pagination, usePaginated } from '../components/ui/Pagination';

const PAGE_SIZES = {
  consultations: 15,
  payments: 15,
  users: 15,
  tutors: 9,
};

// 역할 한국어 라벨
function roleLabel(role: string | undefined): string {
  if (role === 'admin') return '관리자';
  if (role === 'tutor') return '강사';
  return '수강생';
}

// 가입 경로 추정 (UID prefix 기반, 민감 정보 노출 없음)
function providerLabel(uid: string | undefined): string {
  if (!uid) return '-';
  if (uid.startsWith('kakao:')) return '카카오 로그인';
  return '이메일/구글 로그인';
}

// Firestore Timestamp / Date / 문자열 어떤 형태든 안전하게 포맷
function formatTS(ts: any, variant: 'date' | 'datetime' = 'date'): string {
  if (!ts) return '-';
  try {
    const d: Date = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return '-';
    return variant === 'datetime' ? d.toLocaleString() : d.toLocaleDateString();
  } catch {
    return '-';
  }
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'consultations' | 'tutors' | 'tutor_apps' | 'payments' | 'users' | 'settings'>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [creditDelta, setCreditDelta] = useState<Record<string, string>>({});
  
  const [stats, setStats] = useState({ users: 0, revenue: 0, upcomingSessions: 0, pendingConsults: 0 });
  const [consultations, setConsultations] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailConsult, setDetailConsult] = useState<any | null>(null);
  const [detailUser, setDetailUser] = useState<any | null>(null);
  const [editTutor, setEditTutor] = useState<any | null>(null);
  const [isAddingTutor, setIsAddingTutor] = useState(false);
  const [consultFilter, setConsultFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [tutorApps, setTutorApps] = useState<any[]>([]);
  const [detailTutorApp, setDetailTutorApp] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  // 앱 설정 (카카오 채널 URL 등)
  const [kakaoChannelUrl, setKakaoChannelUrl] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users
      const userSnap = await getDocs(collection(db, 'users'));
      setUsersList(userSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Fetch Consultations
      let combinedConsults: any[] = [];
      try {
        const consultSnap = await getDocs(query(collection(db, 'consultations'), orderBy('createdAt', 'desc')));
        combinedConsults = consultSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('consultations fetch failed:', err);
      }
      setConsultations(combinedConsults);
      const pendingCount = combinedConsults.filter(c => c.status === 'pending' || !c.status).length;

      // 3. Fetch Payments
      let allPayments: any[] = [];
      try {
        const paymentSnap = await getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc')));
        allPayments = paymentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('payments fetch failed:', err);
      }
      setPayments(allPayments);

      let totalRevenue = 0;
      allPayments.forEach(p => {
        if (p.status === 'completed') totalRevenue += (p.amount || 0);
      });

      // 4. Fetch Tutors
      let tutorList: any[] = [];
      try {
        const tutorSnap = await getDocs(collection(db, 'tutors'));
        tutorList = tutorSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('tutors fetch failed:', err);
      }
      setTutors(tutorList);

      // 5. Fetch Upcoming Sessions
      let upcomingCount = 0;
      try {
        const sessionSnap = await getDocs(query(collection(db, 'sessions'), where('status', '==', 'upcoming')));
        upcomingCount = sessionSnap.size;
      } catch (err) {
        console.warn('sessions fetch failed:', err);
      }

      // 6. Fetch Tutor Applications
      let appsList: any[] = [];
      try {
        const appsSnap = await getDocs(query(collection(db, 'tutor_applications'), orderBy('createdAt', 'desc')));
        appsList = appsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('tutor_applications fetch failed:', err);
      }
      setTutorApps(appsList);

      // 7. Fetch App Settings (kakao channel URL 등)
      try {
        const settingsSnap = await getDocs(query(collection(db, 'app_settings')));
        const mainDoc = settingsSnap.docs.find(d => d.id === 'main');
        if (mainDoc) {
          const data = mainDoc.data() as any;
          setKakaoChannelUrl(data.kakaoChannelUrl || '');
        }
      } catch (err) {
        console.warn('app_settings fetch failed:', err);
      }

      setStats({
        users: userSnap.size,
        revenue: totalRevenue,
        upcomingSessions: upcomingCount,
        pendingConsults: pendingCount
      });
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin') return;
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleToggleConsultStatus = async (c: any) => {
    const nextStatus = c.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateDoc(doc(db, 'consultations', c.id), { status: nextStatus });
      setConsultations(prev => prev.map(x => (x.id === c.id ? { ...x, status: nextStatus } : x)));
      setStats(prev => ({
        ...prev,
        pendingConsults: prev.pendingConsults + (nextStatus === 'completed' ? -1 : 1),
      }));
    } catch (err: any) {
      alert('상태 변경 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const handleAdjustUserCredits = async (u: any, delta: number) => {
    if (!delta || !Number.isFinite(delta)) return;
    try {
      await updateDoc(doc(db, 'users', u.id), { credits: increment(delta) });
      setUsersList(prev =>
        prev.map(x => (x.id === u.id ? { ...x, credits: (x.credits || 0) + delta } : x))
      );
      setCreditDelta(prev => ({ ...prev, [u.id]: '' }));
    } catch (err: any) {
      alert('크레딧 조정 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const handleApproveTutorApp = async (app: any) => {
    if (!window.confirm(`${app.name} 님의 강사 신청을 승인합니다.\n승인 시 해당 유저의 역할이 '강사'로 변경되고 튜터 목록에 등록됩니다.`)) return;
    try {
      // 1. 튜터 문서 생성 (user uid를 문서 ID로 사용)
      await setDoc(doc(db, 'tutors', app.userId), {
        id: app.userId,
        name: app.name,
        avatar: `https://picsum.photos/seed/tutor_${app.userId}/200/200`,
        rating: 0,
        reviewCount: 0,
        specialties: [],
        bio: app.introduction || '',
        longBio: app.experience || '',
        hourlyRate: 0,
        availability: [],
        languages: ['English'],
        location: '',
        tier: '',
        hidden: false,
        createdAt: serverTimestamp(),
      });

      // 2. 유저 역할 변경
      await updateDoc(doc(db, 'users', app.userId), {
        role: 'tutor',
        tutorApplicationStatus: 'approved',
      });

      // 3. 신청 문서 상태 업데이트
      await updateDoc(doc(db, 'tutor_applications', app.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
      });

      setTutorApps(prev => prev.map(a => (a.id === app.id ? { ...a, status: 'approved' } : a)));
      setUsersList(prev => prev.map(u => (u.id === app.userId ? { ...u, role: 'tutor', tutorApplicationStatus: 'approved' } : u)));
      alert('승인 처리 완료');
      setDetailTutorApp(null);
      fetchAdminData();
    } catch (err: any) {
      alert('승인 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const handleRejectTutorApp = async (app: any, reason: string) => {
    if (!reason.trim()) {
      alert('거절 사유를 입력해주세요.');
      return;
    }
    try {
      await updateDoc(doc(db, 'tutor_applications', app.id), {
        status: 'rejected',
        rejectionReason: reason.trim(),
        reviewedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', app.userId), {
        tutorApplicationStatus: 'rejected',
      });
      setTutorApps(prev =>
        prev.map(a => (a.id === app.id ? { ...a, status: 'rejected', rejectionReason: reason.trim() } : a))
      );
      alert('거절 처리 완료');
      setDetailTutorApp(null);
      setRejectionReason('');
    } catch (err: any) {
      alert('거절 처리 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const handleDeleteConsult = async (c: any) => {
    const confirmed = window.confirm(
      `"${c.name || '(이름 없음)'}" 님의 상담 신청을 삭제합니다.\n\n` +
      `이 작업은 되돌릴 수 없습니다. 진행하시겠습니까?`
    );
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, 'consultations', c.id));
      setConsultations(prev => prev.filter(x => x.id !== c.id));
      setStats(prev => ({
        ...prev,
        pendingConsults: prev.pendingConsults - (c.status === 'completed' ? 0 : 1),
      }));
    } catch (err: any) {
      alert('삭제 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const handleToggleTutorHidden = async (t: any) => {
    const nextHidden = !t.hidden;
    try {
      await updateDoc(doc(db, 'tutors', t.id), { hidden: nextHidden });
      setTutors(prev => prev.map(x => (x.id === t.id ? { ...x, hidden: nextHidden } : x)));
    } catch (err: any) {
      alert('처리 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const handleToggleEnrollDisabled = async (t: any) => {
    const nextDisabled = !t.enrollDisabled;
    // 비활성화 시 안내 문구 입력
    let nextMessage = t.disabledMessage || '';
    if (nextDisabled) {
      const input = window.prompt(
        '비활성화 시 "등록하기" 버튼 자리에 표시할 안내 문구를 입력해주세요.\n(예: 현재 대기 중 · 수업 준비 중)',
        nextMessage || '현재 대기 중'
      );
      if (input === null) return; // 취소
      nextMessage = input.trim() || '현재 대기 중';
    }
    try {
      await updateDoc(doc(db, 'tutors', t.id), {
        enrollDisabled: nextDisabled,
        disabledMessage: nextMessage,
      });
      setTutors(prev =>
        prev.map(x => (x.id === t.id ? { ...x, enrollDisabled: nextDisabled, disabledMessage: nextMessage } : x))
      );
    } catch (err: any) {
      alert('처리 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await setDoc(
        doc(db, 'app_settings', 'main'),
        {
          kakaoChannelUrl: kakaoChannelUrl.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      alert('설정이 저장되었습니다.');
    } catch (err: any) {
      alert('저장 실패: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleUpdateDisabledMessage = async (t: any) => {
    const input = window.prompt('새 안내 문구를 입력해주세요.', t.disabledMessage || '현재 대기 중');
    if (input === null) return;
    const nextMessage = input.trim() || '현재 대기 중';
    try {
      await updateDoc(doc(db, 'tutors', t.id), { disabledMessage: nextMessage });
      setTutors(prev => prev.map(x => (x.id === t.id ? { ...x, disabledMessage: nextMessage } : x)));
    } catch (err: any) {
      alert('문구 저장 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const handleSaveTutor = async (payload: any) => {
    if (!editTutor) return;
    try {
      await updateDoc(doc(db, 'tutors', editTutor.id), payload);
      setTutors(prev => prev.map(x => (x.id === editTutor.id ? { ...x, ...payload } : x)));
      setEditTutor(null);
    } catch (err: any) {
      alert('저장 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const handleDeleteTutor = async (t: any) => {
    const confirmed = window.confirm(
      `강사 "${t.name || '(이름 없음)'}" 을(를) 영구 삭제합니다.\n\n` +
      `이 작업은 되돌릴 수 없습니다. 진행하시겠습니까?`
    );
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, 'tutors', t.id));
      setTutors(prev => prev.filter(x => x.id !== t.id));
    } catch (err: any) {
      alert('삭제 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const handleCreateTutor = async (payload: any) => {
    try {
      const ref = await addDoc(collection(db, 'tutors'), {
        ...payload,
        rating: payload.rating || 0,
        reviewCount: 0,
        availability: [],
        hidden: false,
        createdAt: serverTimestamp(),
      });
      setTutors(prev => [
        { id: ref.id, ...payload, rating: 0, reviewCount: 0, availability: [], hidden: false },
        ...prev,
      ]);
      setIsAddingTutor(false);
    } catch (err: any) {
      alert('강사 등록 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const handleResetUserCredits = async (u: any) => {
    if (!window.confirm(`${u.name || u.email}님의 크레딧을 0으로 초기화합니다. 진행할까요?`)) return;
    try {
      await updateDoc(doc(db, 'users', u.id), { credits: 0 });
      setUsersList(prev => prev.map(x => (x.id === u.id ? { ...x, credits: 0 } : x)));
    } catch (err: any) {
      alert('초기화 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const handlePurgeAllCredits = async () => {
    if (!window.confirm('모든 사용자의 크레딧을 0으로 초기화합니다. 실행하시겠습니까?')) return;
    try {
      // Firestore batch는 500개 제한 → 여러 묶음으로 커밋
      const snap = await getDocs(collection(db, 'users'));
      const CHUNK = 400;
      for (let i = 0; i < snap.docs.length; i += CHUNK) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + CHUNK).forEach(d => {
          batch.update(d.ref, { credits: 0 });
        });
        await batch.commit();
      }
      alert(`완료: ${snap.size}명의 크레딧을 0으로 회수했습니다.`);
      fetchAdminData();
    } catch (err: any) {
      alert('회수 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Shield size={64} className="text-red-200 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">접근 권한이 없습니다.</h2>
        <p className="mt-2 text-slate-600">이 페이지는 관리자만 접근할 수 있습니다.</p>
      </div>
    );
  }

  const pendingTutorAppsCount = tutorApps.filter(a => a.status === 'pending').length;

  const navItems = [
    { id: 'overview', label: '현황판', icon: TrendingUp },
    { id: 'consultations', label: '상담 내역', icon: MessageSquare, count: stats.pendingConsults },
    { id: 'payments', label: '결제 관리', icon: CreditCard },
    { id: 'users', label: '유저 관리', icon: Users },
    { id: 'tutor_apps', label: '강사 신청', icon: School, count: pendingTutorAppsCount },
    { id: 'tutors', label: '강사 관리', icon: UserPlus },
    { id: 'settings', label: '설정', icon: Settings },
  ];

  const filteredUsers = usersList
    .slice()
    .sort((a: any, b: any) => (b.credits || 0) - (a.credits || 0))
    .filter((u: any) => {
      if (!userSearch.trim()) return true;
      const q = userSearch.toLowerCase();
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.referralCode || '').toLowerCase().includes(q)
      );
    });

  const filteredConsultations = consultations.filter(c => {
    if (consultFilter === 'all') return true;
    if (consultFilter === 'pending') return c.status === 'pending' || !c.status;
    return c.status === 'completed';
  });

  const completedCount = consultations.filter(c => c.status === 'completed').length;
  const pendingCount = consultations.filter(c => c.status === 'pending' || !c.status).length;

  const usersPage = usePaginated(filteredUsers, PAGE_SIZES.users);
  const consultPage = usePaginated(filteredConsultations, PAGE_SIZES.consultations);
  const paymentsPage = usePaginated(payments, PAGE_SIZES.payments);
  const tutorsPage = usePaginated(tutors, PAGE_SIZES.tutors);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">관리자 대시보드</h1>
          <p className="mt-2 text-slate-600">EnglishBites 전체 서비스 현황을 실시간으로 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAdminData} className="text-xs">새로고침</Button>
          <Button
            variant="outline"
            onClick={handlePurgeAllCredits}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            전체 크레딧 회수
          </Button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="flex gap-4 border-b border-slate-200 mb-8 overflow-x-auto pb-px">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap',
              activeTab === item.id 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <item.icon size={18} />
            {item.label}
            {item.count ? (
              <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-600">
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <p className="text-slate-500 animate-pulse font-bold">데이터를 불러오는 중...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {/* Summary Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: '전체 유저', value: `${stats.users}명`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: '누적 매출', value: `${(stats.revenue/10000).toLocaleString()}만원`, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: '예정된 수업', value: `${stats.upcomingSessions}건`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: '대기 중인 상담', value: `${stats.pendingConsults}건`, icon: MessageSquare, color: 'text-rose-600', bg: 'bg-rose-50' },
                ].map((stat, idx) => (
                  <Card key={idx} className="flex items-center gap-4">
                    <div className={cn('rounded-xl p-3', stat.bg, stat.color)}>
                      <stat.icon size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Recent Consultations Section */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">최근 상담 신청 (대기 중)</h2>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('consultations')}>전체 보기</Button>
                  </div>
                  <div className="space-y-4">
                    {consultations.filter(c => c.status === 'pending' || !c.status).slice(0, 5).length === 0 ? (
                      <Card className="p-8 text-center text-slate-500 border-dashed">대기 중인 상담이 없습니다.</Card>
                    ) : (
                      consultations.filter(c => c.status === 'pending' || !c.status).slice(0, 5).map((c) => (
                        <Card key={c.id} className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                          <div className="flex gap-4">
                            <div className="bg-rose-50 p-3 rounded-xl h-fit">
                              <MessageSquare size={20} className="text-rose-600" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{c.name || '미입력'} <span className="text-xs text-slate-500 font-normal ml-2">{c.contactType || '연락처'}: {c.contactValue || c.contact}</span></p>
                              <p className="text-xs text-slate-500 line-clamp-1 mt-1">{c.motivation || c.purpose || (Array.isArray(c.goals) ? c.goals.join(', ') : '상세 내용 없음')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 font-bold">{formatTS(c.createdAt, 'date')}</span>
                            <Button variant="outline" size="sm" className="text-xs" onClick={() => setDetailConsult(c)}>
                              상세보기
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>

                {/* Platform Health Sidebar */}
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900">시스템 현황</h2>
                  <Card className="bg-slate-900 text-white border-none p-6">
                    <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest mb-1">Environment</p>
                    <p className="text-lg font-bold mb-6">Cloudflare Pages <br/>& Functions</p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                        <span className="text-sm text-slate-400">Database (Firestore)</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-sm text-green-400 font-bold">Online</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                        <span className="text-sm text-slate-400">총 가입자 수</span>
                        <span className="text-sm text-white font-bold">{stats.users}명</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">등록된 튜터 수</span>
                        <span className="text-sm text-white font-bold">{tutors.length}명</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'consultations' && (
            <motion.div key="consultations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold text-slate-900">상담 신청 내역</h2>
                {/* 상태 필터 탭 */}
                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                  {([
                    { id: 'all', label: `전체 (${consultations.length})` },
                    { id: 'pending', label: `대기 중 (${pendingCount})` },
                    { id: 'completed', label: `완료 (${completedCount})` },
                  ] as const).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setConsultFilter(opt.id)}
                      className={cn(
                        'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                        consultFilter === opt.id
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Card className="p-0 overflow-hidden shadow-sm border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="px-6 py-4 font-bold">신청자</th>
                        <th className="px-6 py-4 font-bold">연락처</th>
                        <th className="px-6 py-4 font-bold">신청 시간</th>
                        <th className="px-6 py-4 font-bold">희망 시간</th>
                        <th className="px-6 py-4 font-bold">상태</th>
                        <th className="px-6 py-4 font-bold text-right">설정</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {consultPage.sliced.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{c.name || '미입력'}</p>
                            {c.userId && <p className="text-[10px] text-blue-600 font-bold mt-0.5">회원 가입됨</p>}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{c.contactType || '연락처'}: {c.contactValue || c.contact}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{formatTS(c.createdAt, 'datetime')}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{c.availableTime || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black tracking-wider uppercase",
                              (c.status === 'pending' || !c.status) ? "bg-rose-100 text-rose-700" : "bg-green-100 text-green-700"
                            )}>
                              {(c.status === 'pending' || !c.status) ? '대기 중' : '완료'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-1 justify-end flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => setDetailConsult(c)}
                              >
                                상세보기
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => handleToggleConsultStatus(c)}
                              >
                                {c.status === 'completed' ? '대기로 변경' : '완료 처리'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs text-red-600 border-red-200 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteConsult(c)}
                              >
                                삭제
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={consultPage.page}
                  totalItems={filteredConsultations.length}
                  pageSize={PAGE_SIZES.consultations}
                  onPageChange={consultPage.setPage}
                />
              </Card>
            </motion.div>
          )}

          {activeTab === 'payments' && (
            <motion.div key="payments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 mb-4">전체 결제 내역</h2>
              <Card className="p-0 overflow-hidden shadow-sm border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="px-6 py-4 font-bold">주문번호</th>
                        <th className="px-6 py-4 font-bold">결제자</th>
                        <th className="px-6 py-4 font-bold">상품명</th>
                        <th className="px-6 py-4 font-bold">최종 결제 금액</th>
                        <th className="px-6 py-4 font-bold">포인트 사용</th>
                        <th className="px-6 py-4 font-bold">결제 일시</th>
                        <th className="px-6 py-4 font-bold">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paymentsPage.sliced.map(p => {
                        const payer = usersList.find(u => u.id === p.userId || u.uid === p.userId);
                        return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-xs font-mono text-slate-500">
                            {(p.orderId || p.id).split('_')[1] || (p.orderId || p.id).substring(0, 10)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            <p className="font-bold">{payer?.name || '알 수 없음'}</p>
                            {payer?.email && <p className="text-[11px] text-slate-500">{payer.email}</p>}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">{p.productName}</td>
                          <td className="px-6 py-4 font-black text-slate-900">{p.amount?.toLocaleString()}원</td>
                          <td className="px-6 py-4 text-sm text-amber-600 font-bold">{p.creditsUsed > 0 ? `-${(p.creditsUsed * 1000).toLocaleString()}원` : '-'}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{formatTS(p.createdAt, 'datetime')}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black tracking-wider uppercase",
                              p.status === 'completed' ? "bg-blue-100 text-blue-700" : 
                              p.status === 'failed' ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
                            )}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={paymentsPage.page}
                  totalItems={payments.length}
                  pageSize={PAGE_SIZES.payments}
                  onPageChange={paymentsPage.setPage}
                />
              </Card>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold text-slate-900">유저 관리 ({filteredUsers.length}명)</h2>
                <input
                  type="text"
                  placeholder="이름·이메일·추천코드 검색"
                  className="w-full sm:w-72 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-500"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <Card className="p-0 overflow-hidden shadow-sm border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3 font-bold">이름 / 이메일</th>
                        <th className="px-4 py-3 font-bold">역할</th>
                        <th className="px-4 py-3 font-bold">추천 코드</th>
                        <th className="px-4 py-3 font-bold">크레딧</th>
                        <th className="px-4 py-3 font-bold">지급 / 회수</th>
                        <th className="px-4 py-3 font-bold text-right">액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usersPage.sliced.map((u: any) => {
                        const raw = creditDelta[u.id] ?? '';
                        const delta = Number(raw);
                        const isValid = raw !== '' && Number.isFinite(delta);
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900">{u.name || '—'}</p>
                              <p className="text-[11px] text-slate-500">{u.email || '이메일 미등록'}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                'text-[10px] font-black uppercase px-2 py-1 rounded-md',
                                u.role === 'admin'
                                  ? 'bg-purple-100 text-purple-700'
                                  : u.role === 'tutor'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-slate-100 text-slate-600'
                              )}>
                                {u.role || 'student'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-slate-600">{u.referralCode || '-'}</td>
                            <td className="px-4 py-3">
                              <span className="text-lg font-black text-slate-900">{(u.credits || 0).toLocaleString()}</span>
                              <span className="text-xs text-slate-400 ml-1">P</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  placeholder="숫자"
                                  className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500"
                                  value={raw}
                                  onChange={(e) =>
                                    setCreditDelta(prev => ({ ...prev, [u.id]: e.target.value }))
                                  }
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs text-green-700 border-green-200 hover:bg-green-50"
                                  disabled={!isValid || delta <= 0}
                                  onClick={() => handleAdjustUserCredits(u, Math.abs(delta))}
                                >
                                  + 지급
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs text-red-700 border-red-200 hover:bg-red-50"
                                  disabled={!isValid || delta <= 0}
                                  onClick={() => handleAdjustUserCredits(u, -Math.abs(delta))}
                                >
                                  − 회수
                                </Button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex gap-1 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[10px]"
                                  onClick={() => setDetailUser(u)}
                                >
                                  상세보기
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[10px] text-slate-500 hover:text-slate-700"
                                  onClick={() => handleResetUserCredits(u)}
                                >
                                  0으로 초기화
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                            검색 결과가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={usersPage.page}
                  totalItems={filteredUsers.length}
                  pageSize={PAGE_SIZES.users}
                  onPageChange={usersPage.setPage}
                />
              </Card>
            </motion.div>
          )}

          {activeTab === 'tutor_apps' && (
            <motion.div key="tutor_apps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                강사 신청 내역 ({tutorApps.length}건)
              </h2>
              {tutorApps.length === 0 ? (
                <Card className="p-12 text-center text-slate-500 border-dashed">
                  접수된 강사 신청이 없습니다.
                </Card>
              ) : (
                <div className="space-y-3">
                  {tutorApps.map(app => (
                    <Card key={app.id} className="p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                          <School size={22} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {app.name}
                            <span className="ml-2 text-xs text-slate-500 font-normal">{app.email}</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            신청일: {formatTS(app.createdAt, 'datetime')}
                          </p>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-1 max-w-md">
                            {app.introduction || app.experience}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full',
                            app.status === 'pending' && 'bg-amber-100 text-amber-700',
                            app.status === 'approved' && 'bg-green-100 text-green-700',
                            app.status === 'rejected' && 'bg-red-100 text-red-700'
                          )}
                        >
                          {app.status === 'pending' ? '대기' : app.status === 'approved' ? '승인됨' : '거절'}
                        </span>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setDetailTutorApp(app)}>
                          상세보기
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'tutors' && (
            <motion.div key="tutors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">등록된 강사 목록 ({tutors.length}명)</h2>
                <Button className="gap-2" onClick={() => setIsAddingTutor(true)}>
                  <UserPlus size={18} /> 강사 추가
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tutorsPage.sliced.map(tutor => (
                  <Card
                    key={tutor.id}
                    className={cn(
                      'p-6 relative overflow-hidden group hover:shadow-md transition-shadow',
                      tutor.hidden && 'opacity-60 bg-slate-50'
                    )}
                  >
                    <div className="absolute top-3 right-3 flex gap-1">
                      {tutor.hidden && (
                        <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                          숨김
                        </span>
                      )}
                      {tutor.enrollDisabled && (
                        <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                          등록 차단
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-4">
                      <img src={tutor.avatar} alt={tutor.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm" referrerPolicy="no-referrer" />
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 flex items-center gap-1">
                          {tutor.name} <Star size={14} className="fill-yellow-400 text-yellow-400 ml-1" /> <span className="text-sm">{tutor.rating}</span>
                        </h3>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{tutor.location}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-sm font-bold text-slate-900 mb-1">{tutor.hourlyRate?.toLocaleString()}원 / 회</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tutor.specialties?.map((s: string, i: number) => (
                          <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">{s}</span>
                        ))}
                      </div>
                    </div>

                    {/* 등록 차단 시 안내 문구 + 수정 링크 */}
                    {tutor.enrollDisabled && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">안내 문구</p>
                          <p className="text-xs font-bold text-amber-900 truncate">
                            {tutor.disabledMessage || '현재 대기 중'}
                          </p>
                        </div>
                        <button
                          className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline whitespace-nowrap"
                          onClick={() => handleUpdateDisabledMessage(tutor)}
                        >
                          수정
                        </button>
                      </div>
                    )}

                    <div className="mt-4 space-y-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="w-full text-xs"
                          onClick={() => setEditTutor(tutor)}
                        >
                          정보 수정
                        </Button>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full text-xs',
                            tutor.enrollDisabled
                              ? 'text-green-600 border-green-200 hover:text-green-700 hover:bg-green-50'
                              : 'text-amber-600 border-amber-200 hover:text-amber-700 hover:bg-amber-50'
                          )}
                          onClick={() => handleToggleEnrollDisabled(tutor)}
                        >
                          {tutor.enrollDisabled ? '등록 활성화' : '등록 비활성화'}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full text-xs',
                            tutor.hidden
                              ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              : 'text-slate-600 hover:text-slate-700 hover:bg-slate-50'
                          )}
                          onClick={() => handleToggleTutorHidden(tutor)}
                        >
                          {tutor.hidden ? '숨김 해제' : '숨기기'}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full text-xs text-red-600 border-red-200 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteTutor(tutor)}
                        >
                          영구 삭제
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <Pagination
                currentPage={tutorsPage.page}
                totalItems={tutors.length}
                pageSize={PAGE_SIZES.tutors}
                onPageChange={tutorsPage.setPage}
                className="mt-6 rounded-2xl border border-slate-100"
              />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900">설정 관리</h2>

              <Card className="p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-11 w-11 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
                    <MessageSquare size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">카카오톡 상담 채널 URL</h3>
                    <p className="text-sm text-slate-500">
                      `/consultation` 페이지의 "상담 채널 열기" 버튼이 이 URL로 연결됩니다.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={kakaoChannelUrl}
                    onChange={(e) => setKakaoChannelUrl(e.target.value)}
                    placeholder="예: https://pf.kakao.com/_englishbites/chat"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      현재 저장된 값이 없으면 기본 URL이 사용됩니다.
                    </p>
                    <Button onClick={handleSaveSettings} disabled={settingsSaving}>
                      {settingsSaving ? '저장 중...' : '저장'}
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-8 bg-slate-50 border border-slate-100">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Firestore 경로</p>
                <p className="text-sm text-slate-700 font-mono mb-4">app_settings/main</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  설정은 <code className="bg-white px-1 py-0.5 rounded">app_settings</code> 컬렉션의{' '}
                  <code className="bg-white px-1 py-0.5 rounded">main</code> 문서에 저장되며,
                  일반 사용자는 읽기만 가능하고 관리자만 수정할 수 있습니다.
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* 상담 상세보기 모달 */}
      <AnimatePresence>
        {detailConsult && (
          <div className="fixed inset-0 z-[250] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="bg-slate-900 text-white p-8 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-blue-300">상담 신청 상세</p>
                    <h2 className="mt-2 text-3xl font-bold">{detailConsult.name || '미입력'}</h2>
                    <p className="mt-2 text-base text-slate-300">
                      {detailConsult.contactType ? `${detailConsult.contactType} · ` : ''}
                      {detailConsult.contactValue || detailConsult.contact || '-'}
                    </p>
                  </div>
                  <button
                    onClick={() => setDetailConsult(null)}
                    className="text-slate-400 hover:text-white transition-colors text-3xl"
                  >
                    ×
                  </button>
                </div>

                <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
                  {/* 상태 / 신청일 */}
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className={cn(
                      'px-4 py-1.5 rounded-full font-black uppercase tracking-wider',
                      detailConsult.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-rose-100 text-rose-700'
                    )}>
                      {detailConsult.status === 'completed' ? '완료' : '대기 중'}
                    </span>
                    <span className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                      신청 시간: {formatTS(detailConsult.createdAt, 'datetime')}
                    </span>
                    {detailConsult.userId && (
                      <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 font-bold">회원 가입됨</span>
                    )}
                  </div>

                  <DetailSection title="공부 목적" value={detailConsult.goals || detailConsult.purpose} />
                  <DetailSection title="수강 기간" value={detailConsult.duration} />
                  <DetailSection title="회화 레벨" value={detailConsult.level} />
                  <DetailSection title="원하는 수업 스타일" value={detailConsult.styles} />
                  <DetailSection title="친구 동행 여부" value={detailConsult.companion} />
                  <DetailSection
                    title="상담 가능 시간"
                    value={
                      [detailConsult.availableTime, detailConsult.availableDetail]
                        .filter(Boolean)
                        .join(' / ')
                    }
                  />
                  <DetailSection title="구체적 목표" value={detailConsult.specificGoals} />
                  <DetailSection title="학습 동기 / 메모" value={detailConsult.motivation} />
                  <DetailSection title="기타 메모" value={detailConsult.notes} />
                </div>

                <div className="p-6 border-t border-slate-100 flex gap-3 justify-between bg-slate-50/50">
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      handleDeleteConsult(detailConsult);
                      setDetailConsult(null);
                    }}
                  >
                    삭제
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleToggleConsultStatus(detailConsult);
                        setDetailConsult(null);
                      }}
                    >
                      {detailConsult.status === 'completed' ? '대기로 변경' : '완료 처리'}
                    </Button>
                    <Button onClick={() => setDetailConsult(null)}>닫기</Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 유저 상세보기 모달 */}
      <AnimatePresence>
        {detailUser && (
          <div className="fixed inset-0 z-[250] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="bg-slate-900 text-white p-8 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <img
                      src={detailUser.avatar || `https://picsum.photos/seed/${detailUser.id}/200/200`}
                      alt={detailUser.name || 'user'}
                      className="w-20 h-20 rounded-2xl object-cover border border-white/20"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-blue-300">회원 상세</p>
                      <h2 className="mt-2 text-3xl font-bold">{detailUser.name || '—'}</h2>
                      <p className="text-base text-slate-300">{detailUser.email || '이메일 미등록'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailUser(null)}
                    className="text-slate-400 hover:text-white transition-colors text-3xl"
                  >
                    ×
                  </button>
                </div>

                <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
                  {/* 기본 정보 */}
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">기본 정보</p>
                    <div className="grid grid-cols-2 gap-5">
                      <FieldBlock label="역할" value={roleLabel(detailUser.role)} badge />
                      <FieldBlock label="가입일" value={formatTS(detailUser.createdAt, 'date')} />
                      <FieldBlock label="상담 완료" value={detailUser.hasCompletedConsultation ? '예' : '아니오'} />
                      <FieldBlock label="가입 경로" value={providerLabel(detailUser.id)} />
                    </div>
                  </div>

                  {/* 크레딧·추천 */}
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">크레딧 · 추천</p>
                    <div className="grid grid-cols-2 gap-5">
                      <FieldBlock
                        label="보유 크레딧"
                        value={`${(detailUser.credits || 0).toLocaleString()} P`}
                        highlight
                      />
                      <FieldBlock label="내 추천 코드" value={detailUser.referralCode || '-'} mono />
                      <FieldBlock
                        label="추천받은 코드"
                        value={detailUser.referredBy || '없음'}
                        mono={!!detailUser.referredBy}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex gap-3 justify-end bg-slate-50/50">
                  <Button onClick={() => setDetailUser(null)}>닫기</Button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 튜터 정보 수정 모달 */}
      <AnimatePresence>
        {editTutor && (
          <TutorEditModal
            mode="edit"
            tutor={editTutor}
            onClose={() => setEditTutor(null)}
            onSave={handleSaveTutor}
          />
        )}
      </AnimatePresence>

      {/* 강사 추가 모달 */}
      <AnimatePresence>
        {isAddingTutor && (
          <TutorEditModal
            mode="create"
            tutor={{}}
            onClose={() => setIsAddingTutor(false)}
            onSave={handleCreateTutor}
          />
        )}
      </AnimatePresence>

      {/* 강사 신청 상세 모달 */}
      <AnimatePresence>
        {detailTutorApp && (
          <div className="fixed inset-0 z-[250] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="bg-slate-900 text-white p-8 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-indigo-300">강사 신청</p>
                    <h2 className="mt-2 text-3xl font-bold">{detailTutorApp.name}</h2>
                    <p className="mt-2 text-base text-slate-300">
                      {detailTutorApp.email} · {detailTutorApp.contactValue}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setDetailTutorApp(null);
                      setRejectionReason('');
                    }}
                    className="text-slate-400 hover:text-white text-3xl"
                  >
                    ×
                  </button>
                </div>

                <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className={cn(
                      'px-4 py-1.5 rounded-full font-black uppercase tracking-wider',
                      detailTutorApp.status === 'pending' && 'bg-amber-100 text-amber-700',
                      detailTutorApp.status === 'approved' && 'bg-green-100 text-green-700',
                      detailTutorApp.status === 'rejected' && 'bg-red-100 text-red-700'
                    )}>
                      {detailTutorApp.status === 'pending' ? '대기' : detailTutorApp.status === 'approved' ? '승인됨' : '거절됨'}
                    </span>
                    <span className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                      신청일: {formatTS(detailTutorApp.createdAt, 'datetime')}
                    </span>
                  </div>

                  <DetailSection title="영어 교육 / 체류 경험" value={detailTutorApp.experience} />
                  <DetailSection title="자격증 · 학력" value={detailTutorApp.qualifications} />
                  <DetailSection title="자기 소개" value={detailTutorApp.introduction} />

                  {detailTutorApp.status === 'rejected' && detailTutorApp.rejectionReason && (
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-red-500 mb-3">거절 사유</p>
                      <p className="text-base text-red-700 leading-relaxed whitespace-pre-wrap bg-red-50 p-4 rounded-2xl border border-red-100">
                        {detailTutorApp.rejectionReason}
                      </p>
                    </div>
                  )}

                  {detailTutorApp.status === 'pending' && (
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">
                        거절할 경우 사유 입력 (승인 시 무시됨)
                      </p>
                      <textarea
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-500 resize-none"
                        placeholder="예: 경력 증빙 부족으로 이번에는 승인이 어렵습니다."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-slate-100 flex gap-3 justify-end bg-slate-50/50">
                  {detailTutorApp.status === 'pending' ? (
                    <>
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRejectTutorApp(detailTutorApp, rejectionReason)}
                      >
                        거절
                      </Button>
                      <Button onClick={() => handleApproveTutorApp(detailTutorApp)}>승인</Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => {
                        setDetailTutorApp(null);
                        setRejectionReason('');
                      }}
                    >
                      닫기
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldBlock({
  label, value, mono = false, badge = false, highlight = false,
}: {
  label: string; value: any; mono?: boolean; badge?: boolean; highlight?: boolean;
}) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      {badge ? (
        <span className="inline-block text-sm font-black uppercase px-3 py-1 rounded-md bg-blue-100 text-blue-700">
          {value}
        </span>
      ) : (
        <p className={cn(
          'text-base font-bold text-slate-800',
          mono && 'font-mono',
          highlight && 'text-2xl font-black text-slate-900'
        )}>
          {value}
        </p>
      )}
    </div>
  );
}

function TutorEditModal({
  mode = 'edit',
  tutor,
  onClose,
  onSave,
}: {
  mode?: 'edit' | 'create';
  tutor: any;
  onClose: () => void;
  onSave: (payload: any) => void;
}) {
  const [form, setForm] = useState({
    name: tutor.name || '',
    location: tutor.location || '',
    hourlyRate: tutor.hourlyRate || 0,
    tier: tutor.tier || '',
    bio: tutor.bio || '',
    longBio: tutor.longBio || '',
    avatar: tutor.avatar || '',
    specialtiesText: (tutor.specialties || []).join(', '),
    languagesText: (tutor.languages || []).join(', '),
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('강사 이름은 필수 입력 항목입니다.');
      return;
    }
    setError('');
    onSave({
      name: form.name.trim(),
      location: form.location.trim(),
      hourlyRate: Number(form.hourlyRate) || 0,
      tier: form.tier.trim(),
      bio: form.bio.trim(),
      longBio: form.longBio.trim(),
      avatar: form.avatar.trim() || `https://picsum.photos/seed/tutor_${Date.now()}/200/200`,
      specialties: form.specialtiesText.split(',').map(s => s.trim()).filter(Boolean),
      languages: form.languagesText.split(',').map(s => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 z-[260] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === 'create' ? '강사 새로 등록' : '강사 정보 수정'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-3xl">
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-bold">{error}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <EditField label="이름 *" value={form.name} onChange={v => setForm({ ...form, name: v })} />
              <EditField label="지역" value={form.location} onChange={v => setForm({ ...form, location: v })} placeholder="예: 미국 서부" />
              <EditField
                label="회당 수강료 (원)"
                type="number"
                value={String(form.hourlyRate)}
                onChange={v => setForm({ ...form, hourlyRate: Number(v) })}
              />
              <EditField label="티어 / 등급" value={form.tier} onChange={v => setForm({ ...form, tier: v })} placeholder="예: Premium" />
            </div>

            <EditField
              label="전공 분야 (쉼표로 구분)"
              value={form.specialtiesText}
              onChange={v => setForm({ ...form, specialtiesText: v })}
              placeholder="예: 비즈니스 영어, IELTS, 프리토킹"
            />
            <EditField
              label="언어 (쉼표로 구분)"
              value={form.languagesText}
              onChange={v => setForm({ ...form, languagesText: v })}
              placeholder="예: English, Korean"
            />
            <EditField
              label="아바타 이미지 URL (선택)"
              value={form.avatar}
              onChange={v => setForm({ ...form, avatar: v })}
              placeholder="비워두면 기본 이미지가 사용됩니다"
            />

            <div>
              <label className="block text-base font-bold text-slate-700 mb-2">한 줄 소개</label>
              <textarea
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-500 resize-none"
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-base font-bold text-slate-700 mb-2">상세 소개</label>
              <textarea
                rows={5}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-500 resize-none"
                value={form.longBio}
                onChange={e => setForm({ ...form, longBio: e.target.value })}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose}>취소</Button>
              <Button type="submit">{mode === 'create' ? '등록' : '저장'}</Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

function EditField({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-base font-bold text-slate-700 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-500"
      />
    </div>
  );
}

function DetailSection({ title, value }: { title: string; value: any }) {
  const isEmpty =
    value == null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0);
  if (isEmpty) return null;

  return (
    <div>
      <p className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">{title}</p>
      {Array.isArray(value) ? (
        <div className="flex flex-wrap gap-2">
          {value.map((v: any, i: number) => (
            <span
              key={i}
              className="inline-flex items-center bg-blue-50 text-blue-700 text-base font-bold px-4 py-2 rounded-full border border-blue-100"
            >
              {String(v)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-base text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl border border-slate-100">
          {String(value)}
        </p>
      )}
    </div>
  );
}
