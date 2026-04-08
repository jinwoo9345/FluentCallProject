import { useState } from 'react';
import { motion } from 'motion/react';
import { Star, Search, Filter, MessageSquare, CreditCard, MapPin } from 'lucide-react';
import { MOCK_TUTORS } from '../constants';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PaymentModal } from '../components/Payment/PaymentModal';

export default function Tutors() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<any>(null);

  const filteredTutors = MOCK_TUTORS.filter(tutor => 
    tutor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tutor.specialties.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePayClick = (tutor: any) => {
    setSelectedTutor(tutor);
    setIsPaymentModalOpen(true);
  };

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
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">가격대</label>
                <input type="range" className="mt-3 w-full accent-blue-600" />
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>10,000원</span>
                  <span>150,000원+</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Tutor List */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredTutors.map((tutor, idx) => (
              <motion.div
                key={tutor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="flex h-full flex-col group hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <img 
                      src={tutor.avatar} 
                      alt={tutor.name} 
                      className="h-16 w-16 rounded-2xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
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
                      <span className="text-lg font-bold text-slate-900">{tutor.hourlyRate.toLocaleString()}원</span>
                      <span className="text-xs text-slate-400"> / 월</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="p-2">
                        <MessageSquare size={16} />
                      </Button>
                      <Button size="sm" className="gap-2" onClick={() => handlePayClick(tutor)}>
                        <CreditCard size={16} />
                        결제하기
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {selectedTutor && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          productId={`plan_${selectedTutor.id}`}
          productName={`${selectedTutor.name} - 베이직 플랜`}
          price={`${selectedTutor.hourlyRate.toLocaleString()}원`}
          amount={selectedTutor.hourlyRate}
        />
      )}
    </div>
  );
}
