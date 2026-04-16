/**
 * [Kakao Auth Handler]
 * Exchanges a Kakao Authorization Code for a Firebase Custom Token.
 */

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

  const pemContents = privateKey.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey("pkcs8", binaryDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedToken));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${unsignedToken}.${encodedSignature}`;
}

export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  try {
    const { code, redirectUri: clientRedirectUri } = await request.json() as any;
    const origin = new URL(request.url).origin;
    const redirectUri = clientRedirectUri || `${origin}/dashboard`;

    // 1. 인가 코드를 액세스 토큰으로 교환
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: env.KAKAO_REST_API_KEY,
        redirect_uri: redirectUri,
        code,
      }),
    });

    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) {
      return new Response(JSON.stringify({ 
        message: '카카오 토큰 교환 실패',
        detail: tokenData.error_description || tokenData.error,
        errorCode: tokenData.error_code,
        sentRedirectUri: redirectUri // 디버깅을 위해 보낸 URI 포함
      }), { status: 400 });
    }

    // 2. 카카오 사용자 정보 가져오기
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json() as any;
    const uid = `kakao:${userData.id}`;

    // 3. Firebase Custom Token 생성
    const customToken = await createCustomToken(uid, env.FIREBASE_CLIENT_EMAIL, env.FIREBASE_PRIVATE_KEY);

    return new Response(JSON.stringify({ customToken }));

  } catch (error: any) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
};
