const USERNAME_PATTERN = /^@[a-zA-Z0-9_]{5,32}$/;

export function normalizeUsername(value: string) {
  const compact = value.trim().replace(/\s+/g, "").toLowerCase();
  return compact.startsWith("@") ? compact : `@${compact}`;
}

export function isValidTelegramUsername(value: string) {
  return USERNAME_PATTERN.test(value);
}

export function withoutAt(value: string) {
  return normalizeUsername(value).slice(1);
}
