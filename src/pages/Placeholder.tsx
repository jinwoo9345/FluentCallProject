import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface PlaceholderProps {
  title: string;
  description?: string;
}

export default function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 p-12 shadow-sm text-center"
      >
        <div className="mx-auto w-20 h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
          <Construction size={36} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">{title}</h1>
        <p className="text-slate-500 leading-relaxed mb-10">
          {description || '아직 정보 없음 — 이 페이지는 준비 중이며, 곧 상세 내용이 업데이트될 예정입니다.'}
        </p>
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft size={16} /> 홈으로 돌아가기
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
