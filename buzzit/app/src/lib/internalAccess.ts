export const FULL_ACCESS_EMAIL = 'meditoku.jp@gmail.com';

export function hasFullAccess(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === FULL_ACCESS_EMAIL;
}
