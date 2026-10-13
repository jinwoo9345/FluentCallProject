import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPointHistory, calculatePointAdjustment, filterPointHistory, pointTimestamp } from '../src/lib/pointHistory';

test('신규 결제는 서버 원장만 사용해 이력 중복을 방지', () => {
  const records = buildPointHistory([], [], [{ id: 'order_new123', flowVersion: 2, userId: 'student', creditsUsed: 100, creditsRefunded: true, referralRewarded: true }], [], [
    { id: 'order_new123_use', kind: 'use', userId: 'student', amount: 100, before: 100, after: 0 },
    { id: 'order_new123_refund', kind: 'refund', userId: 'student', amount: 100, before: 0, after: 100 },
  ]);
  assert.equal(records.length, 2);
  assert.equal(records.filter(r => r.kind === 'use').length, 1);
  assert.equal(records.filter(r => r.kind === 'refund').length, 1);
});

test('지급/회수 잔액과 누락 잔액을 정확히 계산', () => {
  assert.deepEqual(calculatePointAdjustment(100, 50), { before: 100, after: 150 });
  assert.deepEqual(calculatePointAdjustment(100, -100), { before: 100, after: 0 });
  assert.deepEqual(calculatePointAdjustment(undefined, 10), { before: 0, after: 10 });
});
test('초과 회수·소수·0·비정상 잔액·정수 범위 초과 거부', () => {
  for (const [balance, delta] of [[100, -101], [100, 0.5], [100, 0], [100, NaN], [-1, 2], [Infinity, 1], ['100', 1], [Number.MAX_SAFE_INTEGER, 1]] as [unknown, number][]) {
    assert.throws(() => calculatePointAdjustment(balance, delta));
  }
});
test('Timestamp·Date·잘못된 날짜 처리', () => {
  assert.equal(pointTimestamp({ toMillis: () => 1000 }), 1000);
  assert.equal(pointTimestamp({ seconds: 1 }), 1000);
  assert.equal(pointTimestamp(new Date(1000)), 1000);
  assert.equal(pointTimestamp('bad-date'), null);
  assert.equal(pointTimestamp(null), null);
});
const users = [{ id: 'a', name: '학생' }, { id: 'b', name: '추천인' }];
const history = () => buildPointHistory(
  [{ id: '1', userId: 'a', delta: 100, before: 0, after: 100, reason: '이벤트', createdAt: new Date('2026-10-12T12:00:00') },
   { id: '2', userId: 'a', delta: -20, before: 100, after: 80, createdAt: new Date('2026-10-13T12:00:00') }],
  [{ id: '3', fromId: 'a', toId: 'b', amount: 30, createdAt: new Date('2026-10-12T12:00:00') }],
  [{ id: '4', userId: 'a', status: 'cancelled', creditsUsed: 40, creditsRefunded: true, createdAt: new Date('2026-10-12T12:00:00'), cancelledAt: new Date('2026-10-13T12:00:00') },
   { id: '5', userId: 'a', referralRewarded: true, referredBy: 'CODE' }], users);
test('지급·회수·선물·사용·반환·보상 여섯 유형 및 선물 중복 방지', () => {
  const entries = history();
  assert.equal(entries.length, 6);
  assert.deepEqual(new Set(entries.map(e => e.kind)), new Set(['grant', 'reclaim', 'gift', 'use', 'refund', 'reward']));
  assert.equal(entries.filter(e => e.kind === 'gift').length, 1);
  assert.equal(entries.find(e => e.kind === 'gift')?.otherUserId, 'b');
});
test('과거 미기록 수령인·일시·잔액을 임의 복원하지 않음', () => {
  const reward = history().find(e => e.kind === 'reward')!;
  assert.equal(reward.userId, '');
  assert.equal(reward.timestamp, null);
  assert.equal(reward.before, undefined);
});
test('입금 대기 주문은 차감만, 실제 반환 플래그 없으면 반환 표시하지 않음', () => {
  const entries = buildPointHistory([], [], [{ id: 'a', creditsUsed: 50, status: 'pending' }, { id: 'b', creditsUsed: 10, status: 'cancelled', creditsRefunded: false }], []);
  assert.deepEqual(entries.map(e => e.kind), ['use', 'use']);
});
test('새 추천 보상 수령인·금액·지급 일시 반영', () => {
  const entry = buildPointHistory([], [], [{ id: 'a', referralRewarded: true, referralRewardUserId: 'b', referralRewardAmount: 20000, referralRewardedAt: new Date(1000) }], users)[0];
  assert.equal(entry.userName, '추천인');
  assert.equal(entry.timestamp, 1000);
});
test('사용자 필터는 송·수신 모두 포함, 검색/유형/기간 필터 동작', () => {
  const base = { kind: 'all', search: '', userId: '', start: '', end: '' };
  assert.equal(filterPointHistory(history(), { ...base, userId: 'b' }).length, 1);
  assert.equal(filterPointHistory(history(), { ...base, kind: 'grant', search: '이벤트' }).length, 1);
  assert.equal(filterPointHistory(history(), { ...base, start: '2026-10-12', end: '2026-10-12' }).length, 3);
  assert.equal(filterPointHistory(history(), { ...base, search: '없음' }).length, 0);
});
test('잘못된 금액을 정상 로그로 표시하지 않음', () => {
  assert.equal(buildPointHistory([{ id: 'bad', delta: NaN }], [{ id: 'bad', amount: -1 }], [{ id: 'bad', creditsUsed: 0.5 }], []).length, 0);
});
