import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface PaginationProps {
  currentPage: number;           // 1-based
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  // 표시할 페이지 번호 계산 (최대 5개 + ellipsis)
  const buildPages = (): (number | '…')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) pages.push('…');
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < totalPages - 1) pages.push('…');
    pages.push(totalPages);
    return pages;
  };

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50',
        className
      )}
    >
      <p className="text-xs text-slate-500 font-medium">
        전체 {totalItems.toLocaleString()}건 중{' '}
        <span className="font-bold text-slate-800">
          {from.toLocaleString()}–{to.toLocaleString()}
        </span>{' '}
        표시
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} /> 이전
        </button>

        {buildPages().map((p, idx) =>
          p === '…' ? (
            <span key={`e-${idx}`} className="px-2 text-xs text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition',
                currentPage === p
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          다음 <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// 커스텀 훅: 배열 + 페이지 크기 → 현재 페이지 slice
import { useState, useEffect, useMemo } from 'react';

export function usePaginated<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // 필터/검색으로 결과가 줄어들면 현재 페이지가 범위를 넘어설 수 있으므로 자동 보정
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const sliced = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  return { page, setPage, sliced, totalPages };
}
