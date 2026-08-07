import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import type { Game } from '@/data/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseISO(iso: string) {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: ({ day: number; iso: string } | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ day, iso });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function chunkWeeks<T>(cells: T[]) {
  const weeks: T[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function HaPill({ home }: { home: boolean }) {
  return (
    <View style={home ? styles.pillHome : styles.pillAway}>
      <Text style={home ? styles.pillHomeText : styles.pillAwayText}>{home ? 'HOME' : 'AWAY'}</Text>
    </View>
  );
}

type Props = {
  games: Game[];
};

export function ScheduleCalendar({ games }: Props) {
  const router = useRouter();

  const months = useMemo(() => {
    const keys = new Set<string>();
    for (const g of games) keys.add(monthKey(parseISO(g.date)));
    return [...keys].sort();
  }, [games]);

  const gamesByDate = useMemo(() => {
    const map = new Map<string, Game[]>();
    for (const g of games) {
      const list = map.get(g.date) || [];
      list.push(g);
      map.set(g.date, list);
    }
    return map;
  }, [games]);

  const initialMonth = useMemo(() => {
    if (!months.length) return monthKey(new Date());
    const today = monthKey(new Date());
    if (months.includes(today)) return today;
    return months.find((m) => m >= today) || months[0];
  }, [months]);

  const [cursor, setCursor] = useState(initialMonth);

  useEffect(() => {
    if (!months.length) return;
    if (!months.includes(cursor)) setCursor(months[0]);
  }, [months, cursor]);

  const activeMonth = months.includes(cursor) ? cursor : months[0] || cursor;
  const [year, monthIndex] = activeMonth.split('-').map(Number);
  const month = monthIndex - 1;
  const grid = buildMonthGrid(year, month);
  const title = new Date(year, month, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const monthIdx = months.indexOf(activeMonth);
  const canPrev = monthIdx > 0;
  const canNext = monthIdx >= 0 && monthIdx < months.length - 1;

  const monthGames = useMemo(
    () =>
      games
        .filter((g) => monthKey(parseISO(g.date)) === activeMonth)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [games, activeMonth]
  );

  const openOpponent = (game: Game) => {
    if (!game.opponentId) return;
    router.push(`/opponent/${game.opponentId}`);
  };

  if (!games.length) {
    return <Text style={styles.empty}>No games in this filter.</Text>;
  }

  return (
    <View>
      <View style={styles.monthNav}>
        <Pressable
          onPress={() => canPrev && setCursor(months[monthIdx - 1])}
          style={canPrev ? styles.navBtn : styles.navBtnOff}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={canPrev ? styles.navChevron : styles.navOff}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{title}</Text>
        <Pressable
          onPress={() => canNext && setCursor(months[monthIdx + 1])}
          style={canNext ? styles.navBtn : styles.navBtnOff}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={canNext ? styles.navChevron : styles.navOff}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={styles.cell}>
            <Text style={styles.weekday}>{d}</Text>
          </View>
        ))}
      </View>

      {chunkWeeks(grid).map((week, wi) => (
        <View key={`w-${wi}`} style={styles.weekGrid}>
          {week.map((cell, i) => {
            if (!cell) return <View key={`e-${wi}-${i}`} style={styles.cell} />;
            const game = (gamesByDate.get(cell.iso) || [])[0];
            if (!game) {
              return (
                <View key={cell.iso} style={styles.cell}>
                  <Text style={styles.dayNum}>{cell.day}</Text>
                </View>
              );
            }

            return (
              <Pressable
                key={cell.iso}
                onPress={() => openOpponent(game)}
                style={styles.gameCell}
              >
                <Text style={styles.dayNumOn}>{cell.day}</Text>
                <Text style={styles.abbr} numberOfLines={1}>
                  {game.opponentAbbr || game.opponent.slice(0, 4).toUpperCase()}
                </Text>
                <HaPill home={game.home} />
              </Pressable>
            );
          })}
        </View>
      ))}

      <Text style={styles.listKicker}>
        {monthGames.length} game{monthGames.length === 1 ? '' : 's'} this month · tap for results
      </Text>

      {monthGames.map((game) => (
        <Pressable key={game.id} onPress={() => openOpponent(game)} style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowDate}>{game.dateLabel}</Text>
            <Text style={styles.rowTime}>
              {game.time} · {game.tv}
            </Text>
          </View>
          {game.opponentLogo ? (
            <Image source={{ uri: game.opponentLogo }} style={styles.logo} />
          ) : (
            <View style={styles.logoSpacer} />
          )}
          <View style={styles.rowMeta}>
            <Text style={styles.rowOpp} numberOfLines={1}>
              <Text style={styles.ha}>{game.home ? 'VS' : '@'} </Text>
              {game.opponent}
            </Text>
            <Text style={styles.rowVenue} numberOfLines={1}>
              {game.venue}
            </Text>
          </View>
          <HaPill home={game.home} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 14,
    marginTop: spacing.md,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  navBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  navBtnOff: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.35,
  },
  navChevron: {
    fontFamily: 'DMSans_400Regular',
    color: colors.gold,
    fontSize: 32,
    lineHeight: 34,
  },
  navOff: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 32,
    lineHeight: 34,
  },
  monthTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: colors.white,
    fontSize: 20,
  },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekGrid: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 4 },
  weekday: {
    textAlign: 'center',
    fontFamily: 'DMSans_700Bold',
    color: colors.mistDim,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  cell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 70,
    paddingHorizontal: 2,
    paddingVertical: 4,
    alignItems: 'center',
  },
  gameCell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 70,
    paddingHorizontal: 2,
    paddingVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 4,
    backgroundColor: colors.navyLift,
  },
  dayNum: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
  },
  dayNumOn: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
  },
  abbr: {
    marginTop: 2,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  pillHome: {
    marginTop: 4,
    backgroundColor: colors.gold,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  pillAway: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  pillHomeText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.navy,
    fontSize: 8,
    letterSpacing: 0.6,
  },
  pillAwayText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mist,
    fontSize: 8,
    letterSpacing: 0.6,
  },
  listKicker: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowLeft: { width: 86, marginRight: 10 },
  rowDate: { fontFamily: 'DMSans_700Bold', color: colors.gold, fontSize: 12 },
  rowTime: { fontFamily: 'DMSans_400Regular', color: colors.mistDim, fontSize: 11, marginTop: 2 },
  logo: { width: 28, height: 28, marginRight: 10 },
  logoSpacer: { width: 28, height: 28, marginRight: 10 },
  rowMeta: { flex: 1, marginRight: 8 },
  rowOpp: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.white,
    fontSize: 16,
  },
  ha: { color: colors.gold },
  rowVenue: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
    marginTop: 2,
  },
});
