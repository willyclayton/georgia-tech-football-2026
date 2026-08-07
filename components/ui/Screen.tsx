import { PropsWithChildren, useEffect, useRef } from 'react';
import { DeviceEventEmitter, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';
import { TAB_SCROLL_TO_TOP } from '@/lib/tabScroll';

type Props = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: ViewStyle;
  padded?: boolean;
}>;

export function Screen({ children, scroll = true, contentStyle, padded = true }: Props) {
  const { pagePad, contentBottom } = usePhoneLayout();
  const scrollRef = useRef<ScrollView>(null);
  const padStyle = padded
    ? { paddingHorizontal: pagePad, paddingBottom: contentBottom }
    : { paddingBottom: contentBottom };

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(TAB_SCROLL_TO_TOP, () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return () => sub.remove();
  }, []);

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={styles.fill}
      contentContainerStyle={[styles.content, padStyle, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padStyle, contentStyle]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.navyLift, colors.navy, colors.navyDeep]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {body}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  safe: { flex: 1 },
  content: { paddingTop: 4 },
  fill: { flex: 1 },
});
