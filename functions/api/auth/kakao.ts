/**
 * [Kakao Auth Handler]
 * Exchanges a Kakao Authorization Code for a Firebase Custom Token.
 */

async function createCustomToken(uid: string, clientEmail: string, privateKey: string) {
  const keyStr = String(privateKey || "");
  if (!keyStr || keyStr.length < 10) {
    throw new Error('FIREBASE_PRIVATE_KEY is invalid or missing');
  }
  
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

  const base64UrlEncode = (str: string) => {
    const bytes = new TextEncoder().encode(str);
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const pemContents = keyStr
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
    
  try {
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("pkcs8", binaryDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedToken));
    
    const signatureBytes = new Uint8Array(signature);
    const encodedSignature = btoa(String.fromCharCode(...signatureBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return `${unsignedToken}.${encodedSignature}`;
  } catch (e: any) {
    throw new Error(`토큰 서명 실패: ${e.message}`);
  }
}

export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  try {
    // 모든 환경 변수 앞뒤 공백 제거 (매우 중요)
    const clientEmail = (env.FIREBASE_CLIENT_EMAIL || "").trim();
    const privateKey = (env.FIREBASE_PRIVATE_KEY || "").trim();
    const kakaoRestKey = (env.KAKAO_REST_API_KEY || "").trim();
    const projectId = (env.FIREBASE_PROJECT_ID || "").trim();

    const envKeys = Object.keys(env);
    const missingKeys = [];
    if (!clientEmail) missingKeys.push('FIREBASE_CLIENT_EMAIL');
    if (!privateKey) missingKeys.push('FIREBASE_PRIVATE_KEY');
    if (!kakaoRestKey) missingKeys.push('KAKAO_REST_API_KEY');

    if (missingKeys.length > 0) {
      return new Response(JSON.stringify({ 
        message: '서버 환경 변수 설정 오류',
        detail: `${missingKeys.join(', ')} 변수가 비어있습니다.`,
        availableKeys: envKeys
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // [보안/정합성 체크] 서비스 계정 이메일에 프로젝트 ID가 포함되어 있는지 확인
    if (projectId && !clientEmail.includes(projectId)) {
      console.warn('[Project ID Mismatch]', { projectId, clientEmail });
      // 차단하지는 않되 로그를 남김
    }

    const body = await request.json() as any;
    const { code, redirectUri: clientRedirectUri } = body;
    const origin = new URL(request.url).origin;
    const redirectUri = clientRedirectUri || `${origin}/dashboard`;

    // 1. 인가 코드를 액세스 토큰으로 교환
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
        message: '카카오 토큰 교환 실패',
        detail: tokenData.error_description || tokenData.error,
        errorCode: tokenData.error_code
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. 카카오 사용자 정보 가져오기
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json() as any;
    if (!userData.id) throw new Error('카카오 사용자 정보 획득 실패');
    
    const uid = `kakao:${userData.id}`;

    // 3. Firebase Custom Token 생성
    const customToken = await createCustomToken(uid, clientEmail, privateKey);

    return new Response(JSON.stringify({ 
      customToken,
      userName: userData.kakao_account?.profile?.nickname,
      userPhoto: userData.kakao_account?.profile?.profile_image_url,
      debug: { // 디버깅용 (문제 해결 후 삭제 권장)
        iss: clientEmail,
        uid: uid
      }
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[Backend Error]', error);
    return new Response(JSON.stringify({ 
      message: '서버 내부 오류',
      detail: error.message 
    }), { status: 500 });
  }
};
