import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

type Props = { title: string; subtitle?: string; right?: string };

export function SectionHeader({ title, subtitle, right }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <Text style={styles.right}>{right}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: { flex: 1 },
  title: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: colors.white,
    fontSize: 22,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 13,
    marginTop: 2,
  },
  right: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 4,
  },
});
