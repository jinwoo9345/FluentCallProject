import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export type CalendarEventKind = 'lesson' | 'personal';

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  title: string;
  start: Date;
  end?: Date;
  /** 색 키워드 — kind에 따라 자동 매핑, 개인 일정은 사용자 지정 가능 */
  color?: 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'slate';
  /** 상세 모달에 전달할 원본 데이터 */
  raw?: any;
}

interface ScheduleCalendarProps {
  events: CalendarEvent[];
  /** "+" 버튼 표시 여부. 비활성화 시 버튼 자체를 안 그림 (관리자용 등) */
  onAddEvent?: () => void;
  onSelectEvent?: (event: CalendarEvent) => void;
  /** 선택된 날짜의 일정만 하단 패널에 표시 */
  initialMonth?: Date;
  /** 헤더에 노출할 작은 캡션 (예: "내 일정", "전체 일정 (관리자)") */
  caption?: string;
}

const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];
const COLOR_MAP: Record<NonNullable<CalendarEvent['color']>, { chip: string; dot: string; ring: string }> = {
  blue:   { chip: 'bg-blue-100 text-blue-700 border-blue-200',       dot: 'bg-blue-500',    ring: 'ring-blue-200' },
  green:  { chip: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
  amber:  { chip: 'bg-amber-100 text-amber-700 border-amber-200',     dot: 'bg-amber-500',   ring: 'ring-amber-200' },
  rose:   { chip: 'bg-rose-100 text-rose-700 border-rose-200',         dot: 'bg-rose-500',    ring: 'ring-rose-200' },
  violet: { chip: 'bg-violet-100 text-violet-700 border-violet-200',   dot: 'bg-violet-500',  ring: 'ring-violet-200' },
  slate:  { chip: 'bg-slate-100 text-slate-700 border-slate-200',     dot: 'bg-slate-500',   ring: 'ring-slate-200' },
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function eventColor(ev: CalendarEvent): NonNullable<CalendarEvent['color']> {
  if (ev.color) return ev.color;
  return ev.kind === 'lesson' ? 'blue' : 'green';
}

export function ScheduleCalendar({
  events,
  onAddEvent,
  onSelectEvent,
  initialMonth,
  caption,
}: ScheduleCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<Date>(initialMonth ? startOfMonth(initialMonth) : startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  // initialMonth가 마운트 이후 변경되면 (예: 다음 수업의 달로 자동 점프) 그쪽으로 이동
  useEffect(() => {
    if (initialMonth) {
      setCursor(startOfMonth(initialMonth));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMonth?.getTime()]);

  // 6주 x 7일 = 42칸 그리드 생성 (이전·다음 달 셀 포함)
  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const startWeekday = first.getDay(); // 0=일
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startWeekday);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [cursor]);

  // 날짜 키별 이벤트 묶기
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = `${ev.start.getFullYear()}-${ev.start.getMonth()}-${ev.start.getDate()}`;
      const arr = map.get(key);
      if (arr) arr.push(ev);
      else map.set(key, [ev]);
    }
    // 시간순 정렬
    map.forEach((arr) => arr.sort((a, b) => a.start.getTime() - b.start.getTime()));
    return map;
  }, [events]);

  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const selectedEvents = eventsByDay.get(dayKey(selectedDay)) || [];

  const goPrev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNext = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => {
    setCursor(startOfMonth(today));
    setSelectedDay(today);
  };

  const monthLabel = `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월`;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
            <CalendarDays size={18} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">{monthLabel}</h2>
            {caption && (
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{caption}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            className="h-9 w-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 flex items-center justify-center transition-colors"
            aria-label="이전 달"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="px-3 h-9 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-white transition-colors"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={goNext}
            className="h-9 w-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 flex items-center justify-center transition-colors"
            aria-label="다음 달"
          >
            <ChevronRight size={16} />
          </button>
          {onAddEvent && (
            <button
              type="button"
              onClick={onAddEvent}
              className="ml-2 px-3 h-9 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider hover:bg-blue-500 transition-colors flex items-center gap-1"
            >
              <Plus size={14} /> 내 일정
            </button>
          )}
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {WEEKDAY_KR.map((w, idx) => (
          <div
            key={w}
            className={cn(
              'text-center text-[11px] font-black uppercase tracking-widest py-2',
              idx === 0 && 'text-rose-500',
              idx === 6 && 'text-blue-500',
              idx !== 0 && idx !== 6 && 'text-slate-500'
            )}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 grid-rows-6">
        {cells.map((d, idx) => {
          const isCurrentMonth = d.getMonth() === cursor.getMonth();
          const isToday = isSameDay(d, today);
          const isSelected = isSameDay(d, selectedDay);
          const dayEvents = eventsByDay.get(dayKey(d)) || [];
          const visibleEvents = dayEvents.slice(0, 3);
          const moreCount = dayEvents.length - visibleEvents.length;
          const weekday = d.getDay();

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedDay(d)}
              className={cn(
                'group relative min-h-[88px] sm:min-h-[104px] border-r border-b border-slate-100 last:border-r-0 px-1.5 pt-1.5 pb-1 text-left transition-colors',
                !isCurrentMonth && 'bg-slate-50/40 text-slate-300',
                isCurrentMonth && 'hover:bg-blue-50/40',
                isSelected && 'bg-blue-50/70 ring-2 ring-inset ring-blue-300',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex items-center justify-center text-[12px] font-bold',
                    isToday
                      ? 'h-6 w-6 rounded-full bg-blue-600 text-white'
                      : isCurrentMonth
                        ? weekday === 0
                          ? 'text-rose-500'
                          : weekday === 6
                            ? 'text-blue-500'
                            : 'text-slate-700'
                        : 'text-slate-300'
                  )}
                >
                  {d.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[9px] font-black text-slate-400">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              <div className="mt-1 space-y-0.5">
                {visibleEvents.map((ev) => {
                  const c = COLOR_MAP[eventColor(ev)];
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent?.(ev);
                      }}
                      className={cn(
                        'truncate text-[10px] sm:text-[11px] leading-tight rounded-md px-1.5 py-0.5 border cursor-pointer',
                        c.chip,
                        'hover:brightness-95'
                      )}
                      title={ev.title}
                    >
                      <span className={cn('inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle', c.dot)} />
                      <span className="align-middle font-bold">
                        {ev.start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="ml-1 align-middle">{ev.title}</span>
                    </div>
                  );
                })}
                {moreCount > 0 && (
                  <div className="text-[10px] font-bold text-slate-400 px-1">+{moreCount} 더보기</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 선택된 날짜 패널 */}
      <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">선택된 날짜</p>
            <p className="text-base font-bold text-slate-900">
              {selectedDay.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}{' '}
              <span className="text-slate-400 font-medium">({WEEKDAY_KR[selectedDay.getDay()]})</span>
            </p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest bg-white text-slate-600 border border-slate-200 px-2 py-1 rounded-full">
            일정 {selectedEvents.length}건
          </span>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-500">이 날짜에는 등록된 일정이 없습니다.</p>
            {onAddEvent && (
              <button
                type="button"
                onClick={onAddEvent}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
              >
                <Plus size={12} /> 내 일정 추가하기
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map((ev) => {
              const c = COLOR_MAP[eventColor(ev)];
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onSelectEvent?.(ev)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-2xl border bg-white px-3 py-2.5 text-left hover:shadow-sm hover:border-slate-300 transition-all',
                    c.ring && 'hover:ring-2',
                    c.ring,
                  )}
                >
                  <span className={cn('h-9 w-1 rounded-full flex-shrink-0', c.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-[10px] font-black uppercase tracking-widest border rounded-full px-1.5 py-0.5', c.chip)}>
                        {ev.kind === 'lesson' ? '수업' : '개인 일정'}
                      </span>
                      <span className="text-sm font-bold text-slate-900 truncate">{ev.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {ev.start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      {ev.end && ` ~ ${ev.end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
