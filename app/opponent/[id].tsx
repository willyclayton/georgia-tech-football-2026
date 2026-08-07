import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { formatGameDate, getOpponent, schedule } from '@/data/tech';

export default function OpponentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const opponent = getOpponent(String(id));
  const upcoming = schedule.filter((g) => g.opponentId === String(id));

  if (!opponent) {
    return (
      <Screen>
        <Text style={styles.missing}>Opponent not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <FadeIn>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/schedule');
          }}
          style={styles.back}
        >
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <View style={styles.hero}>
          <Image source={{ uri: opponent.logo }} style={styles.logo} />
          <View style={styles.heroMeta}>
            <Text style={styles.abbr}>{opponent.abbr}</Text>
            <Text style={styles.name}>{opponent.name}</Text>
            <Text style={styles.record}>
              {opponent.season} · {opponent.record}
              {opponent.conference ? ` · ${opponent.conference}` : ''}
            </Text>
          </View>
        </View>
      </FadeIn>

      {upcoming.length ? (
        <FadeIn delay={70}>
          <Text style={styles.section}>Vs Georgia Tech</Text>
          {upcoming.map((g) => (
            <View key={g.id} style={styles.gtRow}>
              <Text style={styles.gtWhen}>
                {g.dateLabel} · {g.time}
              </Text>
              <Text style={styles.gtMatch}>
                {g.home ? 'at Bobby Dodd' : `@ ${g.venue}`}
              </Text>
              <Text style={styles.gtNote}>{g.note || g.tv}</Text>
            </View>
          ))}
        </FadeIn>
      ) : null}

      <FadeIn delay={120}>
        <Text style={styles.section}>{opponent.season} Schedule</Text>
        <Text style={styles.sub}>Past games and results</Text>
        {opponent.games.map((g) => (
          <View key={g.id} style={styles.game}>
            <View style={styles.gameLeft}>
              <Text
                style={[
                  styles.result,
                  g.result === 'W' && styles.win,
                  g.result === 'L' && styles.loss,
                ]}
              >
                {g.result || '—'}
              </Text>
              <Text style={styles.date}>{formatGameDate(g.date)}</Text>
            </View>
            {g.opponentLogo ? (
              <Image source={{ uri: g.opponentLogo }} style={styles.oppLogo} />
            ) : null}
            <View style={styles.gameMeta}>
              <Text style={styles.oppName} numberOfLines={1}>
                {g.home ? 'vs' : '@'} {g.opponentAbbr || g.opponent}
              </Text>
              <Text style={styles.venue} numberOfLines={1}>
                {g.venue || '—'}
              </Text>
            </View>
            <Text style={styles.score}>{g.score || '—'}</Text>
          </View>
        ))}
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
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 64, height: 64 },
  heroMeta: { flex: 1 },
  abbr: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 1.4,
  },
  name: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 26,
    marginTop: 2,
  },
  record: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: 4,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: colors.white,
    fontSize: 20,
  },
  sub: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  gtRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  gtWhen: { fontFamily: 'DMSans_700Bold', color: colors.gold, fontSize: 12, letterSpacing: 0.8 },
  gtMatch: { fontFamily: 'DMSans_700Bold', color: colors.white, fontSize: 16, marginTop: 4 },
  gtNote: { fontFamily: 'DMSans_400Regular', color: colors.mistDim, fontSize: 13, marginTop: 2 },
  game: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  gameLeft: { width: 52 },
  result: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.mistDim,
    fontSize: 16,
  },
  win: { color: '#7CB87C' },
  loss: { color: '#C47B7B' },
  date: { fontFamily: 'DMSans_400Regular', color: colors.mistDim, fontSize: 11, marginTop: 2 },
  oppLogo: { width: 24, height: 24 },
  gameMeta: { flex: 1 },
  oppName: { fontFamily: 'DMSans_700Bold', color: colors.white, fontSize: 15 },
  venue: { fontFamily: 'DMSans_400Regular', color: colors.mistDim, fontSize: 11, marginTop: 2 },
  score: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: colors.white,
    fontSize: 15,
    minWidth: 48,
    textAlign: 'right',
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
