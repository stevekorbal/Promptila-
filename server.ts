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
