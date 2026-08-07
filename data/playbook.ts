import { depthFor } from '@/data/tech';
import type { DepthSlot } from '@/data/types';

export type PlaybookLevel = 'basics' | 'deeper';

export type PlaybookCoach = {
  role: string;
  name: string;
  note: string;
};

export type PlaybookPlayerRef = {
  depthLabel: string;
  role: string;
  blurb: string;
};

export type PlaybookPlay = {
  id: string;
  name: string;
  simple: string;
  deeper: string;
  watchFor: string;
};

export type PlaybookConcept = {
  id: string;
  title: string;
  simple: string;
  deeper: string;
};

export type SidePlaybook = {
  id: 'offense' | 'defense';
  title: string;
  scheme: string;
  tagline: string;
  /** One-screen “for dummies” summary */
  dummy: {
    headline: string;
    bullets: string[];
  };
  coaches: PlaybookCoach[];
  identity: string[];
  players: PlaybookPlayerRef[];
  plays: PlaybookPlay[];
  concepts: PlaybookConcept[];
  saturdayTips: string[];
};

function starter(unit: 'offense' | 'defense', label: string): DepthSlot | undefined {
  return depthFor(unit).find((r) => r.label === label)?.slots?.[0];
}

function playerLine(unit: 'offense' | 'defense', label: string, fallback: string) {
  const s = starter(unit, label);
  return s ? `#${s.number} ${s.name}` : fallback;
}

