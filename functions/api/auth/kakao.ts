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
    const clientEmail = (env.FIREBASE_CLIENT_EMAIL || "").trim();
    const privateKey = (env.FIREBASE_PRIVATE_KEY || "").trim();
    const privateKeyId = (env.FIREBASE_PRIVATE_KEY_ID || "").trim();
    const kakaoRestKey = (env.KAKAO_REST_API_KEY || "").trim();
    const projectId = (env.FIREBASE_PROJECT_ID || "").trim();

    // ... (검증 로직 생략)

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
