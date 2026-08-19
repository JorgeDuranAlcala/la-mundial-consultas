export const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

const SESSION_EXPIRED_KEY = 'logistika_session_expired';

export function markSessionExpired(): void {
  sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
}

export function consumeSessionExpiredMessage(): boolean {
  const expired = sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1';
  if (expired) {
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
  }
  return expired;
}
