/**
 * [Kakao Auth Handler]
 * Exchanges a Kakao Access Token for a Firebase Custom Token.
 * Requires FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID 
 * to be set in Cloudflare Environment Variables.
 */

// Simple JWT generation for Cloudflare Workers (without heavy node-jose)
async function createCustomToken(uid: string, clientEmail: string, privateKey: string) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://identitytoolkit.googleapis.com/google.firebase.auth.v1.CustomTokenAudience',
    iat: now,
    exp: now + 3600,
    uid: uid,
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '');
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Cloudflare Workers Web Crypto API for RSA signing
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${unsignedToken}.${encodedSignature}`;
}

export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  try {
    const { accessToken } = await request.json() as any;
    
    // 1. 카카오 사용자 정보 가져오기
    const kakaoUserRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const kakaoUser = await kakaoUserRes.json() as any;

    if (!kakaoUser.id) {
      return new Response(JSON.stringify({ message: '카카오 인증 실패' }), { status: 401 });
    }

    const uid = `kakao:${kakaoUser.id}`;
    
    // 2. Cloudflare 환경 변수에서 서비스 계정 정보 읽기
    const clientEmail = env.FIREBASE_CLIENT_EMAIL;
    const privateKey = env.FIREBASE_PRIVATE_KEY; // "\n" 포함된 원본 문자열이어야 함

    if (!clientEmail || !privateKey) {
      return new Response(JSON.stringify({ message: '서버 설정(Service Account)이 누락되었습니다.' }), { status: 500 });
    }

    // 3. Custom Token 생성
    const customToken = await createCustomToken(uid, clientEmail, privateKey);

    return new Response(JSON.stringify({ customToken }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
};
