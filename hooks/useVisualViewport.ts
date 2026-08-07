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

/**
 * Track the *visible* viewport on mobile Safari (toolbar expands/collapses).
 * Also mirrors values onto CSS vars for the html/#root shell.
 */
export function useVisualViewportHeight(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(initial);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const root = document.documentElement;
    const vv = window.visualViewport;

    const apply = () => {
      const height = Math.round(vv?.height ?? window.innerHeight);
      const top = Math.round(vv?.offsetTop ?? 0);
      root.style.setProperty('--app-height', `${height}px`);
      root.style.setProperty('--app-top', `${top}px`);
      // Prefer the smaller of visualViewport vs innerHeight — never taller than visible.
      const safeHeight = Math.min(height, Math.round(window.innerHeight));
      setSize({ height: safeHeight, top, ready: true });
    };

    apply();
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
    };
  }, []);

  return size;
}
