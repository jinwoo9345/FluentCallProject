import { Link, useLocation } from 'react-router-dom';
import {
  User, Calendar, Menu, X, LogOut, Shield, ChevronDown,
  BookOpen, GraduationCap, Users,
  Sparkles, Gift, CalendarPlus, MessageCircle,
  Star, HelpCircle, Newspaper,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';

type SubItem = {
  name: string;
  path: string;
  icon: any;
  description: string;
  accent: string; // Tailwind 색상 토큰 (예: 'text-blue-600 bg-blue-50')
};
type MenuItem = { name: string; icon: any; items: SubItem[] };

export const Navbar = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDropdownHovered, setIsDropdownHovered] = useState(false);
  const [mobileSub, setMobileSub] = useState<string | null>(null);
  const location = useLocation();
  const { user, firebaseUser, setIsAuthModalOpen, setAuthMode } = useAuth();

  const menus: MenuItem[] = [
    {
      name: '소개',
      icon: BookOpen,
      items: [
        {
          name: '프로그램 소개',
          path: '/about',
          icon: Sparkles,
          description: '서비스 목적과 차별점 한눈에',
          accent: 'text-blue-600 bg-blue-50',
        },
        {
          name: '튜터 소개',
          path: '/tutors',
          icon: Users,
          description: '검증된 원어민 튜터 프로필',
          accent: 'text-indigo-600 bg-indigo-50',
        },
        {
          name: '친구 추천 혜택',
          path: '/referral',
          icon: Gift,
          description: '친구 초대 시 20,000P 즉시 지급',
          accent: 'text-pink-600 bg-pink-50',
        },
      ],
    },
    {
      name: '수업',
      icon: GraduationCap,
      items: [
        {
          name: '수업 등록·신청',
          path: '/tutors',
          icon: CalendarPlus,
          description: '튜터 선택 후 수강권 결제',
          accent: 'text-emerald-600 bg-emerald-50',
        },
        {
          name: '상담 신청',
          path: '/consultation',
          icon: MessageCircle,
          description: '전문 매니저 1:1 학습 상담',
          accent: 'text-sky-600 bg-sky-50',
        },
      ],
    },
    {
      name: '커뮤니티',
      icon: Users,
      items: [
        {
          name: '수강생 후기',
          path: '/reviews',
          icon: Star,
          description: '실제 학습자들의 솔직 리뷰',
          accent: 'text-amber-600 bg-amber-50',
        },
        {
          name: 'Q&A 게시판',
          path: '/qna',
          icon: HelpCircle,
          description: '궁금한 점을 자유롭게 질문',
          accent: 'text-violet-600 bg-violet-50',
        },
        {
          name: '정보 게시판',
          path: '/info-board',
          icon: Newspaper,
          description: '학습 팁·영어 자료 모음',
          accent: 'text-slate-700 bg-slate-100',
        },
      ],
    },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isActiveDropdown = (item: MenuItem) => item.items.some(s => isActive(s.path));

  const handleSignOut = () => signOut(auth);

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-brand-cream-dark/50 bg-brand-cream/80 backdrop-blur-md">
      <div className="mx-auto grid grid-cols-[auto_1fr_auto] h-20 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* 좌측: 로고 */}
        <div className="justify-self-start">
          <Link to="/" className="flex items-center gap-2 text-2xl font-black text-slate-900 font-display tracking-tight">
            <span>English<span className="text-blue-600">Bites</span></span>
          </Link>
        </div>

        {/* 중앙: 데스크톱 메뉴 */}
        <div className="hidden md:flex md:items-center md:justify-center md:gap-6 justify-self-center">
          {/* 드롭다운 메뉴 그룹 — 하나의 통합 패널(메가 메뉴) */}
          <div
            className="relative"
            onMouseEnter={() => setIsDropdownHovered(true)}
            onMouseLeave={() => setIsDropdownHovered(false)}
          >
            <div className="flex items-center gap-6">
              {menus.map((menu) => (
                <button
                  key={menu.name}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-sm font-bold transition-colors rounded-lg hover:text-blue-600',
                    isActiveDropdown(menu) ? 'text-blue-600' : 'text-slate-600'
                  )}
                >
                  <menu.icon size={16} />
                  {menu.name}
                  <ChevronDown
                    size={14}
                    className={cn('transition-transform', isDropdownHovered && 'rotate-180')}
                  />
                </button>
              ))}
            </div>

            {/* 드롭다운 — 3개 섹션이 gap 없이 접해 하나의 패널처럼 합쳐 보임 */}
            {isDropdownHovered && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50">
                <div className="flex items-start">
                  {menus.map((menu, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === menus.length - 1;
                    return (
                      <div
                        key={menu.name}
                        className={cn(
                          'bg-white/95 backdrop-blur-xl shadow-2xl p-4 w-72 border-y border-white/40',
                          isFirst ? 'rounded-l-2xl border-l border-white/40' : 'border-l border-slate-200/60',
                          isLast && 'rounded-r-2xl border-r border-white/40'
                        )}
                      >
                        <div className="flex items-center gap-2 px-1 pt-0.5 pb-2.5 mb-2 border-b border-slate-200/60">
                          <menu.icon size={14} className="text-blue-600" />
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                            {menu.name}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          {menu.items.map((sub) => {
                            const active = isActive(sub.path);
                            return (
                              <Link
                                key={`${menu.name}-${sub.path}-${sub.name}`}
                                to={sub.path}
                                className={cn(
                                  'flex items-start gap-3 px-2.5 py-2.5 rounded-xl transition-colors',
                                  active ? 'bg-blue-50' : 'hover:bg-slate-50'
                                )}
                              >
                                <div className={cn(
                                  'flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center',
                                  sub.accent
                                )}>
                                  <sub.icon size={16} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={cn(
                                    'text-sm font-bold leading-tight',
                                    active ? 'text-blue-700' : 'text-slate-900'
                                  )}>
                                    {sub.name}
                                  </p>
                                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                    {sub.description}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 관리자 — admin만 */}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-bold transition-colors rounded-lg hover:text-blue-600',
                isActive('/admin') ? 'text-blue-600' : 'text-slate-600'
              )}
            >
              <Shield size={16} />관리자
            </Link>
          )}
        </div>

        {/* 우측: 내 강의실(로그인시) + 인증 영역 (데스크톱) */}
        <div className="hidden md:flex md:items-center md:gap-3 justify-self-end">
          {/* 내 강의실 — 프로필 바로 왼쪽 */}
          {firebaseUser && (
            <Link
              to="/dashboard"
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-bold transition-colors rounded-lg hover:text-blue-600',
                isActive('/dashboard') ? 'text-blue-600' : 'text-slate-600'
              )}
            >
              <Calendar size={16} />내 강의실
            </Link>
          )}

          {firebaseUser ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2">
                <img
                  src={user?.avatar || `https://picsum.photos/seed/${firebaseUser.uid}/100/100`}
                  alt="Profile"
                  className="h-8 w-8 rounded-full border border-slate-200"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900">{user?.name || firebaseUser.displayName}</span>
                  <span className="text-[10px] text-slate-500 uppercase">
                    {user?.role === 'tutor' ? '강사' : user?.role === 'admin' ? '관리자' : '수강생'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="text-slate-400 hover:text-red-600 transition-colors"
                title="로그아웃"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => openAuth('signin')}>
                <User size={16} />
                로그인
              </Button>
              <Button size="sm" onClick={() => openAuth('signup')}>시작하기</Button>
            </>
          )}
        </div>

        {/* 모바일 메뉴 버튼 */}
        <div className="flex md:hidden justify-self-end">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="text-slate-600 hover:text-blue-600 focus:outline-none"
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* 모바일 Nav */}
      {isMobileOpen && (
        <div className="border-t border-slate-100 bg-white p-4 md:hidden">
          <div className="flex flex-col gap-1">
            {menus.map((menu) => (
              <div key={menu.name}>
                <button
                  onClick={() => setMobileSub(mobileSub === menu.name ? null : menu.name)}
                  className="w-full flex items-center justify-between px-3 py-3 text-base font-bold text-slate-700 rounded-lg"
                >
                  <span className="flex items-center gap-2">
                    <menu.icon size={18} />
                    {menu.name}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn('transition-transform text-slate-400', mobileSub === menu.name && 'rotate-180')}
                  />
                </button>
                {mobileSub === menu.name && (
                  <div className="ml-2 mb-2 flex flex-col gap-1 border-l-2 border-blue-100 pl-3">
                    {menu.items.map((sub) => {
                      const active = isActive(sub.path);
                      return (
                        <Link
                          key={`mobile-${menu.name}-${sub.path}-${sub.name}`}
                          to={sub.path}
                          onClick={() => {
                            setIsMobileOpen(false);
                            setMobileSub(null);
                          }}
                          className={cn(
                            'flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors',
                            active ? 'bg-blue-50' : 'hover:bg-slate-50'
                          )}
                        >
                          <div className={cn(
                            'flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center mt-0.5',
                            sub.accent
                          )}>
                            <sub.icon size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              'text-sm font-bold leading-tight',
                              active ? 'text-blue-700' : 'text-slate-900'
                            )}>
                              {sub.name}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                              {sub.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {firebaseUser && (
              <Link
                to="/dashboard"
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-3 text-base font-bold rounded-lg',
                  isActive('/dashboard') ? 'text-blue-600' : 'text-slate-700'
                )}
              >
                <Calendar size={18} />내 강의실
              </Link>
            )}

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-3 text-base font-bold rounded-lg',
                  isActive('/admin') ? 'text-blue-600' : 'text-slate-700'
                )}
              >
                <Shield size={18} />관리자
              </Link>
            )}

            <hr className="my-2 border-slate-100" />
            {firebaseUser ? (
              <Button variant="outline" className="w-full" onClick={handleSignOut}>로그아웃</Button>
            ) : (
              <>
                <Button variant="outline" className="w-full" onClick={() => { setIsMobileOpen(false); openAuth('signin'); }}>
                  로그인
                </Button>
                <Button className="w-full" onClick={() => { setIsMobileOpen(false); openAuth('signup'); }}>
                  시작하기
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
