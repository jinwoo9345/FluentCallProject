/**
 * [Admin] Firebase Auth Custom Claim 동기화 엔드포인트
 *
 * 요청자(관리자)가 임의 유저의 role 을 Firebase Auth custom claim 에 반영한다.
 * Firestore 의 users.{uid}.role 과 Auth claim 을 일치시키기 위한 용도.
 *
 * 흐름:
 *  1) Authorization 헤더의 Firebase ID 토큰을 accounts:lookup 으로 검증 → caller uid 획득
 *  2) Firestore REST 로 users/{caller_uid}.role === 'admin' 확인
 *  3) Service Account 로 OAuth2 access token 발급
 *  4) Identity Toolkit accounts:update 로 customAttributes 설정
 *
 * 환경 변수:
 *  - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (서비스 계정)
 *  - FIREBASE_API_KEY (accounts:lookup 용 Web API 키)
 *  - FIREBASE_DATABASE_ID (선택, 기본 (default))
 */

interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  FIREBASE_API_KEY: string;
  FIREBASE_DATABASE_ID?: string;
}

const ALLOWED_ROLES = new Set(['student', 'tutor', 'admin']);

function b64url(buf: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof buf === 'string') bytes = new TextEncoder().encode(buf);
  else if (buf instanceof Uint8Array) bytes = buf;
  else bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function importPrivateKey(privateKey: string): Promise<CryptoKey> {
  const pem = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\s/g, '');
  const pkcs8 = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function getServiceAccountAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp: iat + 3600,
  };
  const header = { alg: 'RS256', typ: 'JWT' };
  const key = await importPrivateKey(privateKey);
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  );
  const assertion = `${unsigned}.${b64url(sig)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await res.json() as any;
  if (!res.ok || !data.access_token) {
    throw new Error(`access token 발급 실패: ${data.error || res.status}`);
  }
  return data.access_token as string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const projectId = (env.FIREBASE_PROJECT_ID || '').trim();
    const clientEmail = (env.FIREBASE_CLIENT_EMAIL || '').trim();
    const privateKey = (env.FIREBASE_PRIVATE_KEY || '').trim();
    const apiKey = (env.FIREBASE_API_KEY || '').trim();
    const databaseId = (env.FIREBASE_DATABASE_ID || '(default)').trim();

    if (!projectId || !clientEmail || !privateKey || !apiKey) {
      return new Response(JSON.stringify({ message: '서버 환경 변수가 부족합니다.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ message: '인증이 필요합니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const idToken = authHeader.slice('Bearer '.length).trim();

    const body = await request.json<{ targetUid?: string; role?: string }>()
      .catch(() => ({} as { targetUid?: string; role?: string }));
    const targetUid = (body.targetUid || '').trim();
    const role = (body.role || '').trim();
    if (!targetUid || !ALLOWED_ROLES.has(role)) {
      return new Response(JSON.stringify({ message: '요청 본문이 올바르지 않습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1) ID 토큰 검증 + caller uid 획득
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    const lookupData = await lookupRes.json() as any;
    if (!lookupRes.ok || !Array.isArray(lookupData.users) || lookupData.users.length === 0) {
      return new Response(JSON.stringify({ message: 'ID 토큰이 유효하지 않습니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const callerUid = lookupData.users[0].localId as string;

    // 2) Firestore REST 로 caller 의 role === 'admin' 검증 (호출자 ID 토큰으로 직접 인증)
    const callerDocRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/users/${encodeURIComponent(callerUid)}`,
      { headers: { Authorization: `Bearer ${idToken}` } }
    );
    if (!callerDocRes.ok) {
      return new Response(JSON.stringify({ message: '권한 정보를 조회할 수 없습니다.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const callerDoc = await callerDocRes.json() as any;
    const callerRole = callerDoc?.fields?.role?.stringValue;
    if (callerRole !== 'admin') {
      return new Response(JSON.stringify({ message: '관리자 권한이 필요합니다.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3) 서비스 계정 access token 발급
    const accessToken = await getServiceAccountAccessToken(clientEmail, privateKey);

    // 4) Identity Toolkit accounts:update 로 customAttributes 설정
    const updateRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts:update`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          localId: targetUid,
          customAttributes: JSON.stringify({ role }),
        }),
      }
    );
    const updateData = await updateRes.json() as any;
    if (!updateRes.ok) {
      return new Response(JSON.stringify({
        message: 'custom claim 업데이트 실패',
        detail: updateData,
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true, uid: targetUid, role }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[set-user-role]', error?.message || error);
    return new Response(JSON.stringify({ message: '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
