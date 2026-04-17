import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User as UserIcon, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { User } from '../../types';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export function ProfileEditModal({ isOpen, onClose, user }: ProfileEditModalProps) {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('이름은 비워둘 수 없습니다.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        email: email.trim(),
        avatar: avatar.trim() || `https://picsum.photos/seed/${user.uid}/200/200`,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || '저장 실패');
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <UserIcon className="text-blue-600" size={22} /> 프로필 수정
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-5">
                <div className="flex items-center gap-4">
                  <img
                    src={avatar || `https://picsum.photos/seed/${user.uid}/200/200`}
                    alt="미리보기"
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">프로필 이미지 URL</label>
                    <input
                      type="text"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">비워두면 기본 이미지가 사용됩니다.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">이름</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">이메일</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="카카오 로그인의 경우 비어있을 수 있어요"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    포인트 선물 수신용으로 등록해두시면 이메일로도 찾을 수 있습니다.
                  </p>
                </div>

                {/* 읽기 전용 정보 */}
                <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-600">추천 코드</span>
                    <span className="font-mono font-bold text-slate-900">{user.referralCode || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-600">역할</span>
                    <span className="uppercase font-bold">{user.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-600">보유 크레딧</span>
                    <span className="font-bold text-slate-900">{(user.credits || 0).toLocaleString()} P</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-600">UID</span>
                    <span className="font-mono text-[10px] break-all">{user.uid}</span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold">{error}</div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={onClose}>취소</Button>
                  <Button type="submit" className="flex-1 gap-2" disabled={saving}>
                    <Save size={16} /> {saving ? '저장 중...' : '저장하기'}
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
