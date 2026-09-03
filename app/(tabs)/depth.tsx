import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DepthFieldView } from '@/components/DepthFieldView';
import { PlaybookPanel } from '@/components/PlaybookPanel';
import { SectionHeader } from '@/components/SectionHeader';
import { Segmented } from '@/components/Segmented';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { depthFor, team } from '@/data/tech';
import type { Unit } from '@/data/types';

const UNITS: { key: Unit; label: string }[] = [
  { key: 'offense', label: 'Offense' },
  { key: 'defense', label: 'Defense' },
  { key: 'special', label: 'Special' },
];

type ViewMode = 'list' | 'field' | 'playbook';

export default function DepthScreen() {
  const [unit, setUnit] = useState<Unit>('offense');
  const [view, setView] = useState<ViewMode>('list');
  const rows = depthFor(unit);

  const sub =
    view === 'playbook'
      ? 'For dummies first — then drill into plays, coaches, and concepts'
      : view === 'field'
        ? 'O = offense · X = defense · tap a spot for depth'
        : `${
            unit === 'offense' ? team.offense : unit === 'defense' ? team.defense : 'Special teams'
          } · Week 1 projection`;

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.kicker}>WEEK 1</Text>
        <Text style={styles.title}>Depth Chart</Text>
        <Text style={styles.sub}>{sub}</Text>
      </FadeIn>

      <FadeIn delay={50} style={{ marginTop: spacing.sm }}>
        <Segmented
          options={[
            { key: 'list', label: 'List' },
            { key: 'field', label: 'Field' },
            { key: 'playbook', label: 'Playbook' },
          ]}
          value={view}
          onChange={setView}
        />
      </FadeIn>

      {view === 'playbook' ? (
        <FadeIn delay={90} style={{ marginTop: spacing.sm }}>
          <PlaybookPanel />
        </FadeIn>
      ) : view === 'field' ? (
        <FadeIn delay={90} style={{ marginTop: spacing.sm }}>
          <DepthFieldView />
        </FadeIn>
      ) : (
        <>
          <FadeIn delay={70} style={{ marginTop: spacing.sm }}>
            <Segmented options={UNITS} value={unit} onChange={setUnit} />
          </FadeIn>

          <FadeIn delay={120}>
            <SectionHeader
              title={UNITS.find((u) => u.key === unit)?.label ?? 'Depth'}
              subtitle="Tap a name for career stats"
              right="1 · 2 · 3"
            />
            {rows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={styles.pos}>{row.label}</Text>
                <View style={styles.slots}>
                  {row.slots.map((slot, idx) => {
                    const body = (
                      <View style={styles.slot}>
                        <Text style={[styles.slotNum, idx === 0 && styles.slotNumStarter]}>
                          #{slot.number}
                        </Text>
                        <Text
                          style={[styles.slotName, idx === 0 && styles.slotNameStarter]}
                          numberOfLines={1}
                        >
                          {slot.name}
                        </Text>
                      </View>
                    );
                    if (!slot.id) return <View key={`${row.label}-${idx}`}>{body}</View>;
                    return (
                      <Link key={`${row.label}-${idx}`} href={`/player/${slot.id}`} asChild>
                        <Pressable>{body}</Pressable>
                      </Link>
                    );
                  })}
                </View>
              </View>
            ))}
          </FadeIn>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.8,
    marginTop: spacing.xs,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 36,
    marginTop: 4,
  },
  sub: { fontFamily: 'DMSans_400Regular', color: colors.mistDim, fontSize: 14, marginTop: 6 },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  pos: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  slots: { gap: 4 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  slotNum: {
    width: 40,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: colors.mistDim,
    fontSize: 15,
  },
  slotNumStarter: { color: colors.gold, fontSize: 17 },
  slotName: { flex: 1, fontFamily: 'DMSans_500Medium', color: colors.mist, fontSize: 15 },
  slotNameStarter: { fontFamily: 'DMSans_700Bold', color: colors.white, fontSize: 16 },
});
