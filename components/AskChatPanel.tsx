import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii } from '@/constants/theme';
import {
  AskMessage,
  SAMPLE_QUESTIONS,
  defaultFollowUps,
  welcomeMessage,
} from '@/lib/askBuzz';
import { askBuzzSmart } from '@/lib/askClient';
import { ASK_TOPICS, AskTopicId, topicById } from '@/lib/askTopics';

type Props = {
  /** Extra bottom padding inside the scroll area */
  contentBottom?: number;
  /** Called before navigating from an answer link (e.g. close modal). */
  onNavigate?: () => void;
};

/**
 * Shared Ask Buzz transcript + composer.
 * Empty state: browse by topic → tap a ready-made question.
 * After chatting: compact follow-ups + optional topic reopen.
 */
export function AskChatPanel({ contentBottom = 8, onNavigate }: Props) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AskMessage[]>(() => [welcomeMessage()]);
  const [topicId, setTopicId] = useState<AskTopicId | null>(null);
  const [browseOpen, setBrowseOpen] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const started = messages.some((m) => m.role === 'user');
  const activeTopic = topicById(topicId);

  const suggestions = useMemo(() => {
    if (!started) return SAMPLE_QUESTIONS;
    const lastBuzz = [...messages].reverse().find((m) => m.role === 'buzz');
    return (lastBuzz?.followUps?.length ? lastBuzz.followUps : defaultFollowUps()).slice(0, 3);
  }, [messages, started]);

  useEffect(() => {
    if (!started) return;
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages, suggestions, started]);

  async function send(text: string) {
    const q = text.trim();
    if (!q) return;
    const userMsg: AskMessage = { id: `u-${Date.now()}`, role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBrowseOpen(false);
    const reply = await askBuzzSmart(q);
    setMessages((prev) => [...prev, reply]);
  }

  function openAskLink(href: string) {
    if (/^https?:\/\//i.test(href)) {
      void Linking.openURL(href);
      return;
    }
    onNavigate?.();
    router.push(href as never);
  }

  function pickTopic(id: AskTopicId) {
    setTopicId((prev) => (prev === id ? null : id));
    setBrowseOpen(true);
  }

  const showBrowse = !started || browseOpen;

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
            <Text
              selectable
              style={[styles.bubbleText, m.role === 'user' && styles.userText]}
            >
              {m.text}
            </Text>
            {m.links?.length ? (
              <View style={styles.links}>
                {m.links.map((l) => (
                  <Pressable
                    key={l.href + l.label}
                    onPress={() => openAskLink(l.href)}
                    style={styles.linkChip}
                    accessibilityRole="link"
                    accessibilityLabel={l.label}
                  >
                    <Text style={styles.linkText}>{l.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ))}

        {showBrowse ? (
          <View style={styles.browse}>
            <View style={styles.browseHead}>
              <Text style={styles.browseKicker}>BROWSE BY TOPIC</Text>
              {started ? (
                <Pressable onPress={() => setBrowseOpen(false)} hitSlop={8}>
                  <Text style={styles.browseHide}>Hide</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.topicGrid}>
              {ASK_TOPICS.map((t) => {
                const on = topicId === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => pickTopic(t.id)}
                    style={[styles.topicChip, on && styles.topicChipOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.topicLabel, on && styles.topicLabelOn]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {activeTopic ? (
              <View style={styles.askList}>
                <Text style={styles.askListKicker}>WHAT CAN I ASK</Text>
                <Text style={styles.askListBlurb}>{activeTopic.blurb}</Text>
                {activeTopic.questions.map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => send(q)}
                    style={({ pressed }) => [styles.askRow, pressed && styles.askRowPressed]}
                  >
                    <Text style={styles.askRowText}>{q}</Text>
                    <Text style={styles.askRowGo}>Ask</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.browseHint}>
                Tap a topic for ready-made questions — or type your own below.
              </Text>
            )}
          </View>
        ) : null}
      </ScrollView>

      {started && !browseOpen ? (
        <Pressable
          onPress={() => setBrowseOpen(true)}
          style={styles.browseAgain}
          accessibilityRole="button"
        >
          <Text style={styles.browseAgainText}>Browse topics</Text>
        </Pressable>
      ) : null}

      {started ? (
        <View style={styles.suggestRow}>
          <Text style={styles.suggestLabel}>NEXT</Text>
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
      ) : null}

      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Or type a question…"
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
    borderRadius: radii.xl,
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
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  linkText: { fontFamily: 'DMSans_700Bold', color: colors.gold, fontSize: 11 },

  browse: {
    marginTop: 4,
    gap: 12,
    paddingTop: 4,
  },
  browseHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  browseKicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  browseHide: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mistDim,
    fontSize: 12,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.navyDeep,
  },
  topicChipOn: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(179,144,81,0.14)',
  },
  topicLabel: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 13,
  },
  topicLabelOn: {
    color: colors.gold,
    fontFamily: 'DMSans_700Bold',
  },
  browseHint: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 13,
    lineHeight: 18,
  },
  askList: {
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 12,
  },
  askListKicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mistDim,
    fontSize: 10,
    letterSpacing: 1.3,
  },
  askListBlurb: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 13,
    marginBottom: 4,
  },
  askRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  askRowPressed: { opacity: 0.7 },
  askRowText: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    color: colors.white,
    fontSize: 14,
    lineHeight: 20,
  },
  askRowGo: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 0.4,
  },

  browseAgain: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  browseAgainText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 0.6,
  },

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
    borderRadius: radii.md,
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
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'DMSans_400Regular',
    color: colors.white,
    fontSize: 16,
    backgroundColor: colors.navyDeep,
  },
  sendBtn: {
    backgroundColor: colors.gold,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
  sendText: { fontFamily: 'DMSans_700Bold', color: colors.navy, fontSize: 14 },
});
