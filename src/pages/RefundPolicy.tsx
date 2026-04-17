import { motion } from 'motion/react';
import { RefundPolicyContent } from '../components/policy/PolicyContents';

export default function RefundPolicy() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 p-8 sm:p-12 shadow-sm"
      >
        <h1 className="text-3xl font-bold text-slate-900 mb-8 font-display">
          EnglishBites 이용약관 및 환불 정책 안내
        </h1>
        <div className="prose prose-slate max-w-none">
          <RefundPolicyContent />
        </div>
      </motion.div>
    </div>
  );
}
