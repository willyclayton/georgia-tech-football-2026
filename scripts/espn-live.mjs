/**
 * Shared ESPN / athletics fetchers for the 2026 season slate.
 * Used by sync-espn.mjs (full snapshot) and api/pulse.mjs (Saturday live overlay).
 */
export const TEAM_ID = '59';
export const CURRENT_SEASON = 2026;
export const PRIOR_SEASON = 2025;

const ESPN_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export async function espnGet(url, { json = true } = {}) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': ESPN_UA,
      Accept: json ? 'application/json' : '*/*',
      Referer: 'https://www.espn.com/',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return json ? res.json() : res.text();
}

export const GAME_NOTES = {
  38: 'Buffaloes first visit to The Flats',
  2633: 'First home meeting since 1986',
  2382: 'In-state non-conference',
  24: 'First-ever trip to Stanford',
  150: 'Defending ACC champions',
  259: 'ACC rivalry road trip',
  103: 'Homecoming',
  221: 'Halloween in Pittsburgh',
  97: '2025 bowl winner',
  228: 'Death Valley',
  154: 'Senior Day stretch',
  61: 'Clean, Old-Fashioned Hate',
};

const ACC_FALLBACK_IDS = new Set(['24', '150', '259', '103', '221', '97', '228', '154', '52', '87', '151', '2390', '258', '183', '120', '152', '59']);

export function nyParts(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const bag = {};
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== 'literal') bag[p.type] = p.value;
  }
  return bag;
}

export function localDateFromIso(iso) {
  const bag = nyParts(iso);
  if (!bag?.year || !bag?.month || !bag?.day) return String(iso || '').slice(0, 10);
  const months = {
    Jan: '01',
    Feb: '02',
    Mar: '03',
    Apr: '04',
    May: '05',
    Jun: '06',
    Jul: '07',
    Aug: '08',
    Sep: '09',
    Oct: '10',
    Nov: '11',
    Dec: '12',
  };
  return `${bag.year}-${months[bag.month]}-${String(bag.day).padStart(2, '0')}`;
}

export function dateLabelFromIso(iso) {
  const bag = nyParts(iso);
  if (!bag) return '';
  return `${bag.weekday}, ${bag.month} ${bag.day}`;
}

export function timeFromIso(iso, statusDetail) {
  const detail = String(statusDetail || '');
  if (/TBD/i.test(detail)) return 'TBA';
  const bag = nyParts(iso);
  if (!bag?.hour) return 'TBA';
  const minute = bag.minute === '00' ? '' : `:${bag.minute}`;
  return `${bag.hour}${minute} ${bag.dayPeriod?.toUpperCase() || 'PM'}`;
}

function tvFromComp(comp) {
  const broadcasts = comp.broadcasts || [];
  const first = broadcasts[0];
  const name = first?.media?.shortName || first?.names?.[0] || first?.shortName;
  if (name) return name;
  const detail = String(comp.status?.type?.detail || '');
  if (/TBD/i.test(detail) || !comp.status?.type?.detail) return 'TBA';
  return 'TBA';
}

function gameStatus(comp) {
  const t = comp.status?.type || {};
  if (t.completed) return 'final';
  if (t.state === 'in' || t.name === 'STATUS_IN_PROGRESS') return 'live';
  return 'upcoming';
}

export function parseStandingsGroup(json, season, label) {
  const entries = (json.standings?.entries || []).map((e) => {
    const t = e.team || {};
    const stats = Object.fromEntries(
      (e.stats || []).map((s) => [s.name || s.abbreviation, s.displayValue ?? s.value])
    );
    return {
      id: String(t.id),
      name: t.displayName || t.name,
      shortName: t.shortDisplayName || t.name,
      abbr: t.abbreviation,
      logo: `https://a.espncdn.com/i/teamlogos/ncaa/500/${t.id}.png`,
      overall: String(stats.overall || '—'),
      conference: String(stats['vs. Conf.'] || '—'),
    };
  });
  return {
    season,
    label,
    conference: {
      name: 'ACC',
      label: label ? `${label} ACC` : 'ACC',
      entries,
    },
  };
}

