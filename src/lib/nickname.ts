import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

// 닉네임 유니크 인덱스(Firestore 컬렉션 `nicknames/`)의 문서 ID 정규화
// - trim
// - lowercase (대소문자 무관 유니크)
export function normalizeNicknameKey(raw: string): string {
  return (raw || '').trim().toLowerCase();
}

export function validateNicknameFormat(raw: string): { ok: boolean; message?: string } {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { ok: false, message: '닉네임을 입력해주세요.' };
  if (trimmed.length < 2) return { ok: false, message: '닉네임은 2자 이상이어야 합니다.' };
  if (trimmed.length > 20) return { ok: false, message: '닉네임은 20자 이하여야 합니다.' };
  return { ok: true };
}

// currentUserId 가 주어지면 본인이 이미 들고 있는 닉네임도 사용 가능으로 간주
export async function isNicknameAvailable(
  raw: string,
  currentUserId?: string
): Promise<boolean> {
  const key = normalizeNicknameKey(raw);
  if (!key) return false;
  const snap = await getDoc(doc(db, 'nicknames', key));
  if (!snap.exists()) return true;
  return currentUserId ? (snap.data() as any).userId === currentUserId : false;
}

// 닉네임 doc 생성 — 다른 유저가 점유한 닉네임이면 throw
export async function claimNickname(raw: string, userId: string): Promise<void> {
  const key = normalizeNicknameKey(raw);
  if (!key) throw new Error('닉네임을 입력해주세요.');
  const ref = doc(db, 'nicknames', key);
  const snap = await getDoc(ref);
  if (snap.exists() && (snap.data() as any).userId !== userId) {
    throw new Error('이미 사용 중인 닉네임입니다.');
  }
  await setDoc(ref, {
    userId,
    name: raw.trim(),
    createdAt: serverTimestamp(),
  });
}

// 닉네임 doc 삭제 — 본인 소유 doc 만 삭제. 실패는 무시(이전 닉네임 미등록 등 정상 상황 포함).
export async function releaseNickname(raw: string, expectedUserId: string): Promise<void> {
  const key = normalizeNicknameKey(raw);
  if (!key) return;
  const ref = doc(db, 'nicknames', key);
  try {
    const snap = await getDoc(ref);
    if (snap.exists() && (snap.data() as any).userId === expectedUserId) {
      await deleteDoc(ref);
    }
  } catch (err) {
    console.warn('[releaseNickname] 실패 (무시):', err);
  }
}
