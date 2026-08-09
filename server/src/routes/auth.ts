import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { getStatus, requestOtp } from "../services/authService.js";

export const authRouter = Router();

const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many verification requests. Try again in 15 minutes."
  }
});

const requestSchema = z.object({
  username: z.string().min(1).max(40)
});

authRouter.post("/request", requestLimiter, async (req, res, next) => {
  try {
    const parsed = requestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Enter a valid Telegram username." });
    }

    const result = await requestOtp(parsed.data.username);

    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    return res.json({
      success: true,
      message: result.message,
      username: result.username,
      expires_at: result.expires_at
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/validate-bot", async (req, res) => {
  try {
    const { botToken } = req.body;
    if (!botToken || typeof botToken !== "string") {
      return res.status(400).json({ success: false, message: "Bot Token is required." });
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken.trim()}/getMe`);
    const data = (await response.json()) as any;

    if (!data.ok) {
      return res.status(400).json({
        success: false,
        message: "Invalid Telegram Bot Token. Double check token from @BotFather."
      });
    }

    return res.json({
      success: true,
      bot: {
        id: data.result.id,
        first_name: data.result.first_name,
        username: `@${data.result.username}`
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to connect to Telegram Bot API." });
  }
});

authRouter.get("/status/:username", async (req, res, next) => {
  try {
    const result = await getStatus(req.params.username);

    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    return res.json({
      success: true,
      verified: result.verified,
      token: "token" in result ? result.token : undefined,
      user: "user" in result ? result.user : undefined
    });
  } catch (error) {
    next(error);
  }
});
