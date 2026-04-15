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
