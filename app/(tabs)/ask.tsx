import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { AskChatPanel } from '@/components/AskChatPanel';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';

/** Full-page Ask Buzz — same free local guide as the floating button. */
export default function AskScreen() {
  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FadeIn style={styles.head}>
          <Image source={require('@/assets/images/gt-logo.png')} style={styles.logo} />
          <View style={styles.headMeta}>
            <Text style={styles.kicker}>FREE · ON-DEVICE</Text>
            <Text style={styles.title}>Ask Buzz</Text>
            <Text style={styles.sub}>Curated team knowledge · on-device search · no API fees.</Text>
          </View>
        </FadeIn>

        <View style={styles.panel}>
          <AskChatPanel />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  logo: { width: 40, height: 40 },
  headMeta: { flex: 1 },
  kicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 24,
    marginTop: 2,
  },
  sub: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
    marginTop: 2,
  },
  panel: { flex: 1, paddingHorizontal: spacing.md, paddingBottom: 4 },
});
