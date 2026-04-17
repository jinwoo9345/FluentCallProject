import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, UserPlus, CreditCard, MessageSquare, TrendingUp, 
  Search, CheckCircle, Clock, MoreVertical, Shield, Star,
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'consultations' | 'tutors' | 'payments'>('overview');
  
  const [stats, setStats] = useState({ users: 0, revenue: 0, upcomingSessions: 0, pendingConsults: 0 });
  const [consultations, setConsultations] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') return;

    async function fetchAdminData() {
      setLoading(true);
      try {
        // 1. Fetch Users
        const userSnap = await getDocs(collection(db, 'users'));
        setUsersList(userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // 2. Fetch Consultations
        const consultSnap = await getDocs(query(collection(db, 'consultations'), orderBy('createdAt', 'desc')));
        const allConsultations = consultSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setConsultations(allConsultations);
        const pendingCount = allConsultations.filter(c => c.status === 'pending').length;

        // 3. Fetch Payments
        const paymentSnap = await getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc')));
        const allPayments = paymentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPayments(allPayments);
        
        let totalRevenue = 0;
        allPayments.forEach(p => {
          if (p.status === 'completed') totalRevenue += (p.amount || 0);
        });

        // 4. Fetch Tutors
        const tutorSnap = await getDocs(collection(db, 'tutors'));
        setTutors(tutorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // 5. Fetch Upcoming Sessions
        const sessionSnap = await getDocs(query(collection(db, 'sessions'), where('status', '==', 'upcoming')));

        setStats({
          users: userSnap.size,
          revenue: totalRevenue,
          upcomingSessions: sessionSnap.size,
          pendingConsults: pendingCount
        });

      } catch (err) {
        console.error("Error fetching admin data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAdminData();
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Shield size={64} className="text-red-200 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">접근 권한이 없습니다.</h2>
        <p className="mt-2 text-slate-600">이 페이지는 관리자만 접근할 수 있습니다.</p>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', label: '현황판', icon: TrendingUp },
    { id: 'consultations', label: '상담 내역', icon: MessageSquare, count: stats.pendingConsults },
    { id: 'payments', label: '결제 관리', icon: CreditCard },
    { id: 'tutors', label: '강사 관리', icon: UserPlus },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">관리자 대시보드</h1>
        <p className="mt-2 text-slate-600">EnglishBites 전체 서비스 현황을 실시간으로 관리합니다.</p>
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
                    {consultations.filter(c => c.status === 'pending').slice(0, 5).length === 0 ? (
                      <Card className="p-8 text-center text-slate-500 border-dashed">대기 중인 상담이 없습니다.</Card>
                    ) : (
                      consultations.filter(c => c.status === 'pending').slice(0, 5).map((c) => (
                        <Card key={c.id} className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                          <div className="flex gap-4">
                            <div className="bg-rose-50 p-3 rounded-xl h-fit">
                              <MessageSquare size={20} className="text-rose-600" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{c.name || '미입력'} <span className="text-xs text-slate-500 font-normal ml-2">{c.contactType}: {c.contactValue}</span></p>
                              <p className="text-xs text-slate-500 line-clamp-1 mt-1">{c.motivation || '상세 내용 없음'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-slate-400 font-bold">{c.createdAt?.toDate().toLocaleDateString()}</span>
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
              <h2 className="text-xl font-bold text-slate-900 mb-4">전체 상담 신청 내역</h2>
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
                      {consultations.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{c.name || '미입력'}</p>
                            {c.userId && <p className="text-[10px] text-blue-600 font-bold mt-0.5">회원 가입됨</p>}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{c.contactType}: {c.contactValue}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{c.createdAt?.toDate().toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{c.availableTime || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black tracking-wider uppercase",
                              c.status === 'pending' ? "bg-rose-100 text-rose-700" : "bg-green-100 text-green-700"
                            )}>
                              {c.status === 'pending' ? '대기 중' : '완료'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="outline" size="sm" className="text-xs">상태 변경</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                        <th className="px-6 py-4 font-bold">결제 ID</th>
                        <th className="px-6 py-4 font-bold">결제자 (UID)</th>
                        <th className="px-6 py-4 font-bold">상품명</th>
                        <th className="px-6 py-4 font-bold">최종 결제 금액</th>
                        <th className="px-6 py-4 font-bold">포인트 사용</th>
                        <th className="px-6 py-4 font-bold">결제 일시</th>
                        <th className="px-6 py-4 font-bold">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-xs font-mono text-slate-500">{p.id.substring(0, 12)}...</td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {usersList.find(u => u.uid === p.userId)?.name || '알 수 없음'}
                            <p className="text-[10px] text-slate-400">{p.userId?.substring(0, 8)}...</p>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">{p.productName}</td>
                          <td className="px-6 py-4 font-black text-slate-900">{p.amount?.toLocaleString()}원</td>
                          <td className="px-6 py-4 text-sm text-amber-600 font-bold">{p.creditsUsed > 0 ? `-${(p.creditsUsed * 1000).toLocaleString()}원` : '-'}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{p.createdAt?.toDate().toLocaleString()}</td>
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'tutors' && (
            <motion.div key="tutors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">등록된 강사 목록</h2>
                <Button className="gap-2"><UserPlus size={18} /> 강사 추가</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tutors.map(tutor => (
                  <Card key={tutor.id} className="p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
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
                    <div className="mt-6 flex gap-2">
                      <Button variant="outline" className="w-full text-xs">정보 수정</Button>
                      <Button variant="outline" className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50">숨기기</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
