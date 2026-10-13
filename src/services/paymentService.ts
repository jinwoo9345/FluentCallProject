import { auth } from '../firebase';

export class PaymentApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function paymentApi(path: string, body: Record<string, unknown>): Promise<any> {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');
  const token = await user.getIdToken();
  const response = await fetch(path, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new PaymentApiError(data.message || '처리를 완료하지 못했습니다. 잠시 후 다시 확인해주세요.', response.status);
  return data;
}
const key = () => `eb.pendingPayments.${auth.currentUser?.uid || ''}`;
function pending(): string[] {
  try { const ids = JSON.parse(localStorage.getItem(key()) || '[]'); return Array.isArray(ids) ? ids.filter(id => typeof id === 'string').slice(-20) : []; }
  catch { return []; }
}
export function rememberPayment(orderId: string) {
  try { localStorage.setItem(key(), JSON.stringify([...new Set([...pending(), orderId])].slice(-20))); } catch {}
}
export function forgetPayment(orderId: string) {
  try { localStorage.setItem(key(), JSON.stringify(pending().filter(id => id !== orderId))); } catch {}
}
export async function recoverPayments() {
  if (window.location.pathname.startsWith('/payment/')) return { ok: true, results: [] };
  // Never cancel a live redirect merely because the window gains focus.
  const result = await paymentApi('/api/payments/recover', {});
  for (const order of result.results || []) if (['cancelled', 'completed'].includes(order.status)) forgetPayment(order.orderId);
  return result;
}
