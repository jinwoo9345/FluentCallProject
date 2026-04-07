import { Link, useLocation } from 'react-router-dom';
import { Phone, User, Calendar, Search, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, firebaseUser, setIsAuthModalOpen, setAuthMode } = useAuth();

  const navLinks = [
    { name: '튜터 찾기', path: '/tutors', icon: Search },
    { name: '내 강의실', path: '/dashboard', icon: Calendar },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = () => {
    signOut(auth);
  };

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-blue-600">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Phone size={18} />
            </div>
            <span>플루언트콜</span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex md:items-center md:gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                'flex items-center gap-2 text-sm font-medium transition-colors hover:text-blue-600',
                isActive(link.path) ? 'text-blue-600' : 'text-slate-600'
              )}
            >
              <link.icon size={16} />
              {link.name}
            </Link>
          ))}
          <div className="h-4 w-[1px] bg-slate-200" />
          
          {firebaseUser ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <img 
                  src={user?.avatar || `https://picsum.photos/seed/${firebaseUser.uid}/100/100`} 
                  alt="Profile" 
                  className="h-8 w-8 rounded-full border border-slate-200"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900">{user?.name || firebaseUser.displayName}</span>
                  <span className="text-[10px] text-slate-500 uppercase">{user?.role === 'tutor' ? '강사' : '수강생'}</span>
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

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-600 hover:text-blue-600 focus:outline-none"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="border-t border-slate-100 bg-white p-4 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-2 text-base font-medium transition-colors',
                  isActive(link.path) ? 'text-blue-600' : 'text-slate-600'
                )}
              >
                <link.icon size={18} />
                {link.name}
              </Link>
            ))}
            <hr className="border-slate-100" />
            {firebaseUser ? (
              <Button variant="outline" className="w-full" onClick={handleSignOut}>로그아웃</Button>
            ) : (
              <>
                <Button variant="outline" className="w-full" onClick={() => { setIsOpen(false); openAuth('signin'); }}>로그인</Button>
                <Button className="w-full" onClick={() => { setIsOpen(false); openAuth('signup'); }}>시작하기</Button>
              </>
            )}
          </div>
        </div>
      )}

    </nav>
  );
};
