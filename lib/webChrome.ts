import { Platform } from 'react-native';

/** Installed PWA / “Add to Home Screen” — home indicator sits inside the app. */
export function isStandaloneWeb(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return (
    Boolean(window.matchMedia?.('(display-mode: standalone)').matches) ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

/**
 * Padding under the tab bar / FAB.
 * In a regular Safari/Chrome tab the visual viewport already excludes the
 * browser chrome and home indicator — forcing ~34px there makes the bar
 * taller than the visible area and eats the last row of content.
 */
export function chromeAwareBottomPad(insetsBottom: number): number {
  if (Platform.OS !== 'web') return Math.max(insetsBottom, 10);
  if (isStandaloneWeb()) return Math.max(insetsBottom, 16);
  return 10;
}
