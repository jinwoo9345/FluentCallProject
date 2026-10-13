import { authenticate, endpoint, type MoneyEnv } from '../../_lib/firebase';
import { cancelOrder, identifier } from '../../_lib/money';
export const onRequestPost: PagesFunction<MoneyEnv> = async ({ request, env }) => endpoint(async () => {
  const caller = await authenticate(request, env);
  const input = await request.json<any>();
  return cancelOrder(caller.store, env, caller.uid, identifier(input.orderId), String(input.reason || '사용자 결제 취소').slice(0, 300));
});
