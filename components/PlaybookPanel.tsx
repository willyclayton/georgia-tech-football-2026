import { Link } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { playbookFor, type SidePlaybook } from '@/data/playbook';
import { depthFor } from '@/data/tech';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Side = 'offense' | 'defense';

function Accordion({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.acc}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onToggle();
        }}
        style={styles.accHead}
      >
        <View style={styles.accHeadText}>
          <Text style={styles.accTitle}>{title}</Text>
          {subtitle ? <Text style={styles.accSub}>{subtitle}</Text> : null}
        </View>
        <Text style={styles.accChev}>{open ? '−' : '+'}</Text>
      </Pressable>
      {open ? <View style={styles.accBody}>{children}</View> : null}
    </View>
  );
}

function PlayerLink({ depthLabel, side }: { depthLabel: string; side: Side }) {
  const slot = useMemo(() => {
    const row = depthFor(side).find((r) => r.label === depthLabel);
    return row?.slots?.[0] || null;
  }, [depthLabel, side]);

  if (!slot?.id) return null;
  return (
    <Link href={`/player/${slot.id}`} asChild>
      <Pressable style={styles.playerChip}>
        <Text style={styles.playerChipText}>
          #{slot.number} {slot.name} ›
        </Text>
      </Pressable>
    </Link>
  );
}

function SideBook({ book }: { book: SidePlaybook }) {
  const [openPlay, setOpenPlay] = useState<string | null>(book.plays[0]?.id ?? null);
  const [openConcept, setOpenConcept] = useState<string | null>(null);
  const [showDeeperPlay, setShowDeeperPlay] = useState<Record<string, boolean>>({});
  const [showDeeperConcept, setShowDeeperConcept] = useState<Record<string, boolean>>({});

  return (
    <View>
      <Text style={styles.scheme}>{book.scheme}</Text>
      <Text style={styles.tagline}>{book.tagline}</Text>

      <View style={styles.dummy}>
        <Text style={styles.dummyKicker}>FOR DUMMIES</Text>
        <Text style={styles.dummyHead}>{book.dummy.headline}</Text>
        {book.dummy.bullets.map((b) => (
          <Text key={b} style={styles.bullet}>
            · {b}
          </Text>
        ))}
      </View>

      <Text style={styles.section}>Who runs it</Text>
      {book.coaches.map((c) => (
        <View key={c.role} style={styles.coachRow}>
          <Text style={styles.coachRole}>{c.role.toUpperCase()}</Text>
          <Text style={styles.coachName}>{c.name}</Text>
          <Text style={styles.coachNote}>{c.note}</Text>
        </View>
      ))}

      <Text style={styles.section}>Identity</Text>
      {book.identity.map((line) => (
        <Text key={line} style={styles.bullet}>
          · {line}
        </Text>
      ))}

      <Text style={styles.section}>Key players</Text>
      <Text style={styles.sectionHint}>Tied to the current depth chart — tap through to the roster card.</Text>
      {book.players.map((p) => (
        <View key={p.depthLabel} style={styles.playerBlock}>
          <View style={styles.playerHead}>
            <Text style={styles.playerRole}>{p.role}</Text>
            <Text style={styles.playerLabel}>{p.depthLabel}</Text>
          </View>
          <Text style={styles.playerBlurb}>{p.blurb}</Text>
          <PlayerLink depthLabel={p.depthLabel} side={book.id} />
        </View>
      ))}

      <Text style={styles.section}>Plays to know</Text>
      <Text style={styles.sectionHint}>Start simple. Open “Go deeper” when you want the why.</Text>
      {book.plays.map((play) => {
        const open = openPlay === play.id;
        const deeper = !!showDeeperPlay[play.id];
        return (
          <Accordion
            key={play.id}
            title={play.name}
            subtitle={open ? undefined : play.simple.slice(0, 72) + (play.simple.length > 72 ? '…' : '')}
            open={open}
            onToggle={() => setOpenPlay(open ? null : play.id)}
          >
            <Text style={styles.body}>{play.simple}</Text>
            <Pressable
              onPress={() =>
                setShowDeeperPlay((prev) => ({ ...prev, [play.id]: !prev[play.id] }))
              }
              style={styles.deeperBtn}
            >
              <Text style={styles.deeperBtnText}>{deeper ? 'Hide deeper dive' : 'Go deeper'}</Text>
            </Pressable>
            {deeper ? <Text style={styles.deeperBody}>{play.deeper}</Text> : null}
            <Text style={styles.watchLabel}>WATCH FOR</Text>
            <Text style={styles.watchBody}>{play.watchFor}</Text>
          </Accordion>
        );
      })}

      <Text style={styles.section}>Deeper concepts</Text>
      {book.concepts.map((c) => {
        const open = openConcept === c.id;
        const deeper = !!showDeeperConcept[c.id];
        return (
          <Accordion
            key={c.id}
            title={c.title}
            subtitle={open ? undefined : c.simple}
            open={open}
            onToggle={() => setOpenConcept(open ? null : c.id)}
          >
            <Text style={styles.body}>{c.simple}</Text>
            <Pressable
              onPress={() =>
                setShowDeeperConcept((prev) => ({ ...prev, [c.id]: !prev[c.id] }))
              }
              style={styles.deeperBtn}
            >
              <Text style={styles.deeperBtnText}>{deeper ? 'Hide deeper dive' : 'Go deeper'}</Text>
            </Pressable>
            {deeper ? <Text style={styles.deeperBody}>{c.deeper}</Text> : null}
          </Accordion>
        );
      })}

      <Text style={styles.section}>Saturday checklist</Text>
      {book.saturdayTips.map((t) => (
        <Text key={t} style={styles.bullet}>
          · {t}
        </Text>
      ))}
    </View>
  );
}

