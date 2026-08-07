import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { depthFor } from '@/data/tech';
import type { DepthRow, DepthSlot } from '@/data/types';

type Side = 'offense' | 'defense';

type Spot = {
  key: string;
  label: string;
  side: Side;
  /** 0–100 from left */
  x: number;
  /** 0–100 from top */
  y: number;
  row: DepthRow;
};

/** Approximate 11-personnel offense (bottom) and nickel defense (top). */
const OFFENSE_SPOTS: { label: string; x: number; y: number }[] = [
  { label: 'WR-X', x: 10, y: 58 },
  { label: 'WR-SL', x: 26, y: 62 },
  { label: 'LT', x: 22, y: 72 },
  { label: 'LG', x: 36, y: 72 },
  { label: 'C', x: 50, y: 72 },
  { label: 'RG', x: 64, y: 72 },
  { label: 'RT', x: 78, y: 72 },
  { label: 'TE', x: 90, y: 68 },
  { label: 'WR-Z', x: 90, y: 58 },
  { label: 'QB', x: 50, y: 82 },
  { label: 'RB', x: 42, y: 90 },
];

const DEFENSE_SPOTS: { label: string; x: number; y: number }[] = [
  { label: 'LCB', x: 10, y: 28 },
  { label: 'NB', x: 28, y: 32 },
  { label: 'FS', x: 42, y: 14 },
  { label: 'SS', x: 58, y: 14 },
  { label: 'RCB', x: 90, y: 28 },
  { label: 'MLB', x: 38, y: 38 },
  { label: 'WLB', x: 62, y: 38 },
  { label: 'DE', x: 18, y: 48 },
  { label: 'NT', x: 38, y: 50 },
  { label: 'DT', x: 58, y: 50 },
  { label: 'RUSH', x: 82, y: 48 },
];

const FIELD_H = 420;

function buildSpots(): Spot[] {
  const offense = depthFor('offense');
  const defense = depthFor('defense');
  const byLabel = (rows: DepthRow[], label: string) =>
    rows.find((r) => r.label === label) || { label, slots: [] as DepthSlot[] };

  return [
    ...DEFENSE_SPOTS.map((s) => ({
      key: `d-${s.label}`,
      label: s.label,
      side: 'defense' as const,
      x: s.x,
      y: s.y,
      row: byLabel(defense, s.label),
    })),
    ...OFFENSE_SPOTS.map((s) => ({
      key: `o-${s.label}`,
      label: s.label,
      side: 'offense' as const,
      x: s.x,
      y: s.y,
      row: byLabel(offense, s.label),
    })),
  ];
}

function starterLabel(row: DepthRow) {
  const s = row.slots[0];
  if (!s) return '—';
  return `#${s.number}`;
}

