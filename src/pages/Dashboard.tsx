import { motion } from 'motion/react';
import { Calendar, Clock, Video, ChevronRight, Award, BookOpen, MessageSquare, DollarSign, Users, User as UserIcon, Heart, Star } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useSessions } from '../hooks/useSessions';
import { useTutors } from '../hooks/useTutors';
import { ConsultationForm } from '../components/Consultation/ConsultationForm';
import { ScheduleManager } from '../components/Dashboard/ScheduleManager';
import { Tutor } from '../types';

export default function Dashboard() {
  const { user, firebaseUser } = useAuth();
  const { sessions, loading: sessionsLoading } = useSessions(firebaseUser?.uid, user?.role);
  const { tutors } = useTutors();
  
  const wishlistedTutors = tutors.filter(t => user?.wishlist?.includes(t.id));

  if (!firebaseUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="bg-slate-50 p-6 rounded-full mb-6">
          <UserIcon size={48} className="text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">로그인이 필요한 서비스입니다.</h2>
        <p className="mt-2 text-slate-600">수업 일정을 확인하려면 로그인해 주세요.</p>
        <Button className="mt-8">로그인하러 가기</Button>
      </div>
    );
  }

  // Phase 2: Consultation Hard Blocker for Students
  if (user?.role === 'student' && !user?.hasCompletedConsultation) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ConsultationForm userId={firebaseUser.uid} onComplete={() => window.location.reload()} />
      </div>
    );
  }

  const stats = user?.role === 'student' ? [
    { label: '완료한 수업', value: sessions.filter(s => s.status === 'completed').length.toString(), icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '학습 시간', value: `${sessions.filter(s => s.status === 'completed').length * 25}분`, icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '보유 크레딧', value: user?.credits?.toString() || '0', icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
  ] : [
    { label: '총 수익', value: `$${sessions.reduce((acc, s) => acc + (s.duration * 0.5), 0).toFixed(2)}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '진행한 수업', value: sessions.filter(s => s.status === 'completed').length.toString(), icon: Video, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '총 학생 수', value: new Set(sessions.map(s => s.userId)).size.toString(), icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
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
                <Card className="p-12 text-center text-slate-500 border-dashed">
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
                    <Card className="flex items-center justify-between p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                          {user?.role === 'student' ? <Users size={24} /> : <UserIcon size={24} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">
                            {user?.role === 'student' ? (tutors.find(t => t.id === cls.tutorId)?.name || '튜터') : '수강생 수업'}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><Calendar size={14} /> {cls.startTime instanceof Date ? cls.startTime.toLocaleDateString() : '시간 미정'}</span>
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
                          입장하기
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* Live Wishlist Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">관심 튜터 (위시리스트)</h2>
            </div>
            {wishlistedTutors.length === 0 ? (
              <Card className="p-8 text-center text-slate-500 border-dashed">
                아직 찜한 튜터가 없습니다.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {wishlistedTutors.map(tutor => (
                  <Card key={tutor.id} className="flex items-center gap-4 p-4 hover:shadow-md transition-shadow">
                    <img src={tutor.avatar} alt={tutor.name} className="h-12 w-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900">{tutor.name}</h3>
                        <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500">
                          <Star size={12} className="fill-current" /> {tutor.rating}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{tutor.specialties.join(', ')}</p>
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
              <p className="text-xs text-slate-500">
                {user?.role === 'student' ? '선호하는 수업 시간대를 알려주세요.' : '수업 가능한 시간대를 등록해주세요.'}
              </p>
            </div>
            <Card className="p-6">
              <ScheduleManager 
                userId={firebaseUser.uid} 
                availability={user?.role === 'student' ? (user?.studentAvailability || []) : (tutors.find(t => t.id === firebaseUser.uid)?.availability || [])} 
                role={user?.role}
              />
            </Card>
          </section>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-xl">
            <h3 className="font-bold text-lg mb-2">보유 크레딧</h3>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">{user?.credits || 0}</span>
              <span className="text-slate-400 mb-1">분 남음</span>
            </div>
            <p className="mt-4 text-xs text-slate-400 leading-relaxed">
              친구를 초대하면 10분 무료 크레딧을 드립니다!
            </p>
            <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-500 border-none">
              크레딧 충전하기
            </Button>
          </Card>

          <Card>
            <h3 className="font-bold text-slate-900 mb-4">내 계정 정보</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <UserIcon size={20} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">추천 코드</p>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <code className="text-sm font-bold text-blue-600">{user?.referralCode}</code>
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">복사</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
