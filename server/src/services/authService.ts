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

export async function requestOtp(rawUsername: string) {
  const username = normalizeUsername(rawUsername);

  if (!isValidTelegramUsername(username)) {
    return { ok: false as const, status: 400, message: "Enter a valid Telegram username." };
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error } = await supabase.from("telegram_verifications").insert({
    username,
    // Retained only because the existing database column is required. The
    // verification itself is performed by matching the Telegram username.
    code: crypto.randomUUID(),
    expires_at: expiresAt
  });

  if (error) {
    throw error;
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

  const { data: attempt, error } = await supabase
    .from("telegram_verifications")
    .select("id")
    .eq("username", telegramUsername)
    .eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!attempt) {
    return { ok: false as const, status: 400, message: "Invalid or expired verification code." };
  }

  const user = await upsertUser({
    telegram_user_id: String(input.telegram_user_id),
    telegram_username: withoutAt(telegramUsername),
    first_name: input.first_name ?? null
  });

  const { error: updateError } = await supabase
    .from("telegram_verifications")
    .update({
      telegram_user_id: String(input.telegram_user_id),
      verified: true,
      verified_at: new Date().toISOString()
    })
    .eq("id", attempt.id);

  if (updateError) {
    throw updateError;
  }

  return sessionResponse(user);
}

export async function getStatus(rawUsername: string) {
  const username = normalizeUsername(rawUsername);

  if (!isValidTelegramUsername(username)) {
    return { ok: false as const, status: 400, message: "Enter a valid Telegram username." };
  }

  const { data: verification, error } = await supabase
    .from("telegram_verifications")
    .select("telegram_user_id")
    .eq("username", username)
    .eq("verified", true)
    .order("verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!verification?.telegram_user_id) {
    return { ok: true as const, verified: false };
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, telegram_user_id, telegram_username, first_name, created_at")
    .eq("telegram_user_id", verification.telegram_user_id)
    .maybeSingle<UserRow>();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return { ok: true as const, verified: false };
  }

  return { ...sessionResponse(user), verified: true };
}

export async function getUserById(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, telegram_user_id, telegram_username, first_name, created_at")
    .eq("id", userId)
    .maybeSingle<UserRow>();

  if (error) {
    throw error;
  }

  return data;
}

async function upsertUser(input: {
  telegram_user_id: string;
  telegram_username: string;
  first_name: string | null;
}) {
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

  if (error) {
    throw error;
  }

  return data;
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
