import { motion } from 'motion/react';
import { Star, Heart, CreditCard } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '@/src/lib/utils';
import { Tutor } from '../../types';
import { calcPackageTotal } from '../../constants';

type TutorCardVariant = 'full' | 'compact';

interface TutorCardProps {
  tutor: Tutor & { enrollDisabled?: boolean; disabledMessage?: string };
  variant?: TutorCardVariant;
  isWishlisted?: boolean;
  /** 리스트 순서 (모션 딜레이 계산용) */
  index?: number;
  onClick?: (tutor: Tutor) => void;
  onRegister?: (tutor: Tutor) => void;
  onWishlistToggle?: (tutorId: string) => void;
}

/**
 * 튜터 정보 카드 공용 컴포넌트.
 * - variant 'full': 리스트(/tutors)용 큰 카드 (별점·전문분야·bio·가격·등록CTA)
 * - variant 'compact': 대시보드·사이드바용 소형 식별 카드 (아바타·이름·전문분야)
 */
export function TutorCard({
  tutor,
  variant = 'full',
  isWishlisted = false,
  index = 0,
  onClick,
  onRegister,
  onWishlistToggle,
}: TutorCardProps) {
  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => onClick?.(tutor)}
        className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all text-left w-full"
      >
        <img
          src={tutor.avatar}
          alt={tutor.name}
          className="h-12 w-12 rounded-xl object-cover flex-shrink-0"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm truncate">{tutor.name}</p>
          <p className="text-[11px] text-slate-500 truncate">
            {(tutor.specialties || []).slice(0, 2).join(' · ') || '튜터'}
          </p>
        </div>
      </button>
    );
  }

  // full variant
  const rating = (Number(tutor.rating) || 5).toFixed(1);
  const reviewCount = tutor.reviewCount || 0;
  const hourlyRate = tutor.hourlyRate || 0;
  // 패키지 할인 적용 시 회당 가격 범위 (24회 +2 보너스 = 최저, 8회 = 최고)
  const minPerSession = hourlyRate > 0 ? Math.round(calcPackageTotal(hourlyRate, 24) / 26) : 0;
  const maxPerSession = hourlyRate > 0 ? Math.round(calcPackageTotal(hourlyRate, 8) / 8) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={() => onClick?.(tutor)}
      className="cursor-pointer"
    >
      <Card className="flex h-full flex-col group hover:shadow-lg transition-shadow relative">
        {onWishlistToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); onWishlistToggle(tutor.id); }}
            className={cn(
              'absolute top-4 right-4 z-10 rounded-full p-2 transition-colors',
              isWishlisted ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-300 hover:text-red-400'
            )}
          >
            <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
        )}

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
                {rating}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                {tutor.tier}
              </span>
              <span className="text-xs text-slate-500">{tutor.location}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">리뷰 {reviewCount}개</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {(tutor.specialties || []).slice(0, 2).map((s) => (
                <span key={s} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 flex-1 text-sm text-slate-600 line-clamp-2">{tutor.bio}</p>

        <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase tracking-widest font-bold">
              회당 수강료
            </span>
            <span className="text-base font-black text-slate-900 block">
              {minPerSession.toLocaleString()}원 ~ {maxPerSession.toLocaleString()}원
            </span>
            <span className="text-[11px] text-slate-500 block">
              패키지 할인 적용 시
            </span>
          </div>
          {tutor.enrollDisabled ? (
            <span
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 cursor-not-allowed"
            >
              {tutor.disabledMessage || '현재 대기 중'}
            </span>
          ) : (
            <Button
              size="sm"
              className="gap-2 px-6"
              onClick={(e) => { e.stopPropagation(); onRegister?.(tutor); }}
            >
              <CreditCard size={16} />
              등록하기
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * TutorCard(full)의 로딩 플레이스홀더.
 */
export function TutorCardSkeleton() {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-10" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12 rounded-md" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-3 w-20" />
          <div className="flex gap-1 pt-1">
            <Skeleton className="h-4 w-14 rounded-full" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex-1 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4">
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
    </Card>
  );
}
