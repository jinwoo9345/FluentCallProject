import { Link, useLocation } from 'react-router-dom';
import {
  User, Calendar, Menu, X, LogOut, Shield, ChevronDown,
  BookOpen, GraduationCap, Users,
  Sparkles, Megaphone, CalendarPlus, MessageCircle,
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
  accent: string;
};
type MenuItem = { name: string; icon: any; items: SubItem[] };

export const Navbar = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isGroupHovered, setIsGroupHovered] = useState(false);
  const [mobileSub, setMobileSub] = useState<string | null>(null);
  const location = useLocation();
  const { user, firebaseUser, setIsAuthModalOpen, setAuthMode } = useAuth();

  const menus: MenuItem[] = [
    {
      name: '소개',
      icon: BookOpen,
      items: [
        { name: '프로그램 소개', path: '/about', icon: Sparkles, description: '서비스 목적과 차별점', accent: 'text-blue-600 bg-blue-50' },
        { name: '이벤트', path: '/events', icon: Megaphone, description: '현재 진행 중인 이벤트 모아보기', accent: 'text-pink-600 bg-pink-50' },
      ],
    },
    {
      name: '수업',
      icon: GraduationCap,
      items: [
        { name: '튜터 찾기·수업 신청', path: '/tutors', icon: CalendarPlus, description: '프로필과 수업 후기를 보고 신청', accent: 'text-emerald-600 bg-emerald-50' },
        { name: '상담 신청', path: '/consultation', icon: MessageCircle, description: '전문 매니저 1:1 학습 상담', accent: 'text-sky-600 bg-sky-50' },
      ],
    },
    {
      name: '커뮤니티',
      icon: Users,
      items: [
        { name: '서비스 이용 후기', path: '/reviews', icon: Star, description: '회원들의 서비스 이용 경험', accent: 'text-amber-600 bg-amber-50' },
        { name: 'Q&A 게시판', path: '/qna', icon: HelpCircle, description: '궁금한 점을 자유롭게 질문', accent: 'text-violet-600 bg-violet-50' },
        { name: '정보 게시판', path: '/info-board', icon: Newspaper, description: '학습 팁·영어 자료 모음', accent: 'text-slate-700 bg-slate-100' },
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
      <div className="relative mx-auto flex h-20 max-w-screen-2xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* 좌측: 로고 */}
        <div className="shrink-0">
          <Link to="/" className="flex items-center gap-2 text-2xl font-black text-slate-900 font-display tracking-tight">
            <span>English<span className="text-blue-600">Bites</span></span>
          </Link>
        </div>

        {/* 메뉴와 계정 영역은 같은 행에 배치하고 하위 메뉴는 하나의 패널로 정렬한다. */}
        <div
          className="relative hidden h-full min-w-0 flex-1 items-center justify-center xl:flex"
          onMouseEnter={() => setIsGroupHovered(true)}
          onMouseLeave={() => setIsGroupHovered(false)}
          onFocus={() => setIsGroupHovered(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsGroupHovered(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsGroupHovered(false);
          }}
        >
          <div className="relative grid h-full w-[720px] max-w-full grid-cols-3 items-center px-3">
          {menus.map((menu, index) => (
            <div key={menu.name} className="relative flex h-full items-center justify-center">
            <button
              type="button"
              aria-expanded={isGroupHovered}
              aria-controls="desktop-navigation-panel"
              onClick={() => setIsGroupHovered(true)}
              className={cn(
                'flex h-11 min-w-28 items-center justify-self-center justify-center gap-2 rounded-xl px-4 text-base font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isActiveDropdown(menu)
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-white hover:text-blue-700'
              )}
            >
              <span>{menu.name}</span>
              <ChevronDown size={14} className={cn('opacity-60 transition-transform', isGroupHovered && 'rotate-180')} />
            </button>
            {index < menus.length - 1 && (
              <span aria-hidden="true" className="pointer-events-none absolute right-0 top-1/2 h-4 w-px -translate-y-1/2 bg-slate-300/70" />
            )}
            </div>
          ))}
          {isGroupHovered && (
            <div id="desktop-navigation-panel" className="absolute inset-x-0 top-full z-50 w-full pt-2">
              <div className="grid grid-cols-3 items-start p-3">
                {menus.map((menu) => (
                  <div key={menu.name} className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 shadow-lg shadow-slate-900/10">
                    <div className="mb-3 flex h-8 items-center gap-2 border-b border-slate-100 px-2 pb-3">
                      <menu.icon size={14} className="text-blue-600" />
                      <p className="text-xs font-bold text-slate-500">{menu.name}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {menu.items.map((sub) => {
                        const active = isActive(sub.path);
                        return (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => setIsGroupHovered(false)}
                            className={cn(
                              'flex min-h-[72px] items-start gap-2.5 rounded-xl px-2 py-3 transition-colors',
                              active ? 'bg-blue-50' : 'hover:bg-slate-50'
                            )}
                          >
                            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', sub.accent)}>
                              <sub.icon size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={cn('text-sm font-bold leading-5', active ? 'text-blue-700' : 'text-slate-900')}>
                                {sub.name}
                              </p>
                              <p className="mt-1 break-keep text-xs leading-4 text-slate-500">{sub.description}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* 우측: 관리자(admin만) + 내 강의실 + 인증 영역 (데스크톱) */}
        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={cn(
                'flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold transition-colors',
                isActive('/admin')
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-700 hover:bg-white/80 hover:text-purple-700'
              )}
            >
              <Shield size={17} />관리자
            </Link>
          )}
          {firebaseUser && (
            <Link
              to="/dashboard"
              className={cn(
                'flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold transition-colors',
                isActive('/dashboard')
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-700 hover:bg-white/80 hover:text-blue-700'
              )}
            >
              <Calendar size={17} />내 강의실
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
                  <span className="max-w-24 truncate text-xs font-bold text-slate-900">{user?.name || firebaseUser.displayName}</span>
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
        <div className="flex xl:hidden">
          <button
            type="button"
            aria-label={isMobileOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={isMobileOpen}
            aria-controls="mobile-navigation-panel"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="text-slate-600 hover:text-blue-600 focus:outline-none"
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* 모바일 Nav */}
      {isMobileOpen && (
        <div id="mobile-navigation-panel" className="max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-slate-100 bg-white p-4 xl:hidden">
          <div className="flex flex-col gap-1">
            {menus.map((menu) => (
              <div key={menu.name}>
                <button
                  onClick={() => setMobileSub(mobileSub === menu.name ? null : menu.name)}
                  aria-expanded={mobileSub === menu.name}
                  className={cn('w-full flex items-center justify-between px-3 py-3 text-base font-bold rounded-lg', isActiveDropdown(menu) ? 'bg-blue-50 text-blue-700' : 'text-slate-700')}
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
                            'flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center mt-0.5',
                            sub.accent
                          )}>
                            <sub.icon size={18} />
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
                  isActive('/admin') ? 'text-purple-600' : 'text-slate-700'
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
