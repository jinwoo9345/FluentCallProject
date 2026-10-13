export type PointHistoryKind = 'grant' | 'reclaim' | 'gift' | 'use' | 'refund' | 'reward';
export const POINT_HISTORY_LABELS: Record<PointHistoryKind, string> = {
  grant: '관리자 지급', reclaim: '관리자 회수', gift: '포인트 선물',
  use: '결제 사용', refund: '취소 반환', reward: '추천 보상',
};
export interface PointHistoryEntry {
  id: string;
  kind: PointHistoryKind;
  amount: number;
  userId: string;
  userName: string;
  otherUserId?: string;
  otherUserName?: string;
  actor: string;
  reason: string;
  reference: string;
  timestamp: number | null;
  before?: number;
  after?: number;
  source: string;
}

export function pointTimestamp(value: any): number | null {
  if (value == null) return null;
  const millis = typeof value?.toMillis === 'function' ? value.toMillis()
    : typeof value?.toDate === 'function' ? value.toDate().getTime()
    : typeof value?.seconds === 'number' ? value.seconds * 1000
    : new Date(value).getTime();
  return Number.isFinite(millis) ? millis : null;
}

export function calculatePointAdjustment(current: unknown, delta: number) {
  const before = current == null ? 0 : current;
  if (typeof before !== 'number') throw new Error('현재 잔액의 형식이 올바르지 않습니다. 사용자 정보를 확인해주세요.');
  if (!Number.isSafeInteger(before) || before < 0) throw new Error('현재 잔액이 올바르지 않습니다. 사용자 정보를 확인해주세요.');
  if (!Number.isSafeInteger(delta) || delta === 0) throw new Error('포인트는 0보다 큰 정수로 입력해주세요.');
  const after = before + delta;
  if (after < 0) throw new Error('보유 포인트보다 많은 금액은 회수할 수 없습니다.');
  if (!Number.isSafeInteger(after)) throw new Error('처리 가능한 포인트 범위를 초과했습니다.');
  return { before, after };
}

// 기존 결제/선물 문서를 읽어 표시한다. 과거 잔액이나 미기록 조정 이력은 추정하지 않는다.
export function buildPointHistory(adjustments: any[], transfers: any[], payments: any[], users: any[], ledger: any[] = []): PointHistoryEntry[] {
  const people = new Map<string, any>();
  users.forEach(u => { people.set(u.id, u); if (u.uid) people.set(u.uid, u); });
  const name = (uid: string, snapshot?: string) => snapshot || people.get(uid)?.name || uid || '대상 미기록';
  const validAmount = (n: number) => Number.isSafeInteger(n) && n > 0;
  const entries: PointHistoryEntry[] = [];
  ledger.forEach(e => {
    if (!Object.hasOwn(POINT_HISTORY_LABELS, e.kind) || !validAmount(Number(e.amount))) return;
    entries.push({ id: `ledger:${e.id}`, kind: e.kind, amount: Number(e.amount), userId: e.userId,
      userName: name(e.userId, e.userName), actor: name(e.actor), reason: e.reason || '-',
      reference: e.reference || e.id, timestamp: pointTimestamp(e.createdAt), before: e.before, after: e.after, source: '서버 포인트 원장' });
  });
  adjustments.forEach(a => {
    const delta = Number(a.delta);
    if (!validAmount(Math.abs(delta))) return;
    entries.push({ id: `adjustment:${a.id}`, kind: delta > 0 ? 'grant' : 'reclaim', amount: Math.abs(delta),
      userId: a.userId, userName: name(a.userId, a.userName), actor: name(a.adminId, a.adminName),
      reason: a.reason || '-', reference: a.id, timestamp: pointTimestamp(a.createdAt),
      before: a.before, after: a.after, source: '관리자 조정 로그' });
  });
  transfers.forEach(t => {
    const amount = Number(t.amount);
    if (!validAmount(amount)) return;
    entries.push({ id: `gift:${t.id}`, kind: 'gift', amount, userId: t.fromId, userName: name(t.fromId, t.fromName),
      otherUserId: t.toId, otherUserName: name(t.toId, t.toName), actor: name(t.fromId, t.fromName),
      reason: '사용자 간 선물', reference: t.id, timestamp: pointTimestamp(t.createdAt), before: t.fromBefore, after: t.fromAfter, source: '선물 기록' });
  });
  payments.forEach(p => {
    if (p.flowVersion === 2) return; // New orders use the authoritative server ledger, not derived duplicates.
    const amount = Number(p.creditsUsed);
    const base = { userId: p.userId, userName: name(p.userId, p.userName), actor: name(p.userId, p.userName),
      reference: p.orderId || p.id, source: '결제 기록 기반' };
    if (validAmount(amount)) {
      entries.push({ ...base, id: `use:${p.id}`, kind: 'use', amount, timestamp: pointTimestamp(p.createdAt),
        reason: `${p.productName || '수강권'} · ${p.status || 'pending'} (주문 생성 시 차감)` });
      if (p.creditsRefunded === true) entries.push({ ...base, id: `refund:${p.id}`, kind: 'refund', amount,
        timestamp: pointTimestamp(p.creditsRefundedAt || p.cancelledAt), actor: '처리자 미기록', reason: p.failReason || '결제 취소 포인트 반환' });
    }
    if (p.referralRewarded === true) {
      const recipientId = p.referralRewardUserId || '';
      entries.push({ id: `reward:${p.id}`, kind: 'reward', amount: Number(p.referralRewardAmount) || 20000,
        userId: recipientId, userName: name(recipientId), actor: '결제 승인',
        reason: `추천 코드 ${p.referredBy || '-'}${recipientId ? '' : ' · 과거 수령인 UID 미기록'}`,
        reference: p.orderId || p.id, timestamp: pointTimestamp(p.referralRewardedAt || p.confirmedAt), source: '결제 기록 기반' });
    }
  });
  return entries.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0) || a.id.localeCompare(b.id));
}

export function filterPointHistory(entries: PointHistoryEntry[], filters: { kind: string; search: string; userId: string; start: string; end: string }) {
  const term = filters.search.trim().toLowerCase();
  const start = filters.start ? new Date(`${filters.start}T00:00:00`).getTime() : null;
  const end = filters.end ? new Date(`${filters.end}T23:59:59.999`).getTime() : null;
  return entries.filter(e => {
    if (filters.kind !== 'all' && e.kind !== filters.kind) return false;
    if (filters.userId && e.userId !== filters.userId && e.otherUserId !== filters.userId) return false;
    if (start !== null && (e.timestamp === null || e.timestamp < start)) return false;
    if (end !== null && (e.timestamp === null || e.timestamp > end)) return false;
    return !term || [e.userName, e.userId, e.otherUserName, e.otherUserId, e.actor, e.reason, e.reference].some(v => v?.toLowerCase().includes(term));
  });
}
