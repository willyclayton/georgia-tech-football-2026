import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { ComponentProps, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { getLastTab, setLastTab } from '@/lib/lastTab';
import { requestTabScrollToTop } from '@/lib/tabScroll';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: {
  name: string;
  href: string;
  label: string;
  icon: IconName;
  match: (path: string) => boolean;
}[] = [
  {
    name: 'index',
    href: '/',
    label: 'Home',
    icon: 'home',
    match: (p) => p === '/' || p === '',
  },
  {
    name: 'roster',
    href: '/roster',
    label: 'Roster',
    icon: 'people',
    match: (p) => p.startsWith('/roster'),
  },
  {
    name: 'depth',
    href: '/depth',
    label: 'Depth',
    icon: 'layers',
    match: (p) => p.startsWith('/depth'),
  },
  {
    name: 'schedule',
    href: '/schedule',
    label: 'Schedule',
    icon: 'calendar',
    match: (p) => p.startsWith('/schedule'),
  },
  {
    name: 'standings',
    href: '/standings',
    label: 'Standings',
    icon: 'trophy',
    match: (p) => p.startsWith('/standings'),
  },
  {
    name: 'ask',
    href: '/ask',
    label: 'Ask',
    icon: 'chatbubble-ellipses',
    match: (p) => p.startsWith('/ask'),
  },
];

function resolveActiveTab(pathname: string) {
  if (pathname.startsWith('/player') || pathname.startsWith('/opponent')) {
    return getLastTab();
  }
  const hit = TABS.find((t) => t.match(pathname));
  return hit?.name ?? 'index';
}

export function MainTabBar() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [barHeight, setBarHeight] = useState(Platform.OS === 'web' ? 88 : 64);
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 12);
  const onDetail = pathname.startsWith('/player') || pathname.startsWith('/opponent');
  const current = resolveActiveTab(pathname);

  useEffect(() => {
    if (!onDetail) {
      const hit = TABS.find((t) => t.match(pathname));
      if (hit) setLastTab(hit.name);
    }
  }, [pathname, onDetail]);

  const onPressTab = (tab: (typeof TABS)[number]) => {
    const onThisTab = current === tab.name && !onDetail;

    if (onThisTab) {
      requestTabScrollToTop();
      return;
    }

    setLastTab(tab.name);

    if (onDetail) {
      // Leave the detail stack so Back from the tab doesn't return to the player
      router.replace(tab.href as never);
      return;
    }

    router.navigate(tab.href as never);
    // Switching tabs should also land at the top of the destination
    requestAnimationFrame(() => requestTabScrollToTop());
  };

  const bar = (
    <View
      style={[styles.bar, { paddingBottom: bottomPad }]}
      accessibilityRole="tablist"
      onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
    >
      {TABS.map((tab) => {
        const focused = current === tab.name;
        const color = focused ? colors.gold : colors.mistDim;
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => onPressTab(tab)}
            style={styles.item}
          >
            <Ionicons name={tab.icon} size={20} color={color} />
            <Text style={[styles.label, { color }]} numberOfLines={1} allowFontScaling={false}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <>
        <View style={{ height: barHeight }} pointerEvents="none" />
        <View style={styles.fixedWrap}>{bar}</View>
      </>
    );
  }

  return bar;
}

const styles = StyleSheet.create({
  fixedWrap: {
    position: 'fixed' as unknown as 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    marginHorizontal: 'auto' as unknown as number,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.navyDeep,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
    paddingTop: 2,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
    paddingBottom: 1,
  },
});
