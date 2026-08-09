import { Router } from "express";
import { z } from "zod";
import { confirmTelegramVerification } from "../services/authService.js";

export const telegramRouter = Router();

const confirmSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  telegram_user_id: z.union([z.string(), z.number()]).transform(String),
  telegram_username: z.string().min(1),
  first_name: z.string().optional()
});

telegramRouter.post("/confirm", async (req, res, next) => {
  try {
    const parsed = confirmSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code." });
    }

    const result = await confirmTelegramVerification(parsed.data);

    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    return res.json({
      success: true,
      token: result.token,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
});
