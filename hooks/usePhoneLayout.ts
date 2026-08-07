import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function usePhoneLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 390;
  const short = height < 740;
  // Tab bar is in-flow now; only need a little scroll breathing room + FAB clearance.
  const bottomFloor = Platform.OS === 'web' ? Math.max(insets.bottom, 12) : Math.max(insets.bottom, 10);
  return {
    width,
    height,
    compact,
    short,
    pagePad: compact ? 16 : 24,
    contentBottom: bottomFloor + (short ? 28 : 36),
  };
}
