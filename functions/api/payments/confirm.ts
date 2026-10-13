import { ApiError, authenticate, endpoint, requireVerified, type MoneyEnv } from '../../_lib/firebase';
import { assertOwned, completeOrder, identifier, refundOrder, tossLookup } from '../../_lib/money';
export const onRequestPost: PagesFunction<MoneyEnv> = async ({ request, env }) => endpoint(async () => {
  const caller = await authenticate(request, env);
  requireVerified(caller);
  const input = await request.json<any>();
  const orderId = identifier(input.orderId);
  const paymentKey = input.paymentKey;
  const amount = Number(input.amount);
  if (typeof paymentKey !== 'string' || !paymentKey || paymentKey.length > 200 || !Number.isSafeInteger(amount) || amount <= 0) throw new ApiError(400, '결제 정보가 올바르지 않습니다.');
  if (!env.TOSS_SECRET_KEY) throw new ApiError(503, '결제 서버 설정이 필요합니다.');
  const p = await caller.store.transaction(async tx => {
    const p = await tx.get(`payments/${orderId}`);
    assertOwned(p, caller.uid);
    if (p.amount !== amount || p.paymentMethod !== 'toss_widget' || (p.paymentKey && p.paymentKey !== paymentKey)) throw new ApiError(409, '주문 금액 또는 결제 정보가 일치하지 않습니다.');
    if (p.status === 'completed') return p;
    if (!['pending', 'confirming'].includes(p.status) || p.creditsRefunded) throw new ApiError(409, '취소되었거나 처리할 수 없는 주문입니다.');
    tx.update(`payments/${orderId}`, { status: 'confirming', paymentKey, confirmStartedAt: new Date() });
    return p;
  });
  if (p.status === 'completed') return { ...p, totalAmount: p.amount, receipt: { url: p.receiptUrl || null } };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  let response: Response;
  try {
    response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: `Basic ${btoa(env.TOSS_SECRET_KEY.trim() + ':')}`, 'Content-Type': 'application/json', 'Idempotency-Key': `eb-confirm-${orderId}` },
      body: JSON.stringify({ paymentKey, orderId, amount: p.amount }),
    });
  } catch {
    const provider = await tossLookup(env, orderId);
    if (provider?.status === 'DONE') return completeOrder(caller.store, orderId, provider);
    throw new ApiError(503, '결제 상태 확인 중입니다. 같은 주문으로 다시 확인해주세요.');
  } finally { clearTimeout(timeout); }
  const result: any = await response.json();
  if (response.ok) return completeOrder(caller.store, orderId, result);
  const provider = await tossLookup(env, orderId);
  if (provider?.status === 'DONE') return completeOrder(caller.store, orderId, provider);
  if (provider && ['ABORTED', 'EXPIRED', 'CANCELED'].includes(provider.status)) await refundOrder(caller.store, orderId, '결제 승인 실패');
  throw new ApiError(response.status >= 500 ? 503 : 409, result.message || '결제 승인 상태를 다시 확인해주세요.');
});
