import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentOrderAction } from '../src/lib/paymentOrderState';

test('무통장 pending만 입금 안내 허용', () => {
  assert.equal(paymentOrderAction({ status: 'pending', paymentMethod: 'manual_bank_transfer' }), 'bank_pending');
});
test('취소/실패 주문은 결제수단과 무관하게 새 주문 안내', () => {
  for (const status of ['cancelled', 'failed']) for (const paymentMethod of ['manual_bank_transfer', 'toss_widget', 'points']) {
    assert.equal(paymentOrderAction({ status, paymentMethod }), 'cancelled');
  }
});
test('승인/취소 확인 중 및 알 수 없는 상태는 입금 안내 금지', () => {
  for (const status of ['confirming', 'cancelling', 'unknown', undefined]) {
    assert.equal(paymentOrderAction({ status, paymentMethod: 'manual_bank_transfer' }), 'waiting');
  }
  assert.equal(paymentOrderAction({ status: 'pending', paymentMethod: 'unknown' }), 'waiting');
});
test('전액 포인트/무통장 완료 주문은 완료 안내', () => {
  for (const paymentMethod of ['points', 'manual_bank_transfer']) {
    assert.equal(paymentOrderAction({ status: 'completed', paymentMethod }), 'completed');
  }
});
test('카드 대기 주문은 무통장 안내와 구분', () => {
  assert.equal(paymentOrderAction({ status: 'pending', paymentMethod: 'toss_widget' }), 'toss_pending');
});
