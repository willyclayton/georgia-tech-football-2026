import { usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AskChatPanel } from '@/components/AskChatPanel';
import { colors, spacing } from '@/constants/theme';
import { chromeAwareBottomPad } from '@/lib/webChrome';

export function AskBuzz() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const pulse = useRef(new Animated.Value(0.85)).current;
  const onAskTab = pathname?.includes('/ask');

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.85, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Sit just above the in-flow custom tab bar (icon + label + bottom pad)
  const fabBottom = chromeAwareBottomPad(insets.bottom) + 78;

  return (
    <>
      {!onAskTab ? (
        <Animated.View
          style={[styles.fabWrap, { bottom: fabBottom, transform: [{ scale: pulse }] }]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={() => setOpen(true)}
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel="Ask Buzz"
          >
            <Image source={require('@/assets/images/gt-logo.png')} style={styles.fabLogo} />
            <View style={styles.fabTextCol}>
              <Text style={styles.fabKicker}>ASK</Text>
              <Text style={styles.fabTitle}>BUZZ</Text>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <Image source={require('@/assets/images/gt-logo.png')} style={styles.headLogo} />
              <View style={styles.headMeta}>
                <Text style={styles.headTitle}>Ask Buzz</Text>
                <Text style={styles.headSub}>Browse topics · tap a question · no API</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={12} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.panel}>
              <AskChatPanel onNavigate={() => setOpen(false)} />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: 14,
    zIndex: 50,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.gold,
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 8,
    borderRadius: 999,
    minHeight: 52,
    ...Platform.select({
      web: { boxShadow: '0 8px 20px rgba(0,0,0,0.35)', cursor: 'pointer' } as object,
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      },
    }),
  },
  fabLogo: { width: 34, height: 34 },
  fabTextCol: { justifyContent: 'center' },
  fabKicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.navy,
    fontSize: 9,
    letterSpacing: 1.6,
    lineHeight: 11,
  },
  fabTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.navy,
    fontSize: 16,
    letterSpacing: 0.6,
    lineHeight: 18,
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(3,15,28,0.72)' },
  sheet: {
    backgroundColor: colors.navyLift,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '88%',
    minHeight: '58%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: spacing.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginTop: 10,
    marginBottom: 8,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  headLogo: { width: 36, height: 36 },
  headMeta: { flex: 1 },
  headTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 20,
  },
  headSub: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.mist, fontSize: 18 },
  panel: { flex: 1, minHeight: 280 },
});
