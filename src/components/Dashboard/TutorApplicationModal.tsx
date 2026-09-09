import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AtSign, School, X } from 'lucide-react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

interface TutorApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorApplicationModal({ isOpen, onClose }: TutorApplicationModalProps) {
  const { user, requireVerifiedEmail } = useAuth();
  const [contact, setContact] = useState('');
  const [experience, setExperience] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!requireVerifiedEmail()) return;
    if (!contact.trim() || !experience.trim() || !introduction.trim()) {
      setError('연락처, 경력, 자기소개를 모두 입력해주세요.');
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid || !user) {
      setError('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const appRef = await addDoc(collection(db, 'tutor_applications'), {
        userId: uid,
        name: user.realName || user.name,
        email: user.email || auth.currentUser?.email || '',
        contactValue: contact.trim(),
        experience: experience.trim(),
        qualifications: qualifications.trim(),
        introduction: introduction.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', uid), { tutorApplicationId: appRef.id });
      onClose();
    } catch (err: any) {
      setError(err?.message || '강사 신청을 제출하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[220] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-6">
                <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                  <School size={22} className="text-blue-600" /> 강사 신청
                </h2>
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-700">
                  신청 내용을 검토한 뒤 관리자가 강사 계정으로 전환합니다.
                </p>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">연락처 (카카오톡/전화) *</label>
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 outline-none focus:border-blue-500"
                      placeholder="예: 010-1234-5678"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">영어 교육/체류 경험 *</label>
                  <textarea
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="예: 5년간 1:1 회화 지도, 미국 시애틀 3년 거주"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">자격증 / 학력</label>
                  <textarea
                    value={qualifications}
                    onChange={(e) => setQualifications(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="예: TESOL, TOEIC 990"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">자기소개 *</label>
                  <textarea
                    value={introduction}
                    onChange={(e) => setIntroduction(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="수업 스타일과 강점을 자유롭게 적어주세요"
                  />
                </div>
                {error && <p className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">{error}</p>}
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={onClose}>취소</Button>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? '제출 중...' : '신청 제출'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
