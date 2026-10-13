import { PACKAGES } from '../../src/constants';
import { ApiError, type MoneyEnv, type Store, type Transaction } from './firebase';
import { inspectPointBalance } from '../../src/lib/pointBalance';

export function identifier(value: unknown) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(value)) throw new ApiError(400, '유효하지 않은 요청 번호입니다.');
  return value;
}
export function balance(value: unknown) {
  const n = value ?? 0;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) throw new ApiError(409, '포인트 잔액을 확인해주세요.');
  return n;
}
const now = () => new Date();
const isOpen = (p: any) => ['pending', 'confirming', 'cancelling'].includes(p.status);
export function assertOwned(p: any, uid: string) {
  if (!p || p.userId !== uid) throw new ApiError(404, '주문을 찾을 수 없습니다.');
  if (p.flowVersion !== 2) throw new ApiError(409, '기존 방식의 주문은 관리자에게 문의해주세요.');
}
async function rewardContext(tx: Transaction, p: any) {
  if (!p.referredBy || p.referralRewarded) return null;
  if (p.referralRewardUserId) {
    const user = await tx.get(`users/${p.referralRewardUserId}`);
    return user ? { uid: p.referralRewardUserId as string, user } : null;
  }
  const code = await tx.get(`referral_codes/${p.referredBy}`);
  if (!code?.userId || code.userId === p.userId || String(code.userId).includes('/')) return null;
  const user = await tx.get(`users/${code.userId}`);
  return user ? { uid: code.userId as string, user } : null;
}
function ledger(tx: Transaction, orderId: string, kind: string, uid: string, amount: number, before: number, after: number, actor: string, reason: string) {
  tx.set(`point_ledger/${orderId}_${kind}`, { kind, userId: uid, amount, before, after, actor, reason, reference: orderId, createdAt: now() });
}
function writeReward(tx: Transaction, orderId: string, reward: any, actor = '서버 결제 승인') {
  if (!reward) return {};
  const state = inspectPointBalance(reward.user.credits);
  const before = state.balance;
  if (!state.valid || !Number.isSafeInteger(before + 20000)) return {
    referralRewarded: false, referralRewardStatus: 'needs_review',
    referralRewardUserId: reward.uid, referralRewardAmount: 20000,
    referralRewardIssue: '추천인 포인트 잔액이 비정상이거나 지급 후 정수 범위를 초과합니다. 관리자 확인이 필요합니다.',
    referralRewardCheckedAt: now(),
  };
  tx.update(`users/${reward.uid}`, { credits: before + 20000 });
  ledger(tx, orderId, 'reward', reward.uid, 20000, before, before + 20000, actor, '추천 보상');
  return { referralRewarded: true, referralRewardStatus: 'paid', referralRewardIssue: '', referralRewardUserId: reward.uid, referralRewardAmount: 20000, referralRewardedAt: now() };
}

export async function transferPoints(store: Store, uid: string, input: any) {
  const operationId = identifier(input.operationId);
  const amount = Number(input.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000) throw new ApiError(400, '선물 금액은 1~100,000P 정수로 입력해주세요.');
  return store.transaction(async tx => {
    const previous = await tx.get(`point_transfers/${operationId}`);
    if (previous) {
      if (previous.fromId !== uid || previous.amount !== amount) throw new ApiError(409, '요청 번호가 이미 사용되었습니다.');
      return { ok: true, amount, recipientName: previous.toName };
    }
    const sender = await tx.get(`users/${uid}`);
    const code = String(sender?.referredBy || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4,16}$/.test(code)) throw new ApiError(400, '가입 시 등록한 추천인에게만 선물할 수 있습니다.');
    const referral = await tx.get(`referral_codes/${code}`);
    const recipientId = referral?.userId;
    if (!recipientId || recipientId === uid || String(recipientId).includes('/')) throw new ApiError(400, '유효한 추천인이 아닙니다.');
    const recipient = await tx.get(`users/${recipientId}`);
    if (!recipient) throw new ApiError(404, '추천인 계정을 찾을 수 없습니다.');
    const before = balance(sender.credits);
    const recipientBefore = balance(recipient.credits);
    if (before < amount) throw new ApiError(409, '보유 포인트가 부족합니다.');
    if (!Number.isSafeInteger(recipientBefore + amount)) throw new ApiError(409, '수신자 잔액 범위를 초과했습니다.');
    tx.update(`users/${uid}`, { credits: before - amount });
    tx.update(`users/${recipientId}`, { credits: recipientBefore + amount });
    tx.set(`point_transfers/${operationId}`, { fromId: uid, fromName: sender.name || '', toId: recipientId, toName: recipient.name || '', amount, referralLocked: true, fromBefore: before, fromAfter: before - amount, toBefore: recipientBefore, toAfter: recipientBefore + amount, flowVersion: 2, createdAt: now() });
    return { ok: true, amount, recipientName: recipient.name || '추천인' };
  });
}

