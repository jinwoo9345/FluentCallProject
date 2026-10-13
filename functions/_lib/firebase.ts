export interface MoneyEnv {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  FIREBASE_API_KEY: string;
  FIREBASE_DATABASE_ID?: string;
  TOSS_SECRET_KEY?: string;
}
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export async function endpoint(action: () => Promise<unknown>) {
  try { return json(await action()); }
  catch (error) {
    console.error('[money-api]', error instanceof Error ? error.message : 'unknown');
    return json({ message: error instanceof ApiError ? error.message : '처리를 완료하지 못했습니다. 같은 주문으로 다시 확인해주세요.' }, error instanceof ApiError ? error.status : 503);
  }
}
const encode64 = (value: string | Uint8Array) => {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};
export async function serviceToken(env: MoneyEnv) {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) throw new ApiError(503, 'Firebase 서버 설정이 필요합니다.');
  const pem = env.FIREBASE_PRIVATE_KEY.replace(/-----[^-]+-----/g, '').replace(/\\n/g, '').replace(/\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encode64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${encode64(JSON.stringify({ iss: env.FIREBASE_CLIENT_EMAIL, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', signal: AbortSignal.timeout(15000), body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${encode64(new Uint8Array(signature))}` }) });
  const data: any = await res.json();
  if (!res.ok || !data.access_token) throw new ApiError(503, 'Firebase 서버 인증에 실패했습니다.');
  return data.access_token as string;
}
export function encodeValue(value: any): any {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  return { mapValue: { fields: encodeFields(value) } };
}
export const encodeFields = (data: Record<string, any>) => Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined).map(([k, v]) => [k, encodeValue(v)]));
function decodeValue(v: any): any {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return null;
}
export const decodeFields = (fields: Record<string, any>) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]));

export class Store {
  readonly root: string;
  constructor(env: MoneyEnv, private token: string) {
    this.root = `projects/${env.FIREBASE_PROJECT_ID}/databases/${env.FIREBASE_DATABASE_ID || '(default)'}/documents`;
  }
  name(path: string) { return `${this.root}/${path}`; }
  async call(suffix: string, body?: any): Promise<any> {
    const res = await fetch(`https://firestore.googleapis.com/v1/${this.root}${suffix}`, { method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data: any = await res.json();
    if (!res.ok) {
      if (res.status === 404) return null;
      if (res.status === 409 || data.error?.status === 'ABORTED') throw new ApiError(409, '동시 처리 충돌. 다시 시도해주세요.');
      throw new ApiError(503, '저장소 처리에 실패했습니다.');
    }
    return data;
  }
  async get(path: string) {
    const data = await this.call(`/${path.split('/').map(encodeURIComponent).join('/')}`);
    return data ? decodeFields(data.fields || {}) : null;
  }
  async transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { transaction } = await this.call(':beginTransaction', { options: { readWrite: {} } });
      const tx = new Transaction(this, transaction);
      try {
        const result = await work(tx);
        await this.call(':commit', { transaction, writes: tx.writes });
        return result;
      } catch (error) {
        await this.call(':rollback', { transaction }).catch(() => {});
        if (error instanceof ApiError && error.status === 409 && attempt < 4) continue;
        throw error;
      }
    }
    throw new ApiError(409, '잠시 후 다시 시도해주세요.');
  }
  async userOrders(uid: string) {
    const result = await this.call(':runQuery', { structuredQuery: { from: [{ collectionId: 'payments' }], where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: uid } } } } });
    return result.filter((r: any) => r.document).map((r: any) => ({ ...decodeFields(r.document.fields), id: r.document.name.split('/').pop() }));
  }
}
export class Transaction {
  writes: any[] = [];
  private cache = new Map<string, any>();
  constructor(private store: Store, private token: string) {}
  async get(path: string) {
    if (this.writes.length) throw new Error('Transactions must read before writing');
    if (!this.cache.has(path)) {
      const response = await this.store.call(':batchGet', { documents: [this.store.name(path)], transaction: this.token });
      const result = response.find((r: any) => r.found || r.missing);
      this.cache.set(path, result?.found ? decodeFields(result.found.fields || {}) : null);
    }
    return this.cache.get(path);
  }
  set(path: string, data: any) { this.writes.push({ update: { name: this.store.name(path), fields: encodeFields(data) } }); }
  update(path: string, data: any) { this.writes.push({ update: { name: this.store.name(path), fields: encodeFields(data) }, updateMask: { fieldPaths: Object.keys(data) }, currentDocument: { exists: true } }); }
}
export async function authenticate(request: Request, env: MoneyEnv) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ') || !header.slice(7).trim()) throw new ApiError(401, '로그인이 필요합니다.');
  if (!env.FIREBASE_API_KEY) throw new ApiError(503, 'Firebase 인증 설정이 필요합니다.');
  const idToken = header.slice(7).trim();
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`, { method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
  const data: any = await res.json();
  if (!res.ok || !data.users?.[0]?.localId) throw new ApiError(401, '인증이 만료되었거나 유효하지 않습니다.');
  const uid = data.users[0].localId as string;
  if (uid.includes('/')) throw new ApiError(401, '유효하지 않은 사용자입니다.');
  // 해당 프로젝트의 ID 토큰인지 Firestore 사용자 조회로도 확인한다.
  const callerStore = new Store(env, idToken);
  const user = await callerStore.get(`users/${uid}`);
  if (!user) throw new ApiError(403, '사용자 정보를 찾을 수 없습니다.');
  return { uid, user, verified: data.users[0].emailVerified === true, store: new Store(env, await serviceToken(env)) };
}
export function requireVerified(caller: Awaited<ReturnType<typeof authenticate>>) {
  if (caller.user.emailVerificationRequired === true && !caller.verified) throw new ApiError(403, '이메일 인증 후 이용할 수 있습니다.');
}
