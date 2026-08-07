import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PlayerRow } from '@/components/PlayerRow';
import { SectionHeader } from '@/components/SectionHeader';
import { Segmented } from '@/components/Segmented';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { POSITION_GROUPS, filterPlayers, players, previousTeamsLabel, team } from '@/data/tech';

export default function RosterScreen() {
  const [group, setGroup] = useState('all');
  const [query, setQuery] = useState('');
  const list = useMemo(() => filterPlayers(group, query), [group, query]);

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.kicker}>{team.season} FOOTBALL · ESPN ROSTER</Text>
        <Text style={styles.title}>Roster</Text>
        <Text style={styles.sub}>{players.length} players · {team.headCoach}</Text>
      </FadeIn>

      <FadeIn delay={70}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, number, school…"
          placeholderTextColor={colors.mistDim}
          style={styles.search}
        />
        <View style={{ marginTop: spacing.sm }}>
          <Segmented
            options={POSITION_GROUPS.slice(0, 4).map((g) => ({ key: g.key, label: g.label }))}
            value={group}
            onChange={setGroup}
          />
        </View>
        <View style={{ marginTop: 8 }}>
          <Segmented
            options={POSITION_GROUPS.slice(4).map((g) => ({ key: g.key, label: g.label }))}
            value={group}
            onChange={setGroup}
          />
        </View>
      </FadeIn>

      <FadeIn delay={120}>
        <SectionHeader
          title={POSITION_GROUPS.find((g) => g.key === group)?.label ?? 'All'}
          right={`${list.length}`}
        />
        {list.map((player) => (
          <PlayerRow
            key={player.id}
            player={player}
            subtitle={
              previousTeamsLabel(player)
                ? `${player.position}${
                    player.eligibility ? ` · ${player.eligibility.yearsLeft} yr left` : ''
                  } · prev ${previousTeamsLabel(player)}`
                : undefined
            }
          />
        ))}
        {list.length === 0 ? <Text style={styles.empty}>No players match.</Text> : null}
      </FadeIn>
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
    letterSpacing: 0.5,
    marginTop: 4,
  },
  sub: { fontFamily: 'DMSans_400Regular', color: colors.mistDim, fontSize: 14, marginTop: 2 },
  search: {
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.white,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16, // iOS Safari zooms inputs under 16px
    backgroundColor: colors.navyDeep,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
  },
});