export function parsePoll(poll) {
  if (!poll) return null;
  const entries = [];
  for (const x of poll.ranks || []) {
    const t = x.team || {};
    entries.push({
      rank: x.current,
      previous: x.previous,
      id: String(t.id),
      name: t.displayName || t.name,
      abbr: t.abbreviation,
      logo: `https://a.espncdn.com/i/teamlogos/ncaa/500/${t.id}.png`,
      record: x.recordSummary || '0-0',
      points: x.points,
    });
  }
  return {
    id: String(poll.id || poll.name || 'poll')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-'),
    poll: poll.name || 'Top 25',
    shortName: poll.shortName || poll.name,
    label: poll.headline || poll.name,
    note: null,
    entries,
  };
}

export function parseGtSchedule(json, accIds) {
  const ids = accIds instanceof Set ? accIds : new Set(accIds || []);
  const events = json.events || [];
  const games = [];
  for (const e of events) {
    const comp = (e.competitions || [])[0] || {};
    const comps = comp.competitors || [];
    const us = comps.find((c) => String(c.team?.id) === TEAM_ID);
    const them = comps.find((c) => String(c.team?.id) !== TEAM_ID);
    if (!us || !them) continue;
    const oid = String(them.team?.id);
    const home = us.homeAway === 'home';
    const iso = comp.date || e.date;
    const status = gameStatus(comp);
    const completed = status === 'final';
    const usScore = us.score?.displayValue ?? us.score ?? null;
    const themScore = them.score?.displayValue ?? them.score ?? null;
    let result = null;
    if (completed) {
      if (us.winner === true) result = 'W';
      else if (us.winner === false) result = 'L';
    }
    const week = Number(e.week?.number || e.week || games.length + 1);
    const venue = comp.venue?.fullName || (home ? 'Bobby Dodd Stadium' : them.team?.displayName);
    const cityParts = [comp.venue?.address?.city, comp.venue?.address?.state].filter(Boolean);
    games.push({
      id: String(e.id),
      week,
      date: localDateFromIso(iso),
      dateLabel: dateLabelFromIso(iso),
      time: timeFromIso(iso, comp.status?.type?.shortDetail || comp.status?.type?.detail),
      tv: tvFromComp(comp),
      opponent: them.team?.location || them.team?.nickname || them.team?.displayName,
      opponentAbbr: them.team?.abbreviation,
      opponentId: oid,
      opponentLogo: `https://a.espncdn.com/i/teamlogos/ncaa/500/${oid}.png`,
      home,
      conference: ids.has(oid),
      venue,
      city: cityParts.join(', ') || (home ? 'Atlanta, GA' : ''),
      status,
      gtScore: completed && usScore != null ? String(usScore) : null,
      oppScore: completed && themScore != null ? String(themScore) : null,
      result,
      note: GAME_NOTES[oid] || undefined,
      source: 'ESPN / Georgia Tech Athletics',
    });
  }
  return games;
}

export function parseOpponentSchedule(json, meta, season) {
  const oid = String(meta.id);
  const games = [];
  for (const e of json.events || []) {
    const comp = (e.competitions || [])[0] || {};
    const comps = comp.competitors || [];
    const us = comps.find((c) => String(c.team?.id) === oid);
    const them = comps.find((c) => String(c.team?.id) !== oid);
    if (!us || !them) continue;
    const status = gameStatus(comp);
    const completed = status === 'final';
    const usScore = us.score?.displayValue ?? us.score ?? null;
    const themScore = them.score?.displayValue ?? them.score ?? null;
    let result = null;
    if (completed) {
      if (us.winner === true) result = 'W';
      else if (us.winner === false) result = 'L';
    }
    games.push({
      id: String(e.id),
      date: localDateFromIso(comp.date || e.date),
      name: e.name,
      home: us.homeAway === 'home',
      opponent: them.team?.displayName || them.team?.nickname,
      opponentAbbr: them.team?.abbreviation,
      opponentId: String(them.team?.id),
      opponentLogo: `https://a.espncdn.com/i/teamlogos/ncaa/500/${them.team?.id}.png`,
      score:
        completed && usScore != null && themScore != null ? `${usScore}-${themScore}` : null,
      result,
      venue: comp.venue?.fullName || null,
      status,
    });
  }
  const wins = games.filter((x) => x.result === 'W').length;
  const losses = games.filter((x) => x.result === 'L').length;
  return {
    id: oid,
    name: meta.name,
    abbr: meta.abbr,
    logo: meta.logo,
    record: meta.record || `${wins}-${losses}`,
    conference: meta.conference || null,
    season,
    games,
  };
}

