import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

type Props = {
  size?: 'sm' | 'lg';
  record?: string;
};

export function BrandMark({ size = 'sm', record }: Props) {
  const { compact } = usePhoneLayout();
  const large = size === 'lg';
  const logoSize = large ? (compact ? 48 : 56) : 34;

  return (
    <View style={styles.wrap}>
      <Image
        source={require('@/assets/images/gt-logo.png')}
        style={{ width: logoSize, height: logoSize }}
        resizeMode="contain"
        accessibilityLabel="Georgia Tech Yellow Jackets logo"
      />
      <View style={styles.textCol}>
        <Text style={[styles.word, large && styles.wordLg, large && compact && styles.wordCompact]}>
          GEORGIA TECH
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.sub}>YELLOW JACKETS</Text>
          {record ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.record}>{record}</Text>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textCol: { flexShrink: 1 },
  word: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 22,
    letterSpacing: 1.5,
    lineHeight: 24,
  },
  wordLg: { fontSize: 28, lineHeight: 30, letterSpacing: 2 },
  wordCompact: { fontSize: 24, lineHeight: 26 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  sub: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 2.2,
  },
  dot: { color: colors.mistDim, fontSize: 12 },
  record: { fontFamily: 'DMSans_500Medium', color: colors.mist, fontSize: 12 },
});
