import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Search, Filter, MessageSquare, Calendar, X, Clock } from 'lucide-react';
import { MOCK_TUTORS } from '../constants';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Tutor } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function Tutors() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const { firebaseUser, user } = useAuth();

  const filteredTutors = MOCK_TUTORS.filter(tutor => 
    tutor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tutor.specialties.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleBook = async (slot: string) => {
    if (!firebaseUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (user?.role !== 'student') {
      alert('수강생만 예약할 수 있습니다.');
      return;
    }

    setIsBooking(true);
    try {
      const fee = selectedTutor!.hourlyRate * 0.1;
      const totalPrice = selectedTutor!.hourlyRate + fee;

      await addDoc(collection(db, 'sessions'), {
        studentId: firebaseUser.uid,
        tutorId: selectedTutor!.id,
        tutorName: selectedTutor!.name,
        startTime: serverTimestamp(), // In a real app, this would be the actual slot time
        duration: 30,
        status: 'upcoming',
        totalPrice,
        fee,
        createdAt: serverTimestamp()
      });

      alert('예약이 완료되었습니다! 내 강의실에서 확인하세요.');
      setSelectedTutor(null);
    } catch (err) {
      console.error(err);
      alert('예약에 실패했습니다.');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Booking Modal Simulation */}
      <AnimatePresence>
        {selectedTutor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">수업 예약하기</h2>
                <button onClick={() => setSelectedTutor(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <img src={selectedTutor.avatar} className="h-12 w-12 rounded-xl object-cover" />
                  <div>
                    <h3 className="font-bold text-slate-900">{selectedTutor.name}</h3>
                    <div className="flex flex-col text-sm">
                      <span className="text-slate-500">수업료: ${selectedTutor.hourlyRate}</span>
                      <span className="text-blue-600 font-medium">플랫폼 수수료 (10%): ${(selectedTutor.hourlyRate * 0.1).toFixed(2)}</span>
                      <span className="text-slate-900 font-bold mt-1">총 결제 금액: ${(selectedTutor.hourlyRate * 1.1).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <h4 className="text-sm font-bold text-slate-900 mb-3">예약 가능한 시간대</h4>
                <div className="grid grid-cols-2 gap-2 mb-8">
                  {selectedTutor.availability.map(slot => (
                    <button 
                      key={slot} 
                      onClick={() => handleBook(slot)}
                      disabled={isBooking}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-blue-600 hover:bg-blue-50 text-sm font-medium text-slate-600 hover:text-blue-600 transition-all disabled:opacity-50"
                    >
                      <Clock size={14} />
                      {slot}
                    </button>
                  ))}
                </div>

                <Button 
                  className="w-full py-4 rounded-2xl" 
                  disabled={isBooking}
                  onClick={() => handleBook(selectedTutor.availability[0])}
                >
                  {isBooking ? '처리 중...' : '예약 확정하기'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">나에게 맞는 튜터 찾기</h1>
          <p className="mt-2 text-slate-600">수백 명의 검증된 원어민 강사 중에서 선택하세요.</p>
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
                  <span>$10</span>
                  <span>$50+</span>
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
                <Card className="flex h-full flex-col">
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
                      <p className="text-xs text-slate-500">리뷰 {tutor.reviewCount}개</p>
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
                      <span className="text-lg font-bold text-slate-900">${tutor.hourlyRate}</span>
                      <span className="text-xs text-slate-400"> / 시간</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="p-2">
                        <MessageSquare size={16} />
                      </Button>
                      <Button size="sm" className="gap-2" onClick={() => setSelectedTutor(tutor)}>
                        <Calendar size={16} />
                        예약하기
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
