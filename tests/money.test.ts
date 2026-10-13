import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrder, transferPoints, completeOrder, refundOrder, cancelOrder, recoverOrders, retryReferralReward } from '../functions/_lib/money';
import { authenticate, type Store } from '../functions/_lib/firebase';
import { PACKAGES } from '../src/constants';
import { paymentOrderAction } from '../src/lib/paymentOrderState';
const tossTest = process.env.POINTS_ONLY === '1' ? test.skip : test;

// Serialized in-memory transaction store. Writes commit together, exceptions discard the entire attempt.
class MemoryStore {
  docs: Record<string, any>;
  private queue: Promise<any> = Promise.resolve();
  constructor(credits = 20000, referredBy = 'REF123') {
    this.docs = {
      'users/student': { name: '학생', email: 'a@example.test', credits, referredBy },
      'users/referrer': { name: '추천인', credits: 100 },
      'referral_codes/REF123': { userId: 'referrer' },
      'tutors/tutor': { name: '튜터' },
      'app_settings/main': { bankName: 'test', accountNumber: 'test', accountHolder: 'test' },
    };
  }
  get(path: string) { return Promise.resolve(structuredClone(this.docs[path] || null)); }
  async userOrders(uid: string) { return Object.entries(this.docs).filter(([path, p]) => path.startsWith('payments/') && p.userId === uid).map(([path, p]) => ({ ...p, id: path.split('/')[1] })); }
  transaction<T>(work: (tx: any) => Promise<T>): Promise<T> {
    const job = this.queue.then(async () => {
      const next = structuredClone(this.docs);
      let writing = false;
      const tx = {
        get: async (path: string) => { assert.equal(writing, false, 'read after write'); return structuredClone(next[path] || null); },
        update: (path: string, value: any) => { writing = true; assert.ok(next[path], 'update missing document'); next[path] = { ...next[path], ...structuredClone(value) }; },
        set: (path: string, value: any) => { writing = true; next[path] = structuredClone(value); },
      };
      const result = await work(tx);
      this.docs = next;
      return result;
    });
    this.queue = job.catch(() => {});
    return job;
  }
  store() { return this as unknown as Store; }
}
const input = (patch = {}) => ({ orderId: 'order_test123', packageKey: 'basic', tutorId: 'tutor', useCredits: true, termsAgreed: true, paymentMethod: 'manual_bank_transfer', depositorName: '학생', ...patch });
const done = (orderId = 'order_test123', amount = 159000) => ({ orderId, totalAmount: amount, status: 'DONE', paymentKey: 'key123', method: '카드' });

test('취소 무통장 재시도는 입금 안내 금지, 새 주문만 다시 차감', async () => {
  const s = new MemoryStore();
  await createOrder(s.store(), 'student', input());
  await cancelOrder(s.store(), {} as any, 'student', 'order_test123', '취소');
  const retried = await createOrder(s.store(), 'student', input());
  assert.equal(paymentOrderAction(retried), 'cancelled');
  assert.equal(s.docs['users/student'].credits, 20000);
  const next = await createOrder(s.store(), 'student', input({ orderId: 'order_new123' }));
  assert.equal(paymentOrderAction(next), 'bank_pending');
  assert.equal(next.creditsUsed, 20000);
  assert.equal(s.docs['users/student'].credits, 0);
  assert.equal(s.docs['payments/order_test123'].status, 'cancelled');
});

