import TelegramBot from "node-telegram-bot-api";
import { config } from "../config.js";
import { confirmTelegramVerification } from "../services/authService.js";
import { addFileToStore, parseFolderFromPath } from "../services/fileStore.js";
import { setTelegramError, setTelegramPolling } from "./status.js";

let activeBot: TelegramBot | null = null;

export function startTelegramBot() {
  const bot = new TelegramBot(config.telegramBotToken, { polling: true });
  activeBot = bot;
  setTelegramPolling();

  bot.onText(/^\/start(?:\s+.*)?$/, async (message) => {
    try {
      await verifyUsername(bot, message);
    } catch (error) {
      console.error("Telegram start command failed:", error);
      await bot
        .sendMessage(message.chat.id, "Verification is temporarily unavailable. Please try again shortly.")
        .catch((sendError) => console.error("Failed to send Telegram error message:", sendError));
    }
  });

  bot.onText(/^\/verify(?:\s+.*)?$/, async (message) => {
    try {
      await bot.sendMessage(message.chat.id, "No code is needed. Return to the website, enter your username, then press /start here.");
    } catch (error) {
      console.error("Telegram verification failed:", error);
      await bot
        .sendMessage(message.chat.id, "Verification is temporarily unavailable. Please try again shortly.")
        .catch((sendError) => console.error("Failed to send Telegram error message:", sendError));
    }
  });

  // Handle incoming documents, photos, videos, audio sent directly to the Telegram bot
  bot.on("message", async (msg) => {
    if (msg.text?.startsWith("/")) return;
    try {
      let fileId = "";
      let fileName = "file";
      let mimeType: string | null = null;
      let sizeBytes = 0;

      if (msg.document) {
        fileId = msg.document.file_id;
        fileName = msg.document.file_name || "document";
        mimeType = msg.document.mime_type || "application/octet-stream";
        sizeBytes = msg.document.file_size || 0;
      } else if (msg.photo && msg.photo.length > 0) {
        const largestPhoto = msg.photo[msg.photo.length - 1];
        fileId = largestPhoto.file_id;
        fileName = `photo_${Date.now()}.jpg`;
        mimeType = "image/jpeg";
        sizeBytes = largestPhoto.file_size || 0;
      } else if (msg.video) {
        fileId = msg.video.file_id;
        fileName = (msg.video as any).file_name || `video_${Date.now()}.mp4`;
        mimeType = msg.video.mime_type || "video/mp4";
        sizeBytes = msg.video.file_size || 0;
      } else if (msg.audio) {
        fileId = msg.audio.file_id;
        fileName = (msg.audio as any).file_name || `audio_${Date.now()}.mp3`;
        mimeType = msg.audio.mime_type || "audio/mpeg";
        sizeBytes = msg.audio.file_size || 0;
      }

      if (fileId && msg.from?.id) {
        const parsed = parseFolderFromPath(fileName, msg.caption);
        const folderName = parsed.folderName;
        const cleanFileName = parsed.fileName;

        addFileToStore({
          id: String(msg.message_id),
          telegram_file_id: fileId,
          telegram_user_id: String(msg.from.id),
          file_name: cleanFileName,
          mime_type: mimeType,
          size_bytes: sizeBytes,
          drive_id: "drive-main",
          folder_id: null,
          folder_name: folderName,
          caption: folderName ? `${folderName} > ${cleanFileName}` : msg.caption || cleanFileName,
          created_at: new Date(msg.date * 1000).toISOString()
        });

        const statusMsg = folderName
          ? `✅ Saved "${cleanFileName}" inside folder "${folderName}"!`
          : `✅ Saved "${cleanFileName}" to your Web File Manager!`;

        await bot.sendMessage(msg.chat.id, statusMsg);
      }
    } catch (err) {
      console.error("Failed to handle incoming Telegram message file:", err);
    }
  });

  bot.on("polling_error", (error: any) => {
    const msg = error?.message || String(error);
    if (!msg.includes("409 Conflict")) {
      setTelegramError(msg);
      console.error("Telegram polling error:", msg);
    }
  });

  return bot;
}

export function getTelegramBot(customToken?: string | null) {
  if (customToken && customToken.trim()) {
    return new TelegramBot(customToken.trim());
  }

  if (!activeBot) {
    throw new Error("Telegram bot is not ready.");
  }

  return activeBot;
}

async function verifyUsername(bot: TelegramBot, message: TelegramBot.Message) {
  const from = message.from;

  if (!from?.username) {
    await bot.sendMessage(message.chat.id, "Your Telegram account needs a public username to sign in.");
    return;
  }

  const result = await confirmTelegramVerification({
    telegram_user_id: String(from.id),
    telegram_username: from.username,
    first_name: from.first_name
  });

  if (!result.ok) {
    await bot.sendMessage(message.chat.id, "No active sign-in request was found for your username. Enter your Telegram username on the website first, then press /start again.");
    return;
  }

  await bot.sendMessage(message.chat.id, "Verification successful. You can now return to the website.");
}
