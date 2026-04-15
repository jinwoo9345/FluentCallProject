import { Phone, Github, Twitter, Instagram, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../ui/Logo';

export const Footer = () => {
  return (
    <footer className="border-t border-brand-cream-dark/50 bg-brand-cream py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-xl font-black text-slate-900 font-display tracking-tight">
              <span>English<span className="text-blue-600">Bites</span></span>
            </Link>
            <p className="mt-4 text-sm text-slate-500 leading-relaxed">
              야금야금 영어가 느는 구조. <br />
              북미/유럽 원어민과 함께하는 <br />
              가장 자유로운 1:1 회화 서비스입니다.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">플랫폼</h3>
            <ul className="mt-4 space-y-2">
              <li><Link to="/tutors" className="text-sm text-slate-500 hover:text-blue-600">튜터 찾기</Link></li>
              <li><Link to="/pricing" className="text-sm text-slate-500 hover:text-blue-600">가격 안내</Link></li>
              <li><Link to="/for-business" className="text-sm text-slate-500 hover:text-blue-600">비즈니스용</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">고객 지원</h3>
            <ul className="mt-4 space-y-2">
              <li><Link to="/help" className="text-sm text-slate-500 hover:text-blue-600">고객 센터</Link></li>
              <li><Link to="/terms-of-service" className="text-sm text-slate-500 hover:text-blue-600">이용약관</Link></li>
              <li><Link to="/refund-policy" className="text-sm text-slate-500 hover:text-blue-600">환불 정책</Link></li>
              <li><Link to="/faq" className="text-sm text-slate-500 hover:text-blue-600">자주 묻는 질문</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">소셜 미디어</h3>
            <div className="mt-4 flex gap-4">
              <a href="#" className="text-slate-400 hover:text-blue-600"><Twitter size={20} /></a>
              <a href="#" className="text-slate-400 hover:text-blue-600"><Instagram size={20} /></a>
              <a href="#" className="text-slate-400 hover:text-blue-600"><Github size={20} /></a>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-slate-200 pt-8 text-center">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} EnglishBites. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
