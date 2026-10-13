import { authenticate, endpoint, requireVerified, type MoneyEnv } from '../../_lib/firebase';
import { transferPoints } from '../../_lib/money';
export const onRequestPost: PagesFunction<MoneyEnv> = async ({ request, env }) => endpoint(async () => {
  const caller = await authenticate(request, env);
  requireVerified(caller);
  return transferPoints(caller.store, caller.uid, await request.json<any>());
});