export async function createOrder(store: Store, uid: string, input: any, tossEnabled = true) {
  const orderId = identifier(input.orderId);
  const pkg = PACKAGES.find(p => p.key === input.packageKey);
  if (input.termsAgreed !== true) throw new ApiError(400, '결제 약관에 동의해주세요.');
  if (!pkg || !['manual_bank_transfer', 'toss_widget'].includes(input.paymentMethod) || typeof input.useCredits !== 'boolean') throw new ApiError(400, '주문 정보가 올바르지 않습니다.');
  if (typeof input.tutorId !== 'string' || !input.tutorId || input.tutorId.includes('/')) throw new ApiError(400, '튜터를 선택해주세요.');
  const depositorName = String(input.depositorName || '').trim().slice(0, 100);
  return store.transaction(async tx => {
    const existing = await tx.get(`payments/${orderId}`);
    if (existing) {
      assertOwned(existing, uid);
      if (existing.packageKey !== pkg.key || existing.tutorId !== input.tutorId || existing.requestedUseCredits !== input.useCredits || existing.requestedPaymentMethod !== input.paymentMethod) throw new ApiError(409, '기존 주문 정보와 다릅니다.');
      return { orderId, ...existing };
    }
    const user = await tx.get(`users/${uid}`);
    if (!user) throw new ApiError(404, '사용자 정보를 찾을 수 없습니다.');
    const tutor = await tx.get(`tutors/${input.tutorId}`);
    if (!tutor || tutor.hidden || tutor.enrollDisabled) throw new ApiError(409, '현재 신청할 수 없는 튜터입니다.');
    const settings = input.paymentMethod === 'manual_bank_transfer' ? await tx.get('app_settings/main') : null;
    const pointState = inspectPointBalance(user.credits);
    const before = pointState.balance;
    const used = input.useCredits && pointState.valid ? Math.min(before, pkg.price) : 0;
    const amount = pkg.price - used;
    if (amount > 0 && input.paymentMethod === 'manual_bank_transfer' && !depositorName) throw new ApiError(400, '입금자명을 입력해주세요.');
    if (amount > 0 && input.paymentMethod === 'manual_bank_transfer' && (!settings?.bankName || !settings?.accountNumber || !settings?.accountHolder)) throw new ApiError(503, '입금 계좌가 설정되지 않았습니다.');
    if (amount > 0 && input.paymentMethod === 'toss_widget' && !tossEnabled) throw new ApiError(503, '결제 서버 설정이 필요합니다.');
    const p: any = { orderId, userId: uid, userName: user.name || '', userEmail: user.email || '', tutorId: input.tutorId, tutorName: tutor.name || '', productId: `plan_${input.tutorId}`, productName: `${tutor.name || '튜터'} — ${pkg.label} ${pkg.sessions}회${pkg.bonus ? ` +${pkg.bonus}회` : ''}`, packageKey: pkg.key, packageSessions: pkg.sessions, packageBonus: pkg.bonus, totalSessions: pkg.sessions + pkg.bonus, originalAmount: pkg.price, amount, creditsUsed: used, creditsRefunded: false, requestedUseCredits: input.useCredits, requestedPaymentMethod: input.paymentMethod, paymentMethod: amount === 0 ? 'points' : input.paymentMethod, status: amount === 0 ? 'completed' : 'pending', referredBy: /^[A-Z0-9]{4,16}$/.test(user.referredBy || '') ? user.referredBy : '', referralRewarded: false, depositorName, createdAt: now(), flowVersion: 2 };
    // All reads before any writes. A points-only order completes atomically without a PG call.
    const reward = amount === 0 ? await rewardContext(tx, p) : null;
    p.termsAgreedAt = now();
    p.pointWarning = pointState.warning;
    p.pointsUnavailable = !pointState.valid;
    if (settings) p.bankSnapshot = { bankName: settings.bankName, accountNumber: settings.accountNumber, accountHolder: settings.accountHolder };
    if (used > 0) {
      tx.update(`users/${uid}`, { credits: before - used });
      ledger(tx, orderId, 'use', uid, used, before, before - used, uid, amount === 0 ? '포인트 전액 결제' : '주문 생성 시 포인트 사용');
    }
    if (amount === 0) Object.assign(p, { confirmedAt: now(), confirmedBy: 'server_points', ...writeReward(tx, orderId, reward) });
    tx.set(`payments/${orderId}`, p);
    return p;
  });
}

