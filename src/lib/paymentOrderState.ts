export type PaymentOrderAction = 'completed' | 'bank_pending' | 'toss_pending' | 'cancelled' | 'waiting';

// 입금 안내는 실제 무통장 대기 주문에만 제공한다. 응답 순서나 선택된 탭을 신뢰하지 않는다.
export function paymentOrderAction(order: { status?: string; paymentMethod?: string }): PaymentOrderAction {
  if (order.status === 'completed') return 'completed';
  if (order.status === 'cancelled' || order.status === 'failed') return 'cancelled';
  if (order.status !== 'pending') return 'waiting';
  if (order.paymentMethod === 'manual_bank_transfer') return 'bank_pending';
  if (order.paymentMethod === 'toss_widget') return 'toss_pending';
  return 'waiting';
}
