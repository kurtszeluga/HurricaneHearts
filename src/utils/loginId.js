export function normalizeLoginId(value = "") {
  return String(value).trim().toLowerCase();
}

export function isValidLoginId(value = "") {
  return /^[a-z0-9_-]{4,20}$/.test(normalizeLoginId(value));
}

export function getLoginIdMessage() {
  return "User ID must be 4-20 characters using letters, numbers, dashes, or underscores.";
}

export function looksLikeEmail(value = "") {
  return String(value).includes("@");
}
