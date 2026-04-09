import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, MapPin, Globe, Clock, CreditCard, Heart } from 'lucide-react';
import { Tutor } from '../../types';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';

interface TutorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutor: Tutor;
  onRegister: () => void;
}

export function TutorDetailModal({ isOpen, onClose, tutor, onRegister }: TutorDetailModalProps) {
  const { user, toggleWishlist } = useAuth();
  const isWishlisted = user?.wishlist?.includes(tutor.id);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-6 top-6 z-10 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="max-h-[80vh] overflow-y-auto p-8 sm:p-10">
              <div className="flex flex-col sm:flex-row gap-8">
                <div className="shrink-0">
                  <img
                    src={tutor.avatar}
                    alt={tutor.name}
                    className="h-32 w-32 rounded-3xl object-cover shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold text-slate-900">{tutor.name}</h2>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(tutor.id);
                      }}
                      className={`rounded-full p-2 transition-colors ${
                        isWishlisted ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400 hover:text-red-400'
                      }`}
                    >
                      <Heart size={24} fill={isWishlisted ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                      {tutor.tier}
                    </span>
                    <div className="flex items-center gap-1 text-sm font-medium text-amber-500">
                      <Star size={16} fill="currentColor" />
                      {tutor.rating} ({tutor.reviewCount} 리뷰)
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={16} />
                      {tutor.location}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Globe size={16} />
                      {tutor.languages.join(', ')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 space-y-8">
                <section>
                  <h3 className="text-lg font-bold text-slate-900">자기소개</h3>
                  <p className="mt-3 text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {tutor.longBio || tutor.bio}
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-slate-900">전문 분야</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tutor.specialties.map((s) => (
                      <span key={s} className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-slate-900">수업 리뷰</h3>
                  <div className="mt-4 space-y-4">
                    {tutor.reviews && tutor.reviews.length > 0 ? (
                      tutor.reviews.map((review) => (
                        <div key={review.id} className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{review.userName}</span>
                            <div className="flex items-center gap-1 text-amber-500">
                              <Star size={12} fill="currentColor" />
                              <span className="text-xs font-bold">{review.rating}</span>
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{review.comment}</p>
                          <span className="mt-2 block text-[10px] text-slate-400">{review.date}</span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-slate-50 p-8 text-center border border-slate-100">
                        <p className="text-sm text-slate-500">아직 등록된 리뷰가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 p-6 sm:px-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">수강료</p>
                  <p className="text-2xl font-black text-slate-900">{tutor.hourlyRate.toLocaleString()}원 <span className="text-sm font-normal text-slate-400">/ 월</span></p>
                </div>
                <Button size="lg" className="px-10 py-6 text-lg font-bold rounded-2xl shadow-lg shadow-blue-200" onClick={onRegister}>
                  등록하기
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