function cdata(chunk, tag) {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))</${tag}>`,
    'i'
  );
  const m = chunk.match(re);
  return String((m && (m[1] ?? m[2])) || '').trim();
}

function attr(chunk, tag, name) {
  const m = chunk.match(new RegExp(`<${tag}[^>]*\\b${name}="([^"]+)"`, 'i'));
  return m ? m[1] : null;
}

export function parseRssItems(xml) {
  const items = [];
  for (const part of xml.split(/<item[\s>]/i).slice(1)) {
    const chunk = part.split(/<\/item>/i)[0];
    const title = cdata(chunk, 'title');
    const link = cdata(chunk, 'link');
    if (!title || !link) continue;
    items.push({
      headline: title,
      description: cdata(chunk, 'description'),
      url: link,
      published: cdata(chunk, 'pubDate'),
      image: attr(chunk, 'media:thumbnail', 'url') || attr(chunk, 'media:content', 'url'),
      sport: cdata(chunk, 'sports'),
    });
  }
  return items;
}

function toIso(published) {
  if (!published) return new Date().toISOString();
  const d = new Date(published);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function newsId(url, headline) {
  return String(url || headline)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 80);
}

const SKIP_NEWS =
  /jersey auction|women'?s basketball|women'?s tennis|hike & spike|helluva block party|ticket combo|players trunk|#?projackets|all-access|coach.?s show/i;

export function isFootballNews(item) {
  const blob = `${item.headline} ${item.description} ${item.sport || ''}`;
  if (SKIP_NEWS.test(blob)) return false;
  if (/^video:/i.test(item.headline)) return false;
  return true;
}

export async function fetchStandings(season, label) {
  const json = await espnGet(
    `https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings?group=1&season=${season}`
  );
  return parseStandingsGroup(json, season, label);
}

export async function fetchRankingsPolls() {
  const json = await espnGet(
    'https://site.web.api.espn.com/apis/site/v2/sports/football/college-football/rankings'
  );
  const polls = [];
  for (const raw of json.rankings || []) {
    const name = String(raw.name || '');
    if (/FCS|Division II|Div II|D2/i.test(name)) continue;
    const parsed = parsePoll(raw);
    if (parsed?.entries?.length) polls.push(parsed);
  }
  return polls;
}

export async function fetchGtSchedule(accIds) {
  const json = await espnGet(
    `https://site.web.api.espn.com/apis/site/v2/sports/football/college-football/teams/${TEAM_ID}/schedule?season=${CURRENT_SEASON}`
  );
  return parseGtSchedule(json, accIds);
}

export async function fetchOpponents(schedule, standings, season = CURRENT_SEASON) {
  const opponents = {};
  const accIds = new Set((standings?.conference?.entries || []).map((e) => String(e.id)));
  for (const g of schedule) {
    const oid = g.opponentId;
    if (!oid || opponents[oid]) continue;
    try {
      const json = await espnGet(
        `https://site.web.api.espn.com/apis/site/v2/sports/football/college-football/teams/${oid}/schedule?season=${season}`
      );
      const accRow = standings?.conference?.entries?.find((x) => x.id === String(oid));
      opponents[oid] = parseOpponentSchedule(
        json,
        {
          id: oid,
          name: g.opponent,
          abbr: g.opponentAbbr,
          logo: g.opponentLogo,
          record: accRow?.overall || '0-0',
          conference: accIds.has(String(oid)) ? 'ACC' : null,
        },
        season
      );
      await new Promise((r) => setTimeout(r, 30));
    } catch (err) {
      console.warn(`Opponent ${oid} failed:`, err.message);
      opponents[oid] = {
        id: String(oid),
        name: g.opponent,
        abbr: g.opponentAbbr,
        logo: g.opponentLogo,
        record: '0-0',
        conference: accIds.has(String(oid)) ? 'ACC' : null,
        season,
        games: [],
      };
    }
  }
  return opponents;
}