export const offensePlaybook: SidePlaybook = {
  id: 'offense',
  title: 'Offense Playbook',
  scheme: 'Spread Pro Style',
  tagline: 'Space the field, run with purpose, throw on schedule.',
  dummy: {
    headline: 'In English: Tech wants room to run and easy throws.',
    bullets: [
      'Spread = receivers line up wide so the defense can’t stack the box.',
      'Pro style = NFL-flavored terminology and multiple protections — not just “air raid.”',
      'The dream snap: run the ball downhill, then hit a play-action or RPO when the defense overplays the run.',
      'If you only watch one guy on offense, start with the RB and the OL — the identity starts up front.',
    ],
  },
  coaches: [
    {
      role: 'Head coach',
      name: 'Brent Key',
      note: 'Former OL / run-game guy. Sets the physical tone: win the line, stay flexible week to week.',
    },
    {
      role: 'Offensive coordinator',
      name: 'George Godsey',
      note: 'Former Tech QB. Back from the NFL (including Ravens staff). Aligns with Key on evaluation and a complementary run/pass mix.',
    },
    {
      role: 'Co-OC / quarterbacks',
      name: 'Chris Weinke',
      note: 'Helps install the QB menu — protections, progressions, and tempo tags.',
    },
  ],
  identity: [
    'Create numbers advantages with motion and formations.',
    'Establish the run so play-action is honest.',
    'Use RPOs and packaged plays so Mendoza can punish light boxes without forcing deep shots.',
    'Keep 11 personnel (1 RB, 1 TE, 3 WR) as the base look — matches the depth chart labels you see in Field view.',
  ],
  players: [
    {
      depthLabel: 'QB',
      role: 'Point guard',
      blurb: `${playerLine('offense', 'QB', 'QB')} runs the operation — cadence, protection calls, and whether the RPO becomes a throw or a handoff.`,
    },
    {
      depthLabel: 'RB',
      role: 'Engine',
      blurb: `${playerLine('offense', 'RB', 'RB')} is the first read on zone/gap runs and a checkdown outlet when the pocket collapses.`,
    },
    {
      depthLabel: 'WR-X',
      role: 'Boundary vertical',
      blurb: `${playerLine('offense', 'WR-X', 'X receiver')} aligns wide — clears coverage and wins contested balls when Tech takes shots.`,
    },
    {
      depthLabel: 'WR-Z',
      role: 'Field vertical',
      blurb: `${playerLine('offense', 'WR-Z', 'Z receiver')} mirrors X on the other side; watch him on glance, comeback, and deep overs.`,
    },
    {
      depthLabel: 'WR-SL',
      role: 'Slot problem',
      blurb: `${playerLine('offense', 'WR-SL', 'Slot')} works the middle — mesh, option routes, and quick game vs nickel.`,
    },
    {
      depthLabel: 'TE',
      role: 'Chess piece',
      blurb: `${playerLine('offense', 'TE', 'TE')} can inline block like an extra tackle or detach as a receiver — classic pro-spread flexibility.`,
    },
    {
      depthLabel: 'C',
      role: 'Line brain',
      blurb: `${playerLine('offense', 'C', 'Center')} IDs the front and starts the protection — if the OL wins, everything else looks sharper.`,
    },
  ],
  plays: [
    {
      id: 'outside-zone',
      name: 'Outside zone',
      simple:
        'OL steps the same way, RB reads the flow and either bounces outside or cuts back into a crease. It’s a “find grass” run.',
      deeper:
        'Zone asks linemen to combo blocks and climb to linebackers. The RB’s track is disciplined: press the edge, plant, and finish north-south. Tech uses this to set up bootlegs and RPOs off the same look.',
      watchFor:
        'If the DE crashes hard inside, the bounce is there. If the edge sits, the cutback behind the pulling/climbing guard is the money cut.',
    },
    {
      id: 'inside-zone-rpo',
      name: 'Inside zone + RPO',
      simple:
        'Looks like a handoff into the A/B gap — but the QB peeks a flat or bubble defender. If that defender sits on the run, he pulls and throws.',
      deeper:
        'Packaged plays let the offense force a conflict defender to be wrong. Pre-snap motion can tip coverage. Post-snap, Mendoza’s eyes tell you the call: mesh with RB = run; sudden pull = throw.',
      watchFor:
        'Count box defenders. Six or fewer in the box? Expect the handoff. Extra hat walks down? Expect the RPO throw.',
    },
    {
      id: 'play-action-shot',
      name: 'Play-action shot',
      simple:
        'Fake the run, then throw deep or over the middle while linebackers step up.',
      deeper:
        'Pro-style PA uses max/half-roll protections. Routes often pair a clear-out vertical with a dig/over or a deep crosser. Godsey’s NFL background shows up in timing: the ball should be out on a rhythm drop.',
      watchFor:
        'Safeties who bite downhill on the fake. If both high safeties sit deep, Tech may check to a run or a shorter crosser instead.',
    },
    {
      id: 'mesh',
      name: 'Mesh / crossing game',
      simple:
        'Two receivers rub across the middle. Someone usually comes open when defenders collide or hesitate.',
      deeper:
        'Mesh stresses man coverage and zone hook defenders. The slot and TE (or opposite WR) create a natural pick without needing a true screen. Good vs blitz because the QB has a quick, defined answer.',
      watchFor:
        'Man coverage: the second crosser. Zone: the settling option in the hole behind the rub.',
    },
    {
      id: 'quick-game',
      name: 'Quick game (slant / stick / hitch)',
      simple:
        'Three-step answers — get the ball out before the rush arrives.',
      deeper:
        'Stick and hitch concepts flood a zone area; slants attack leverage. These are “stay ahead of the chains” plays and the foundation when Tech wants tempo.',
      watchFor:
        'CB alignment. Press-man invites slant. Soft cushion invites hitch/comeback.',
    },
  ],
  concepts: [
    {
      id: '11-personnel',
      title: '11 personnel (the base look)',
      simple: '1 running back, 1 tight end, 3 wide receivers. It’s the modern default.',
      deeper:
        'Eleven keeps a run threat while forcing nickel personnel on defense. Tech’s depth chart (WR-X / WR-Z / WR-SL + TE + RB) is built for this. Empty or 12 (2 TE) are changeups, not the identity.',
    },
    {
      id: 'protection',
      title: 'Protection before hero ball',
      simple: 'If the OL can’t block it, the play never happens.',
      deeper:
        'Pro-style offenses tag protections (slide, big-on-big, turnback). Listen for hard counts and checks — Mendoza communicating with Ionata and the tackles is a feature, not a bug.',
    },
    {
      id: 'tempo',
      title: 'Tempo as a weapon',
      simple: 'Sometimes they snap fast so the defense can’t substitute.',
      deeper:
        'No-huddle after explosives or vs confused personnel. Don’t confuse “spread” with “always fast” — Tech still huddles when they want to dictate a heavier call.',
    },
    {
      id: 'godsey-key',
      title: 'Godsey + Key partnership',
      simple: 'New OC in 2026, same physical ethos from Key.',
      deeper:
        'Godsey’s NFL packaging meets Key’s OL-driven run game. Expect complementary football: early downs to set levers, not 50/50 chuck-and-duck.',
    },
  ],
  saturdayTips: [
    'First 15 plays: are they establishing Haynes/the run, or are they in quick game?',
    'On early downs, count the box — that predicts RPO vs pure run.',
    'Explosive pass? Rewind: was it PA off a run look you’d already seen?',
    'Third-and-medium: mesh/stick territory more often than hero deep balls.',
  ],
};

