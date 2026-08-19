import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { markSessionExpired, SESSION_TIMEOUT_MS } from '@/lib/session-timeout';
import { useAuth } from '@/stores/useStore';

const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'click',
  'touchstart',
  'scroll',
] as const;

export function useSessionTimeout() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const expireSession = useCallback(() => {
    markSessionExpired();
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!useAuth.getState().user) return;

    lastActivityRef.current = Date.now();
    timeoutRef.current = setTimeout(expireSession, SESSION_TIMEOUT_MS);
  }, [expireSession]);

  useEffect(() => {
    if (!user) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    resetTimer();

    const onActivity = () => resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
      document.addEventListener(event, onActivity, { passive: true, capture: true });
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastActivityRef.current >= SESSION_TIMEOUT_MS) {
        expireSession();
        return;
      }
      resetTimer();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
        document.removeEventListener(event, onActivity, true);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user, resetTimer, expireSession]);
}
