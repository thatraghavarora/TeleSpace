import cors from "cors";
import express from "express";
import fs from "fs";
import helmet from "helmet";
import path from "path";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { debugRouter } from "./routes/debug.js";
import { filesRouter } from "./routes/files.js";
import { meRouter } from "./routes/me.js";
import { telegramRouter } from "./routes/telegram.js";
import { startTelegramBot } from "./telegram/bot.js";

const app = express();

app.set("trust proxy", 1);

// Disable helmet headers that block cross-origin requests
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false
  })
);

// Bulletproof Universal CORS Middleware (Applies to all origins, headers & preflight OPTIONS)
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true
  })
);

app.use(express.json({ limit: "32kb" }));

// Backend Root HTML Status Page
app.get("/", (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TeleSpace Engine Status</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          background: #0f172a;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        .card {
          background: #1e293b;
          border: 2px solid #38bdf8;
          box-shadow: 8px 8px 0px #0284c7;
          border-radius: 16px;
          padding: 32px;
          max-width: 500px;
          width: 100%;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid #10b981;
          padding: 6px 14px;
          border-radius: 9999px;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 20px;
        }
        .pulse {
          width: 10px;
          height: 10px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 10px #10b981;
        }
        h1 { font-size: 28px; font-weight: 800; margin-bottom: 12px; color: #ffffff; }
        p { color: #94a3b8; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
        .stat { background: #0f172a; padding: 14px; border-radius: 10px; border: 1px solid #334155; }
        .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        .stat-val { font-size: 16px; font-weight: 700; color: #38bdf8; margin-top: 4px; }
        .footer { font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #334155; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="status-badge">
          <span class="pulse"></span> Server & Telegram Engine Online
        </div>
        <h1>TeleSpace API</h1>
        <p>Unlimited Telegram Cloud Storage backend server is running and accepting CORS requests from all origins.</p>
        
        <div class="grid">
          <div class="stat">
            <div class="stat-label">CORS Status</div>
            <div class="stat-val">Enabled (Any Origin)</div>
          </div>
          <div class="stat">
            <div class="stat-label">Telegram Bot</div>
            <div class="stat-val">Polling Active</div>
          </div>
          <div class="stat">
            <div class="stat-label">Server Port</div>
            <div class="stat-val">${config.port}</div>
          </div>
          <div class="stat">
            <div class="stat-label">File Persistence</div>
            <div class="stat-val">JSON Store Active</div>
          </div>
        </div>

        <div class="footer">
          TeleSpace Backend Service • Powered by Express & Telegram API
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, status: "online", timestamp: new Date().toISOString() });
});

app.use("/auth", authRouter);
app.use("/api/auth", authRouter);
app.use("/debug", debugRouter);
app.use("/api/debug", debugRouter);
app.use("/files", filesRouter);
app.use("/api/files", filesRouter);
app.use("/telegram", telegramRouter);
app.use("/api/telegram", telegramRouter);
app.use("/me", meRouter);
app.use("/api/me", meRouter);

// Serve production built frontend statically if available
const clientDistPath = path.resolve(process.cwd(), "client/dist");
const fallbackDistPath = path.resolve(process.cwd(), "../client/dist");
const actualDistPath = fs.existsSync(clientDistPath) ? clientDistPath : (fs.existsSync(fallbackDistPath) ? fallbackDistPath : null);

if (actualDistPath) {
  app.use(express.static(actualDistPath));
  app.get("*", (req, res, next) => {
    if (
      req.path.startsWith("/auth") ||
      req.path.startsWith("/api") ||
      req.path.startsWith("/files") ||
      req.path.startsWith("/telegram") ||
      req.path.startsWith("/debug") ||
      req.path.startsWith("/me") ||
      req.path.startsWith("/health")
    ) {
      return next();
    }
    res.sendFile(path.join(actualDistPath, "index.html"));
  });
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Something went wrong." });
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`API & Web App listening on http://0.0.0.0:${config.port}`);
  startTelegramBot();
  console.log("Telegram bot polling started.");
});
