export type Unit = 'offense' | 'defense' | 'special';

export type PreviousTeam = {
  id?: string;
  slug?: string;
  name: string;
  abbr?: string | null;
  logo?: string | null;
};

export type CareerCategory = {
  name: string;
  displayName: string;
  labels: string[];
  rows: {
    year: number | string;
    teamId?: string;
    teamSlug?: string;
    teamAbbr?: string | null;
    teamName?: string | null;
    teamLogo?: string | null;
    stats: Record<string, string>;
    display: Record<string, string>;
  }[];
  totals?: Record<string, string> | null;
};

export type SeasonCategoryStats = {
  displayName: string;
  stats: Record<string, string>;
};

export type CareerSeason = {
  year: number | string;
  teamAbbr?: string | null;
  teamName?: string | null;
  teamLogo?: string | null;
  /** @deprecated Flat merge — prefer categories */
  stats?: Record<string, string>;
  categories?: Record<string, SeasonCategoryStats>;
};

export type Eligibility = {
  class: string;
  classAbbr: string;
  experienceYears?: number | null;
  seasonsPlayed: number;
  seasons: number[];
  seasonsLabel?: string | null;
  yearsLeft: number;
  yearsLeftLabel: string;
  extraYearLikely?: boolean;
  basis?: 'class' | 'seasons';
  note?: string;
};

export type Player = {
  id: string;
  espnId: string;
  number: number;
  name: string;
  firstName?: string;
  lastName?: string;
  position: string;
  positionName?: string;
  height: string;
  weight: number;
  year: string;
  hometown: string;
  unit: Unit;
  headshot?: string | null;
  previous?: string | null;
  previousTeams: PreviousTeam[];
  eligibility?: Eligibility | null;
  career?: {
    categories: CareerCategory[];
    seasons: CareerSeason[];
    headlines: { label: string; value: string }[];
    primaryCategory?: string | null;
  } | null;
  note?: string | null;
  tags: string[];
};

export type DepthSlot = {
  id: string | null;
  number: number;
  name: string;
  position: string;
};

export type DepthRow = {
  label: string;
  slots: DepthSlot[];
};

export type Game = {
  id: string;
  week: number;
  date: string;
  dateLabel: string;
  time: string;
  tv: string;
  opponent: string;
  opponentAbbr: string;
  opponentId?: string | null;
  opponentLogo?: string;
  home: boolean;
  conference: boolean;
  venue: string;
  city: string;
  status: 'upcoming' | 'final' | 'live';
  note?: string;
  source?: string;
};

export type OpponentGame = {
  id: string;
  date: string;
  name?: string;
  home: boolean;
  opponent: string;
  opponentAbbr?: string;
  opponentId?: string;
  opponentLogo?: string;
  score?: string | null;
  result?: string | null;
  venue?: string | null;
};

export type Opponent = {
  id: string;
  name: string;
  abbr: string;
  logo: string;
  record: string;
  conference?: string | null;
  season: number;
  games: OpponentGame[];
};

export type StandingEntry = {
  id: string;
  name: string;
  shortName?: string;
  abbr: string;
  logo: string;
  overall: string;
  conference: string;
};

export type RankEntry = {
  rank: number;
  previous?: number;
  id: string;
  name: string;
  abbr: string;
  logo: string;
  record: string;
  points?: number;
};

export type StandingsPayload = {
  season: number;
  label?: string;
  conference: {
    name: string;
    label?: string;
    entries: StandingEntry[];
  };
  national: {
    poll: string;
    label?: string;
    note?: string;
    entries: RankEntry[];
  };
};

export type LivePayload = {
  team: {
    name: string;
    nickname: string;
    abbr: string;
    conference: string;
    stadium: string;
    city: string;
    headCoach: string;
    offensiveCoordinator?: string;
    coOffensiveCoordinator?: string;
    defensiveCoordinator?: string;
    offense: string;
    defense: string;
    season: number;
    record: string;
    color: string;
    navy: string;
    logo: string;
    logoDark: string;
    lastSeason: { record: string; conference: string; rank: number; note: string };
    pulse: { label: string; value: string; detail: string }[];
  };
  players: Player[];
  depthChart: Record<Unit, DepthRow[]>;
  schedule: Game[];
  featured: string[];
  featuredMore?: string[];
  opponents?: Record<string, Opponent>;
  standings?: StandingsPayload;
  dataAsOf: string;
  sources: { name: string; url: string; usedFor: string }[];
};
