import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { onRequestPost as createOrderHandler } from './functions/api/payments/orders';
import { onRequestPost as confirmHandler } from './functions/api/payments/confirm';
import { onRequestPost as cancelHandler } from './functions/api/payments/cancel';
import { onRequestPost as recoverHandler } from './functions/api/payments/recover';
import { onRequestPost as webhookHandler } from './functions/api/payments/webhook';
import { onRequestPost as transferHandler } from './functions/api/points/transfer';
import { onRequestPost as adminPaymentHandler } from './functions/api/admin/payment';
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

  // The local server uses exactly the same authenticated handlers as Pages.
  const apiHandlers = [
    ['/api/payments/orders', createOrderHandler], ['/api/payments/confirm', confirmHandler],
    ['/api/payments/cancel', cancelHandler], ['/api/payments/recover', recoverHandler],
    ['/api/payments/webhook', webhookHandler], ['/api/points/transfer', transferHandler],
    ['/api/admin/payment', adminPaymentHandler],
  ] as const;
  for (const [route, handler] of apiHandlers) {
    app.post(route, async (req, res) => {
      const request = new Request(`http://localhost:${PORT}${req.originalUrl}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
        body: JSON.stringify(req.body),
      });
      const response = await handler({ request, env: process.env } as any);
      res.status(response.status);
      response.headers.forEach((value, name) => res.setHeader(name, value));
      res.send(await response.text());
    });
  }

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