export function DepthFieldView() {
  const spots = useMemo(() => buildSpots(), []);
  const [selected, setSelected] = useState<string | null>(null);
  const [fieldW, setFieldW] = useState(0);

  const active = spots.find((s) => s.key === selected) || null;
  const markerSize = fieldW > 0 ? Math.max(34, Math.min(44, fieldW * 0.11)) : 38;

  const onFieldLayout = (e: LayoutChangeEvent) => {
    setFieldW(e.nativeEvent.layout.width);
  };

  return (
    <View>
      <Text style={styles.legend}>
        <Text style={styles.legendO}>O</Text> offense · <Text style={styles.legendX}>X</Text> defense ·
        tap a spot to expand depth
      </Text>

      <View style={styles.field} onLayout={onFieldLayout}>
        <View style={[styles.band, { top: 0, backgroundColor: '#082816' }]} />
        <View style={[styles.band, { top: FIELD_H * 0.2, backgroundColor: '#0A301C' }]} />
        <View style={[styles.band, { top: FIELD_H * 0.4, backgroundColor: '#082816' }]} />
        <View style={[styles.band, { top: FIELD_H * 0.6, backgroundColor: '#0A301C' }]} />
        <View style={[styles.band, { top: FIELD_H * 0.8, backgroundColor: '#082816' }]} />
        <View style={[styles.midLine, { top: FIELD_H * 0.52 - 1 }]} />
        <Text style={styles.endLabelTop}>DEFENSE</Text>
        <Text style={styles.endLabelBottom}>OFFENSE</Text>

        {fieldW > 0
          ? spots.map((spot) => {
              const on = selected === spot.key;
              const mark = spot.side === 'offense' ? 'O' : 'X';
              const left = (spot.x / 100) * fieldW - markerSize / 2;
              const top = (spot.y / 100) * FIELD_H - markerSize / 2;
              return (
                <Pressable
                  key={spot.key}
                  onPress={() => setSelected(on ? null : spot.key)}
                  style={[
                    styles.marker,
                    {
                      left,
                      top,
                      width: markerSize,
                      height: markerSize,
                    },
                    spot.side === 'offense' ? styles.markerO : styles.markerX,
                    on ? styles.markerOn : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${spot.label} ${starterLabel(spot.row)}`}
                >
                  <Text style={[styles.markGlyph, on ? styles.markGlyphOn : null]}>{mark}</Text>
                  <Text style={[styles.markPos, on ? styles.markPosOn : null]} numberOfLines={1}>
                    {spot.label}
                  </Text>
                  <Text style={[styles.markNum, on ? styles.markNumOn : null]} numberOfLines={1}>
                    {starterLabel(spot.row)}
                  </Text>
                </Pressable>
              );
            })
          : null}
      </View>

      {active ? (
        <View style={styles.expand}>
          <View style={styles.expandHead}>
            <Text style={styles.expandSide}>
              {active.side === 'offense' ? 'OFFENSE' : 'DEFENSE'}
            </Text>
            <Text style={styles.expandTitle}>{active.label}</Text>
            <Pressable onPress={() => setSelected(null)} hitSlop={12}>
              <Text style={styles.expandClose}>Close</Text>
            </Pressable>
          </View>
          {active.row.slots.length ? (
            active.row.slots.map((slot, idx) => {
              const body = (
                <View style={styles.depthRow}>
                  <Text style={[styles.depthRank, idx === 0 ? styles.depthRankOne : null]}>
                    {idx + 1}
                  </Text>
                  <View style={styles.depthMeta}>
                    <Text style={[styles.depthName, idx === 0 ? styles.depthNameOne : null]}>
                      #{slot.number} {slot.name}
                    </Text>
                    <Text style={styles.depthPos}>
                      {slot.position}
                      {idx === 0 ? ' · starter' : ` · depth ${idx + 1}`}
                    </Text>
                  </View>
                  <Text style={styles.depthChev}>›</Text>
                </View>
              );
              if (!slot.id) {
                return (
                  <View key={`${active.key}-${idx}`} style={styles.depthWrap}>
                    {body}
                  </View>
                );
              }
              return (
                <Link key={`${active.key}-${idx}`} href={`/player/${slot.id}`} asChild>
                  <Pressable style={styles.depthWrap}>{body}</Pressable>
                </Link>
              );
            })
          ) : (
            <Text style={styles.emptyDepth}>No depth listed for this spot.</Text>
          )}
        </View>
      ) : (
        <Text style={styles.hint}>Select an O or X to see 1 · 2 · 3 depth and open a player.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  legendO: { fontFamily: 'SpaceGrotesk_700Bold', color: colors.gold },
  legendX: { fontFamily: 'SpaceGrotesk_700Bold', color: colors.white },
  field: {
    height: FIELD_H,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    position: 'relative',
    backgroundColor: '#082816',
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: FIELD_H / 5,
  },
  midLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: colors.gold,
    opacity: 0.55,
  },
  endLabelTop: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'DMSans_700Bold',
    color: 'rgba(255,255,255,0.28)',
    fontSize: 10,
    letterSpacing: 2,
  },
  endLabelBottom: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'DMSans_700Bold',
    color: 'rgba(255,255,255,0.28)',
    fontSize: 10,
    letterSpacing: 2,
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 1,
    zIndex: 2,
  },
  markerO: {
    backgroundColor: colors.navy,
    borderColor: colors.gold,
  },
  markerX: {
    backgroundColor: colors.navyDeep,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  markerOn: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    zIndex: 5,
  },
  markGlyph: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.gold,
    fontSize: 12,
    lineHeight: 14,
  },
  markGlyphOn: { color: colors.navy },
  markPos: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mist,
    fontSize: 8,
    letterSpacing: 0.3,
    lineHeight: 10,
  },
  markPosOn: { color: colors.navy },
  markNum: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: colors.white,
    fontSize: 9,
    lineHeight: 11,
  },
  markNumOn: { color: colors.navyDeep },
  expand: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  expandHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  expandSide: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1.2,
    marginRight: 10,
  },
  expandTitle: {
    flex: 1,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 22,
  },
  expandClose: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 13,
  },
  depthWrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  depthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  depthRank: {
    width: 28,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.mistDim,
    fontSize: 18,
  },
  depthRankOne: { color: colors.gold },
  depthMeta: { flex: 1 },
  depthName: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 16,
  },
  depthNameOne: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
  },
  depthPos: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
    marginTop: 2,
  },
  depthChev: { color: colors.mistDim, fontSize: 20, marginLeft: 8 },
  emptyDepth: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 14,
    paddingVertical: 12,
  },
  hint: {
    marginTop: spacing.md,
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 13,
  },
});