test('모든 수강권의 0·부분·전액·초과 잔액과 추천인 유무/미사용 선택 조합', async () => {
  for (const pkg of PACKAGES) for (const credits of [0, 1, pkg.price, pkg.price + 1234]) {
    for (const referredBy of ['', 'REF123']) for (const useCredits of [false, true]) {
      const s = new MemoryStore(credits, referredBy);
      const p = await createOrder(s.store(), 'student', input({ packageKey: pkg.key, useCredits }), false);
      const used = useCredits ? Math.min(credits, pkg.price) : 0;
      assert.equal(p.creditsUsed, used);
      assert.equal(p.amount, pkg.price - used);
      assert.equal(s.docs['users/student'].credits, credits - used);
      assert.equal(p.status, p.amount === 0 ? 'completed' : 'pending');
      assert.equal(p.totalSessions, pkg.sessions + pkg.bonus);
      assert.equal(s.docs['users/referrer'].credits, p.amount === 0 && referredBy ? 20100 : 100);
      if (p.amount > 0) {
        await cancelOrder(s.store(), {} as any, 'student', p.orderId, '조합 테스트 취소');
        await cancelOrder(s.store(), {} as any, 'student', p.orderId, '중복 취소');
        assert.equal(s.docs['users/student'].credits, credits);
      }
    }
  }
});

test('무통장 승인과 취소 동시 요청은 한쪽만 반영', async () => {
  for (const cancelFirst of [false, true]) {
    const s = new MemoryStore();
    await createOrder(s.store(), 'student', input());
    const approve = () => completeOrder(s.store(), 'order_test123', undefined, 'admin');
    const cancel = () => cancelOrder(s.store(), {} as any, 'student', 'order_test123', '취소');
    await Promise.allSettled(cancelFirst ? [cancel(), approve()] : [approve(), cancel()]);
    const p = s.docs['payments/order_test123'];
    assert.ok(['completed', 'cancelled'].includes(p.status));
    assert.equal(s.docs['users/student'].credits, p.status === 'cancelled' ? 20000 : 0);
    assert.equal(s.docs['users/referrer'].credits, p.status === 'completed' ? 20100 : 100);
    assert.equal(!!s.docs['point_ledger/order_test123_refund'], p.status === 'cancelled');
  }
});

test('비정상 추천인 잔액은 결제를 막지 않고 보상 확인 대상으로 남김', async () => {
  for (const credits of ['100', -1, 0.5, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1, Infinity]) {
    const s = new MemoryStore();
    await createOrder(s.store(), 'student', input());
    s.docs['users/referrer'].credits = credits;
    await completeOrder(s.store(), 'order_test123', undefined, 'admin');
    await completeOrder(s.store(), 'order_test123', undefined, 'admin');
    assert.equal(s.docs['payments/order_test123'].status, 'completed');
    assert.equal(s.docs['payments/order_test123'].referralRewardStatus, 'needs_review');
    assert.equal(s.docs['users/referrer'].credits, credits);
    assert.equal(s.docs['point_ledger/order_test123_reward'], undefined);
    assert.equal(s.docs['users/student'].credits, 0);
  }
});

test('본인 비정상 잔액은 포인트 미사용 정가 결제 및 취소 가능, 원본 보존', async () => {
  for (const credits of ['100', -1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN]) for (const useCredits of [false, true]) {
    const s = new MemoryStore(); s.docs['users/student'].credits = credits;
    const p = await createOrder(s.store(), 'student', input({ useCredits }));
    assert.equal(p.amount, 179000); assert.equal(p.creditsUsed, 0);
    assert.equal(p.pointsUnavailable, true); assert.match(p.pointWarning, /관리자/);
    assert.equal(s.docs['users/student'].credits, credits);
    await cancelOrder(s.store(), {} as any, 'student', p.orderId, '취소');
    assert.equal(s.docs['users/student'].credits, credits);
    assert.equal(s.docs['payments/order_test123'].status, 'cancelled');
    assert.equal(s.docs['point_ledger/order_test123_use'], undefined);
    assert.equal(s.docs['point_ledger/order_test123_refund'], undefined);
  }
});

