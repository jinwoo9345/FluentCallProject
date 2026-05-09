/**
 * [EB-app SSO Token Bridge]
 * 메인 사이트 Firebase ID Token 검증 → 관리자 권한 확인 → EB-app용 Custom Token 발급
 *
 * 흐름:
 *  1. 클라이언트(메인 사이트 AdminDashboard)가 본인 idToken 전송
 *  2. Google JWKS로 서명 검증 (메인 프로젝트)
 *  3. Firestore REST에서 /users/{uid}.role === 'admin' 확인 (본인 토큰으로)
 *  4. EB-app 프로젝트 서비스 계정으로 Custom Token 서명 (claims: { role: 'admin' })
 *  5. 토큰 반환 → 클라이언트가 EB-app URL fragment로 전달
 */

interface Env {
  FIREBASE_PROJECT_ID: string;          // 메인 사이트 프로젝트 ID (기존)
  VITE_FIREBASE_DATABASE_ID: string;    // 메인 사이트 Firestore DB ID (기존)
  EB_APP_FIREBASE_PROJECT_ID: string;   // EB-app 프로젝트 ID (신규)
  EB_APP_FIREBASE_CLIENT_EMAIL: string; // EB-app 서비스 계정 이메일 (신규)
  EB_APP_FIREBASE_PRIVATE_KEY: string;  // EB-app 서비스 계정 비공개 키 (신규)
}

// Firebase JWK endpoint (JWK 형식이라 importKey('jwk') 가능)
const FIREBASE_JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

// JWKS 1시간 캐시 (rate limit 방지). Cloudflare Worker isolate 단위 캐시.
let jwksCache: { keys: any[]; expiresAt: number } | null = null;

// ---------- helpers ----------

function base64UrlDecode(input: string): Uint8Array {
  let s = input.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const binary = atob(s);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function base64UrlDecodeJson(input: string): any {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(input)));
}

function toBase64Url(buf: ArrayBuffer | Uint8Array | string): string {
  const data =
    typeof buf === 'string'
      ? new TextEncoder().encode(buf)
      : buf instanceof Uint8Array
      ? buf
      : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < data.byteLength; i++) binary += String.fromCharCode(data[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ---------- ID token verification ----------

async function fetchFirebaseJWKs(): Promise<any[]> {
  const now = Date.now();
  if (jwksCache && jwksCache.expiresAt > now) return jwksCache.keys;
  const res = await fetch(FIREBASE_JWK_URL);
  if (!res.ok) throw new Error('JWKS fetch failed');
  const data = (await res.json()) as { keys: any[] };
  jwksCache = { keys: data.keys, expiresAt: now + 60 * 60 * 1000 };
  return data.keys;
}

async function verifyIdToken(
  idToken: string,
  expectedProjectId: string
): Promise<{ uid: string; email?: string }> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = base64UrlDecodeJson(headerB64);
  const payload = base64UrlDecodeJson(payloadB64);

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < now) throw new Error('Token expired');
  if (typeof payload.iat !== 'number' || payload.iat > now + 60) throw new Error('Token iat invalid');
  if (payload.aud !== expectedProjectId) throw new Error('Invalid audience');
  if (payload.iss !== `https://securetoken.google.com/${expectedProjectId}`) throw new Error('Invalid issuer');
  if (!payload.sub || typeof payload.sub !== 'string') throw new Error('Missing subject');
  if (header.alg !== 'RS256') throw new Error('Unsupported algorithm');

  const keys = await fetchFirebaseJWKs();
  const jwk = keys.find((k: any) => k.kid === header.kid);
  if (!jwk) throw new Error('Unknown key ID');

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    base64UrlDecode(signatureB64),
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  );
  if (!ok) throw new Error('Invalid signature');

  return { uid: payload.sub, email: payload.email };
}

// ---------- admin role check via Firestore REST ----------

async function getUserRole(
  uid: string,
  idToken: string,
  projectId: string,
  databaseId: string
): Promise<string | null> {
  const dbId = databaseId && databaseId !== '(default)' ? databaseId : '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/users/${uid}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore read failed: ${res.status}`);
  const data = (await res.json()) as any;
  return data?.fields?.role?.stringValue ?? null;
}

// ---------- custom token signing for EB-app ----------

async function createEbAppCustomToken(
  uid: string,
  email: string | undefined,
  ebAppRole: 'admin' | 'instructor',
  clientEmail: string,
  privateKey: string
): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000) - 30;
  const exp = iat + 3600;

  const payload: Record<string, any> = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat,
    exp,
    uid: String(uid),
    claims: {
      role: ebAppRole,
      ...(email ? { email } : {})
    }
  };

  const headerB64 = toBase64Url(JSON.stringify(header));
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const unsigned = `${headerB64}.${payloadB64}`;

  const pem = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\s/g, '');

  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  );

  return `${unsigned}.${toBase64Url(sig)}`;
}

// ---------- handler ----------

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const mainProjectId = (env.FIREBASE_PROJECT_ID || '').trim();
    const mainDbId = (env.VITE_FIREBASE_DATABASE_ID || '(default)').trim();
    const ebAppProjectId = (env.EB_APP_FIREBASE_PROJECT_ID || '').trim();
    const ebAppClientEmail = (env.EB_APP_FIREBASE_CLIENT_EMAIL || '').trim();
    const ebAppPrivateKey = (env.EB_APP_FIREBASE_PRIVATE_KEY || '').trim();

    if (!mainProjectId || !ebAppProjectId || !ebAppClientEmail || !ebAppPrivateKey) {
      return new Response(JSON.stringify({ message: '서버 설정 오류' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = (await request.json().catch(() => ({}))) as { idToken?: string };
    if (!body?.idToken) {
      return new Response(JSON.stringify({ message: 'idToken이 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. ID 토큰 검증
    const { uid, email } = await verifyIdToken(body.idToken, mainProjectId);

    // 2. Firestore에서 권한 확인 (본인 토큰 사용 → 규칙상 본인 doc은 읽기 허용)
    //    메인 사이트의 'admin' / 'tutor'만 EB-app 진입 허용. 'student' 등은 차단.
    const role = await getUserRole(uid, body.idToken, mainProjectId, mainDbId);
    if (role !== 'admin' && role !== 'tutor') {
      return new Response(JSON.stringify({ message: 'EB-app 접근 권한이 없습니다.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. EB-app용 Custom Token 발급 — 메인 'tutor' → EB-app 'instructor'로 매핑
    const ebAppRole: 'admin' | 'instructor' = role === 'admin' ? 'admin' : 'instructor';
    const ebAppToken = await createEbAppCustomToken(uid, email, ebAppRole, ebAppClientEmail, ebAppPrivateKey);

    return new Response(JSON.stringify({ ebAppToken, ebAppProjectId }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error: any) {
    console.error('[eb-app-sso]', error?.message || error);
    return new Response(JSON.stringify({ message: 'SSO 토큰 발급 실패' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
