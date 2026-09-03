import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { Segmented } from '@/components/Segmented';
import {
  CURRENT_SEASON,
  PRIOR_SEASON,
  collegeStops,
  depthRoleFor,
  getPlayer,
  orderedCareerCategories,
} from '@/data/tech';

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const player = getPlayer(String(id));
  const role = player ? depthRoleFor(player.id) : null;
  const categories = useMemo(
    () => (player ? orderedCareerCategories(player) : []),
    [player]
  );
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [yearView, setYearView] = useState<'current' | 'prior' | 'career'>('current');
  const selectedName = activeCat ?? categories[0]?.name ?? null;
  const selected = categories.find((c) => c.name === selectedName) ?? categories[0];
  const yearFilter = yearView === 'current' ? CURRENT_SEASON : yearView === 'prior' ? PRIOR_SEASON : null;
  const yearRows = selected
    ? yearFilter == null
      ? selected.rows
      : selected.rows.filter((row) => Number(row.year) === yearFilter)
    : [];
  const yearLine = yearRows[0]?.display;
  const headlines =
    yearView === 'career' && selected?.totals
      ? (selected.labels || []).slice(0, 4).map((lab) => ({
          label: lab,
          value: selected.totals?.[lab] ?? '—',
        }))
      : yearLine
        ? (selected?.labels || []).slice(0, 4).map((lab) => ({
            label: lab,
            value: yearLine[lab] ?? '—',
          }))
        : [];

  if (!player) {
    return (
      <Screen>
        <Text style={styles.missing}>Player not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </Screen>
    );
  }

  const elig = player.eligibility;
  const stops = collegeStops(player);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <FadeIn>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/roster');
          }}
          style={styles.back}
        >
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <View style={styles.heroRow}>
          {player.headshot ? (
            <Image
              source={{
                uri: player.headshot.includes('combiner')
                  ? player.headshot
                  : `https://a.espncdn.com/combiner/i?img=/i/headshots/college-football/players/full/${player.espnId}.png&w=200&h=146`,
              }}
              style={styles.headshot}
            />
          ) : (
            <View style={[styles.headshot, styles.headFallback]}>
              <Text style={styles.headNum}>#{player.number}</Text>
            </View>
          )}
          <View style={styles.heroMeta}>
            <Text style={styles.numberPos}>
              #{player.number} · {player.position}
              {elig?.classAbbr ? ` · ${elig.classAbbr}` : player.year ? ` · ${player.year}` : ''}
            </Text>
            <Text style={styles.name}>{player.name}</Text>
            <Text style={styles.vitals}>
              {player.height} · {player.weight || '—'} lbs
              {player.hometown ? ` · ${player.hometown}` : ''}
            </Text>
            {role ? <Text style={styles.metaLine}>{role}</Text> : null}
          </View>
        </View>
        {player.note ? <Text style={styles.note}>{player.note}</Text> : null}
      </FadeIn>

      <FadeIn delay={50}>
        <Text style={styles.section}>College Stops</Text>
        <View style={styles.stopsRow}>
          {stops.map((t, i) => (
            <View key={`${t.abbr || t.name}-${i}`} style={styles.stopChip}>
              {t.logo ? <Image source={{ uri: t.logo }} style={styles.stopLogo} /> : null}
              <Text style={styles.stopAbbr}>{t.abbr || t.name}</Text>
              {i < stops.length - 1 ? <Text style={styles.stopArrow}>→</Text> : null}
            </View>
          ))}
        </View>
        {elig ? (
          <View style={styles.eligBlock}>
            <Text style={styles.eligLine}>
              <Text style={styles.eligEm}>{elig.class}</Text>
              {' · '}
              {elig.seasonsPlayed === 0
                ? 'no college seasons yet'
                : `${elig.seasonsPlayed} season${elig.seasonsPlayed === 1 ? '' : 's'} played`}
              {elig.seasonsLabel ? ` (${elig.seasonsLabel})` : ''}
              {' · '}
              <Text style={styles.eligLeft}>{elig.yearsLeftLabel}</Text>
            </Text>
            {player.tags[0] ? <Text style={styles.metaLine}>{player.tags[0]}</Text> : null}
          </View>
        ) : null}
      </FadeIn>

      <FadeIn delay={80}>
        <Text style={styles.section}>Stats</Text>
        <View style={{ marginBottom: 12 }}>
          <Segmented
            options={[
              { key: 'current', label: String(CURRENT_SEASON) },
              { key: 'prior', label: String(PRIOR_SEASON) },
              { key: 'career', label: 'Career' },
            ]}
            value={yearView}
            onChange={setYearView}
          />
        </View>
        {categories.length ? (
          <>
            <View style={styles.catTabs}>
              {categories.map((cat) => {
                const on = cat.name === selected?.name;
                return (
                  <Pressable
                    key={cat.name}
                    onPress={() => setActiveCat(cat.name)}
                    style={[styles.catTab, on && styles.catTabOn]}
                  >
                    <Text style={[styles.catTabText, on && styles.catTabTextOn]}>
                      {cat.displayName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {headlines.length ? (
              <View style={styles.kpiRow}>
                {headlines.map((h) => (
                  <View key={h.label} style={styles.kpi}>
                    <Text style={styles.kpiLabel}>{h.label}</Text>
                    <Text style={styles.kpiValue}>{h.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {selected ? (
              <>
                <Text style={styles.subSection}>
                  {selected.displayName}{' '}
                  {yearView === 'career' ? 'by Season' : `· ${yearFilter}`}
                </Text>
                {yearRows.length ? (
                  <>
                    <View style={styles.tableHead}>
                      <Text style={[styles.th, styles.colYear]}>YR</Text>
                      <Text style={[styles.th, styles.colTeam]}>TM</Text>
                      {(selected.labels || []).slice(0, 5).map((lab) => (
                        <Text key={lab} style={[styles.th, styles.colStat]}>
                          {lab}
                        </Text>
                      ))}
                    </View>
                    {[...yearRows].reverse().map((row) => (
                      <View key={`${row.year}-${row.teamAbbr}`} style={styles.tableRow}>
                        <Text style={[styles.td, styles.colYear]}>{row.year}</Text>
                        <Text style={[styles.td, styles.colTeam]}>{row.teamAbbr || '—'}</Text>
                        {(selected.labels || []).slice(0, 5).map((lab) => (
                          <Text key={lab} style={[styles.td, styles.colStat]}>
                            {row.display[lab] ?? '—'}
                          </Text>
                        ))}
                      </View>
                    ))}
                    {yearView === 'career' && selected.totals ? (
                      <View style={[styles.tableRow, styles.totalsRow]}>
                        <Text style={[styles.td, styles.colYear, styles.bold]}>TOT</Text>
                        <Text style={[styles.td, styles.colTeam]} />
                        {(selected.labels || []).slice(0, 5).map((lab) => (
                          <Text key={lab} style={[styles.td, styles.colStat, styles.bold]}>
                            {selected.totals?.[lab] ?? '—'}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.empty}>
                    {yearView === 'current'
                      ? `No ${CURRENT_SEASON} line yet — first snap still ahead.`
                      : `No ${PRIOR_SEASON} ${selected.displayName.toLowerCase()} on file. Flip to Career.`}
                  </Text>
                )}
              </>
            ) : null}
          </>
        ) : (
          <Text style={styles.empty}>No college statistical line yet for this player.</Text>
        )}
        <Text style={styles.source}>
          Career via ESPN · eligibility estimated from seasons with stats
        </Text>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    minHeight: 44,
    alignSelf: 'flex-start',
    paddingRight: 12,
  },
  backChevron: {
    fontFamily: 'DMSans_400Regular',
    color: colors.gold,
    fontSize: 32,
    lineHeight: 32,
  },
  backLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 14,
  },
  heroRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  headshot: {
    width: 76,
    height: 76,
    borderRadius: 6,
    backgroundColor: colors.navyLift,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  headFallback: { alignItems: 'center', justifyContent: 'center' },
  headNum: { fontFamily: 'SpaceGrotesk_700Bold', color: colors.gold, fontSize: 20 },
  heroMeta: { flex: 1, paddingTop: 2 },
  numberPos: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  name: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 26,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  vitals: { fontFamily: 'DMSans_400Regular', color: colors.mistDim, fontSize: 13, marginTop: 3 },
  eligBlock: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  eligLine: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 13,
    lineHeight: 18,
  },
  eligEm: { fontFamily: 'DMSans_700Bold', color: colors.white },
  eligLeft: { fontFamily: 'DMSans_700Bold', color: colors.gold },
  metaLine: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
    marginTop: 3,
  },
  note: {
    marginTop: spacing.sm,
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: colors.white,
    fontSize: 20,
  },
  subSection: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  stopsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  stopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingRight: 4,
  },
  stopLogo: { width: 22, height: 22 },
  stopAbbr: { fontFamily: 'DMSans_700Bold', color: colors.white, fontSize: 13 },
  stopArrow: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 13,
    marginLeft: 2,
  },
  empty: { fontFamily: 'DMSans_400Regular', color: colors.mistDim, fontSize: 14, lineHeight: 20 },
  catTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  catTab: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 4,
  },
  catTabOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  catTabText: { fontFamily: 'DMSans_700Bold', color: colors.mist, fontSize: 12 },
  catTabTextOn: { color: colors.navy },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: {
    width: '47%',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  kpiLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1,
  },
  kpiValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 26,
    marginTop: 2,
  },
  tableHead: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  totalsRow: { borderBottomWidth: 0 },
  th: { fontFamily: 'DMSans_700Bold', color: colors.mistDim, fontSize: 10, letterSpacing: 0.5 },
  td: { fontFamily: 'DMSans_500Medium', color: colors.white, fontSize: 13 },
  bold: { fontFamily: 'DMSans_700Bold', color: colors.gold },
  colYear: { width: 44 },
  colTeam: { width: 44 },
  colStat: { flex: 1, textAlign: 'right' },
  source: {
    marginTop: 14,
    marginBottom: 8,
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 11,
    textAlign: 'center',
  },
  missing: {
    fontFamily: 'DMSans_500Medium',
    color: colors.white,
    fontSize: 16,
    marginTop: 40,
    textAlign: 'center',
  },
  backBtn: { alignSelf: 'center', marginTop: 20, padding: 12 },
  backText: { fontFamily: 'DMSans_700Bold', color: colors.gold },
});
