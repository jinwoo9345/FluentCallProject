import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";

/**
 * [Local Development Server]
 * This Express server is used for local development (npm run dev).
 * In production (Cloudflare Pages), the API is handled by Cloudflare Pages Functions 
 * located in the /functions directory.
 */

// .env 파일 로드 (.env.local 우선)
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
  console.log("[Server] Loaded config from .env.local");
} else {
  dotenv.config();
  console.log("[Server] Loaded config from .env");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // [최우선] 환경변수 API
  app.get("/api/config", (req, res) => {
    console.log("[Server] Incoming /api/config request");
    console.log("[Server] TOSS_KEY exists:", !!process.env.VITE_TOSS_CLIENT_KEY);
    res.setHeader('X-Custom-Server', 'Express-Production-Final');
    res.json({
      tossClientKey: (process.env.VITE_TOSS_CLIENT_KEY || "").trim(),
      emailjsPublicKey: (process.env.VITE_EMAILJS_PUBLIC_KEY || "").trim(),
      emailjsServiceId: (process.env.VITE_EMAILJS_SERVICE_ID || "").trim(),
      emailjsTemplateId: (process.env.VITE_EMAILJS_TEMPLATE_ID || "").trim(),
    });
  });

  app.use(express.json());

  // Toss Payments Confirm
  app.post("/api/payments/confirm", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { paymentKey, orderId, amount } = req.body;
    const secretKey = (process.env.TOSS_SECRET_KEY || "").trim();

    if (!secretKey) {
      console.error("[Server] TOSS_SECRET_KEY is missing in environment variables");
      return res.status(500).json({ message: "TOSS_SECRET_KEY is missing" });
    }

    const encryptedSecretKey = Buffer.from(secretKey + ":").toString("base64");

    try {
      const response = await axios.post(
        "https://api.tosspayments.com/v1/payments/confirm",
        { paymentKey, orderId, amount },
        {
          headers: {
            Authorization: `Basic ${encryptedSecretKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json(error.response?.data || { message: "Internal Error" });
    }
  });

  // EB-app SSO Token Bridge (Cloudflare functions/api/eb-app/sso.ts와 동일 로직)
  app.post("/api/eb-app/sso", async (req, res) => {
    try {
      const mainProjectId = (process.env.FIREBASE_PROJECT_ID || "").trim();
      const mainDbId = (process.env.VITE_FIREBASE_DATABASE_ID || "(default)").trim();
      const ebAppProjectId = (process.env.EB_APP_FIREBASE_PROJECT_ID || "").trim();
      const ebAppClientEmail = (process.env.EB_APP_FIREBASE_CLIENT_EMAIL || "").trim();
      const ebAppPrivateKey = (process.env.EB_APP_FIREBASE_PRIVATE_KEY || "").trim();

      if (!mainProjectId || !ebAppProjectId || !ebAppClientEmail || !ebAppPrivateKey) {
        return res.status(500).json({ message: "서버 설정 오류" });
      }

      const { idToken } = req.body || {};
      if (!idToken || typeof idToken !== "string") {
        return res.status(400).json({ message: "idToken이 필요합니다." });
      }

      // 1. Google JWKS로 ID Token 검증
      const parts = idToken.split(".");
      if (parts.length !== 3) return res.status(401).json({ message: "Malformed token" });
      const [headerB64, payloadB64, signatureB64] = parts;

      const b64urlToBytes = (s: string): Uint8Array => {
        let str = s.replace(/-/g, "+").replace(/_/g, "/");
        while (str.length % 4) str += "=";
        return Uint8Array.from(Buffer.from(str, "base64"));
      };
      const b64urlToJson = (s: string) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
      const toB64Url = (data: ArrayBuffer | Uint8Array | string): string => {
        const buf = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as any);
        return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
      };

      const header = b64urlToJson(headerB64);
      const payload = b64urlToJson(payloadB64);
      const now = Math.floor(Date.now() / 1000);
      if (header.alg !== "RS256") return res.status(401).json({ message: "Bad alg" });
      if (typeof payload.exp !== "number" || payload.exp < now)
        return res.status(401).json({ message: "Expired" });
      if (payload.aud !== mainProjectId)
        return res.status(401).json({ message: "Bad audience" });
      if (payload.iss !== `https://securetoken.google.com/${mainProjectId}`)
        return res.status(401).json({ message: "Bad issuer" });

      const jwksRes = await axios.get(
        "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
      );
      const jwk = (jwksRes.data.keys as any[]).find((k) => k.kid === header.kid);
      if (!jwk) return res.status(401).json({ message: "Unknown kid" });

      const verifyKey = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
      );
      const ok = await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        verifyKey,
        b64urlToBytes(signatureB64),
        new TextEncoder().encode(`${headerB64}.${payloadB64}`)
      );
      if (!ok) return res.status(401).json({ message: "Bad signature" });

      const uid = String(payload.sub);
      const email: string | undefined = payload.email;

      // 2. Firestore REST로 관리자 권한 확인
      const dbId = mainDbId && mainDbId !== "(default)" ? mainDbId : "(default)";
      const userDocUrl = `https://firestore.googleapis.com/v1/projects/${mainProjectId}/databases/${dbId}/documents/users/${uid}`;
      const userRes = await axios
        .get(userDocUrl, { headers: { Authorization: `Bearer ${idToken}` } })
        .catch((e) => ({ status: e.response?.status ?? 500, data: null } as any));
      const role = (userRes as any).data?.fields?.role?.stringValue ?? null;
      if (role !== "admin" && role !== "tutor") {
        return res.status(403).json({ message: "EB-app 접근 권한이 없습니다." });
      }
      const ebAppRole: "admin" | "instructor" = role === "admin" ? "admin" : "instructor";

      // 3. EB-app용 Custom Token 서명
      const iat = Math.floor(Date.now() / 1000) - 30;
      const exp = iat + 3600;
      const ctHeader = { alg: "RS256", typ: "JWT" };
      const ctPayload = {
        iss: ebAppClientEmail,
        sub: ebAppClientEmail,
        aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
        iat,
        exp,
        uid,
        claims: { role: ebAppRole, ...(email ? { email } : {}) }
      };
      const ctHeaderB64 = toB64Url(JSON.stringify(ctHeader));
      const ctPayloadB64 = toB64Url(JSON.stringify(ctPayload));
      const unsigned = `${ctHeaderB64}.${ctPayloadB64}`;

      const pem = ebAppPrivateKey
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
        .replace(/\\n/g, "")
        .replace(/\s/g, "");
      const der = Buffer.from(pem, "base64");
      const signKey = await crypto.subtle.importKey(
        "pkcs8",
        der,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        signKey,
        new TextEncoder().encode(unsigned)
      );
      const ebAppToken = `${unsigned}.${toB64Url(sig)}`;

      res.setHeader("Cache-Control", "no-store");
      return res.json({ ebAppToken, ebAppProjectId });
    } catch (error: any) {
      console.error("[eb-app-sso]", error?.message || error);
      return res.status(401).json({ message: "SSO 토큰 발급 실패" });
    }
  });

  // 정적 파일 서빙 (dist 폴더)
  const distPath = path.join(__dirname, "dist");
  app.use(express.static(distPath));

  // SPA Fallback: 모든 요청에 대해 index.html 반환 (API 제외)
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "Not Found" });
    }
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] PRODUCTION READY on port ${PORT}`);
  });
}

startServer();
