import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Segmented } from '@/components/Segmented';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { CURRENT_SEASON, PRIOR_SEASON, standingsForYear, team } from '@/data/tech';
import { useSeasonPulse } from '@/hooks/useSeasonPulse';

type YearTab = 'current' | 'prior';
type Board = 'acc' | 'ap' | 'coaches';

export default function StandingsScreen() {
  const live = useSeasonPulse();
  const [year, setYear] = useState<YearTab>('current');
  const [tab, setTab] = useState<Board>('acc');
  const season = year === 'prior' ? PRIOR_SEASON : CURRENT_SEASON;
  const data = standingsForYear(season, live.standings, live.standingsPrior);
  const polls = year === 'prior' ? data?.polls || [] : live.polls.length ? live.polls : data?.polls || [];
  const ap = polls.find((p) => /AP/i.test(p.poll)) || data?.national;
  const coaches = polls.find((p) => /coach/i.test(p.poll));

  const acc = useMemo(() => data?.conference.entries ?? [], [data]);
  const pollEntries = tab === 'coaches' ? coaches?.entries ?? [] : ap?.entries ?? [];
  const gtAccRank = acc.findIndex((e) => e.abbr === team.abbr) + 1;

  const yearOptions = [
    { key: 'current' as const, label: String(CURRENT_SEASON) },
    { key: 'prior' as const, label: String(PRIOR_SEASON) },
  ];
  const boardOptions = [
    { key: 'acc' as const, label: 'ACC' },
    { key: 'ap' as const, label: 'AP' },
    ...(year === 'current' && coaches ? [{ key: 'coaches' as const, label: 'Coaches' }] : []),
  ];

  const sub =
    tab === 'acc'
      ? data?.conference.label || 'ACC conference race'
      : tab === 'coaches'
        ? coaches?.label || 'AFCA Coaches Poll'
        : ap?.label || ap?.poll || 'National poll';

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.kicker}>{season} · STANDINGS</Text>
        <Text style={styles.title}>Standings</Text>
        <Text style={styles.sub}>{sub}</Text>
      </FadeIn>

      <FadeIn delay={50} style={{ marginTop: spacing.sm }}>
        <Segmented
          options={yearOptions}
          value={year}
          onChange={(next) => {
            setYear(next);
            if (next === 'prior' && tab === 'coaches') setTab('ap');
          }}
        />
      </FadeIn>

      <FadeIn delay={70} style={{ marginTop: spacing.sm }}>
        <Segmented options={boardOptions} value={tab} onChange={setTab} />
      </FadeIn>

      {tab === 'acc' ? (
        <FadeIn delay={120}>
          {year === 'current' && gtAccRank > 0 ? (
            <Text style={styles.highlight}>
              Georgia Tech · {acc[gtAccRank - 1]?.overall} overall · {acc[gtAccRank - 1]?.conference}{' '}
              ACC · #{gtAccRank} in conference · {CURRENT_SEASON} slate
            </Text>
          ) : null}
          {year === 'prior' ? (
            <Text style={styles.highlight}>
              {PRIOR_SEASON} final: Georgia Tech {team.lastSeason.record} ({team.lastSeason.conference}{' '}
              ACC), AP #{team.lastSeason.rank}. {team.lastSeason.note}.
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
          {tab === 'ap' && ap?.note ? <Text style={styles.highlight}>{ap.note}</Text> : null}
          {tab === 'coaches' && coaches?.note ? (
            <Text style={styles.highlight}>{coaches.note}</Text>
          ) : null}
          {pollEntries.length ? (
            <>
              <View style={styles.head}>
                <Text style={[styles.th, styles.colRank]}>#</Text>
                <Text style={[styles.th, styles.colTeam]}>TEAM</Text>
                <Text style={[styles.th, styles.colRec]}>REC</Text>
              </View>
              {pollEntries.map((row) => {
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
            </>
          ) : (
            <Text style={styles.footnote}>
              {year === 'prior'
                ? `No archived ${PRIOR_SEASON} national table in-app. Georgia Tech finished ${team.lastSeason.record} (${team.lastSeason.conference} ACC) and ranked #${team.lastSeason.rank} in the final AP poll.`
                : 'Poll not available yet.'}
            </Text>
          )}
          {year === 'current' && !pollEntries.some((r) => r.abbr === team.abbr) ? (
            <Text style={styles.footnote}>
              Georgia Tech is unranked to open {CURRENT_SEASON}. Last season: {team.lastSeason.record},
              final AP #{team.lastSeason.rank}. Flip to {PRIOR_SEASON} for the ACC finish.
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
