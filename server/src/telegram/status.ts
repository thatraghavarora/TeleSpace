export const telegramStatus = {
  polling: false,
  lastError: null as string | null,
  lastErrorAt: null as string | null
};

export function setTelegramPolling() {
  telegramStatus.polling = true;
  telegramStatus.lastError = null;
  telegramStatus.lastErrorAt = null;
}

export function setTelegramError(error: string) {
  telegramStatus.polling = false;
  telegramStatus.lastError = error;
  telegramStatus.lastErrorAt = new Date().toISOString();
}
