/**
 * [Kakao Auth Handler]
 * Exchanges a Kakao Authorization Code for a Firebase Custom Token.
 */

async function createCustomToken(uid: string, clientEmail: string, privateKey: string) {
  // Ensure privateKey is a string before calling replace
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

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '');
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Use the safe keyStr variable
  const pemContents = keyStr
    .replace(/\\n/g, "\n") // 글자 그대로의 \n을 실제 줄바꿈으로 변환
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, ""); // 모든 공백 및 줄바꿈 제거
    
  try {
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("pkcs8", binaryDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedToken));
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return `${unsignedToken}.${encodedSignature}`;
  } catch (e: any) {
    throw new Error(`Base64 디코딩 실패: ${e.message}. 키 형식을 확인해주세요.`);
  }
}

export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  try {
    // [DEBUG] 현재 환경 변수 상태 체크 (키 이름만 확인)
    const envKeys = Object.keys(env);
    const requiredKeys = ['FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'KAKAO_REST_API_KEY'];
    const missingKeys = requiredKeys.filter(key => !env[key]);

    if (missingKeys.length > 0) {
      console.error('[Env Error] Missing keys:', missingKeys);
      return new Response(JSON.stringify({ 
        message: '서버 환경 변수 설정 오류',
        detail: `${missingKeys.join(', ')} 변수가 Cloudflare에 등록되어 있지 않거나 비어있습니다.`,
        availableKeys: envKeys // 현재 서버가 알고 있는 변수 목록 (디버깅용)
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
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
        client_id: env.KAKAO_REST_API_KEY || '',
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
      }), { status: 400 });
    }

    // 2. 카카오 사용자 정보 가져오기
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json() as any;
    if (!userData.id) throw new Error('카카오 사용자 정보 획득 실패');
    
    const uid = `kakao:${userData.id}`;

    // 3. Firebase Custom Token 생성
    const customToken = await createCustomToken(uid, env.FIREBASE_CLIENT_EMAIL, env.FIREBASE_PRIVATE_KEY);

    return new Response(JSON.stringify({ 
      customToken,
      userName: userData.kakao_account?.profile?.nickname,
      userPhoto: userData.kakao_account?.profile?.profile_image_url
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
