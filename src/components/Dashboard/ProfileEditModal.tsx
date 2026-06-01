import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User as UserIcon, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { User } from '../../types';
import {
  validateNicknameFormat,
  isNicknameAvailable,
  claimNickname,
  releaseNickname,
} from '../../lib/nickname';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export function ProfileEditModal({ isOpen, onClose, user }: ProfileEditModalProps) {
  const [nickname, setNickname] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNickname = nickname.trim();
    const fmt = validateNicknameFormat(trimmedNickname);
    if (!fmt.ok) {
      setError(fmt.message || '닉네임이 올바르지 않습니다.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const previousNickname = (user.name || '').trim();
      const isNicknameChanged = trimmedNickname.toLowerCase() !== previousNickname.toLowerCase();

      if (isNicknameChanged) {
        // 1) 중복 검증 — 본인 소유 닉네임은 통과
        const available = await isNicknameAvailable(trimmedNickname, user.uid);
        if (!available) {
          setError('이미 사용 중인 닉네임입니다.');
          setSaving(false);
          return;
        }
        // 2) 새 닉네임 점유 (race condition 시 throw)
        try {
          await claimNickname(trimmedNickname, user.uid);
        } catch (err: any) {
          setError(err?.message || '닉네임 등록에 실패했습니다.');
          setSaving(false);
          return;
        }
        // 3) 이전 닉네임 doc 해제 (다른 사용자가 쓸 수 있도록)
        if (previousNickname) await releaseNickname(previousNickname, user.uid);
      }

      await updateDoc(doc(db, 'users', user.uid), {
        name: trimmedNickname,
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
                  <label className="block text-sm font-bold text-slate-700 mb-1">닉네임 (표시명)</label>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={20}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">서비스 전반에서 이 이름으로 표시됩니다. <strong>다른 회원과 중복될 수 없습니다.</strong></p>
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

                {/* 실명 (읽기 전용) */}
                <div className="pt-2 border-t border-slate-100 space-y-2 text-sm text-slate-500">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600">실명</span>
                    <span className="font-bold text-slate-900 text-base">{user.realName || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600">내 추천 코드</span>
                    <span className="font-mono font-bold text-slate-900 text-base">{user.referralCode || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600">회원 구분</span>
                    <span className="font-bold text-slate-900">
                      {user.role === 'tutor' ? '강사' : user.role === 'admin' ? '관리자' : '수강생'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600">보유 포인트</span>
                    <span className="font-bold text-slate-900">{(user.credits || 0).toLocaleString()} P</span>
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
