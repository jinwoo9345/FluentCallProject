import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";

console.log("[Server] >>> TOP LEVEL START <<<");
console.log("[Server] Current working directory:", process.cwd());
console.log("[Server] NODE_ENV:", process.env.NODE_ENV);

dotenv.config();
console.log("[Server] dotenv.config() called");

console.log("[Server] Environment variables loaded. Checking VITE_TOSS_CLIENT_KEY...");
console.log("[Server] VITE_TOSS_CLIENT_KEY exists:", !!process.env.VITE_TOSS_CLIENT_KEY);
if (process.env.VITE_TOSS_CLIENT_KEY) {
  console.log("[Server] VITE_TOSS_CLIENT_KEY length:", process.env.VITE_TOSS_CLIENT_KEY.length);
  console.log("[Server] VITE_TOSS_CLIENT_KEY prefix:", process.env.VITE_TOSS_CLIENT_KEY.substring(0, 7) + "...");
}

console.log("[Server] Booting up...");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 정적 파일 경로 계산
// 번들링된 경우(dist/server.js)와 직접 실행(server.ts) 경우 모두 대응
const isBundled = __filename.endsWith('server.js');
const distPath = isBundled 
  ? __dirname 
  : path.resolve(process.cwd(), "dist");

console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
console.log(`[Server] Directory: ${__dirname}`);
console.log(`[Server] Resolved distPath: ${distPath}`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 로깅 미들웨어 - API 요청만 기록
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) {
      console.log(`[Server] API Request: ${req.method} ${req.url}`);
    }
    next();
  });

  // [최우선 순위] 환경변수 전달 API
  app.get("/api/config", (req, res) => {
    console.log("[Server] >>> Incoming request for /api/config");
    
    const config = {
      tossClientKey: (process.env.VITE_TOSS_CLIENT_KEY || "").trim(),
      emailjsPublicKey: (process.env.VITE_EMAILJS_PUBLIC_KEY || "").trim(),
      emailjsServiceId: (process.env.VITE_EMAILJS_SERVICE_ID || "").trim(),
      emailjsTemplateId: (process.env.VITE_EMAILJS_TEMPLATE_ID || "").trim(),
    };
    
    console.log("[Server] Sending config:", { 
      tossClientKey: config.tossClientKey ? "OK" : "EMPTY" 
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Custom-Server', 'Express-Vite-Final');
    return res.json(config);
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  app.use(express.json());

  // Toss Payments Confirmation API
  app.post("/api/payments/confirm", async (req, res) => {
    const { paymentKey, orderId, amount } = req.body;
    const secretKey = (process.env.TOSS_SECRET_KEY || "").trim();
    
    if (!secretKey) return res.status(500).json({ message: "TOSS_SECRET_KEY is missing" });

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
      res.status(200).json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json(error.response?.data || { message: "Internal Server Error" });
    }
  });

  // 정적 파일 서비스 (dist가 있으면 우선, 없으면 src는 Vite가 담당)
  if (fs.existsSync(distPath)) {
    console.log("[Server] dist folder found. Serving static files from dist.");
    app.use(express.static(distPath));
    
    // API route fallback for SPA
    app.get("*", (req, res, next) => {
      if (req.url.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Development mode: Loading Vite middleware");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] RUNNING on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("[Server] Critical failure during startup:", err);
});
