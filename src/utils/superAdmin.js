export const SUPER_ADMIN_EMAILS = [
  "hurricanehearts.admin@gmail.com",
  "kurtszeluga@gmail.com"
];

export function isSuperAdminEmail(email = "") {
  return SUPER_ADMIN_EMAILS.includes(String(email).trim().toLowerCase());
}
