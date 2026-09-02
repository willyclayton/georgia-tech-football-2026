import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

type ViewportSize = {
  height: number;
  top: number;
  ready: boolean;
};

const initial: ViewportSize = {
  height: typeof window !== 'undefined' ? window.innerHeight : 0,
  top: 0,
  ready: false,
};

/** Visible viewport height. Never min() with innerHeight — that undershoots on iOS. */
export function measureVisualViewport(): { height: number; top: number } {
  if (typeof window === 'undefined') return { height: 0, top: 0 };
  const vv = window.visualViewport;
  const height = Math.round(vv?.height || window.innerHeight || 0);
  const top = Math.round(vv?.offsetTop ?? 0);
  return { height, top };
}

export function applyVisualViewportCss(height: number, top: number) {
  if (typeof document === 'undefined' || !height) return;
  const root = document.documentElement;
  root.style.setProperty('--app-height', `${height}px`);
  root.style.setProperty('--app-top', `${top}px`);
}

/**
 * Track the *visible* viewport on mobile Safari (toolbar expands/collapses).
 * Mirrors values onto CSS vars for the html/#root shell.
 */
export function useVisualViewportHeight(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(initial);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const apply = () => {
      const next = measureVisualViewport();
      applyVisualViewportCss(next.height, next.top);
      if (next.height) setSize({ ...next, ready: true });
    };

    apply();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    window.addEventListener('pageshow', apply);
    const onVis = () => {
      if (document.visibilityState === 'visible') apply();
    };
    document.addEventListener('visibilitychange', onVis);

    const raf1 = requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(apply);
    });
    const t1 = window.setTimeout(apply, 100);
    const t2 = window.setTimeout(apply, 400);

    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      window.removeEventListener('pageshow', apply);
      document.removeEventListener('visibilitychange', onVis);
      cancelAnimationFrame(raf1);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return size;
}
