import { ApiError, authenticate, endpoint, type MoneyEnv } from '../../_lib/firebase';
import { cancelOrder, completeOrder, identifier, retryReferralReward } from '../../_lib/money';
export const onRequestPost: PagesFunction<MoneyEnv> = async ({ request, env }) => endpoint(async () => {
  const caller = await authenticate(request, env);
  if (caller.user.role !== 'admin') throw new ApiError(403, '관리자 권한이 필요합니다.');
  const input = await request.json<any>();
  const orderId = identifier(input.orderId);
  if (input.action === 'retry_reward') return retryReferralReward(caller.store, orderId, caller.uid);
  if (input.action === 'approve') return completeOrder(caller.store, orderId, undefined, caller.uid);
  if (input.action === 'cancel') return cancelOrder(caller.store, env, caller.uid, orderId, String(input.reason || '관리자 취소').slice(0, 300), true);
  throw new ApiError(400, '유효하지 않은 작업입니다.');
});
