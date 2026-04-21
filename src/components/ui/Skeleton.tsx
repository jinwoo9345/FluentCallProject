import { cn } from '@/src/lib/utils';

interface SkeletonProps {
  className?: string;
}

/**
 * 로딩 중 콘텐츠가 "곧 들어올 자리"를 시각적으로 알리는 플레이스홀더.
 * 스피너만 있을 때보다 체감 로딩 시간이 짧고 UI가 덜 멈춘 느낌을 준다.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-slate-200/70 rounded-md',
        className
      )}
    />
  );
}
