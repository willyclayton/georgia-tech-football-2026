import { useEffect, useMemo, useState } from 'react';
import {
  CURRENT_SEASON,
  dataAsOf as bakedAsOf,
  news as bakedNews,
  opponents as bakedOpponents,
  polls as bakedPolls,
  schedule as bakedSchedule,
  standings as bakedStandings,
  standingsPrior as bakedPrior,
  team,
} from '@/data/tech';
import type { Game, NewsItem, Opponent, PollPayload, StandingsPayload } from '@/data/types';

export type PulseOverlay = {
  live: boolean;
  record: string;
  schedule: Game[];
  opponents: Record<string, Opponent>;
  standings?: StandingsPayload;
  standingsPrior?: StandingsPayload;
  polls: PollPayload[];
  news: NewsItem[];
  pulse: { label: string; value: string; detail: string }[];
  dataAsOf: string;
};

function mergeSchedule(live: Game[] | undefined): Game[] {
  if (!live?.length) return bakedSchedule;
  const byOpp = new Map(bakedSchedule.map((g) => [String(g.opponentId || g.id), g]));
  const byId = new Map(bakedSchedule.map((g) => [g.id, g]));
  return live.map((g) => {
    const baked = byId.get(g.id) || byOpp.get(String(g.opponentId || ''));
    if (!baked) return g;
    return {
      ...baked,
      ...g,
      note: g.note || baked.note,
      source: g.source || baked.source,
    };
  });
}

export function useSeasonPulse(): PulseOverlay {
  const [overlay, setOverlay] = useState<Partial<PulseOverlay> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    fetch('/api/pulse', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok) return;
        setOverlay({
          live: true,
          record: data.record,
          schedule: data.schedule,
          opponents: data.opponents,
          standings: data.standings,
          standingsPrior: data.standingsPrior,
          polls: data.polls,
          news: data.news,
          pulse: data.pulse,
          dataAsOf: data.dataAsOf,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, []);

  return useMemo(() => {
    const schedule = mergeSchedule(overlay?.schedule);
    return {
      live: Boolean(overlay?.live),
      record: overlay?.record || team.record,
      schedule,
      opponents: overlay?.opponents || bakedOpponents,
      standings: overlay?.standings || bakedStandings,
      standingsPrior: overlay?.standingsPrior || bakedPrior,
      polls: overlay?.polls?.length ? overlay.polls : bakedPolls,
      news: overlay?.news?.length ? overlay.news : bakedNews,
      pulse: overlay?.pulse?.length ? overlay.pulse : team.pulse,
      dataAsOf: overlay?.dataAsOf || bakedAsOf,
    };
  }, [overlay]);
}

export { CURRENT_SEASON };
