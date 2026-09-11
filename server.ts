import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Webhook forwarder for Get Your Free AI Report form
  app.post("/api/audit-webhook", async (req, res) => {
    try {
      const webhookUrl = "https://n8n-r7ed.srv1965679.hstgr.cloud/webhook/9ba196f8-c567-4e4a-b424-4ede63310955";
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      const responseText = await webhookResponse.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      res.status(webhookResponse.status).json(responseData);
    } catch (err: any) {
      console.error("Webhook forwarding error:", err);
      res.status(502).json({
        code: 502,
        error: "Failed to connect to the webhook destination",
        message: err?.message || String(err),
      });
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
    // Serve static files from the dist directory
    app.use(express.static("dist"));
    
    // SPA fallback: serve index.html for any unknown routes
    app.get("*", (req, res) => {
      res.sendFile(new URL("./dist/index.html", import.meta.url).pathname);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
