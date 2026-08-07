import { DeviceEventEmitter } from 'react-native';

export const TAB_SCROLL_TO_TOP = 'gt-tab-scroll-to-top';

/** Ask the focused Screen scroll view to jump to top. */
export function requestTabScrollToTop() {
  DeviceEventEmitter.emit(TAB_SCROLL_TO_TOP);
}
