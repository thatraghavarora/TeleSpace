import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || "",
  jwtSecret: process.env.JWT_SECRET || "telespace_secret_jwt_key_2026",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5175"
};
