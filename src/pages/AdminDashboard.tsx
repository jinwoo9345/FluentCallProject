import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, UserPlus, CreditCard, MessageSquare, TrendingUp, 
  Search, CheckCircle, Clock, MoreVertical, Shield, Star
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
  const [stats, setStats] = useState({ users: 0, revenue: 0, sessions: 0, pendingConsults: 0 });
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') return;

    async function fetchAdminData() {
      setLoading(true);
      try {
        // 1. Fetch Stats (Simple Example)
        const userSnap = await getDocs(collection(db, 'users'));
        const consultSnap = await getDocs(query(collection(db, 'consultations'), where('status', '==', 'pending')));
        const paymentSnap = await getDocs(collection(db, 'payments'));
        
        let totalRevenue = 0;
        paymentSnap.forEach(doc => totalRevenue += (doc.data().amount || 0));

        setStats({
          users: userSnap.size,
          revenue: totalRevenue,
          sessions: 0, // Placeholder
          pendingConsults: consultSnap.size
        });

        // 2. Fetch Recent Consultations
        const cSnap = await getDocs(query(collection(db, 'consultations'), orderBy('createdAt', 'desc'), limit(10)));
        setConsultations(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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
    { id: 'tutors', label: '강사 관리', icon: UserPlus },
    { id: 'payments', label: '결제 관리', icon: CreditCard },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">관리자 대시보드</h1>
        <p className="mt-2 text-slate-600">EnglishBites 전체 서비스 현황을 한눈에 관리합니다.</p>
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

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Summary Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: '전체 유저', value: stats.users, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: '누적 매출', value: `${(stats.revenue/10000).toFixed(1)}만원`, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
              { label: '진행 예정 수업', value: '12', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: '대기 중인 상담', value: stats.pendingConsults, icon: MessageSquare, color: 'text-rose-600', bg: 'bg-rose-50' },
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
              <h2 className="text-xl font-bold text-slate-900">최근 상담 신청</h2>
              <div className="space-y-4">
                {consultations.length === 0 ? (
                  <Card className="p-8 text-center text-slate-500">데이터가 없습니다.</Card>
                ) : (
                  consultations.map((c) => (
                    <Card key={c.id} className="p-4 flex items-center justify-between">
                      <div className="flex gap-4">
                        <div className="bg-slate-100 p-2 rounded-lg h-fit">
                          <MessageSquare size={20} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{c.name} ({c.contactValue})</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{c.motivation}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400">{c.createdAt?.toDate().toLocaleDateString()}</span>
                        <Button variant="outline" size="sm">상세보기</Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Platform Health Sidebar */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">서버 정보</h2>
              <Card className="bg-slate-900 text-white border-none p-6">
                <p className="text-xs text-slate-400 uppercase font-bold">환경</p>
                <p className="text-lg font-bold">Cloudflare Pages & Functions</p>
                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between">
                  <span className="text-xs text-slate-400">DB 상태</span>
                  <span className="text-xs text-green-400 font-bold">Online</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-xs text-slate-400">빌드 버전</span>
                  <span className="text-xs text-blue-400 font-bold">v1.2.0-main</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'consultations' && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-4">성함</th>
                <th className="px-6 py-4">연락처</th>
                <th className="px-6 py-4">신청 시간</th>
                <th className="px-6 py-4">상태</th>
                <th className="px-6 py-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consultations.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{c.contactType}: {c.contactValue}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{c.createdAt?.toDate().toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                      상담 대기
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-blue-600"><MoreVertical size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Tutors & Payments tabs would follow similar list patterns */}
    </div>
  );
}
