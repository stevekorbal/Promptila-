import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import cors from "cors";

import stripeConfigHandler from "./api/stripe-config.ts";
import createPaymentIntentHandler from "./api/create-payment-intent.ts";
import updatePaymentIntentHandler from "./api/update-payment-intent.ts";
import createCheckoutSessionHandler from "./api/create-checkout-session.ts";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Stripe API routes
  app.all("/api/stripe-config", (req, res) => {
    return stripeConfigHandler(req as any, res as any);
  });

  app.all("/api/create-payment-intent", (req, res) => {
    return createPaymentIntentHandler(req as any, res as any);
  });

  app.all("/api/update-payment-intent", (req, res) => {
    return updatePaymentIntentHandler(req as any, res as any);
  });

  app.all("/api/create-checkout-session", (req, res) => {
    return createCheckoutSessionHandler(req as any, res as any);
  });

  // Audit webhook route (audits start automatically inside Supabase database)
  app.post("/api/audit-webhook", async (req, res) => {
    res.status(200).json({
      ok: true,
      message: "Audits start automatically from the database.",
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from the dist directory
    app.use(express.static("dist"));
    
    // SPA fallback: serve index.html for any unknown routes
    app.get("*all", (req, res) => {
      res.sendFile(new URL("./dist/index.html", import.meta.url).pathname);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
