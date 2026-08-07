import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import {
  AskMessage,
  SAMPLE_QUESTIONS,
  defaultFollowUps,
  welcomeMessage,
} from '@/lib/askBuzz';
import { askBuzzSmart } from '@/lib/askClient';

type Props = {
  /** Extra bottom padding inside the scroll area */
  contentBottom?: number;
  /** Called before navigating from an answer link (e.g. close modal). */
  onNavigate?: () => void;
};

/**
 * Shared Ask Buzz transcript + composer.
 * Starter samples show only before the first question; afterward, compact follow-ups.
 */
export function AskChatPanel({ contentBottom = 8, onNavigate }: Props) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AskMessage[]>(() => [welcomeMessage()]);
  const scrollRef = useRef<ScrollView>(null);
  const started = messages.some((m) => m.role === 'user');

  const suggestions = useMemo(() => {
    if (!started) return SAMPLE_QUESTIONS;
    const lastBuzz = [...messages].reverse().find((m) => m.role === 'buzz');
    return (lastBuzz?.followUps?.length ? lastBuzz.followUps : defaultFollowUps()).slice(0, 3);
  }, [messages, started]);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages, suggestions]);

  async function send(text: string) {
    const q = text.trim();
    if (!q) return;
    const userMsg: AskMessage = { id: `u-${Date.now()}`, role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    const reply = await askBuzzSmart(q);
    setMessages((prev) => [...prev, reply]);
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.transcript, { paddingBottom: contentBottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((m) => (
          <View
            key={m.id}
            style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.buzzBubble]}
          >
            {m.role === 'buzz' ? <Text style={styles.buzzLabel}>BUZZ</Text> : null}
            <Text style={[styles.bubbleText, m.role === 'user' && styles.userText]}>{m.text}</Text>
            {m.links?.length ? (
              <View style={styles.links}>
                {m.links.map((l) => (
                  <Pressable
                    key={l.href + l.label}
                    onPress={() => {
                      onNavigate?.();
                      router.push(l.href as never);
                    }}
                    style={styles.linkChip}
                  >
                    <Text style={styles.linkText}>{l.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <View style={styles.suggestRow}>
        <Text style={styles.suggestLabel}>{started ? 'NEXT' : 'TRY'}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestScroll}
          keyboardShouldPersistTaps="handled"
        >
          {suggestions.map((s) => (
            <Pressable key={s} onPress={() => send(s)} style={styles.suggestChip}>
              <Text style={styles.suggestText} numberOfLines={1}>
                {s}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about a player, jersey, schedule…"
          placeholderTextColor={colors.mistDim}
          style={styles.input}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <Pressable
          onPress={() => send(input)}
          style={[styles.sendBtn, !input.trim() && styles.sendDisabled]}
          disabled={!input.trim()}
        >
          <Text style={styles.sendText}>Ask</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  transcript: { gap: 10, paddingTop: 8 },
  bubble: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: '94%',
  },
  buzzBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.navyDeep,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.gold },
  buzzLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  bubbleText: {
    fontFamily: 'DMSans_400Regular',
    color: colors.white,
    fontSize: 14,
    lineHeight: 20,
  },
  userText: { color: colors.navy, fontFamily: 'DMSans_500Medium' },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  linkChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gold,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  linkText: { fontFamily: 'DMSans_700Bold', color: colors.gold, fontSize: 11 },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  suggestLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mistDim,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  suggestScroll: { gap: 6, paddingRight: 4, alignItems: 'center' },
  suggestChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: 220,
    backgroundColor: colors.navyDeep,
  },
  suggestText: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 12,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'DMSans_400Regular',
    color: colors.white,
    fontSize: 16, // iOS Safari zooms inputs under 16px
    backgroundColor: colors.navyDeep,
  },
  sendBtn: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingHorizontal: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
  sendText: { fontFamily: 'DMSans_700Bold', color: colors.navy, fontSize: 14 },
});
