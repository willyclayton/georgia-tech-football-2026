import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Segmented } from '@/components/Segmented';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { standings, team } from '@/data/tech';

type Tab = 'acc' | 'national';

export default function StandingsScreen() {
  const [tab, setTab] = useState<Tab>('acc');
  const data = standings;

  const acc = useMemo(() => data?.conference.entries ?? [], [data]);
  const national = useMemo(() => data?.national.entries ?? [], [data]);
  const gtAccRank = acc.findIndex((e) => e.abbr === team.abbr) + 1;

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.kicker}>{data?.season ?? team.season} · STANDINGS</Text>
        <Text style={styles.title}>Standings</Text>
        <Text style={styles.sub}>
          {tab === 'acc'
            ? data?.conference.label || 'ACC conference race'
            : data?.national.label || data?.national.poll || 'National poll'}
        </Text>
      </FadeIn>

      <FadeIn delay={70} style={{ marginTop: spacing.sm }}>
        <Segmented
          options={[
            { key: 'acc', label: 'ACC' },
            { key: 'national', label: 'Top 25' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </FadeIn>

      {tab === 'acc' ? (
        <FadeIn delay={120}>
          {gtAccRank > 0 ? (
            <Text style={styles.highlight}>
              Georgia Tech · {acc[gtAccRank - 1]?.overall} overall · {acc[gtAccRank - 1]?.conference}{' '}
              ACC · #{gtAccRank} in conference
            </Text>
          ) : null}
          <View style={styles.head}>
            <Text style={[styles.th, styles.colRank]}>#</Text>
            <Text style={[styles.th, styles.colTeam]}>TEAM</Text>
            <Text style={[styles.th, styles.colRec]}>CONF</Text>
            <Text style={[styles.th, styles.colRec]}>OVR</Text>
          </View>
          {acc.map((row, i) => {
            const isGt = row.abbr === team.abbr;
            return (
              <View key={row.id} style={[styles.row, isGt && styles.rowGt]}>
                <Text style={[styles.td, styles.colRank, isGt && styles.gtText]}>{i + 1}</Text>
                <View style={[styles.colTeam, styles.teamCell]}>
                  <Image source={{ uri: row.logo }} style={styles.logo} />
                  <Text style={[styles.teamName, isGt && styles.gtText]} numberOfLines={1}>
                    {row.shortName || row.abbr}
                  </Text>
                </View>
                <Text style={[styles.td, styles.colRec, isGt && styles.gtText]}>{row.conference}</Text>
                <Text style={[styles.td, styles.colRec, isGt && styles.gtText]}>{row.overall}</Text>
              </View>
            );
          })}
        </FadeIn>
      ) : (
        <FadeIn delay={120}>
          {data?.national.note ? <Text style={styles.highlight}>{data.national.note}</Text> : null}
          <View style={styles.head}>
            <Text style={[styles.th, styles.colRank]}>#</Text>
            <Text style={[styles.th, styles.colTeam]}>TEAM</Text>
            <Text style={[styles.th, styles.colRec]}>REC</Text>
          </View>
          {national.map((row) => {
            const isGt = row.abbr === team.abbr;
            return (
              <View key={row.id} style={[styles.row, isGt && styles.rowGt]}>
                <Text style={[styles.td, styles.colRank, isGt && styles.gtText]}>{row.rank}</Text>
                <View style={[styles.colTeam, styles.teamCell]}>
                  <Image source={{ uri: row.logo }} style={styles.logo} />
                  <Text style={[styles.teamName, isGt && styles.gtText]} numberOfLines={1}>
                    {row.name}
                  </Text>
                </View>
                <Text style={[styles.td, styles.colRec, isGt && styles.gtText]}>{row.record}</Text>
              </View>
            );
          })}
          {!national.some((r) => r.abbr === team.abbr) ? (
            <Text style={styles.footnote}>
              Georgia Tech finished {team.lastSeason.record} ({team.lastSeason.conference} ACC) and
              ranked #{team.lastSeason.rank} in the final 2025 AP poll.
            </Text>
          ) : null}
        </FadeIn>
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
    fontSize: 40,
    marginTop: 4,
  },
  sub: { fontFamily: 'DMSans_400Regular', color: colors.mistDim, fontSize: 14, marginTop: 2 },
  highlight: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 13,
    lineHeight: 18,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowGt: { backgroundColor: 'rgba(179,144,81,0.12)' },
  th: { fontFamily: 'DMSans_700Bold', color: colors.mistDim, fontSize: 10, letterSpacing: 0.8 },
  td: { fontFamily: 'DMSans_500Medium', color: colors.white, fontSize: 14 },
  gtText: { color: colors.gold, fontFamily: 'DMSans_700Bold' },
  colRank: { width: 28 },
  colTeam: { flex: 1 },
  colRec: { width: 52, textAlign: 'right' },
  teamCell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 22, height: 22 },
  teamName: { flex: 1, fontFamily: 'DMSans_700Bold', color: colors.white, fontSize: 14 },
  footnote: {
    marginTop: spacing.md,
    marginBottom: 8,
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
    lineHeight: 18,
  },
});