test('보상 재확인은 잔액 복구 후 한 번만 지급하고 대상 UID를 유지', async () => {
  const s = new MemoryStore(); s.docs['users/referrer'].credits = -1;
  await createOrder(s.store(), 'student', input());
  await assert.rejects(retryReferralReward(s.store(), 'order_test123'));
  await completeOrder(s.store(), 'order_test123', undefined, 'admin');
  await retryReferralReward(s.store(), 'order_test123');
  assert.equal(s.docs['payments/order_test123'].referralRewardStatus, 'needs_review');
  s.docs['users/referrer'].credits = 0;
  s.docs['referral_codes/REF123'].userId = 'other'; // 확인 대상으로 저장한 수령인은 변경하지 않는다.
  await Promise.all([retryReferralReward(s.store(), 'order_test123'), retryReferralReward(s.store(), 'order_test123')]);
  assert.equal(s.docs['users/referrer'].credits, 20000);
  assert.equal(s.docs['payments/order_test123'].referralRewardStatus, 'paid');
  assert.equal(s.docs['payments/order_test123'].referralRewarded, true);
});

test('전액 포인트 결제도 추천인 오류와 무관하게 완료', async () => {
  const s = new MemoryStore(179000); s.docs['users/referrer'].credits = -1;
  const p = await createOrder(s.store(), 'student', input());
  assert.equal(p.status, 'completed'); assert.equal(p.amount, 0);
  assert.equal(p.referralRewardStatus, 'needs_review');
  assert.equal(s.docs['users/student'].credits, 0);
});

