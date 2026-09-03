import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScheduleCalendar } from '@/components/ScheduleCalendar';
import { SectionHeader } from '@/components/SectionHeader';
import { Segmented } from '@/components/Segmented';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { CURRENT_SEASON, team } from '@/data/tech';
import { useSeasonPulse } from '@/hooks/useSeasonPulse';

type Filter = 'all' | 'home' | 'away' | 'acc';
type ViewMode = 'list' | 'calendar';

export default function ScheduleScreen() {
  const live = useSeasonPulse();
  const schedule = live.schedule;
  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView] = useState<ViewMode>('list');
  const games = useMemo(() => {
    return schedule.filter((g) => {
      if (filter === 'home') return g.home;
      if (filter === 'away') return !g.home;
      if (filter === 'acc') return g.conference;
      return true;
    });
  }, [filter, schedule]);

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.kicker}>{team.season} · GT / ACC</Text>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.sub}>
          {schedule.length} games · tap a team for their {CURRENT_SEASON} slate
        </Text>
      </FadeIn>

      <FadeIn delay={50} style={{ marginTop: spacing.sm }}>
        <Segmented
          options={[
            { key: 'list', label: 'List' },
            { key: 'calendar', label: 'Calendar' },
          ]}
          value={view}
          onChange={setView}
        />
      </FadeIn>

      <FadeIn delay={90} style={{ marginTop: spacing.sm }}>
        <Segmented
          options={[
            { key: 'all', label: 'All' },
            { key: 'home', label: 'Home' },
            { key: 'away', label: 'Away' },
            { key: 'acc', label: 'ACC' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </FadeIn>

      {view === 'calendar' ? (
        <FadeIn delay={120}>
          <ScheduleCalendar games={games} />
        </FadeIn>
      ) : (
        <FadeIn delay={120}>
          <SectionHeader title="Regular Season" right={`${games.length}`} />
          {games.map((game) => {
            const opp = game.opponentId ? live.opponents[game.opponentId] : undefined;
            const scoreLine =
              game.status === 'final' && game.result
                ? `${game.result} ${game.gtScore ?? ''}-${game.oppScore ?? ''}`
                : null;
            const body = (
              <Pressable style={styles.game}>
                <View style={styles.gameTop}>
                  <Text style={styles.week}>WK {game.week}</Text>
                  <Text style={styles.when}>
                    {game.dateLabel} · {scoreLine || game.time}
                  </Text>
                </View>
                <View style={styles.matchRow}>
                  {game.opponentLogo ? (
                    <Image source={{ uri: game.opponentLogo }} style={styles.logo} />
                  ) : null}
                  <Text style={styles.matchup}>
                    <Text style={styles.ha}>{game.home ? 'VS' : '@'} </Text>
                    {game.opponent}
                  </Text>
                  <Text style={styles.chev}>›</Text>
                </View>
                <Text style={styles.meta}>
                  {game.venue} · {game.city}
                  {opp ? ` · ${opp.record}` : ''}
                </Text>
                <View style={styles.badgeRow}>
                  <Text style={game.conference ? styles.badge : styles.badgeMuted}>
                    {game.conference ? 'ACC' : 'NON-CON'}
                  </Text>
                  <Text style={game.home ? styles.badge : styles.badgeMuted}>
                    {game.home ? 'HOME' : 'AWAY'}
                  </Text>
                  <Text style={styles.tv}>{game.tv}</Text>
                </View>
              </Pressable>
            );

            if (!game.opponentId) return <View key={game.id}>{body}</View>;
            return (
              <Link key={game.id} href={`/opponent/${game.opponentId}`} asChild>
                {body}
              </Link>
            );
          })}
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
  game: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  gameTop: { flexDirection: 'row', justifyContent: 'space-between' },
  week: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  when: { fontFamily: 'DMSans_400Regular', color: colors.mistDim, fontSize: 12 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  logo: { width: 32, height: 32 },
  matchup: {
    flex: 1,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 26,
    letterSpacing: 0.3,
  },
  ha: { color: colors.gold },
  chev: { color: colors.mistDim, fontSize: 22 },
  meta: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 13,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  badge: {
    fontFamily: 'DMSans_700Bold',
    color: colors.navy,
    backgroundColor: colors.gold,
    fontSize: 10,
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgeMuted: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mist,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    fontSize: 10,
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tv: { fontFamily: 'DMSans_700Bold', color: colors.mistDim, fontSize: 12 },
});
