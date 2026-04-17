import { Github, Twitter, Instagram } from 'lucide-react';
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
    <footer className="border-t border-brand-cream-dark/50 bg-brand-cream py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
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

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">플랫폼</h3>
            <ul className="mt-4 space-y-2">
              <li><Link to="/tutors" className="text-sm text-slate-500 hover:text-blue-600">튜터 찾기</Link></li>
              <li><Link to="/dashboard" className="text-sm text-slate-500 hover:text-blue-600">내 강의실</Link></li>
              <li><Link to="/referral" className="text-sm text-slate-500 hover:text-blue-600">친구 추천</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">고객 지원</h3>
            <ul className="mt-4 space-y-2">
              <li><Link to="/terms-of-service" className="text-sm text-slate-500 hover:text-blue-600">이용약관</Link></li>
              <li><Link to="/refund-policy" className="text-sm text-slate-500 hover:text-blue-600">환불 정책</Link></li>
              <li><Link to="/consultation" className="text-sm text-slate-500 hover:text-blue-600">상담 채널</Link></li>
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

        {/* 통신판매중개업 고지 */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="p-4 rounded-xl bg-white/60 border border-slate-200 mb-6">
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong className="text-slate-800">[통신판매중개자 고지]</strong>{' '}
              본 사이트는 통신판매중개자이며, 통신판매의 당사자가 아닙니다.
              따라서 튜터가 등록한 상품·거래정보 및 가격, 수업 내용 등 거래와 관련된
              일체의 의무와 책임은 <strong>각 튜터(판매자)</strong>에게 있습니다.
              EnglishBites는 회원과 튜터 간의 원활한 거래를 중개하며,
              중개 과정에서 발생한 문제에 대해 성실히 조정·중재할 책임을 다합니다.
            </p>
          </div>

          {/* 사업자 정보 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-500 leading-relaxed">
            <p><span className="font-bold text-slate-600">상호</span> · {BUSINESS_INFO.companyName}</p>
            <p><span className="font-bold text-slate-600">대표자</span> · {BUSINESS_INFO.representative}</p>
            <p><span className="font-bold text-slate-600">사업자등록번호</span> · {BUSINESS_INFO.businessNumber}</p>
            <p><span className="font-bold text-slate-600">통신판매중개업 신고</span> · {BUSINESS_INFO.mailOrderNumber}</p>
            <p><span className="font-bold text-slate-600">주소</span> · {BUSINESS_INFO.address}</p>
            <p><span className="font-bold text-slate-600">호스팅 제공자</span> · {BUSINESS_INFO.hostingProvider}</p>
            <p><span className="font-bold text-slate-600">고객센터</span> · {BUSINESS_INFO.phone}</p>
            <p><span className="font-bold text-slate-600">이메일</span> · {BUSINESS_INFO.email}</p>
          </div>

          <p className="mt-8 text-xs text-slate-400 text-center">
            © {new Date().getFullYear()} {BUSINESS_INFO.companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
