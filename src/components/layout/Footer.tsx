import { Github, Twitter, Instagram, Building2, FileText, Users, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

// TODO: 실제 사업자 정보로 교체 필요 (사업자 등록 완료 후)
const BUSINESS_INFO = {
  companyName: 'EnglishBites',
  representative: '(대표자명)',
  businessNumber: '(사업자등록번호)',
  mailOrderNumber: '(통신판매중개업 신고번호)',
  address: '(사업장 주소)',
  phone: '(대표 전화)',
  email: '(대표 이메일)',
  hostingProvider: 'Cloudflare',
};

export const Footer = () => {
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
            <FooterLink to="/consultation">상담 채널</FooterLink>
          </FooterColumn>

          <FooterColumn icon={FileText} title="소셜 미디어">
            <div className="mt-1 flex gap-3">
              <SocialIconLink href="#" label="Twitter"><Twitter size={18} /></SocialIconLink>
              <SocialIconLink href="#" label="Instagram"><Instagram size={18} /></SocialIconLink>
              <SocialIconLink href="#" label="GitHub"><Github size={18} /></SocialIconLink>
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
                통신판매중개자 고지
              </p>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                본 사이트는 <strong className="text-slate-800">통신판매중개자</strong>이며, 통신판매의 당사자가 아닙니다.
                튜터가 등록한 상품·거래정보 및 가격, 수업 내용 등 거래와 관련된 일체의 의무와 책임은{' '}
                <strong className="text-slate-800">각 튜터(판매자)</strong>에게 있습니다.
                EnglishBites는 회원과 튜터 간의 원활한 거래를 중개하며, 중개 과정에서 발생한 문제에 대해 성실히 조정·중재할 책임을 다합니다.
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
            <InfoItem label="상호" value={BUSINESS_INFO.companyName} />
            <InfoItem label="대표자" value={BUSINESS_INFO.representative} />
            <InfoItem label="사업자등록번호" value={BUSINESS_INFO.businessNumber} />
            <InfoItem label="통신판매중개업 신고" value={BUSINESS_INFO.mailOrderNumber} />
            <InfoItem label="주소" value={BUSINESS_INFO.address} className="sm:col-span-2" />
            <InfoItem label="호스팅 제공자" value={BUSINESS_INFO.hostingProvider} />
            <InfoItem label="고객센터" value={BUSINESS_INFO.phone} />
            <InfoItem label="이메일" value={BUSINESS_INFO.email} />
          </div>

          <p className="mt-8 pt-6 border-t border-slate-200/60 text-xs text-slate-400 text-center">
            © {new Date().getFullYear()} {BUSINESS_INFO.companyName}. All rights reserved.
          </p>
        </div>
      </div>
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

function SocialIconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="h-9 w-9 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors flex items-center justify-center"
    >
      {children}
    </a>
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
