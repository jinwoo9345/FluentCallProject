/**
 * [Kakao Auth Handler]
 * Exchanges a Kakao Authorization Code for a Firebase Custom Token.
 */

async function createCustomToken(uid: string, clientEmail: string, privateKey: string, privateKeyId?: string) {
  const keyStr = String(privateKey || "");
  if (!keyStr || keyStr.length < 10) {
    throw new Error('FIREBASE_PRIVATE_KEY is invalid or missing');
  }
  
  // Header에 kid 추가 (Firebase 검증에 필수적일 수 있음)
  const header: any = { alg: 'RS256', typ: 'JWT' };
  if (privateKeyId) {
    header.kid = privateKeyId;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://identitytoolkit.googleapis.com/google.firebase.auth.v1.CustomTokenAudience',
    iat: now,
    exp: now + 3600,
    uid: uid,
  };

  const base64UrlEncode = (uint8array: Uint8Array) => {
    const base64 = btoa(Array.from(uint8array).map(b => String.fromCharCode(b)).join(''));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const encoder = new TextEncoder();
  const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const pemContents = keyStr
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
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
      encoder.encode(unsignedToken)
    );
    
    const encodedSignature = base64UrlEncode(new Uint8Array(signature));
    return `${unsignedToken}.${encodedSignature}`;
  } catch (e: any) {
    throw new Error(`토큰 서명 실패: ${e.message}`);
  }
}

export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  try {
    const clientEmail = (env.FIREBASE_CLIENT_EMAIL || "").trim();
    const privateKey = (env.FIREBASE_PRIVATE_KEY || "").trim();
    const privateKeyId = (env.FIREBASE_PRIVATE_KEY_ID || "").trim();
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
    const customToken = await createCustomToken(uid, clientEmail, privateKey, privateKeyId);

    // 프로젝트 ID 추출 및 검증
    const emailProjectId = clientEmail.split('@')[1]?.split('.')[0];
    const isProjectMatched = projectId === emailProjectId;

    return new Response(JSON.stringify({ 
      customToken,
      userName: userData.kakao_account?.profile?.nickname,
      userPhoto: userData.kakao_account?.profile?.profile_image_url,
      debug: {
        uid,
        iss: clientEmail,
        envProjectId: projectId,
        extractedProjectId: emailProjectId,
        isMatched: isProjectMatched
      }
    }), { 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('[Backend Error]', error);
    return new Response(JSON.stringify({ 
      message: '서버 내부 오류',
      detail: error.message 
    }), { status: 500 });
  }
};