export async function fetchTeamRecord() {
  const json = await espnGet(
    `https://site.web.api.espn.com/apis/site/v2/sports/football/college-football/teams/${TEAM_ID}`
  );
  const rec = json.team?.record?.items?.find((x) => x.type === 'total') || json.team?.record?.items?.[0];
  return rec?.summary || '0-0';
}

export async function fetchNews() {
  const items = [];
  const seen = new Set();
  const push = (item) => {
    const url = item.url;
    if (!url || seen.has(url) || !isFootballNews(item)) return;
    seen.add(url);
    items.push({
      id: newsId(url, item.headline),
      headline: item.headline,
      description: item.description || '',
      url,
      source: item.source,
      published: toIso(item.published),
      image: item.image || null,
      tag: item.tag || null,
    });
  };

  try {
    const xml = await espnGet('https://ramblinwreck.com/sports/m-footbl/rss', { json: false });
    for (const it of parseRssItems(xml)) {
      push({
        ...it,
        source: 'Georgia Tech Athletics',
        tag: /opener|game 1|whiteout|preview/i.test(`${it.headline} ${it.description}`)
          ? 'Opener'
          : /poll|rank/i.test(it.headline)
            ? 'Polls'
            : 'Program',
      });
    }
  } catch (err) {
    console.warn('RamblinWreck RSS failed:', err.message);
  }

  try {
    const search = await espnGet(
      'https://site.web.api.espn.com/apis/search/v2?query=georgia%20tech%20football%202026&limit=12'
    );
    for (const block of search.results || []) {
      if (block.type !== 'article') continue;
      for (const it of block.contents || []) {
        const headline = it.displayName || it.headline || it.title;
        const url = typeof it.link === 'string' ? it.link : it.link?.web || it.link?.href;
        const blob = `${headline} ${it.description || ''}`.toLowerCase();
        if (
          !/georgia tech|yellow jacket/.test(blob) &&
          !/acc college football preview|2026 acc/.test(blob)
        ) {
          continue;
        }
        push({
          headline,
          description: it.description || it.subtitle || '',
          url,
          published: it.date,
          image: it.images?.[0]?.url || null,
          source: 'ESPN',
          tag: /preview|opener/i.test(headline) ? 'Preview' : 'ESPN',
        });
      }
    }
  } catch (err) {
    console.warn('ESPN search failed:', err.message);
  }

  try {
    const news = await espnGet(
      'https://site.web.api.espn.com/apis/site/v2/sports/football/college-football/news?limit=40'
    );
    for (const a of news.articles || []) {
      const cats = a.categories || [];
      const isGt = cats.some((c) => String(c.teamId || c.team?.id) === TEAM_ID);
      const headline = a.headline || a.title || '';
      const desc = a.description || '';
      const blob = `${headline} ${desc}`.toLowerCase();
      const isAccPreview = /acc college football preview|2026 acc/.test(blob);
      if (!isGt && !isAccPreview) continue;
      push({
        headline,
        description: desc,
        url: a.links?.web?.href || a.links?.mobile?.href,
        published: a.published,
        image: a.images?.[0]?.url || null,
        source: 'ESPN',
        tag: a.type === 'Preview' ? 'Preview' : isAccPreview ? 'ACC' : 'ESPN',
      });
    }
  } catch (err) {
    console.warn('ESPN news failed:', err.message);
  }

  const curated = [
    {
      headline: '2026 ACC college football preview, predictions, top transfers and more',
      description:
        'Repeat run for Miami? Revenge for Duke? Reset for Clemson? Intrigue around a Tech team coming off 9-4.',
      url: 'https://www.espn.com/college-football/story/_/id/48947564/2026-acc-college-football-preview-predictions-top-transfers-more',
      source: 'ESPN',
      tag: 'ACC',
      published: '2026-08-11T11:36:42Z',
    },
    {
      headline: 'WR DeAndre Hopkins hired as Georgia Tech assistant WR coach',
      description: 'The NFL veteran joins Brent Key’s staff heading into the 2026 opener.',
      url: 'https://www.espn.com/college-football/story/_/id/49504555/wr-deandre-hopkins-hired-georgia-tech-assistant-wr-coach',
      source: 'ESPN',
      tag: 'Staff',
      published: '2026-08-06T16:00:00Z',
    },
  ];
  for (const item of curated) push(item);

  items.sort((a, b) => String(b.published).localeCompare(String(a.published)));
  return items.slice(0, 10);
}

