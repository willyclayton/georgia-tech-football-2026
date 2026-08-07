import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { BrandMark } from '@/components/BrandMark';
import { SectionHeader } from '@/components/SectionHeader';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import {
  countdownLabel,
  dataAsOf,
  featuredMoreIds,
  featuredPlayers,
  nextGame,
  shortLastName,
  sources,
  standings,
  team,
  upcomingGames,
} from '@/data/tech';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

export default function HomeScreen() {
  const { pagePad } = usePhoneLayout();
  const [now, setNow] = useState(() => new Date());
  const [watchExpanded, setWatchExpanded] = useState(false);
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + pulse.value * 0.6,
    transform: [{ scale: 0.85 + pulse.value * 0.2 }],
  }));

  const hero = useMemo(() => nextGame(now), [now]);
  const upcoming = useMemo(() => upcomingGames(4, now), [now]);
  const featured = useMemo(() => featuredPlayers(watchExpanded), [watchExpanded]);
  const canExpandWatch = featuredMoreIds.length > featuredPlayers(false).length;
  const gtStanding = standings?.conference.entries.find((e) => e.abbr === team.abbr);
  const gtAccRank =
    (standings?.conference.entries.findIndex((e) => e.abbr === team.abbr) ?? -1) + 1;

  return (
    <Screen padded={false}>
      <FadeIn style={{ paddingHorizontal: pagePad, paddingTop: spacing.xs }}>
        <BrandMark size="lg" record={`${team.season} · ${team.record}`} />
      </FadeIn>

      <FadeIn delay={70} style={styles.heroBleed}>
        <View style={[styles.hero, { paddingHorizontal: pagePad }]}>
          <View style={styles.heroTop}>
            <View style={styles.statusRow}>
              <Animated.View style={[styles.liveDot, pulseStyle]} />
              <Text style={styles.statusLabel}>NEXT UP</Text>
            </View>
            <Text style={styles.heroWhen}>
              {hero ? `${hero.dateLabel} · ${hero.time}` : 'TBD'}
            </Text>
          </View>

          {hero ? (
            <>
              <View style={styles.matchup}>
                <Image source={require('@/assets/images/gt-logo.png')} style={styles.teamLogo} />
                <Text style={styles.vs}>{hero.home ? 'VS' : '@'}</Text>
                {hero.opponentLogo ? (
                  <Image source={{ uri: hero.opponentLogo }} style={styles.teamLogo} />
                ) : (
                  <View style={[styles.teamLogo, styles.logoFallback]} />
                )}
              </View>
              <Text style={styles.opponent}>{hero.opponent.toUpperCase()}</Text>
              <Text style={styles.heroMeta}>
                {hero.venue} · {hero.city}
              </Text>
              <View style={styles.heroFooter}>
                <Text style={styles.countdown}>{countdownLabel(hero.date, now)}</Text>
                <Text style={styles.tv}>{hero.tv}</Text>
              </View>
            </>
          ) : null}
        </View>
      </FadeIn>

      <View style={{ paddingHorizontal: pagePad }}>
        <FadeIn delay={140}>
          <SectionHeader title="Team Pulse" subtitle="Carryover from 2025" />
          <View style={styles.pulseRow}>
            {team.pulse.map((item) => (
              <View key={item.label} style={styles.pulseItem}>
                <Text style={styles.pulseLabel}>{item.label}</Text>
                <Text style={styles.pulseValue}>{item.value}</Text>
                <Text style={styles.pulseDetail}>{item.detail}</Text>
              </View>
            ))}
          </View>
        </FadeIn>

        <FadeIn delay={210}>
          <SectionHeader title="Ones to Watch" subtitle="Projected impact" right="ROSTER" />
          {featured.map((p) => (
            <Link key={p.id} href={`/player/${p.id}`} asChild>
              <Pressable style={styles.watchRow}>
                <Text style={styles.watchNum}>{p.number}</Text>
                <View style={styles.watchMeta}>
                  <Text style={styles.watchName}>
                    {shortLastName(p.name)}
                    <Text style={styles.watchPos}>  {p.position}</Text>
                  </Text>
                  <Text style={styles.watchSub} numberOfLines={1}>
                    {p.note ?? `${p.year} · ${p.hometown}`}
                  </Text>
                </View>
                <Text style={styles.chev}>›</Text>
              </Pressable>
            </Link>
          ))}
          {canExpandWatch ? (
            <Pressable
              onPress={() => setWatchExpanded((v) => !v)}
              style={styles.seeMore}
              accessibilityRole="button"
            >
              <Text style={styles.seeMoreText}>
                {watchExpanded ? 'Show less' : 'See more players'}
              </Text>
            </Pressable>
          ) : null}
        </FadeIn>

        <FadeIn delay={250}>
          <SectionHeader title="Standings Pulse" subtitle="2025 finish" right="FULL" />
          <Link href="/standings" asChild>
            <Pressable style={styles.standRow}>
              <View style={styles.standItem}>
                <Text style={styles.standLabel}>ACC</Text>
                <Text style={styles.standValue}>
                  {gtStanding?.conference ?? team.lastSeason.conference}
                </Text>
                <Text style={styles.standDetail}>
                  {gtAccRank > 0 ? `#${gtAccRank} in ACC` : 'Conference'}
                </Text>
              </View>
              <View style={styles.standItem}>
                <Text style={styles.standLabel}>OVERALL</Text>
                <Text style={styles.standValue}>
                  {gtStanding?.overall ?? team.lastSeason.record}
                </Text>
                <Text style={styles.standDetail}>Final 2025</Text>
              </View>
              <View style={styles.standItem}>
                <Text style={styles.standLabel}>AP</Text>
                <Text style={styles.standValue}>#{team.lastSeason.rank}</Text>
                <Text style={styles.standDetail}>Final poll</Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          </Link>
        </FadeIn>

        <FadeIn delay={280}>
          <SectionHeader title="Schedule" subtitle="Tap a team for their past games" />
          {upcoming.map((game) => {
            const row = (
              <Pressable style={styles.gameRow}>
                {game.opponentLogo ? (
                  <Image source={{ uri: game.opponentLogo }} style={styles.oppLogo} />
                ) : null}
                <Text style={styles.gameDate}>{game.dateLabel.replace(/^[A-Za-z]+,\s*/, '')}</Text>
                <Text style={styles.gameMatch}>
                  {game.home ? 'vs' : '@'} {game.opponentAbbr}
                </Text>
                <Text style={styles.gameTime}>{game.time}</Text>
                <Text style={styles.chev}>›</Text>
              </Pressable>
            );
            if (!game.opponentId) return <View key={game.id}>{row}</View>;
            return (
              <Link key={game.id} href={`/opponent/${game.opponentId}`} asChild>
                {row}
              </Link>
            );
          })}
        </FadeIn>

        <FadeIn delay={340}>
          <Text style={styles.asOf}>{dataAsOf}</Text>
          <Text style={styles.sourceLine}>
            Data: {sources.map((s) => s.name).join(' · ')}
          </Text>
        </FadeIn>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroBleed: { marginTop: spacing.sm },
  hero: {
    backgroundColor: colors.gold,
    paddingTop: 18,
    paddingBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: colors.navy,
  },
  statusLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.navy,
    fontSize: 11,
    letterSpacing: 2,
  },
  heroWhen: {
    fontFamily: 'DMSans_500Medium',
    color: 'rgba(5,30,57,0.72)',
    fontSize: 13,
  },
  matchup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginTop: 16,
  },
  teamLogo: { width: 56, height: 56 },
  logoFallback: { backgroundColor: 'rgba(5,30,57,0.15)', borderRadius: 4 },
  vs: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.navy,
    fontSize: 16,
    letterSpacing: 2,
  },
  opponent: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.navy,
    fontSize: 36,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 10,
  },
  heroMeta: {
    fontFamily: 'DMSans_400Regular',
    color: 'rgba(5,30,57,0.75)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  heroFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(5,30,57,0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  countdown: { fontFamily: 'DMSans_700Bold', color: colors.navy, fontSize: 14 },
  tv: { fontFamily: 'DMSans_500Medium', color: 'rgba(5,30,57,0.7)', fontSize: 13 },
  pulseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pulseItem: {
    width: '47%',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  pulseLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  pulseValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 28,
    marginTop: 2,
  },
  pulseDetail: { fontFamily: 'DMSans_400Regular', color: colors.mistDim, fontSize: 12 },
  watchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  watchNum: {
    width: 34,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.gold,
    fontSize: 22,
    textAlign: 'center',
  },
  watchMeta: { flex: 1 },
  watchName: { fontFamily: 'DMSans_700Bold', color: colors.white, fontSize: 15 },
  watchPos: { fontFamily: 'DMSans_500Medium', color: colors.gold, fontSize: 13 },
  watchSub: { fontFamily: 'DMSans_400Regular', color: colors.mistDim, fontSize: 12, marginTop: 2 },
  seeMore: {
    marginTop: 4,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  seeMoreText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 14,
    letterSpacing: 0.4,
  },
  standRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  standItem: { flex: 1 },
  standLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  standValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 22,
    marginTop: 2,
  },
  standDetail: { fontFamily: 'DMSans_400Regular', color: colors.mistDim, fontSize: 11, marginTop: 2 },
  chev: { color: colors.mistDim, fontSize: 20 },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  oppLogo: { width: 24, height: 24 },
  gameDate: {
    width: 56,
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 13,
  },
  gameMatch: { flex: 1, fontFamily: 'DMSans_700Bold', color: colors.white, fontSize: 15 },
  gameTime: { fontFamily: 'DMSans_500Medium', color: colors.gold, fontSize: 13 },
  asOf: {
    marginTop: 28,
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 11,
  },
  sourceLine: {
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 10,
  },
});
