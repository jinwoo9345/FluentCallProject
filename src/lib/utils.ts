import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 추천 코드 생성기 (32^8 ≈ 10^12 조합) — crypto 기반, 혼동 글자(I/O/0/1) 제외
// firestore.rules의 '^[A-Z0-9]{4,16}$' 패턴 준수
const REFERRAL_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateReferralCode(length: number = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => REFERRAL_CHARS[b % REFERRAL_CHARS.length]).join('');
}
