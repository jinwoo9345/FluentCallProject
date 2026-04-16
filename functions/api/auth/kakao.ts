/**
 * [Kakao Auth Handler]
 * Exchanges a Kakao Authorization Code for a Firebase Custom Token.
 */

async function createCustomToken(uid: string, clientEmail: string, privateKey: string) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000) - 30; // 30초 여유
  const exp = iat + 3600;
  
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://identitytoolkit.googleapis.com/google.firebase.auth.v1.CustomTokenAudience',
    iat,
    exp,
    uid: String(uid)
  };

  const stringToBase64Url = (str: string) => {
    const b64 = btoa(unescape(encodeURIComponent(str)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const arrayBufferToBase64Url = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const encodedHeader = stringToBase64Url(JSON.stringify(header));
  const encodedPayload = stringToBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");
    
  try {
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
    
    const encodedSignature = arrayBufferToBase64Url(signature);
    return `${unsignedToken}.${encodedSignature}`;
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

    const envKeys = Object.keys(env);
    if (!clientEmail || !privateKey || !kakaoRestKey) {
      return new Response(JSON.stringify({ 
        message: '환경 변수 누락',
        detail: '필수 환경 변수가 설정되지 않았습니다.',
        availableKeys: envKeys
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await request.json() as any;
    const { code, redirectUri: clientRedirectUri } = body;
    const origin = new URL(request.url).origin;
    const redirectUri = clientRedirectUri || `${origin}/dashboard`;

    // 1. 카카오 토큰 교환
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
    if (!tokenData.access_token) {
      return new Response(JSON.stringify({ 
        message: '카카오 인증 실패', 
        detail: tokenData.error_description 
      }), { status: 400 });
    }

    // 2. 카카오 사용자 정보
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json() as any;
    const uid = `kakao:${userData.id}`;

    // 3. 토큰 생성
    const customToken = await createCustomToken(uid, clientEmail, privateKey);

    return new Response(JSON.stringify({ 
      customToken,
      userName: userData.kakao_account?.profile?.nickname,
      userPhoto: userData.kakao_account?.profile?.profile_image_url,
      debug: { iss: clientEmail, projectId }
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ message: '서버 오류', detail: error.message }), { status: 500 });
  }
};
