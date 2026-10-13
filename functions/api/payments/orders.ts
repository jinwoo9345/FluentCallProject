import { authenticate, endpoint, requireVerified, type MoneyEnv } from '../../_lib/firebase';
import { createOrder } from '../../_lib/money';
export const onRequestPost: PagesFunction<MoneyEnv> = async ({ request, env }) => endpoint(async () => {
  const caller = await authenticate(request, env);
  requireVerified(caller);
  const input = await request.json<any>();
  return createOrder(caller.store, caller.uid, input, !!env.TOSS_SECRET_KEY);
});
