export const POINT_UNAVAILABLE_MESSAGE = '포인트 사용 불가 — 잔액 확인이 필요합니다. 관리자에게 문의해주세요. 포인트 없이 결제할 수 있습니다.';

export function inspectPointBalance(value: unknown) {
  const n = value ?? 0;
  const valid = typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
  return { valid, balance: valid ? n as number : 0, warning: valid ? '' : POINT_UNAVAILABLE_MESSAGE };
}
