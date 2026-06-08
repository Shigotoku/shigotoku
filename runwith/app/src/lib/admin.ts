export const ADMIN_EMAILS = ["admin@shigotoku.com"];

/** 全プラン相当で機能利用可（Runwith Pro + 医療モード相当） */
export const FULL_ACCESS_EMAIL = "meditoku.jp@gmail.com";

export function isAdminUser(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function hasFullAccess(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === FULL_ACCESS_EMAIL;
}
