/**
 * [Kakao Auth Handler]
 * Exchanges a Kakao Authorization Code for a Firebase Custom Token.
 */

async function createCustomToken(uid: string, clientEmail: string, privateKey: string) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000) - 30;
  const exp = iat + 3600;
  
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat,
    exp,
    uid: String(uid)
  };

  const toB64Url = (buf: ArrayBuffer | string) => {
    const encoder = new TextEncoder();
    const data = typeof buf === 'string' ? encoder.encode(buf) : new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < data.byteLength; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const part1 = toB64Url(JSON.stringify(header));
  const part2 = toB64Url(JSON.stringify(payload));
  const unsignedToken = `${part1}.${part2}`;

  const pem = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");
    
  try {
    const key = await crypto.subtle.importKey(
      "pkcs8", 
      Uint8Array.from(atob(pem), c => c.charCodeAt(0)),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, 
      false, 
      ["sign"]
    );
    
    const sig = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5", 
      key, 
      new TextEncoder().encode(unsignedToken)
    );
    
    return `${unsignedToken}.${toB64Url(sig)}`;
  } catch (e: any) {
    throw new Error(`서명 실패: ${e.message}`);
  }
}

export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  try {
    const clientEmail = (env.FIREBASE_CLIENT_EMAIL || "").trim();
    const privateKey = (env.FIREBASE_PRIVATE_KEY || "").trim();
    const kakaoRestKey = (env.KAKAO_REST_API_KEY || "").trim();
    const projectId = (env.FIREBASE_PROJECT_ID || "").trim();

    if (!clientEmail || !privateKey || !kakaoRestKey) {
      return new Response(JSON.stringify({ message: '설정 오류', detail: '환경 변수가 부족합니다.' }), { status: 500 });
    }

    const { code, redirectUri: clientRedirectUri } = await request.json() as any;
    const origin = new URL(request.url).origin;
    const redirectUri = clientRedirectUri || `${origin}/dashboard`;

    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: kakaoRestKey,
        redirect_uri: redirectUri,
        code,
      }),
    });

    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) return new Response(JSON.stringify({ message: '카카오 인증 실패' }), { status: 400 });

    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json() as any;
    const uid = `kakao:${userData.id}`;

    const customToken = await createCustomToken(uid, clientEmail, privateKey);

    return new Response(JSON.stringify({
      customToken,
      userName: userData.kakao_account?.profile?.nickname,
      debug: { iss: clientEmail, projectId }
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ message: '서버 오류', detail: error.message }), { status: 500 });
  }
};
