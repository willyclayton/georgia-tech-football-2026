import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import type { Player } from '@/data/types';

type Props = { player: Player; subtitle?: string };

/** List rows stay light: jersey mark only. Headshots load on the detail screen. */
export function PlayerRow({ player, subtitle }: Props) {
  return (
    <Link href={`/player/${player.id}`} asChild>
      <Pressable style={styles.row}>
        <View style={styles.numWrap}>
          <Text style={styles.num}>{player.number}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.name}>{player.name}</Text>
          <Text style={styles.sub}>
            {subtitle ??
              `${player.position}${
                player.eligibility
                  ? ` · ${player.eligibility.yearsLeft} yr left`
                  : player.year
                    ? ` · ${player.year}`
                    : ''
              } · ${player.height}`}
          </Text>
        </View>
        <View style={styles.right}>
          {player.eligibility ? (
            <Text style={styles.elig}>{player.eligibility.classAbbr}</Text>
          ) : player.tags[0] ? (
            <Text style={styles.tag}>{player.tags[0]}</Text>
          ) : null}
          <Text style={styles.chev}>›</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    minHeight: 56,
  },
  numWrap: {
    width: 40,
    height: 40,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navyDeep,
  },
  num: { fontFamily: 'SpaceGrotesk_700Bold', color: colors.gold, fontSize: 16 },
  meta: { flex: 1 },
  name: { fontFamily: 'DMSans_700Bold', color: colors.white, fontSize: 15 },
  sub: { fontFamily: 'DMSans_400Regular', color: colors.mistDim, fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
  tag: {
    fontFamily: 'DMSans_700Bold',
    color: colors.goldSoft,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  elig: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  chev: { color: colors.mistDim, fontSize: 20 },
});
