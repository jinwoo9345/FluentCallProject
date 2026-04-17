import { useState } from 'react';
import React from 'react';
import { motion } from 'motion/react';
import { Star, Search, Filter, CreditCard, Heart, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PaymentModal } from '../components/Payment/PaymentModal';
import { TutorDetailModal } from '../components/Tutors/TutorDetailModal';
import { useAuth } from '../contexts/AuthContext';
import { useTutors } from '../hooks/useTutors';

export default function Tutors() {
  const { user, setIsAuthModalOpen, setAuthMode, toggleWishlist } = useAuth();
  const { tutors, loading, error } = useTutors();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<any>(null);

  const filteredTutors = tutors.filter(tutor => 
    tutor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tutor.specialties.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleRegisterClick = (e: React.MouseEvent, tutor: any) => {
    e.stopPropagation();
    if (!user) {
      setAuthMode('signin');
      setIsAuthModalOpen(true);
      return;
    }
    setSelectedTutor(tutor);
    setIsPaymentModalOpen(true);
  };

  const handleTutorClick = (tutor: any) => {
    setSelectedTutor(tutor);
    setIsDetailModalOpen(true);
  };

  const handleHeartClick = (e: React.MouseEvent, tutorId: string) => {
    e.stopPropagation();
    if (!user) {
      setAuthMode('signin');
      setIsAuthModalOpen(true);
      return;
    }
    toggleWishlist(tutorId);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-slate-600">최고의 원어민 튜터들을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-4">
          <p className="font-bold text-lg">데이터를 가져오지 못했습니다</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()}>다시 시도하기</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">나에게 맞는 튜터 찾기</h1>
          <p className="mt-2 text-slate-600">나와 잘 맞는 원어민 강사를 찾아보세요.</p>
        </div>
        
        <div className="flex w-full max-w-md items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
          <Search className="text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="이름 또는 전문 분야 검색..." 
            className="w-full bg-transparent text-sm outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <div className="hidden lg:block">
          <Card className="sticky top-24">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Filter size={18} />
              필터
            </div>
            <div className="mt-6 space-y-6">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">전문 분야</label>
                <div className="mt-3 space-y-2">
                  {['비즈니스 영어', 'IELTS', 'TOEFL', '일상 회화'].map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">수업 방식</label>
                <div className="mt-3 space-y-2">
                  {['25~30분 집중', '자유로운 대화', '비즈니스 특화'].map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Tutor List */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredTutors.map((tutor, idx) => {
              const isWishlisted = user?.wishlist?.includes(tutor.id);
              return (
                <motion.div
                  key={tutor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => handleTutorClick(tutor)}
                  className="cursor-pointer"
                >
                  <Card className="flex h-full flex-col group hover:shadow-lg transition-shadow relative">
                    <button 
                      onClick={(e) => handleHeartClick(e, tutor.id)}
                      className={`absolute top-4 right-4 z-10 rounded-full p-2 transition-colors ${
                        isWishlisted ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-300 hover:text-red-400'
                      }`}
                    >
                      <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
                    </button>

                    <div className="flex items-start gap-4">
                      <img 
                        src={tutor.avatar} 
                        alt={tutor.name} 
                        className="h-16 w-16 rounded-2xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between pr-8">
                          <h3 className="font-bold text-slate-900">{tutor.name}</h3>
                          <div className="flex items-center gap-1 text-sm font-medium text-amber-500">
                            <Star size={14} fill="currentColor" />
                            {tutor.rating}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{tutor.tier}</span>
                          <span className="text-xs text-slate-500">{tutor.location}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">리뷰 {tutor.reviewCount}개</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tutor.specialties.slice(0, 2).map((s) => (
                            <span key={s} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <p className="mt-4 flex-1 text-sm text-slate-600 line-clamp-2">
                      {tutor.bio}
                    </p>

                    <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4">
                      <div>
                        <span className="text-sm font-bold text-blue-600">베이직 플랜</span>
                        <span className="text-xs text-slate-400 block">8회 수업 패키지</span>
                      </div>
                      <Button size="sm" className="gap-2 px-6" onClick={(e) => handleRegisterClick(e, tutor)}>
                        <CreditCard size={16} />
                        등록하기
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedTutor && (
        <>
          <TutorDetailModal
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            tutor={selectedTutor}
            onRegister={() => {
              setIsDetailModalOpen(false);
              if (!user) {
                setAuthMode('signin');
                setIsAuthModalOpen(true);
              } else {
                setIsPaymentModalOpen(true);
              }
            }}
          />
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            productId={`plan_${selectedTutor.id}`}
            productName={`${selectedTutor.name} - 베이직 플랜`}
            price={`${selectedTutor.hourlyRate.toLocaleString()}원`}
            amount={selectedTutor.hourlyRate}
          />
        </>
      )}
    </div>
  );
}
