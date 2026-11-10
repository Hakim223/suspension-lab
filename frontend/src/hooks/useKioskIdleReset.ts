import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const KEY = 'sl-kiosk';

/**
 * Kiosk mode for the workshop waiting room: open the app once with `?kiosk=1`
 * (persisted for the browser session). After `idleMs` without interaction the app
 * returns to the home page so the next customer starts fresh.
 */
export function useKioskIdleReset(idleMs = 180_000) {
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    const param = new URLSearchParams(loc.search).get('kiosk');
    try {
      if (param === '1') sessionStorage.setItem(KEY, '1');
      if (param === '0') sessionStorage.removeItem(KEY);
    } catch { /* storage unavailable */ }
  }, [loc.search]);

  useEffect(() => {
    let enabled = false;
    try { enabled = sessionStorage.getItem(KEY) === '1'; } catch { enabled = false; }
    if (!enabled) return;
    let timer = window.setTimeout(() => nav('/'), idleMs);
    const bump = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => nav('/'), idleMs);
    };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [nav, idleMs, loc.pathname]);
}