test('추천인 유무와 무관하게 포인트 자동 사용, 초과분 보존', async () => {
  for (const referredBy of ['', 'REF123']) {
    const s = new MemoryStore(20000, referredBy);
    const p = await createOrder(s.store(), 'student', input());
    assert.equal(p.amount, 159000); assert.equal(p.creditsUsed, 20000);
    assert.equal(s.docs['users/student'].credits, 0);
    assert.equal(s.docs['point_ledger/order_test123_use'].amount, 20000);
  }
  const s = new MemoryStore(200000);
  const p = await createOrder(s.store(), 'student', input());
  assert.equal(p.status, 'completed'); assert.equal(p.amount, 0);
  assert.equal(s.docs['users/student'].credits, 21000);
});
test('포인트 미사용 선택', async () => {
  const s = new MemoryStore(); const p = await createOrder(s.store(), 'student', input({ useCredits: false }));
  assert.equal(p.amount, 179000); assert.equal(s.docs['users/student'].credits, 20000);
});
test('전액 포인트 결제는 계좌/PG 설정 없어도 원자적으로 완료', async () => {
  const s = new MemoryStore(179000); delete s.docs['app_settings/main'];
  const p = await createOrder(s.store(), 'student', input({ paymentMethod: 'toss_widget', depositorName: '' }), false);
  assert.equal(p.status, 'completed'); assert.equal(p.paymentMethod, 'points');
  assert.equal(s.docs['users/referrer'].credits, 20100);
  await createOrder(s.store(), 'student', input({ paymentMethod: 'toss_widget', depositorName: '' }), false);
  assert.equal(s.docs['users/referrer'].credits, 20100);
});
test('서버 가격만 사용하며 같은 주문 재시도는 재차감하지 않음', async () => {
  const s = new MemoryStore(); const body = input({ amount: 1, creditsUsed: -1, productName: '조작' });
  const first = await createOrder(s.store(), 'student', body);
  const second = await createOrder(s.store(), 'student', body);
  assert.equal(first.amount, second.amount); assert.equal(first.amount, 159000);
  assert.equal(s.docs['users/student'].credits, 0);
  await assert.rejects(createOrder(s.store(), 'student', input({ packageKey: 'premium' })));
  await assert.rejects(createOrder(s.store(), 'referrer', body));
});
test('동시 주문으로 같은 포인트를 두 번 사용하지 않음', async () => {
  const s = new MemoryStore();
  const orders = await Promise.all([createOrder(s.store(), 'student', input()), createOrder(s.store(), 'student', input({ orderId: 'order_other123' }))]);
  assert.equal(orders.reduce((sum, p) => sum + p.creditsUsed, 0), 20000);
  assert.equal(s.docs['users/student'].credits, 0);
});
test('서버 설정/튜터/형식 실패 시 포인트 보존', async () => {
  for (const patch of [{ termsAgreed: false }, { tutorId: 'missing' }, { tutorId: '../bad' }, { packageKey: 'bad' }, { useCredits: 'yes' }, { orderId: '../bad' }]) {
    const s = new MemoryStore(); await assert.rejects(createOrder(s.store(), 'student', input(patch))); assert.equal(s.docs['users/student'].credits, 20000);
  }
  const s = new MemoryStore(); await assert.rejects(createOrder(s.store(), 'student', input({ paymentMethod: 'toss_widget' }), false));
  assert.equal(s.docs['users/student'].credits, 20000);
});
test('선물은 추천인만 수신, 잔액·로그 함께 변경 및 재시도 멱등', async () => {
  const s = new MemoryStore();
  const body = { operationId: 'gift_test123', amount: 5000, toId: 'attacker' };
  await transferPoints(s.store(), 'student', body);
  await transferPoints(s.store(), 'student', body);
  assert.equal(s.docs['users/student'].credits, 15000);
  assert.equal(s.docs['users/referrer'].credits, 5100);
  assert.equal(s.docs['point_transfers/gift_test123'].toId, 'referrer');
  await assert.rejects(transferPoints(s.store(), 'referrer', body));
});
test('선물 부족·소수·한도 초과·추천인 미등록·본인 추천 거부', async () => {
  for (const amount of [0, -1, 0.5, 20001, 100001, NaN]) {
    const s = new MemoryStore(); await assert.rejects(transferPoints(s.store(), 'student', { operationId: 'gift_test123', amount })); assert.equal(s.docs['users/student'].credits, 20000);
  }
  const s = new MemoryStore(20000, ''); await assert.rejects(transferPoints(s.store(), 'student', { operationId: 'gift_test123', amount: 1 }));
  s.docs['users/student'].referredBy = 'REF123'; s.docs['referral_codes/REF123'].userId = 'student';
  await assert.rejects(transferPoints(s.store(), 'student', { operationId: 'gift_test123', amount: 1 }));
});
test('동시 선물 요청도 같은 잔액을 중복 사용할 수 없음', async () => {
  const s = new MemoryStore(5000);
  const result = await Promise.allSettled([transferPoints(s.store(), 'student', { operationId: 'gift_test123', amount: 5000 }), transferPoints(s.store(), 'student', { operationId: 'gift_other123', amount: 5000 })]);
  assert.equal(result.filter(r => r.status === 'fulfilled').length, 1); assert.equal(s.docs['users/student'].credits, 0);
});
test('무통장 취소 및 반환 재시도는 한 번만 반환', async () => {
  const s = new MemoryStore(); await createOrder(s.store(), 'student', input());
  await cancelOrder(s.store(), {} as any, 'student', 'order_test123', '취소');
  await cancelOrder(s.store(), {} as any, 'student', 'order_test123', '취소');
  assert.equal(s.docs['users/student'].credits, 20000);
  assert.equal(s.docs['point_ledger/order_test123_refund'].amount, 20000);
});
test('타인 주문 취소 및 기존 누락 주문 자동 변경 금지', async () => {
  const s = new MemoryStore(); await createOrder(s.store(), 'student', input());
  await assert.rejects(cancelOrder(s.store(), {} as any, 'referrer', 'order_test123', '취소'));
  s.docs['payments/order_legacy123'] = { userId: 'student', creditsUsed: 100, status: 'pending' };
  await assert.rejects(refundOrder(s.store(), 'order_legacy123', '취소'));
});
test('입금 확인·추천 보상 중복 지급 방지, 취소 후 승인 거부', async () => {
  const s = new MemoryStore(); await createOrder(s.store(), 'student', input());
  await completeOrder(s.store(), 'order_test123', undefined, 'admin');
  await completeOrder(s.store(), 'order_test123', undefined, 'admin');
  assert.equal(s.docs['users/referrer'].credits, 20100);
  await assert.rejects(refundOrder(s.store(), 'order_test123', '취소'));
  const t = new MemoryStore(); await createOrder(t.store(), 'student', input()); await refundOrder(t.store(), 'order_test123', '취소');
  await assert.rejects(completeOrder(t.store(), 'order_test123', undefined, 'admin'));
});
tossTest('PG 응답의 주문·금액·상태 불일치 거부', async () => {
  for (const patch of [{ orderId: 'order_wrong123' }, { totalAmount: 1 }, { status: 'READY' }]) {
    const s = new MemoryStore(); await createOrder(s.store(), 'student', input({ paymentMethod: 'toss_widget' }));
    await assert.rejects(completeOrder(s.store(), 'order_test123', { ...done(), ...patch }));
    assert.equal(s.docs['payments/order_test123'].status, 'pending');
  }
});
tossTest('취소 요청 중 PG가 DONE이면 반환 대신 완료 확정', async () => {
  const s = new MemoryStore(); await createOrder(s.store(), 'student', input({ paymentMethod: 'toss_widget' }));
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(done()), { status: 200 });
  try { await cancelOrder(s.store(), { TOSS_SECRET_KEY: 'test' } as any, 'student', 'order_test123', '취소'); }
  finally { globalThis.fetch = original; }
  assert.equal(s.docs['payments/order_test123'].status, 'completed'); assert.equal(s.docs['users/student'].credits, 0);
});
tossTest('PG 조회 실패/승인 진행 중에는 임의 반환하지 않음', async () => {
  for (const provider of [{ status: 503, data: {} }, { status: 200, data: { status: 'IN_PROGRESS' } }]) {
    const s = new MemoryStore(); await createOrder(s.store(), 'student', input({ paymentMethod: 'toss_widget' }));
    const original = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify(provider.data), { status: provider.status });
    try { await assert.rejects(cancelOrder(s.store(), { TOSS_SECRET_KEY: 'test' } as any, 'student', 'order_test123', '취소')); }
    finally { globalThis.fetch = original; }
    assert.equal(s.docs['users/student'].credits, 0);
  }
});
tossTest('SDK 중단(미승인) 및 탭 종료 후 만료 주문 복구', async () => {
  const s = new MemoryStore(); await createOrder(s.store(), 'student', input({ paymentMethod: 'toss_widget' }));
  s.docs['payments/order_test123'].createdAt = new Date(Date.now() - 46 * 60 * 1000);
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ code: 'NOT_FOUND_PAYMENT' }), { status: 404 });
  try { await recoverOrders(s.store(), { TOSS_SECRET_KEY: 'test' } as any, 'student'); }
  finally { globalThis.fetch = original; }
  assert.equal(s.docs['users/student'].credits, 20000); assert.equal(s.docs['payments/order_test123'].status, 'cancelled');
});
tossTest('진행 중인 신규 주문과 기존 주문은 복구가 임의 취소하지 않음', async () => {
  const s = new MemoryStore(); await createOrder(s.store(), 'student', input({ paymentMethod: 'toss_widget' }));
  s.docs['payments/order_legacy123'] = { userId: 'student', status: 'pending', paymentMethod: 'toss_widget', createdAt: new Date(0) };
  const result = await recoverOrders(s.store(), {} as any, 'student');
  assert.equal(result.results.length, 0); assert.equal(s.docs['payments/order_test123'].status, 'pending');
});
test('인증 없는 요청과 위조 ID 토큰 거부', async () => {
  await assert.rejects(authenticate(new Request('https://example.test'), {} as any), (error: any) => error.status === 401);
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'INVALID_ID_TOKEN' } }), { status: 400 });
  try { await assert.rejects(authenticate(new Request('https://example.test', { headers: { Authorization: 'Bearer forged' } }), { FIREBASE_API_KEY: 'test' } as any), (error: any) => error.status === 401); }
  finally { globalThis.fetch = original; }
});