export function accIdSet(standings) {
  const ids = new Set((standings?.conference?.entries || []).map((e) => String(e.id)));
  if (ids.size < 8) {
    for (const id of ACC_FALLBACK_IDS) ids.add(id);
  }
  ids.delete(TEAM_ID);
  return ids;
}

export function attachPolls(standings, polls, { note } = {}) {
  const ap = polls.find((p) => /AP/i.test(p.poll)) || polls[0] || null;
  const coaches = polls.find((p) => /coach/i.test(p.poll)) || null;
  return {
    ...standings,
    national: ap
      ? { ...ap, note: note || ap.note }
      : {
          id: 'ap',
          poll: 'AP Top 25',
          label: 'AP Top 25',
          note: note || null,
          entries: [],
        },
    polls: [ap, coaches].filter(Boolean).map((p) => ({
      ...p,
      note: note || p.note,
    })),
  };
}

export function buildPulse({ record, standings, schedule, polls }) {
  const next = schedule.find((g) => g.status !== 'final') || null;
  const acc = standings?.conference?.entries || [];
  const gt = acc.find((e) => e.abbr === 'GT');
  const accRank = acc.findIndex((e) => e.abbr === 'GT') + 1;
  const ap = polls?.find((p) => /AP/i.test(p.poll));
  const apRow = ap?.entries?.find((e) => e.abbr === 'GT');
  const homeLeft = schedule.filter((g) => g.home && g.status !== 'final').length;
  return [
    {
      label: String(CURRENT_SEASON),
      value: record || '0-0',
      detail: record === '0-0' ? 'Clean slate' : 'This season',
    },
    {
      label: 'ACC',
      value: gt?.conference || '0-0',
      detail: accRank > 0 ? `#${accRank} in table` : 'Conference',
    },
    {
      label: 'NEXT',
      value: next?.opponentAbbr || '—',
      detail: next ? `${next.dateLabel} · ${next.tv}` : 'Season complete',
    },
    {
      label: 'AP',
      value: apRow ? `#${apRow.rank}` : 'NR',
      detail: apRow ? 'Top 25' : 'Preseason poll',
    },
    {
      label: 'HOME',
      value: String(homeLeft),
      detail: homeLeft === 1 ? 'Home game left' : 'Home games left',
    },
  ].slice(0, 4);
}

export async function fetchSeasonOverlay() {
  const [standings2026, polls, record] = await Promise.all([
    fetchStandings(CURRENT_SEASON, String(CURRENT_SEASON)),
    fetchRankingsPolls(),
    fetchTeamRecord(),
  ]);
  const accIds = accIdSet(standings2026);
  const schedule = await fetchGtSchedule(accIds);
  const [opponents, news, standings2025] = await Promise.all([
    fetchOpponents(schedule, standings2026, CURRENT_SEASON),
    fetchNews(),
    fetchStandings(PRIOR_SEASON, `${PRIOR_SEASON} Final`).catch(() => null),
  ]);
  const standings = attachPolls(standings2026, polls, {
    note: '2026 polls · records reset with the new season',
  });
  const standingsPrior = standings2025
    ? {
        ...standings2025,
        national: {
          id: 'ap-final',
          poll: 'AP Top 25',
          label: `${PRIOR_SEASON} Final AP`,
          note: 'Georgia Tech finished 9-4 (6-2 ACC) and ranked No. 24 in the final 2025 AP poll.',
          entries: [],
        },
        polls: [],
      }
    : null;
  return {
    season: CURRENT_SEASON,
    record,
    schedule,
    opponents,
    standings,
    standingsPrior,
    polls: standings.polls || polls,
    news,
    pulse: buildPulse({ record, standings, schedule, polls }),
    dataAsOf: `ESPN ${CURRENT_SEASON} roster, slate, polls & news · synced ${new Date()
      .toISOString()
      .slice(0, 10)}`,
  };
}
