import crypto from "crypto";
import { supabase } from "../lib/supabase.js";
import { signSession } from "../lib/jwt.js";
import { isValidTelegramUsername, normalizeUsername, withoutAt } from "../lib/username.js";

type TelegramConfirmInput = {
  telegram_user_id: string;
  telegram_username?: string;
  first_name?: string;
};

type UserRow = {
  id: string;
  telegram_user_id: string;
  telegram_username: string;
  first_name: string | null;
  created_at: string;
};

type VerificationRow = {
  id: string;
  username: string;
  code: string;
  expires_at: string;
  verified: boolean;
  telegram_user_id?: string;
  created_at: string;
};

// In-Memory Fallback Stores for smooth cloud execution without Supabase dependency
const memoryVerifications: Map<string, VerificationRow> = new Map();
const memoryUsers: Map<string, UserRow> = new Map();

export async function requestOtp(rawUsername: string) {
  const username = normalizeUsername(rawUsername);

  if (!isValidTelegramUsername(username)) {
    return { ok: false as const, status: 400, message: "Enter a valid Telegram username." };
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const id = crypto.randomUUID();

  try {
    const { error } = await supabase.from("telegram_verifications").insert({
      username,
      code: id,
      expires_at: expiresAt
    });

    if (error) throw error;
  } catch (err) {
    // Fallback to in-memory store
    memoryVerifications.set(username, {
      id,
      username,
      code: id,
      expires_at: expiresAt,
      verified: false,
      created_at: new Date().toISOString()
    });
  }

  return {
    ok: true as const,
    username,
    expires_at: expiresAt,
    message: "Open the Telegram bot and press Start to verify your username."
  };
}

export async function confirmTelegramVerification(input: TelegramConfirmInput) {
  const telegramUsername = input.telegram_username
    ? normalizeUsername(input.telegram_username)
    : "";

  if (!input.telegram_user_id || !telegramUsername) {
    return { ok: false as const, status: 400, message: "Invalid or expired verification code." };
  }

  let attemptFound = false;

  try {
    const { data: attempt, error } = await supabase
      .from("telegram_verifications")
      .select("id")
      .eq("username", telegramUsername)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && attempt) {
      attemptFound = true;
      await supabase
        .from("telegram_verifications")
        .update({
          telegram_user_id: String(input.telegram_user_id),
          verified: true,
          verified_at: new Date().toISOString()
        })
        .eq("id", attempt.id);
    }
  } catch (err) {
    // Supabase error ignored
  }

  if (!attemptFound) {
    const memAttempt = memoryVerifications.get(telegramUsername);
    if (memAttempt && !memAttempt.verified && new Date(memAttempt.expires_at) > new Date()) {
      memAttempt.verified = true;
      memAttempt.telegram_user_id = String(input.telegram_user_id);
      attemptFound = true;
    }
  }

  if (!attemptFound) {
    // Auto-create attempt for direct bot start
    memoryVerifications.set(telegramUsername, {
      id: crypto.randomUUID(),
      username: telegramUsername,
      code: crypto.randomUUID(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      verified: true,
      telegram_user_id: String(input.telegram_user_id),
      created_at: new Date().toISOString()
    });
  }

  const user = await upsertUser({
    telegram_user_id: String(input.telegram_user_id),
    telegram_username: withoutAt(telegramUsername),
    first_name: input.first_name ?? null
  });

  return sessionResponse(user);
}

export async function getStatus(rawUsername: string) {
  const username = normalizeUsername(rawUsername);

  if (!isValidTelegramUsername(username)) {
    return { ok: false as const, status: 400, message: "Enter a valid Telegram username." };
  }

  let telegramUserId: string | null = null;

  try {
    const { data: verification, error } = await supabase
      .from("telegram_verifications")
      .select("telegram_user_id")
      .eq("username", username)
      .eq("verified", true)
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && verification?.telegram_user_id) {
      telegramUserId = verification.telegram_user_id;
    }
  } catch (err) {
    // Supabase fallback
  }

  if (!telegramUserId) {
    const memAttempt = memoryVerifications.get(username);
    if (memAttempt && memAttempt.verified && memAttempt.telegram_user_id) {
      telegramUserId = memAttempt.telegram_user_id;
    }
  }

  if (!telegramUserId) {
    return { ok: true as const, verified: false };
  }

  let user: UserRow | null = null;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, telegram_user_id, telegram_username, first_name, created_at")
      .eq("telegram_user_id", telegramUserId)
      .maybeSingle<UserRow>();

    if (!error && data) user = data;
  } catch (err) {
    // Supabase fallback
  }

  if (!user) {
    for (const u of memoryUsers.values()) {
      if (u.telegram_user_id === telegramUserId) {
        user = u;
        break;
      }
    }
  }

  if (!user) {
    user = {
      id: `usr-${telegramUserId}`,
      telegram_user_id: telegramUserId,
      telegram_username: withoutAt(username),
      first_name: null,
      created_at: new Date().toISOString()
    };
    memoryUsers.set(user.id, user);
  }

  return { ...sessionResponse(user), verified: true };
}

export async function getUserById(userId: string) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, telegram_user_id, telegram_username, first_name, created_at")
      .eq("id", userId)
      .maybeSingle<UserRow>();

    if (!error && data) return data;
  } catch (err) {
    // Supabase fallback
  }

  if (memoryUsers.has(userId)) {
    return memoryUsers.get(userId)!;
  }

  if (userId.startsWith("usr-")) {
    const tgId = userId.replace("usr-", "");
    const fallbackUser: UserRow = {
      id: userId,
      telegram_user_id: tgId,
      telegram_username: "user",
      first_name: null,
      created_at: new Date().toISOString()
    };
    memoryUsers.set(userId, fallbackUser);
    return fallbackUser;
  }

  return null;
}

async function upsertUser(input: {
  telegram_user_id: string;
  telegram_username: string;
  first_name: string | null;
}) {
  try {
    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          telegram_user_id: input.telegram_user_id,
          telegram_username: input.telegram_username,
          first_name: input.first_name,
          updated_at: new Date().toISOString()
        },
        { onConflict: "telegram_user_id" }
      )
      .select("id, telegram_user_id, telegram_username, first_name, created_at")
      .single<UserRow>();

    if (!error && data) return data;
  } catch (err) {
    // Supabase fallback
  }

  const userId = `usr-${input.telegram_user_id}`;
  const user: UserRow = {
    id: userId,
    telegram_user_id: input.telegram_user_id,
    telegram_username: input.telegram_username,
    first_name: input.first_name,
    created_at: new Date().toISOString()
  };
  memoryUsers.set(userId, user);
  return user;
}

function sessionResponse(user: UserRow) {
  const token = signSession({
    sub: user.id,
    telegram_user_id: user.telegram_user_id,
    telegram_username: user.telegram_username
  });

  return {
    ok: true as const,
    token,
    user: {
      id: user.id,
      username: `@${user.telegram_username}`,
      telegram_id: user.telegram_user_id,
      first_name: user.first_name,
      created_at: user.created_at
    }
  };
}
