import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
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
  CURRENT_SEASON,
  PRIOR_SEASON,
  countdownLabel,
  featuredMoreIds,
  featuredPlayers,
  formatNewsDate,
  nextFromSchedule,
  shortLastName,
  sources,
  team,
  upcomingFromSchedule,
} from '@/data/tech';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';
import { useSeasonPulse } from '@/hooks/useSeasonPulse';

export default function HomeScreen() {
  const { pagePad } = usePhoneLayout();
  const [now, setNow] = useState(() => new Date());
  const [watchExpanded, setWatchExpanded] = useState(false);
  const pulseAnim = useSharedValue(0.5);
  const live = useSeasonPulse();

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [pulseAnim]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + pulseAnim.value * 0.6,
    transform: [{ scale: 0.85 + pulseAnim.value * 0.2 }],
  }));

  const hero = useMemo(() => nextFromSchedule(live.schedule, now), [live.schedule, now]);
  const upcoming = useMemo(
    () => upcomingFromSchedule(live.schedule, 4, now),
    [live.schedule, now]
  );
  const featured = useMemo(() => featuredPlayers(watchExpanded), [watchExpanded]);
  const canExpandWatch = featuredMoreIds.length > featuredPlayers(false).length;
  const gtStanding = live.standings?.conference.entries.find((e) => e.abbr === team.abbr);
  const gtAccRank =
    (live.standings?.conference.entries.findIndex((e) => e.abbr === team.abbr) ?? -1) + 1;
  const ap = live.polls.find((p) => /AP/i.test(p.poll)) || live.standings?.national;
  const apGt = ap?.entries.find((e) => e.abbr === team.abbr);
  const news = live.news.slice(0, 6);

  return (
    <Screen padded={false}>
      <FadeIn style={{ paddingHorizontal: pagePad, paddingTop: spacing.xs }}>
        <BrandMark size="lg" record={`${CURRENT_SEASON} · ${live.record}`} />
      </FadeIn>

      <FadeIn delay={70} style={styles.heroBleed}>
        <View style={[styles.hero, { paddingHorizontal: pagePad }]}>
          <View style={styles.heroTop}>
            <View style={styles.statusRow}>
              <Animated.View style={[styles.liveDot, pulseStyle]} />
              <Text style={styles.statusLabel}>
                {hero?.status === 'live' ? 'LIVE' : 'NEXT UP'}
              </Text>
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
          <SectionHeader title="Team Pulse" subtitle={`${CURRENT_SEASON} slate · 0–0 until kickoff`} />
          <View style={styles.pulseRow}>
            {live.pulse.map((item) => (
              <View key={item.label} style={styles.pulseItem}>
                <Text style={styles.pulseLabel}>{item.label}</Text>
                <Text style={styles.pulseValue}>{item.value}</Text>
                <Text style={styles.pulseDetail}>{item.detail}</Text>
              </View>
            ))}
          </View>
        </FadeIn>

        <FadeIn delay={180}>
          <SectionHeader
            title="The Mood"
            subtitle="How the opener and the year are landing"
            right="NEWS"
          />
          {news.length ? (
            news.map((item) => (
              <Pressable
                key={item.id}
                style={styles.newsRow}
                onPress={() => Linking.openURL(item.url)}
                accessibilityRole="link"
              >
                <View style={styles.newsMeta}>
                  <Text style={styles.newsKicker}>
                    {(item.tag || item.source).toUpperCase()} · {formatNewsDate(item.published)}
                  </Text>
                  <Text style={styles.newsHead} numberOfLines={2}>
                    {item.headline}
                  </Text>
                  {item.description ? (
                    <Text style={styles.newsDek} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.chev}>›</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyNews}>Season news lands here after the next sync.</Text>
          )}
        </FadeIn>

        <FadeIn delay={210}>
          <SectionHeader title="Ones to Watch" subtitle="Week 1 projection" right="ROSTER" />
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

        <FadeIn delay={240}>
          <SectionHeader title="Polls" subtitle="Preseason Top 25 is fine — GT is unranked" />
          <Link href="/standings" asChild>
            <Pressable style={styles.pollBlock}>
              {(ap?.entries || []).slice(0, 5).map((row) => (
                <View key={row.id} style={styles.pollRow}>
                  <Text style={styles.pollRank}>{row.rank}</Text>
                  {row.logo ? <Image source={{ uri: row.logo }} style={styles.pollLogo} /> : null}
                  <Text style={styles.pollName} numberOfLines={1}>
                    {row.abbr}
                  </Text>
                  <Text style={styles.pollRec}>{row.record}</Text>
                </View>
              ))}
              <Text style={styles.pollNote}>
                {apGt
                  ? `Georgia Tech · #${apGt.rank}`
                  : `Georgia Tech · NR · finished #${team.lastSeason.rank} AP in ${PRIOR_SEASON}`}
              </Text>
            </Pressable>
          </Link>
        </FadeIn>

        <FadeIn delay={250}>
          <SectionHeader title="Standings Pulse" subtitle={`${CURRENT_SEASON} · toggle ${PRIOR_SEASON} on Standings`} right="FULL" />
          <Link href="/standings" asChild>
            <Pressable style={styles.standRow}>
              <View style={styles.standItem}>
                <Text style={styles.standLabel}>ACC</Text>
                <Text style={styles.standValue}>{gtStanding?.conference ?? '0-0'}</Text>
                <Text style={styles.standDetail}>
                  {gtAccRank > 0 ? `#${gtAccRank} in ACC` : 'Conference'}
                </Text>
              </View>
              <View style={styles.standItem}>
                <Text style={styles.standLabel}>OVERALL</Text>
                <Text style={styles.standValue}>{gtStanding?.overall ?? live.record}</Text>
                <Text style={styles.standDetail}>{CURRENT_SEASON} slate</Text>
              </View>
              <View style={styles.standItem}>
                <Text style={styles.standLabel}>AP</Text>
                <Text style={styles.standValue}>{apGt ? `#${apGt.rank}` : 'NR'}</Text>
                <Text style={styles.standDetail}>Preseason</Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          </Link>
        </FadeIn>

        <FadeIn delay={280}>
          <SectionHeader title="Schedule" subtitle={`Tap a team for their ${CURRENT_SEASON} slate`} />
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
                <Text style={styles.gameTime}>
                  {game.status === 'final' && game.result
                    ? `${game.result} ${game.gtScore}-${game.oppScore}`
                    : game.time}
                </Text>
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
          <Text style={styles.asOf}>{live.dataAsOf}</Text>
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
  newsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  newsMeta: { flex: 1 },
  newsKicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  newsHead: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 15,
    marginTop: 3,
  },
  newsDek: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  emptyNews: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 13,
    paddingVertical: 12,
  },
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
  pollBlock: {
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  pollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
  },
  pollRank: {
    width: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.gold,
    fontSize: 14,
  },
  pollLogo: { width: 18, height: 18 },
  pollName: {
    flex: 1,
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 13,
  },
  pollRec: { fontFamily: 'DMSans_500Medium', color: colors.mistDim, fontSize: 12 },
  pollNote: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
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
