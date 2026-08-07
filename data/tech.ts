import live from './live.json';
import type {
  DepthRow,
  Game,
  LivePayload,
  Opponent,
  Player,
  PreviousTeam,
  StandingsPayload,
  Unit,
} from './types';

const data = live as LivePayload;

export const team = data.team;
export const players: Player[] = data.players;
export const schedule: Game[] = data.schedule;
export const depthChart = data.depthChart;
export const featuredIds = data.featured;
export const featuredMoreIds = data.featuredMore ?? data.featured;
export const standings: StandingsPayload | undefined = data.standings;
export const opponents: Record<string, Opponent> = data.opponents ?? {};
export const dataAsOf = data.dataAsOf;
export const sources = data.sources;

const byId = new Map(players.map((p) => [p.id, p]));

export function getPlayer(id: string): Player | undefined {
  return byId.get(id);
}

const GT_STOP: PreviousTeam = {
  name: 'Georgia Tech',
  abbr: 'GT',
  logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/59.png',
  id: '59',
};

/**
 * College path in real chronological order (first season at each school),
 * ending with Georgia Tech. Prefers career season rows over ESPN's unordered teams map.
 */
export function collegeStops(player: Player, opts?: { includeGt?: boolean }): PreviousTeam[] {
  const includeGt = opts?.includeGt !== false;
  const byKey = new Map<string, { team: PreviousTeam; firstYear: number }>();

  for (const cat of player.career?.categories || []) {
    for (const row of cat.rows || []) {
      const abbr = row.teamAbbr || null;
      if (!abbr || abbr === 'GT') continue;
      const year = Number(row.year);
      if (!Number.isFinite(year)) continue;
      const key = String(row.teamSlug || row.teamId || abbr);
      const existing = byKey.get(key);
      const team: PreviousTeam = {
        id: row.teamId,
        slug: row.teamSlug,
        name: row.teamName || abbr,
        abbr,
        logo: row.teamLogo,
      };
      if (!existing || year < existing.firstYear) {
        byKey.set(key, { team, firstYear: year });
      }
    }
  }

  let prior: PreviousTeam[];
  if (byKey.size) {
    prior = [...byKey.values()]
      .sort((a, b) => a.firstYear - b.firstYear)
      .map((x) => x.team);
  } else {
    prior = [...(player.previousTeams || [])];
  }

  return includeGt ? [...prior, GT_STOP] : prior;
}

export function previousTeamsLabel(player: Player): string {
  const stops = collegeStops(player, { includeGt: false });
  if (!stops.length) return '';
  return stops.map((t) => t.abbr || t.name).join(', ');
}

export function featuredPlayers(expanded = false): Player[] {
  const ids = expanded ? featuredMoreIds : featuredIds;
  return ids.map((id) => byId.get(id)).filter(Boolean) as Player[];
}

export function getOpponent(id: string): Opponent | undefined {
  return opponents[id];
}

export function playersByUnit(unit: Unit | 'all'): Player[] {
  const list = unit === 'all' ? players : players.filter((p) => p.unit === unit);
  return [...list].sort((a, b) => a.number - b.number || a.name.localeCompare(b.name));
}

export function depthFor(unit: Unit): DepthRow[] {
  return depthChart[unit] ?? [];
}

export function depthRoleFor(playerId: string): string | null {
  for (const unit of ['offense', 'defense', 'special'] as Unit[]) {
    for (const row of depthChart[unit] ?? []) {
      const idx = row.slots.findIndex((s) => s.id === playerId);
      if (idx === 0) return `${row.label} · Starter`;
      if (idx > 0) return `${row.label} · Depth ${idx + 1}`;
    }
  }
  return null;
}

export function nextGame(now = new Date()): Game | undefined {
  return schedule.find((g) => {
    if (g.status === 'final') return false;
    const day = new Date(`${g.date}T23:59:59`);
    return day.getTime() >= now.getTime() - 12 * 60 * 60 * 1000;
  });
}

export function upcomingGames(limit = 4, now = new Date()): Game[] {
  const next = nextGame(now);
  if (!next) return [];
  const idx = schedule.findIndex((g) => g.id === next.id);
  return schedule.slice(idx, idx + limit);
}

/** Categories to show in player stats UI, in a sensible order. */
export const STAT_CATEGORY_ORDER = [
  'passing',
  'rushing',
  'receiving',
  'defensive',
  'interceptions',
  'kicking',
  'punting',
  'kickReturns',
  'puntReturns',
] as const;

export function orderedCareerCategories(player: Player) {
  const cats = player.career?.categories ?? [];
  const primary = player.career?.primaryCategory;
  const rank = (name: string) => {
    if (primary && name === primary) return -1;
    const idx = STAT_CATEGORY_ORDER.indexOf(name as (typeof STAT_CATEGORY_ORDER)[number]);
    return idx === -1 ? 50 : idx;
  };
  return [...cats]
    .filter((c) => c.name !== 'scoring' && (c.rows?.length || c.totals))
    .sort((a, b) => rank(a.name) - rank(b.name));
}

export const POSITION_GROUPS = [
  { key: 'all', label: 'All' },
  { key: 'offense', label: 'Offense' },
  { key: 'defense', label: 'Defense' },
  { key: 'special', label: 'Special' },
  { key: 'QB', label: 'QB', positions: ['QB'] },
  { key: 'RB', label: 'RB', positions: ['RB', 'FB'] },
  { key: 'WR', label: 'WR', positions: ['WR'] },
  { key: 'TE', label: 'TE', positions: ['TE'] },
  { key: 'OL', label: 'OL', positions: ['OL', 'OT', 'OG', 'C'] },
  { key: 'DL', label: 'DL', positions: ['DE', 'DT', 'DL'] },
  { key: 'LB', label: 'LB', positions: ['LB'] },
  { key: 'DB', label: 'DB', positions: ['CB', 'S', 'DB', 'NB'] },
];

export function filterPlayers(groupKey: string, query = ''): Player[] {
  const q = query.trim().toLowerCase();
  const group = POSITION_GROUPS.find((g) => g.key === groupKey) ?? POSITION_GROUPS[0];
  let list: Player[];
  if (group.key === 'all') list = playersByUnit('all');
  else if (group.key === 'offense' || group.key === 'defense' || group.key === 'special') {
    list = playersByUnit(group.key as Unit);
  } else {
    list = players
      .filter((p) => group.positions?.includes(p.position))
      .sort((a, b) => a.number - b.number || a.name.localeCompare(b.name));
  }
  if (!q) return list;
  return list.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      String(p.number).includes(q) ||
      p.position.toLowerCase().includes(q) ||
      p.hometown.toLowerCase().includes(q) ||
      (p.previous || '').toLowerCase().includes(q)
  );
}

export function shortLastName(full: string) {
  const parts = full.replace(/\./g, '').split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1];
  if (/^(jr|sr|ii|iii|iv)$/i.test(last) && parts.length >= 2) return parts[parts.length - 2];
  return last;
}

export function countdownLabel(targetDate: string, now = new Date()): string {
  const target = new Date(`${targetDate}T20:00:00`);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return 'Game day';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 1) return `${days} days`;
  if (days === 1) return `1 day ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return 'Soon';
}

export function formatGameDate(iso: string) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
