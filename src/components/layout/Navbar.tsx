import { Link, useLocation } from 'react-router-dom';
import {
  User, Calendar, Menu, X, LogOut, Shield, ChevronDown,
  BookOpen, ClipboardList, Info,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';

type SubItem = { name: string; path: string };
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
        { name: '프로그램 소개', path: '/about' },
        { name: '튜터 소개', path: '/tutors' },
      ],
    },
    {
      name: '레벨테스트',
      icon: ClipboardList,
      items: [
        { name: '레벨테스트 안내', path: '/level-test' },
      ],
    },
    {
      name: '정보',
      icon: Info,
      items: [
        { name: '자주 묻는 질문 (FAQ)', path: '/faq' },
        { name: 'Q&A 게시판', path: '/qna' },
        { name: '정보 게시판', path: '/info-board' },
        { name: '환불 정책', path: '/refund-policy' },
        { name: '이용 약관', path: '/terms-of-service' },
        { name: '친구 추천 시스템', path: '/referral' },
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
        <div className="hidden md:flex md:items-center md:justify-center md:gap-4 justify-self-center">
          {/* 드롭다운 메뉴 그룹 — 하나의 통합 패널(메가 메뉴)로 표시 */}
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

            {/* 통합 드롭다운 패널 — 3개 섹션을 한 패널에 나란히 */}
            {isDropdownHovered && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50">
                <div className="rounded-2xl border border-slate-100 bg-white shadow-2xl p-6 flex gap-10">
                  {menus.map((menu) => (
                    <div key={menu.name} className="min-w-[180px]">
                      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-100">
                        <menu.icon size={14} className="text-blue-600" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                          {menu.name}
                        </p>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {menu.items.map((sub) => (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            className={cn(
                              'block px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
                              isActive(sub.path)
                                ? 'bg-blue-50 text-blue-600 font-bold'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            )}
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 내 강의실 — 로그인 시에만 */}
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

        {/* 우측: 인증 영역 (데스크톱) */}
        <div className="hidden md:flex md:items-center md:gap-3 justify-self-end">
          {firebaseUser ? (
            <div className="flex items-center gap-3">
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
                  <div className="ml-8 mb-2 flex flex-col gap-1 border-l border-slate-100 pl-3">
                    {menu.items.map((sub) => (
                      <Link
                        key={sub.path}
                        to={sub.path}
                        onClick={() => {
                          setIsMobileOpen(false);
                          setMobileSub(null);
                        }}
                        className={cn(
                          'block px-3 py-2 text-sm rounded-lg transition-colors',
                          isActive(sub.path)
                            ? 'text-blue-600 font-bold bg-blue-50'
                            : 'text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        {sub.name}
                      </Link>
                    ))}
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
