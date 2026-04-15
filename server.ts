import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";

// .env 파일 로드
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // [최우선] 환경변수 API
  app.get("/api/config", (req, res) => {
    console.log("[Server] Incoming /api/config request");
    res.setHeader('X-Custom-Server', 'Express-Vite-Final-Fix');
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

  // Vite Middleware (개발 모드 강제)
  console.log("[Server] Starting Vite Middleware...");
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] READY on port ${PORT}`);
  });
}

startServer();