export function PlaybookPanel() {
  const [side, setSide] = useState<Side>('offense');
  const book = playbookFor(side);

  return (
    <View>
      <View style={styles.sideRow}>
        {(['offense', 'defense'] as Side[]).map((key) => {
          const on = side === key;
          return (
            <Pressable
              key={key}
              onPress={() => setSide(key)}
              style={[styles.sideChip, on ? styles.sideChipOn : null]}
            >
              <Text style={[styles.sideChipText, on ? styles.sideChipTextOn : null]}>
                {key === 'offense' ? 'Offense' : 'Defense'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <SideBook key={side} book={book} />
    </View>
  );
}

const styles = StyleSheet.create({
  sideRow: { flexDirection: 'row', marginBottom: spacing.md },
  sideChip: {
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
  },
  sideChipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  sideChipText: { fontFamily: 'DMSans_700Bold', color: colors.mist, fontSize: 13 },
  sideChipTextOn: { color: colors.navy },
  scheme: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 1.6,
  },
  tagline: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: colors.white,
    fontSize: 22,
    marginTop: 6,
    marginBottom: spacing.sm,
  },
  dummy: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
  },
  dummyKicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  dummyHead: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 20,
    marginBottom: 10,
  },
  bullet: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 6,
  },
  section: {
    marginTop: spacing.md,
    marginBottom: 6,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 20,
  },
  sectionHint: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 13,
    marginBottom: 10,
  },
  coachRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  coachRole: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  coachName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 18,
    marginTop: 2,
  },
  coachNote: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  playerBlock: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  playerHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  playerRole: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 17,
  },
  playerLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 1,
  },
  playerBlurb: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  playerChip: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 6 },
  playerChipText: { fontFamily: 'DMSans_700Bold', color: colors.gold, fontSize: 13 },
  acc: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  accHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 48,
  },
  accHeadText: { flex: 1, paddingRight: 12 },
  accTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 17,
  },
  accSub: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 13,
    marginTop: 3,
  },
  accChev: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.gold,
    fontSize: 22,
    width: 24,
    textAlign: 'center',
  },
  accBody: { paddingBottom: 14 },
  body: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 14,
    lineHeight: 21,
  },
  deeperBtn: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 6 },
  deeperBtnText: { fontFamily: 'DMSans_700Bold', color: colors.gold, fontSize: 13 },
  deeperBody: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    color: colors.white,
    fontSize: 14,
    lineHeight: 21,
  },
  watchLabel: {
    marginTop: 12,
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  watchBody: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 14,
    lineHeight: 20,
  },
});
