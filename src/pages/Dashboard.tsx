import { motion } from 'motion/react';
import { Calendar, Clock, Video, ChevronRight, Award, TrendingUp, BookOpen, MessageSquare, DollarSign, Users, User as UserIcon, Heart } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { MOCK_TUTORS } from '../constants';

export default function Dashboard() {
  const { user, firebaseUser } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const wishlistedTutors = MOCK_TUTORS.filter(t => user?.wishlist?.includes(t.id));

  useEffect(() => {
    if (!firebaseUser || !user) return;

    const field = user.role === 'student' ? 'studentId' : 'tutorId';
    const q = query(
      collection(db, 'sessions'),
      where(field, '==', firebaseUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseUser, user]);

  if (!firebaseUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <h2 className="text-2xl font-bold text-slate-900">로그인이 필요한 서비스입니다.</h2>
        <p className="mt-2 text-slate-600">수업 일정을 확인하려면 로그인해 주세요.</p>
      </div>
    );
  }

  const stats = user?.role === 'student' ? [
    { label: '완료한 수업', value: sessions.filter(s => s.status === 'completed').length.toString(), icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '학습 시간', value: (sessions.filter(s => s.status === 'completed').length * 0.5).toString(), icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '보유 크레딧', value: user?.credits?.toString() || '0', icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
  ] : [
    { label: '총 수익', value: `$${sessions.reduce((acc, s) => acc + (s.totalPrice - s.fee), 0).toFixed(2)}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '진행한 수업', value: sessions.filter(s => s.status === 'completed').length.toString(), icon: Video, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '총 학생 수', value: new Set(sessions.map(s => s.studentId)).size.toString(), icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Main Content */}
        <div className="flex-1 space-y-8">
          <header>
            <h1 className="text-3xl font-bold text-slate-900">반가워요, {user?.name || firebaseUser.displayName}님!</h1>
            <p className="mt-2 text-slate-600">
              {user?.role === 'student' 
                ? `현재 예약된 수업이 ${sessions.filter(s => s.status === 'upcoming').length}개 있습니다.`
                : `오늘 예정된 수업이 ${sessions.filter(s => s.status === 'upcoming').length}개 있습니다.`}
            </p>
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat, idx) => (
              <Card key={idx} className="flex items-center gap-4">
                <div className={cn('rounded-xl p-3', stat.bg, stat.color)}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Upcoming Classes */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                {user?.role === 'student' ? '예정된 수업' : '수업 일정'}
              </h2>
              <Button variant="ghost" size="sm" className="text-blue-600">전체 보기</Button>
            </div>
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <Card className="p-12 text-center text-slate-500">
                  아직 예약된 수업이 없습니다.
                </Card>
              ) : (
                sessions.map((cls, idx) => (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                          {user?.role === 'student' ? <Users size={24} /> : <UserIcon size={24} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">
                            {user?.role === 'student' ? cls.tutorName : '수강생 수업'}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><Calendar size={14} /> {cls.startTime?.toDate().toLocaleDateString() || '시간 미정'}</span>
                            <span className="flex items-center gap-1"><Clock size={14} /> {cls.duration}분</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                          <MessageSquare size={16} />
                          메시지
                        </Button>
                        <Button variant="secondary" size="sm">
                          상세 정보
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* Wishlist Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">관심 튜터 (위시리스트)</h2>
            </div>
            {wishlistedTutors.length === 0 ? (
              <Card className="p-8 text-center text-slate-500">
                아직 찜한 튜터가 없습니다.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {wishlistedTutors.map(tutor => (
                  <Card key={tutor.id} className="flex items-center gap-4 p-4 hover:shadow-md transition-shadow">
                    <img src={tutor.avatar} alt={tutor.name} className="h-12 w-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{tutor.name}</h3>
                      <p className="text-xs text-slate-500">{tutor.tier}</p>
                    </div>
                    <Heart size={18} className="text-red-500 fill-current" />
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Schedule Management Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">내 스케줄 관리</h2>
            </div>
            <Card className="p-0 overflow-hidden">
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-bold text-slate-500 uppercase tracking-wider py-3">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => <div key={day}>{day}</div>)}
              </div>
              <div className="grid grid-cols-7 h-64">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="border-r border-b border-slate-50 p-2 text-xs text-slate-300 relative">
                    {i + 1 <= 31 && i + 1}
                    {(i === 15 || i === 16) && (
                      <div className="absolute inset-x-1 top-6 bottom-1 bg-blue-100 rounded-md border-l-2 border-blue-600 p-1 overflow-hidden">
                        <p className="text-[8px] font-bold text-blue-700 truncate">수업 예약됨</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          <Card className="bg-slate-900 text-white border-none">
            <h3 className="font-bold text-lg mb-2">보유 크레딧</h3>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">120</span>
              <span className="text-slate-400 mb-1">분 남음</span>
            </div>
            <Button variant="primary" className="w-full mt-6 bg-blue-600 hover:bg-blue-500">
              크레딧 충전하기
            </Button>
          </Card>

          <Card>
            <h3 className="font-bold text-slate-900 mb-4">빠른 링크</h3>
            <ul className="space-y-3">
              {[
                '학습 자료실',
                '수업 히스토리',
                '계정 설정',
                '친구 초대하기',
              ].map((item) => (
                <li key={item}>
                  <button className="flex w-full items-center justify-between text-sm text-slate-600 hover:text-blue-600 transition-colors group">
                    {item}
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
