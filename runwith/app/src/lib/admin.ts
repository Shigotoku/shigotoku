export const ADMIN_EMAILS = ["admin@shigotoku.com"];

export function isAdminUser(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
