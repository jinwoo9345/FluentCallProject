import { useState } from 'react';
import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PaymentModal } from '../components/Payment/PaymentModal';
import { TutorDetailModal } from '../components/Tutors/TutorDetailModal';
import { TutorCard, TutorCardSkeleton } from '../components/Tutors/TutorCard';
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
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <TutorCardSkeleton key={`skel-${i}`} />)
              : filteredTutors.map((tutor, idx) => (
                  <TutorCard
                    key={tutor.id}
                    tutor={tutor as any}
                    index={idx}
                    isWishlisted={user?.wishlist?.includes(tutor.id)}
                    onClick={() => handleTutorClick(tutor)}
                    onRegister={(t) => handleRegisterClick({ stopPropagation: () => {} } as any, t)}
                    onWishlistToggle={(id) => handleHeartClick({ stopPropagation: () => {} } as any, id)}
                  />
                ))}
            {!loading && filteredTutors.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400">
                검색 조건에 맞는 튜터가 없습니다.
              </div>
            )}
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
            amount={selectedTutor.hourlyRate}
            tutorId={selectedTutor.id}
            tutorName={selectedTutor.name}
          />
        </>
      )}
    </div>
  );
}
