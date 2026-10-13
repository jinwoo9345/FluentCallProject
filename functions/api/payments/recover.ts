import { authenticate, endpoint, type MoneyEnv } from '../../_lib/firebase';
import { recoverOrders } from '../../_lib/money';
export const onRequestPost: PagesFunction<MoneyEnv> = async ({ request, env }) => endpoint(async () => {
  const caller = await authenticate(request, env);
  return recoverOrders(caller.store, env, caller.uid);
});
