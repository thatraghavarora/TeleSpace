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
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json({ limit: "32kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/debug", debugRouter);
app.use("/files", filesRouter);
app.use("/telegram", telegramRouter);
app.use("/me", meRouter);

// Serve production built frontend statically
const clientDistPath = path.join(process.cwd(), "../client/dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res, next) => {
    if (
      req.path.startsWith("/auth") ||
      req.path.startsWith("/files") ||
      req.path.startsWith("/telegram") ||
      req.path.startsWith("/debug") ||
      req.path.startsWith("/me") ||
      req.path.startsWith("/health")
    ) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, "index.html"));
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