export async function completeOrder(store: Store, orderId: string, provider?: any, adminId?: string) {
  return store.transaction(async tx => {
    const p = await tx.get(`payments/${orderId}`);
    if (!p || p.flowVersion !== 2) throw new ApiError(404, '주문을 찾을 수 없습니다.');
    if (provider && (provider.orderId !== orderId || provider.status !== 'DONE' || Number(provider.totalAmount) !== p.amount || (p.paymentKey && provider.paymentKey !== p.paymentKey))) throw new ApiError(409, '결제 응답과 주문 정보가 일치하지 않습니다.');
    if (p.status === 'completed') return { ...p, receipt: { url: p.receiptUrl || null }, totalAmount: p.amount };
    if (!isOpen(p) || p.creditsRefunded) throw new ApiError(409, '완료 처리할 수 없는 주문입니다. 관리자 확인이 필요합니다.');
    if (!provider && (!adminId || p.paymentMethod !== 'manual_bank_transfer')) throw new ApiError(403, '입금 확인 권한이 필요합니다.');
    const reward = await rewardContext(tx, p);
    const patch = { status: 'completed', confirmedAt: now(), confirmedBy: adminId || 'server_toss', ...writeReward(tx, orderId, reward), ...(provider ? { paymentKey: provider.paymentKey, method: provider.method || '', receiptUrl: provider.receipt?.url || null } : {}) };
    tx.update(`payments/${orderId}`, patch);
    return { ...p, ...patch, totalAmount: p.amount, receipt: provider?.receipt || null };
  });
}
export async function retryReferralReward(store: Store, orderId: string, actor = '서버 보상 재확인') {
  return store.transaction(async tx => {
    const p = await tx.get(`payments/${orderId}`);
    if (!p || p.flowVersion !== 2 || p.status !== 'completed') throw new ApiError(409, '완료된 신규 주문만 보상을 재확인할 수 있습니다.');
    if (p.referralRewarded) return { ok: true, referralRewardStatus: 'paid' };
    if (p.referralRewardStatus !== 'needs_review') throw new ApiError(409, '관리자 확인 대상인 보상이 아닙니다.');
    const reward = await rewardContext(tx, p);
    if (!reward) throw new ApiError(409, '보상 대상 계정을 찾을 수 없습니다. 관리자 확인이 필요합니다.');
    const patch = { ...writeReward(tx, orderId, reward, actor), referralRewardRetriedBy: actor, referralRewardRetriedAt: now() };
    tx.update(`payments/${orderId}`, patch);
    return { ok: true, ...patch };
  });
}
export async function refundOrder(store: Store, orderId: string, reason: string) {
  return store.transaction(async tx => {
    const p = await tx.get(`payments/${orderId}`);
    if (!p || p.flowVersion !== 2) throw new ApiError(404, '주문을 찾을 수 없습니다.');
    if (p.status === 'cancelled' && p.creditsRefunded) return { ok: true, status: 'cancelled' };
    if (p.status === 'completed') throw new ApiError(409, '완료된 결제는 취소할 수 없습니다.');
    const amount = p.creditsRefunded ? 0 : balance(p.creditsUsed);
    if (amount > 0) {
      const user = await tx.get(`users/${p.userId}`);
      if (!user) throw new ApiError(409, '반환 대상 계정이 없어 관리자 확인이 필요합니다.');
      const before = balance(user.credits);
      if (!Number.isSafeInteger(before + amount)) throw new ApiError(409, '반환 잔액 범위를 초과했습니다.');
      tx.update(`users/${p.userId}`, { credits: before + amount });
      ledger(tx, orderId, 'refund', p.userId, amount, before, before + amount, '서버 취소', reason);
    }
    tx.update(`payments/${orderId}`, { status: 'cancelled', cancelledAt: now(), failReason: reason.slice(0, 300), creditsRefunded: true, creditsRefundedAt: now() });
    return { ok: true, status: 'cancelled' };
  });
}
export async function tossLookup(env: MoneyEnv, orderId: string) {
  if (!env.TOSS_SECRET_KEY) throw new ApiError(503, '결제 서버 설정이 필요합니다.');
  const res = await fetch(`https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(orderId)}`, { signal: AbortSignal.timeout(15000), headers: { Authorization: `Basic ${btoa(env.TOSS_SECRET_KEY.trim() + ':')}` } });
  const data: any = await res.json();
  if (res.status === 404 && data.code === 'NOT_FOUND_PAYMENT') return null;
  if (!res.ok) throw new ApiError(503, '결제 상태 확인이 지연되고 있습니다. 포인트를 임의 반환하지 않고 다시 확인합니다.');
  return data;
}
export async function cancelOrder(store: Store, env: MoneyEnv, uid: string, orderId: string, reason: string, admin = false) {
  const stage = await store.transaction(async tx => {
    const p = await tx.get(`payments/${orderId}`);
    if (!admin) assertOwned(p, uid);
    else if (!p || p.flowVersion !== 2) throw new ApiError(409, '기존 주문은 기존 관리자 취소 기능을 사용해주세요.');
    if (p.status === 'completed' || p.status === 'cancelled') return p;
    const expiredConfirm = p.status === 'confirming' && Date.now() - new Date(p.confirmStartedAt || p.createdAt).getTime() > 45 * 60 * 1000;
    if (p.paymentMethod === 'toss_widget' && (p.status === 'pending' || expiredConfirm)) tx.update(`payments/${orderId}`, { status: 'cancelling' });
    return { ...p, wasConfirming: p.status === 'confirming' && !expiredConfirm };
  });
  if (stage.status === 'completed') return { ok: true, status: 'completed' };
  if (stage.status === 'cancelled') return { ok: true, status: 'cancelled' };
  if (stage.paymentMethod === 'manual_bank_transfer') return refundOrder(store, orderId, reason);
  const provider = await tossLookup(env, orderId);
  if (provider?.status === 'DONE') return completeOrder(store, orderId, provider);
  // An external confirm request may still be in flight. Never refund its points on an ambiguous status.
  const terminal = provider && ['ABORTED', 'EXPIRED', 'CANCELED'].includes(provider.status);
  if (terminal || (!stage.wasConfirming && (!provider || provider.status === 'READY'))) return refundOrder(store, orderId, reason);
  throw new ApiError(409, '결제 처리가 진행 중입니다. 상태 확인 후 포인트 반환이 완료됩니다.');
}
export async function recoverOrders(store: Store, env: MoneyEnv, uid: string) {
  const orders = await store.userOrders(uid);
  const candidates = orders.filter((p: any) => p.flowVersion === 2 && p.paymentMethod === 'toss_widget' && isOpen(p) && (p.status !== 'pending' || Date.now() - new Date(p.createdAt).getTime() > 45 * 60 * 1000)).slice(0, 20);
  const results = [];
  for (const p of candidates) {
    try { results.push({ orderId: p.id, ...(await cancelOrder(store, env, uid, p.id, '미완료 결제 상태 확인 및 포인트 반환')) }); }
    catch (error) { results.push({ orderId: p.id, pending: true, message: error instanceof Error ? error.message : '재확인 필요' }); }
  }
  return { ok: true, results };
}
