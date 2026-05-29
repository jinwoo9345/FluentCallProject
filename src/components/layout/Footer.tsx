import { useEffect, useState } from 'react';
import { Facebook, Twitter, Instagram, Building2, FileText, Users, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/firebase';
import type { FooterSettings } from '@/src/types';

// 관리자가 app_settings/main.footer 를 설정하기 전의 기본값
const DEFAULTS: Required<FooterSettings> = {
  companyName: 'EnglishBites',
  representative: '(대표자명)',
  businessNumber: '(사업자등록번호)',
  mailOrderNumber: '(통신판매중개업 신고번호)',
  address: '(사업장 주소)',
  phone: '(대표 전화)',
  email: '(대표 이메일)',
  hostingProvider: 'Cloudflare',
  instagramUrl: '',
  twitterUrl: '',
  facebookUrl: '',
};

export const Footer = () => {
  const [info, setInfo] = useState<Required<FooterSettings>>(DEFAULTS);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'app_settings', 'main'),
      (snap) => {
        const footer = (snap.data()?.footer || {}) as FooterSettings;
        setInfo({
          companyName: footer.companyName || DEFAULTS.companyName,
          representative: footer.representative || DEFAULTS.representative,
          businessNumber: footer.businessNumber || DEFAULTS.businessNumber,
          mailOrderNumber: footer.mailOrderNumber || DEFAULTS.mailOrderNumber,
          address: footer.address || DEFAULTS.address,
          phone: footer.phone || DEFAULTS.phone,
          email: footer.email || DEFAULTS.email,
          hostingProvider: footer.hostingProvider || DEFAULTS.hostingProvider,
          instagramUrl: footer.instagramUrl || '',
          twitterUrl: footer.twitterUrl || '',
          facebookUrl: footer.facebookUrl || '',
        });
      },
      (err) => console.warn('footer settings subscription failed:', err)
    );
    return () => unsub();
  }, []);

  const handleSocialClick = (url: string) => {
    if (url && url.trim()) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      setComingSoonOpen(true);
    }
  };

  return (
    <footer className="border-t border-brand-cream-dark/50 bg-brand-cream">
      {/* 상단: 브랜드 + 섹션 링크 */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-xl font-black text-slate-900 font-display tracking-tight">
              <span>English<span className="text-blue-600">Bites</span></span>
            </Link>
            <p className="mt-4 text-sm text-slate-500 leading-relaxed">
              원어민 튜터와 학습자를 연결하는<br />
              1:1 전화영어 중개 플랫폼.<br />
              나에게 맞는 튜터를 직접 선택하세요.
            </p>
          </div>

          <FooterColumn icon={Users} title="플랫폼">
            <FooterLink to="/tutors">튜터 찾기</FooterLink>
            <FooterLink to="/dashboard">내 강의실</FooterLink>
            <FooterLink to="/referral">친구 추천</FooterLink>
          </FooterColumn>

          <FooterColumn icon={Shield} title="고객 지원">
            <FooterLink to="/terms-of-service">이용약관</FooterLink>
            <FooterLink to="/refund-policy">환불 정책</FooterLink>
            <FooterLink to="/privacy-policy">개인정보처리방침</FooterLink>
            <FooterLink to="/consultation">상담 채널</FooterLink>
          </FooterColumn>

          <FooterColumn icon={FileText} title="소셜 미디어">
            <div className="mt-1 flex gap-3">
              <SocialIconButton onClick={() => handleSocialClick(info.instagramUrl)} label="Instagram"><Instagram size={18} /></SocialIconButton>
              <SocialIconButton onClick={() => handleSocialClick(info.twitterUrl)} label="Twitter"><Twitter size={18} /></SocialIconButton>
              <SocialIconButton onClick={() => handleSocialClick(info.facebookUrl)} label="Facebook"><Facebook size={18} /></SocialIconButton>
            </div>
          </FooterColumn>
        </div>
      </div>

      {/* 중단: 통신판매중개자 고지 (별도 배경색으로 시각 분리) */}
      <div className="border-t border-brand-cream-dark/40 bg-white/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <FileText size={16} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 mb-1.5">
                서비스 플랫폼 안내
              </p>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                본 사이트는 외국인 튜터와 회원을 연결하는 서비스 플랫폼으로, 사이트 내에서 제공되는 모든 강의에 대한 결제, 환불 및 민원 처리는 <strong className="text-slate-800">잉글리시바이트</strong>에서 책임지고 운영합니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 하단: 사업자 정보 (섹션 배경 + 아이콘으로 정보 위계 강화) */}
      <div className="border-t border-brand-cream-dark/40 bg-slate-50/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={14} className="text-slate-500" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">사업자 정보</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2.5">
            <InfoItem label="상호" value={info.companyName} />
            <InfoItem label="대표자" value={info.representative} />
            <InfoItem label="사업자등록번호" value={info.businessNumber} />
            <InfoItem label="통신판매중개업 신고" value={info.mailOrderNumber} />
            <InfoItem label="주소" value={info.address} className="sm:col-span-2" />
            <InfoItem label="호스팅 제공자" value={info.hostingProvider} />
            <InfoItem label="고객센터" value={info.phone} />
            <InfoItem label="이메일" value={info.email} />
          </div>

          <p className="mt-4 text-[9px] text-slate-400 leading-relaxed">
            해당 사이트내에서 결제되는 강의에 대한 환불 및 민원의 책임은 '잉글리시바이트'에서 진행합니다. 민원담당자: [형상욱], 연락처: 010-6558-1040
          </p>

          <p className="mt-8 pt-6 border-t border-slate-200/60 text-xs text-slate-400 text-center">
            © {new Date().getFullYear()} {info.companyName}. All rights reserved.
          </p>
        </div>
      </div>

      {comingSoonOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => setComingSoonOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <FileText size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">곧 준비 예정입니다</h3>
              <p className="mt-2 text-sm text-slate-500">
                소셜 미디어 채널을 준비 중입니다.<br />조금만 기다려주세요.
              </p>
              <button
                onClick={() => setComingSoonOpen(false)}
                className="mt-6 w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

function FooterColumn({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-700">
        <Icon size={12} className="text-blue-600" />
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {children}
      </ul>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="text-sm text-slate-500 hover:text-blue-600 transition-colors"
      >
        {children}
      </Link>
    </li>
  );
}

function SocialIconButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="h-9 w-9 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors flex items-center justify-center"
    >
      {children}
    </button>
  );
}

function InfoItem({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
      <p className="text-[12px] text-slate-700 leading-snug">{value}</p>
    </div>
  );
}
