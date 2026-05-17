import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Flame, ChevronRight } from 'lucide-react';

const DISMISS_KEY = 'promoPopupDismissedAt';
const DISMISS_HOURS = 24;

/**
 * 메인 페이지 우측 하단에 떠 있는 작은 프로모션 팝업.
 * 스크롤해도 화면에 고정(fixed)되어 사라지지 않으며, 닫기 시 24시간 동안 다시 뜨지 않는다.
 */
export function PromotionPopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 페이지 진입 시 닫힌 지 24시간 지났는지 확인 → 짧은 지연 후 슬라이드 인
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const dismissedAt = Number(raw);
        const elapsedMs = Date.now() - dismissedAt;
        if (elapsedMs < DISMISS_HOURS * 60 * 60 * 1000) return;
      }
    } catch {
      // localStorage 접근 실패 시(시크릿 모드 등) 그냥 표시
    }
    const t = setTimeout(() => setIsVisible(true), 700);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // 무시
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="fixed bottom-5 right-5 z-[80] w-[300px] max-w-[calc(100vw-2rem)]"
        >
          <div className="relative rounded-2xl shadow-2xl shadow-blue-900/30 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden border border-white/10">
            {/* 글로우 */}
            <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 bg-amber-400/20 rounded-full blur-2xl" />

            <button
              type="button"
              onClick={handleClose}
              aria-label="팝업 닫기"
              className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={14} />
            </button>

            <Link
              to="/events"
              className="block p-5 pr-9 group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full">
                  <Flame size={11} /> 진행 중
                </span>
                <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">
                  플랫폼 이벤트
                </span>
              </div>
              <p className="text-sm font-black leading-snug text-white">
                30명 선착순 정상가 프로모션
              </p>
              <p className="mt-1 text-[11px] text-blue-100/90 leading-relaxed">
                선착순 30명 마감 후엔 모든 수강권이 10% 인상됩니다.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-300 group-hover:text-amber-200">
                이벤트 자세히 보기 <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
