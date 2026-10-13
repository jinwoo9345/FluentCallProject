import { endpoint, serviceToken, Store, type MoneyEnv } from '../../_lib/firebase';
import { completeOrder, identifier, refundOrder, tossLookup } from '../../_lib/money';
export const onRequestPost: PagesFunction<MoneyEnv> = async ({ request, env }) => endpoint(async () => {
  const input = await request.json<any>();
  const orderId = identifier(input.data?.orderId);
  const store = new Store(env, await serviceToken(env));
  const p = await store.get(`payments/${orderId}`);
  if (!p || p.flowVersion !== 2 || p.paymentMethod !== 'toss_widget') return { ok: true, ignored: true };
  // Posted status is never trusted: query Toss with the server secret.
  const provider = await tossLookup(env, orderId);
  if (provider?.status === 'DONE') {
    await completeOrder(store, orderId, provider);
    return { ok: true };
  }
  if (provider && ['ABORTED', 'EXPIRED', 'CANCELED'].includes(provider.status) && p.status !== 'completed') {
    await refundOrder(store, orderId, '결제 실패·만료 확인');
    return { ok: true };
  }
  return { ok: true, ignored: true };
});
