import { Router } from "express";
import { config } from "../config.js";
import { supabase } from "../lib/supabase.js";
import { telegramStatus } from "../telegram/status.js";

export const debugRouter = Router();

debugRouter.get("/status", async (_req, res) => {
  const checks: Record<string, unknown> = {
    api: { ok: true },
    configuration: {
      supabase_url: Boolean(config.supabaseUrl),
      supabase_service_role_key: Boolean(config.supabaseServiceRoleKey),
      telegram_bot_token: Boolean(config.telegramBotToken),
      jwt_secret: Boolean(config.jwtSecret)
    },
    telegram: { ...telegramStatus }
  };

  try {
    const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/getMe`);
    const body = (await response.json()) as { ok?: boolean; result?: { username?: string } };
    checks.telegram = {
      ...telegramStatus,
      token_valid: body.ok === true,
      bot_username: body.result?.username ?? null
    };
  } catch (error) {
    checks.telegram = {
      ...telegramStatus,
      token_valid: false,
      check_error: error instanceof Error ? error.message : "Telegram check failed"
    };
  }

  const { error } = await supabase
    .from("users")
    .select("id, telegram_user_id, telegram_username, first_name, created_at, updated_at")
    .limit(1);
  checks.supabase = error
    ? { ok: false, code: error.code, message: error.message, hint: error.hint }
    : { ok: true };

  res.json(checks);
});