export const defensePlaybook: SidePlaybook = {
  id: 'defense',
  title: 'Defense Playbook',
  scheme: '4-2-5',
  tagline: 'Four down linemen, two linebackers, five DBs — speed over bulk.',
  dummy: {
    headline: 'In English: Tech plays light and fast in the secondary.',
    bullets: [
      '4 = four players with a hand in the dirt (ends + tackles).',
      '2 = two traditional linebackers near the ball.',
      '5 = five defensive backs (corners, nickel, safeties) — built for spread offenses.',
      'Goal: stop the run with angles and pursuit, then erase space in the pass game with an extra DB.',
    ],
  },
  coaches: [
    {
      role: 'Head coach',
      name: 'Brent Key',
      note: 'Program standard-setter. Defense still has to fit his physical, complementary identity.',
    },
    {
      role: 'Defensive coordinator',
      name: 'Jason Semore',
      note: 'Returned as DC in 2026 (also linebackers). Prior GT staff experience with Key — continuity on communication and pursuit rules.',
    },
  ],
  identity: [
    'Nickel as the base — five DBs vs modern spread.',
    'Disruptive front that can win with four rushers so coverage isn’t stranded.',
    'Two LBs who can run (sideline to sideline) more than classic thumpers.',
    'Safeties help vs run and rotate into coverage — FS/SS are not statues.',
  ],
  players: [
    {
      depthLabel: 'DE',
      role: 'Edge setter',
      blurb: `${playerLine('defense', 'DE', 'DE')} holds the edge on run plays and freelances for pressure when the call is go.`,
    },
    {
      depthLabel: 'RUSH',
      role: 'Speed end',
      blurb: `${playerLine('defense', 'RUSH', 'Rush end')} is the chase piece — wider alignment, higher sack upside.`,
    },
    {
      depthLabel: 'NT',
      role: 'Nose',
      blurb: `${playerLine('defense', 'NT', 'Nose')} occupies double teams so LBs can run free.`,
    },
    {
      depthLabel: 'DT',
      role: '3-tech / penetrator',
      blurb: `${playerLine('defense', 'DT', 'DT')} attacks gaps and collapses pocket from inside.`,
    },
    {
      depthLabel: 'MLB',
      role: 'Signal-caller',
      blurb: `${playerLine('defense', 'MLB', 'Mike LB')} fits the A/B gaps and makes the checks — Efford’s unit heartbeat.`,
    },
    {
      depthLabel: 'WLB',
      role: 'Will / flow',
      blurb: `${playerLine('defense', 'WLB', 'Will LB')} runs to the perimeter and matches backs/TEs in space.`,
    },
    {
      depthLabel: 'NB',
      role: 'Nickel',
      blurb: `${playerLine('defense', 'NB', 'Nickel')} is why it’s a 4-2-5 — covers slots and can blitz from the edge of the box.`,
    },
    {
      depthLabel: 'FS',
      role: 'Center field',
      blurb: `${playerLine('defense', 'FS', 'Free safety')} is the last line — deep help and alley support.`,
    },
  ],
  plays: [
    {
      id: 'cover-3',
      name: 'Cover 3 (base zone)',
      simple:
        'Three deep zones (two corners + a safety) and four underneath defenders. Safe vs deep balls; can get stressed by crossing routes.',
      deeper:
        'In a 4-2-5 shell, nickel and LBs own the hooks/flats. Corners sink with vertical stems. Tech can play “sky” (safety deep middle) or rotate to a one-high look after motion.',
      watchFor:
        'Mesh and digs that settle in the seams between deep thirds and underneath zones.',
    },
    {
      id: 'cover-1',
      name: 'Cover 1 (man + robber/help)',
      simple:
        'Everyone locks a man; one safety cleans up deep. Aggressive — big plays both ways.',
      deeper:
        'Often paired with a five- or six-man pressure. Nickel matches the slot. The “robber” safety can cheat toward a favored route concept if Semore tags it.',
      watchFor:
        'Picks/rubs vs man. If Tech’s DBs win leverage at the snap, Cover 1 looks elite; if not, yards after catch explode.',
    },
    {
      id: 'cover-2-invert',
      name: 'Two-high / quarters family',
      simple:
        'Two safeties deep split the field — harder to hit deep outs and posts.',
      deeper:
        'Quarters (Cover 4) lets corners play run-strong and pass off verticals to safeties. Useful vs 11-personnel spread teams that love PA shots — exactly what Tech sees in the ACC.',
      watchFor:
        'RPOs that hold the safety with a run fake, then throw the glance/hitch into vacated grass.',
    },
    {
      id: 'simulated-pressure',
      name: 'Simulated pressure',
      simple:
        'Looks like a blitz, but only four rush — coverage behind it stays sound.',
      deeper:
        'A LB or nickel walks up, then peels into coverage while a delayed end loops. Offenses slide protection the wrong way. Classic modern college answer to RPO/empty.',
      watchFor:
        'Pre-snap chaos (walk-ups) that settles into a four-man rush. If the OL slides toward the fake, the free rusher is coming from the other edge.',
    },
    {
      id: 'run-fits',
      name: 'Run fits (spill / alley)',
      simple:
        'Everyone has a gap. Wrong gap = chunk run.',
      deeper:
        '4-2-5 often “spills” wide runs to the alley where a safety fills. Nose and DT must occupy so Efford/Lightsey aren’t blocked twice. Pursuit angles > highlight-reel arm tackles.',
      watchFor:
        'Cutbacks. If the front overruns outside zone, Haynes-type backs make you pay the other way.',
    },
  ],
  concepts: [
    {
      id: 'why-425',
      title: 'Why 4-2-5 instead of 4-3?',
      simple: 'Because offenses live in 11 personnel — you need an extra DB more than a third LB.',
      deeper:
        'A classic 4-3 puts three LBs on the field. Spread teams punish that with slots and empty. 4-2-5 trades a LB for a nickel who can cover and still blitz.',
    },
    {
      id: 'nickel-base',
      title: 'Nickel is the base, not a package',
      simple: 'That fifth DB isn’t a special look — it’s Saturday’s default.',
      deeper:
        'Field view’s NB spot matters. If Hill (or whoever’s in) can’t play, the whole structure bends. Matchups vs ACC slots decide drives.',
    },
    {
      id: 'semore-return',
      title: 'Semore’s return',
      simple: 'New DC in 2026 who already knows Key’s building.',
      deeper:
        'Staff continuity helps communication — checks, pursuit rules, and specials install faster when the call sheet language is shared. Expect clarity over exotic blitz roulette early.',
    },
    {
      id: 'complementary',
      title: 'Complementary football',
      simple: 'Defense’s job is get the ball back in good field position — not just pad sack totals.',
      deeper:
        'Third-down stops and red-zone stands matter more than free-rusher highlights. Takeaways after Godsey’s offense goes three-and-out are the hidden yardage game.',
    },
  ],
  saturdayTips: [
    'At the snap, count DBs near the box — five backs = 4-2-5 nickel base.',
    'If both safeties are deep, expect a two-high answer to PA.',
    'Walk-up LB who drops = simulated pressure, not always a true blitz.',
    'Chunk run? Find who missed the spill/alley fit — usually a LB or safety angle.',
  ],
};

export function playbookFor(side: 'offense' | 'defense'): SidePlaybook {
  return side === 'offense' ? offensePlaybook : defensePlaybook;
}
