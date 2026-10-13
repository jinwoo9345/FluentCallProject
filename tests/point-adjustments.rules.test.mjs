// 로컬 Firestore emulator 전용. 실제 프로젝트로 연결하지 않는다.
// java -jar <firestore-emulator.jar> --host 127.0.0.1 --port 8089 --project_id demo-point-audit --rules firestore.rules
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
const project = 'demo-point-audit';
const base = `http://127.0.0.1:8089/v1/projects/${project}/databases/(default)/documents`;
const resource = path => `projects/${project}/databases/(default)/documents/${path}`;
const fields = data => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, typeof value === 'number' ? { integerValue: String(value) } : { stringValue: value }]));
function token(uid) {
  const now = Math.floor(Date.now() / 1000);
  const encode = data => Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ aud: project, iss: `https://securetoken.google.com/${project}`, sub: uid, user_id: uid, iat: now, exp: now + 3600, firebase: { sign_in_provider: 'custom', identities: {} } })}.`;
}
async function api(path, method, body, auth = 'owner') {
  return fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
before(async () => {
  for (const id of ['valid', 'reclaim']) await api(`/point_adjustments/${id}`, 'DELETE');
  for (const [uid, role] of [['admin', 'admin'], ['student', 'student'], ['target', 'student']]) {
    const res = await api(`/users/${uid}`, 'PATCH', { fields: fields({ role, credits: 100, name: uid }) });
    assert.equal(res.status, 200, await res.text());
  }
});
const adjustment = (id, overrides = {}) => ({
  update: { name: resource(`point_adjustments/${id}`), fields: fields({ userId: 'target', userName: 'target', adminId: 'admin', adminName: 'admin', delta: 10, before: 100, after: 110, reason: 'test', ...overrides }) },
  updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
});
const change = (credits) => ({ update: { name: resource('users/target'), fields: fields({ credits }) }, updateMask: { fieldPaths: ['credits'] } });
test('관리자는 잔액 변경+로그를 원자적으로 생성 가능', async () => {
  const res = await api(':commit', 'POST', { writes: [change(110), adjustment('valid')] }, token('admin'));
  assert.equal(res.status, 200, await res.text());
});
test('관리자는 로그 읽기 가능', async () => {
  const res = await api('/point_adjustments/valid', 'GET', null, token('admin'));
  assert.equal(res.status, 200, await res.text());
});
test('일반 회원/비로그인 로그 읽기 거부', async () => {
  for (const auth of [token('student'), null]) {
    const res = await api('/point_adjustments/valid', 'GET', null, auth);
    assert.equal(res.status, 403);
  }
});
test('일반 회원의 관리자 로그 생성 거부', async () => {
  const res = await api(':commit', 'POST', { writes: [adjustment('forged', { adminId: 'student', before: 110, after: 120 })] }, token('student'));
  assert.equal(res.status, 403);
});
test('잔액 변경 없는 단독 로그 생성 거부', async () => {
  const res = await api(':commit', 'POST', { writes: [adjustment('standalone', { before: 110, after: 120 })] }, token('admin'));
  assert.equal(res.status, 403);
});
test('조작된 잔액/사유/처리자 로그 거부 및 잔액 롤백', async () => {
  for (const patch of [{ before: 100, after: 110 }, { delta: 20 }, { reason: '' }, { adminId: 'student' }, { delta: 0 }, { after: -1 }]) {
    const res = await api(':commit', 'POST', { writes: [change(120), adjustment(`bad-${Math.random()}`, { before: 110, after: 120, ...patch })] }, token('admin'));
    assert.equal(res.status, 403, await res.text());
    const doc = await (await api('/users/target', 'GET')).json();
    assert.equal(doc.fields.credits.integerValue, '110');
  }
});
test('관리자도 저장된 로그 수정/삭제 불가', async () => {
  const update = await api('/point_adjustments/valid?updateMask.fieldPaths=reason', 'PATCH', { fields: fields({ reason: 'tampered' }) }, token('admin'));
  assert.equal(update.status, 403, await update.text());
  const remove = await api('/point_adjustments/valid', 'DELETE', null, token('admin'));
  assert.equal(remove.status, 403);
});
test('잔액 전액 회수는 사용자별 트랜잭션으로 가능', async () => {
  const res = await api(':commit', 'POST', { writes: [change(0), adjustment('reclaim', { delta: -110, before: 110, after: 0 })] }, token('admin'));
  assert.equal(res.status, 200, await res.text());
});
test('회원은 본인/타인 잔액 직접 증감 불가', async () => {
  for (const uid of ['student', 'target']) for (const credits of [0, 10000]) {
    const res = await api(`/users/${uid}?updateMask.fieldPaths=credits`, 'PATCH', { fields: fields({ credits }) }, token('student'));
    assert.equal(res.status, 403, await res.text());
  }
});
test('회원은 서버 결제/선물/원장 위조 불가', async () => {
  for (const collection of ['payments', 'point_transfers', 'point_ledger']) {
    const res = await api(`/${collection}/forged`, 'PATCH', { fields: fields({ userId: 'student', fromId: 'student', toId: 'target', amount: 100 }) }, token('student'));
    assert.equal(res.status, 403, await res.text());
  }
});
test('관리자도 신규 서버 주문의 금액/상태 및 원장 직접 변경 불가', async () => {
  await api('/payments/serverorder', 'PATCH', { fields: fields({ flowVersion: 2, userId: 'student', amount: 100, status: 'pending' }) });
  await api('/point_ledger/serverentry', 'PATCH', { fields: fields({ userId: 'student', amount: 100 }) });
  for (const [key, value] of [['amount', 1], ['status', 'completed'], ['flowVersion', 1]]) {
    const res = await api(`/payments/serverorder?updateMask.fieldPaths=${key}`, 'PATCH', { fields: fields({ [key]: value }) }, token('admin'));
    assert.equal(res.status, 403, await res.text());
  }
  for (const method of ['PATCH', 'DELETE']) {
    const res = await api('/point_ledger/serverentry', method, method === 'PATCH' ? { fields: fields({ amount: 1 }) } : null, token('admin'));
    assert.equal(res.status, 403, await res.text());
  }
  const read = await api('/point_ledger/serverentry', 'GET', null, token('admin'));
  assert.equal(read.status, 200);
});
test('기존 프로필 변경과 기존 관리자 주문 처리는 유지', async () => {
  const profile = await api('/users/student?updateMask.fieldPaths=name', 'PATCH', { fields: fields({ name: '변경' }) }, token('student'));
  assert.equal(profile.status, 200, await profile.text());
  await api('/payments/legacyorder', 'PATCH', { fields: fields({ userId: 'student', status: 'pending', amount: 100 }) });
  const approve = await api('/payments/legacyorder?updateMask.fieldPaths=status', 'PATCH', { fields: fields({ status: 'completed' }) }, token('admin'));
  assert.equal(approve.status, 200, await approve.text());
});
