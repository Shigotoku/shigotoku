const LOCK_KEY = 'buzzit-persona-lock-v1';

export function isPersonaLocked(): boolean {
  try {
    return sessionStorage.getItem(LOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function setPersonaLocked(locked: boolean) {
  try {
    if (locked) sessionStorage.setItem(LOCK_KEY, '1');
    else sessionStorage.removeItem(LOCK_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('buzzit-persona-lock-changed'));
}
