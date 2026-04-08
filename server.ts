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

  // Toss Payments Confirmation API
  app.post("/api/payments/confirm", async (req, res) => {
    const { paymentKey, orderId, amount } = req.body;

    // Toss Payments Secret Key (Base64 encoded)
    const secretKey = process.env.TOSS_SECRET_KEY || "test_sk_zYyZq67j18n5E9p5619V3n7zG0pX";
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
      console.error("Toss Payment Confirmation Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { message: "Internal Server Error" });
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
