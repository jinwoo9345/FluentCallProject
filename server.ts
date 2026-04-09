import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import axios from "axios";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // [최우선 순위] 환경변수 전달 API - 모든 미들웨어보다 앞에 배치
  app.get("/api/config", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json({
      tossClientKey: (process.env.VITE_TOSS_CLIENT_KEY || "").trim(),
      emailjsPublicKey: (process.env.VITE_EMAILJS_PUBLIC_KEY || "").trim(),
      emailjsServiceId: (process.env.VITE_EMAILJS_SERVICE_ID || "").trim(),
      emailjsTemplateId: (process.env.VITE_EMAILJS_TEMPLATE_ID || "").trim(),
    });
  });

  // Toss Payments Confirmation API
  app.post("/api/payments/confirm", async (req, res) => {
    const { paymentKey, orderId, amount } = req.body;

    // Toss Payments Secret Key (Base64 encoded)
    const secretKey = (process.env.TOSS_SECRET_KEY || "").trim();
    
    if (!secretKey) {
      console.error("Toss Secret Key is missing in environment variables.");
      return res.status(500).json({ 
        message: "서버 설정 오류: TOSS_SECRET_KEY가 설정되지 않았습니다." 
      });
    }

    const encryptedSecretKey = Buffer.from(secretKey + ":").toString("base64");

    console.log(`Attempting payment confirmation for order: ${orderId}, amount: ${amount}`);

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

      console.log("Toss Payment Confirmation Success:", response.data.status);
      res.status(200).json(response.data);
    } catch (error: any) {
      const errorData = error.response?.data;
      console.error("Toss Payment Confirmation Error:", JSON.stringify(errorData || error.message));
      
      // If it's an authentication error, provide a clearer message
      if (error.response?.status === 401) {
        return res.status(401).json({
          message: "Toss Payments 인증 실패: 시크릿 키가 올바르지 않거나 환경 설정이 잘못되었습니다.",
          details: errorData
        });
      }
      
      res.status(error.response?.status || 500).json(errorData || { message: "Internal Server Error" });
    }
  });

  // API Route for Payment (Placeholder since Polar is removed)
  app.post("/api/checkout", async (req, res) => {
    try {
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json({ error: "Product ID is required" });
      }

      // Since Polar is removed, we'll return a success message or redirect to a contact page
      // In a real app, you'd integrate another payment provider here
      res.json({ 
        message: "Payment system is being updated. Please contact support for manual payment.",
        contactUrl: "/contact" 
      });
    } catch (error: any) {
      console.error("Checkout Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
