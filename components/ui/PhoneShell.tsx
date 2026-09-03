import { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors } from '@/constants/theme';

export function PhoneShell({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const constrain = Platform.OS === 'web' && width > 480;

  if (!constrain) {
    return <View style={styles.fill}>{children}</View>;
  }

  return (
    <View style={styles.desktop}>
      <View style={styles.phone}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    position: 'relative',
    minHeight: 0,
    width: '100%',
    ...Platform.select({
      web: {
        height: '100%' as unknown as number,
        flexGrow: 1,
        flexShrink: 1,
      },
      default: {},
    }),
  },
  desktop: {
    flex: 1,
    backgroundColor: colors.navyDeep,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    minHeight: 0,
    ...Platform.select({
      web: { height: '100%' as unknown as number },
      default: {},
    }),
  },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    maxHeight: 932,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.navy,
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0 18px 40px rgba(0,0,0,0.45)' } as object,
      default: {},
    }),
  },
});
