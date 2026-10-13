import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectPointBalance, POINT_UNAVAILABLE_MESSAGE } from '../src/lib/pointBalance';

test('정상 잔액 및 기존 누락 필드는 포인트 사용 상태 유지', () => {
  for (const value of [0, 1, 20000, 179000, Number.MAX_SAFE_INTEGER, undefined, null]) {
    const state = inspectPointBalance(value);
    assert.equal(state.valid, true);
    assert.equal(state.balance, value ?? 0);
    assert.equal(state.warning, '');
  }
});
test('음수·문자열·소수·안전한 정수 초과는 사용 불가 안내와 할인 0', () => {
  for (const value of [-1, '20000', 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, {}, true]) {
    const state = inspectPointBalance(value);
    assert.equal(state.valid, false);
    assert.equal(state.balance, 0);
    assert.equal(state.warning, POINT_UNAVAILABLE_MESSAGE);
    assert.match(state.warning, /포인트 사용 불가/);
    assert.match(state.warning, /관리자/);
    assert.match(state.warning, /포인트 없이 결제/);
  }
});
