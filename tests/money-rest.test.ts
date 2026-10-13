// 로컬 demo emulator에서 실제 Firestore REST 트랜잭션을 검증한다. 운영 접속 없음.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Store, ApiError, encodeFields } from '../functions/_lib/firebase';
import { createOrder, transferPoints, cancelOrder, completeOrder, retryReferralReward } from '../functions/_lib/money';
import { onRequestPost as ordersHandler } from '../functions/api/payments/orders';
import { onRequestPost as confirmHandler } from '../functions/api/payments/confirm';
import { onRequestPost as cancelHandler } from '../functions/api/payments/cancel';
import { onRequestPost as adminHandler } from '../functions/api/admin/payment';
import { onRequestPost as webhookHandler } from '../functions/api/payments/webhook';
const env = { FIREBASE_PROJECT_ID: 'demo-point-audit', FIREBASE_DATABASE_ID: '(default)' } as any;
class EmulatorStore extends Store {
  async call(suffix: string, body?: any) {
    const res = await fetch(`http://127.0.0.1:8089/v1/${this.root}${suffix}`, {
      method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data: any = await res.json();
    if (res.status === 404) return null;
    if (res.status === 409 || data.error?.status === 'ABORTED') throw new ApiError(409, 'conflict');
    assert.ok(res.ok, JSON.stringify(data));
    return data;
  }
}
const s = new EmulatorStore(env, 'owner');
const order = (id: string) => ({ orderId: id, packageKey: 'basic', tutorId: 'rest_tutor', useCredits: true, termsAgreed: true, paymentMethod: 'manual_bank_transfer', depositorName: '학생' });
test('실제 REST 주문·차감·취소·반환 및 승인 보상 멱등 처리', async () => {
  for (const [path, data] of Object.entries({
    'users/rest_student': { credits: 20000, name: 'REST 학생', referredBy: 'REST123' },
    'users/rest_referrer': { credits: 0, name: 'REST 추천인' },
    'referral_codes/REST123': { userId: 'rest_referrer' },
    'tutors/rest_tutor': { name: 'REST 튜터' },
    'app_settings/main': { bankName: 'test', accountNumber: 'test', accountHolder: 'test' },
  })) await s.call(':commit', { writes: [{ update: { name: s.name(path), fields: encodeFields(data) } }] });
  const id = `rest_${crypto.randomUUID().replace(/-/g, '')}`;
  const p = await createOrder(s, 'rest_student', order(id));
  assert.equal(p.amount, 159000);
  await createOrder(s, 'rest_student', order(id));
  assert.equal((await s.get('users/rest_student'))?.credits, 0);
  await cancelOrder(s, env, 'rest_student', id, 'REST 취소');
  await cancelOrder(s, env, 'rest_student', id, 'REST 재시도');
  assert.equal((await s.get('users/rest_student'))?.credits, 20000);
  assert.equal((await s.get(`point_ledger/${id}_refund`))?.amount, 20000);
  const nextId = `${id}_next`;
  await createOrder(s, 'rest_student', order(nextId));
  await completeOrder(s, nextId, undefined, 'admin');
  await completeOrder(s, nextId, undefined, 'admin');
  assert.equal((await s.get('users/rest_referrer'))?.credits, 20000);
  assert.ok((await s.userOrders('rest_student')).some((p: any) => p.id === nextId));
});
test('실제 REST 이체의 잔액·로그 원자성 및 중복 요청 차단', async () => {
  await s.call(':commit', { writes: [{ update: { name: s.name('users/rest_student'), fields: encodeFields({ credits: 5000 }) }, updateMask: { fieldPaths: ['credits'] } }] });
  const operationId = `gift_${crypto.randomUUID().replace(/-/g, '')}`;
  await transferPoints(s, 'rest_student', { operationId, amount: 5000 });
  await transferPoints(s, 'rest_student', { operationId, amount: 5000 });
  assert.equal((await s.get('users/rest_student'))?.credits, 0);
  assert.equal((await s.get('users/rest_referrer'))?.credits, 25000);
  assert.equal((await s.get(`point_transfers/${operationId}`))?.fromAfter, 0);
});
test('실제 REST 동시 주문에서도 전액 포인트는 한 번만 사용', { timeout: 30000 }, async () => {
  for (const [path, data] of Object.entries({
    'users/rest_full_student': { credits: 179000, referredBy: 'FULL123', name: '전액 학생' },
    'users/rest_full_referrer': { credits: 0, name: '전액 추천인' },
    'referral_codes/FULL123': { userId: 'rest_full_referrer' },
  })) await s.call(':commit', { writes: [{ update: { name: s.name(path), fields: encodeFields(data) } }] });
  const id = `full_${crypto.randomUUID().replace(/-/g, '')}`;
  const records = await Promise.all([
    createOrder(s, 'rest_full_student', order(`${id}_one`), false),
    createOrder(s, 'rest_full_student', order(`${id}_two`), false),
  ]);
  assert.equal(records.reduce((sum, p) => sum + p.creditsUsed, 0), 179000);
  assert.equal(records.filter(p => p.status === 'completed').length, 1);
  assert.equal((await s.get('users/rest_full_student'))?.credits, 0);
  assert.equal((await s.get('users/rest_full_referrer'))?.credits, 20000);
  const completed = records.find(p => p.status === 'completed');
  assert.equal(completed?.paymentMethod, 'points');
  assert.equal(completed?.amount, 0);
  await createOrder(s, 'rest_full_student', order(completed!.orderId), false);
  assert.equal((await s.get('users/rest_full_referrer'))?.credits, 20000);
});
test('실제 REST 비정상 잔액은 정가 주문/취소 허용, 보상은 확인 후 재처리', async () => {
  const prefix = `bad_${crypto.randomUUID().replace(/-/g, '')}`;
  const uid = `${prefix}_student`;
  const referrer = `${prefix}_referrer`;
  for (const [path, data] of Object.entries({
    [`users/${uid}`]: { credits: -1, referredBy: 'BAD123', name: '확인 학생' },
    [`users/${referrer}`]: { credits: Number.MAX_SAFE_INTEGER, name: '확인 추천인' },
    'referral_codes/BAD123': { userId: referrer },
  })) await s.call(':commit', { writes: [{ update: { name: s.name(path), fields: encodeFields(data) } }] });
  const p = await createOrder(s, uid, order(prefix));
  assert.equal(p.amount, 179000); assert.equal(p.creditsUsed, 0);
  assert.match(p.pointWarning, /포인트 사용 불가/);
  await cancelOrder(s, env, uid, prefix, '취소');
  assert.equal((await s.get(`users/${uid}`))?.credits, -1);
  const approvedId = `${prefix}_approved`;
  await createOrder(s, uid, order(approvedId));
  await completeOrder(s, approvedId, undefined, 'admin');
  assert.equal((await s.get(`payments/${approvedId}`))?.status, 'completed');
  assert.equal((await s.get(`payments/${approvedId}`))?.referralRewardStatus, 'needs_review');
  assert.equal((await s.get(`users/${referrer}`))?.credits, Number.MAX_SAFE_INTEGER);
  assert.equal(await s.get(`point_ledger/${approvedId}_reward`), null);
  await s.call(':commit', { writes: [{ update: { name: s.name(`users/${referrer}`), fields: encodeFields({ credits: 0 }) }, updateMask: { fieldPaths: ['credits'] } }] });
  await retryReferralReward(s, approvedId);
  await retryReferralReward(s, approvedId);
  assert.equal((await s.get(`users/${referrer}`))?.credits, 20000);
  assert.equal((await s.get(`payments/${approvedId}`))?.referralRewardStatus, 'paid');
});
test('API 인증·이메일 제한·주문 소유자/금액 검증·카드 승인·웹훅 위조 거부', { skip: process.env.POINTS_ONLY === '1' }, async () => {
  // 외부 인증/PG 응답만 mock. 저장/트랜잭션은 실제 로컬 REST emulator.
  const key = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const privateKey = Buffer.from(await crypto.subtle.exportKey('pkcs8', key.privateKey)).toString('base64');
  const apiEnv = { ...env, FIREBASE_API_KEY: 'test', FIREBASE_CLIENT_EMAIL: 'test@example.test', FIREBASE_PRIVATE_KEY: privateKey, TOSS_SECRET_KEY: 'test' };
  const original = globalThis.fetch;
  let provider: any = null;
  let confirmCalls = 0;
  globalThis.fetch = async (url: any, init: any = {}) => {
    const address = String(url);
    if (address.startsWith('https://identitytoolkit.googleapis.com/')) {
      const { idToken } = JSON.parse(init.body);
      if (idToken === 'forged') return new Response('{}', { status: 400 });
      return Response.json({ users: [{ localId: idToken === 'other' ? 'rest_referrer' : 'rest_student', emailVerified: idToken !== 'unverified' }] });
    }
    if (address === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'server-test' });
    if (address.startsWith('https://firestore.googleapis.com/')) return original(address.replace('https://firestore.googleapis.com', 'http://127.0.0.1:8089'), { ...init, headers: { ...init.headers, Authorization: 'Bearer owner' } });
    if (address === 'https://api.tosspayments.com/v1/payments/confirm') {
      confirmCalls++;
      const body = JSON.parse(init.body);
      provider = { orderId: body.orderId, paymentKey: body.paymentKey, totalAmount: body.amount, status: 'DONE', method: '카드' };
      return Response.json(provider);
    }
    if (address.startsWith('https://api.tosspayments.com/')) return provider ? Response.json(provider) : Response.json({ code: 'NOT_FOUND_PAYMENT' }, { status: 404 });
    return original(url, init);
  };
  const invoke = async (handler: any, body: any, token = 'student') => {
    const request = new Request('https://example.test/api', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    return handler({ request, env: apiEnv });
  };
  try {
    const id = `api_${crypto.randomUUID().replace(/-/g, '')}`;
    const body = { ...order(id), paymentMethod: 'toss_widget' };
    assert.equal((await invoke(ordersHandler, body, '')).status, 401);
    assert.equal((await invoke(ordersHandler, body, 'forged')).status, 401);
    await s.call(':commit', { writes: [{ update: { name: s.name('users/rest_student'), fields: encodeFields({ credits: 20000, emailVerificationRequired: true }) }, updateMask: { fieldPaths: ['credits', 'emailVerificationRequired'] } }] });
    assert.equal((await invoke(ordersHandler, body, 'unverified')).status, 403);
    assert.equal((await s.get('users/rest_student'))?.credits, 20000);
    const created = await invoke(ordersHandler, body);
    assert.equal(created.status, 200, await created.text());
    assert.equal((await invoke(confirmHandler, { orderId: id, paymentKey: 'test-key', amount: 1 })).status, 409);
    assert.equal((await invoke(confirmHandler, { orderId: id, paymentKey: 'test-key', amount: 159000 }, 'other')).status, 404);
    assert.equal((await invoke(cancelHandler, { orderId: id }, 'other')).status, 404);
    assert.equal((await invoke(adminHandler, { orderId: id, action: 'approve' })).status, 403);
    // 클라이언트가 webhook에 DONE을 써도 토스 조회가 미승인이면 완료되지 않음.
    assert.equal((await invoke(webhookHandler, { data: { orderId: id, status: 'DONE' } }, '')).status, 200);
    assert.equal((await s.get(`payments/${id}`))?.status, 'pending');
    assert.equal(confirmCalls, 0);
    assert.equal((await invoke(confirmHandler, { orderId: id, paymentKey: 'test-key', amount: 159000 })).status, 200);
    assert.equal((await invoke(confirmHandler, { orderId: id, paymentKey: 'test-key', amount: 159000 })).status, 200);
    assert.equal(confirmCalls, 1);
    const notification = await invoke(webhookHandler, { data: { orderId: id, status: 'DONE' } }, '');
    assert.deepEqual(await notification.json(), { ok: true }); // 공개 웹훅 응답으로 개인정보를 노출하지 않는다.
    assert.equal((await s.get(`payments/${id}`))?.status, 'completed');
    assert.equal((await s.get('users/rest_student'))?.credits, 0);
  } finally { globalThis.fetch = original; }
});
