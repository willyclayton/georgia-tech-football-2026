/**
 * Data-driven fan-question coverage for Ask Buzz.
 * Adds natural-language phrasings from the ~250 fan FAQ list when live.json can answer.
 */
export function addFanDataCoverage(push, ctx) {
  const { team, players, schedule, depthChart, collegeStops, describePlayer, describeStats, playerLinks, shortLastName } =
    ctx;

  const starter = (unit, label) => {
    const row = (depthChart[unit] || []).find((r) => r.label === label);
    return row?.slots?.[0] || null;
  };
  const depthNames = (unit, label, n = 3) => {
    const row = (depthChart[unit] || []).find((r) => r.label === label);
    return (row?.slots || [])
      .filter((s) => s.name)
      .slice(0, n)
      .map((s) => `#${s.number} ${s.name}`)
      .join(' → ');
  };

  const qb1 = starter('offense', 'QB');
  const rb1 = starter('offense', 'RB');
  const te1 = starter('offense', 'TE');
  const lt = starter('offense', 'LT');
  const pk = starter('special', 'PK');
  const punter = starter('special', 'P');
  const ls = starter('special', 'LS');

  const qbs = players.filter((p) => p.position === 'QB').sort((a, b) => a.number - b.number);
  const rbs = players.filter((p) => ['RB', 'FB'].includes(p.position));
  const wrs = players.filter((p) => p.position === 'WR');
  const wrYds = (p) => {
    const h = p.career?.headlines?.find((x) => x.label === 'YDS');
    return h ? Number(String(h.value).replace(/,/g, '')) || 0 : 0;
  };
  const topWrs = [...wrs].sort((a, b) => wrYds(b) - wrYds(a)).slice(0, 3);
  const depthWrs = ['WR-X', 'WR-Z', 'WR-SL']
    .map((label) => starter('offense', label))
    .filter(Boolean);

  const qbTransfers = qbs.filter((p) => collegeStops(p).length);
  const defTransfers = players.filter(
    (p) => p.unit === 'defense' && collegeStops(p).length
  );

  const olLabels = ['LT', 'LG', 'C', 'RG', 'RT'];
  const olStarters = olLabels.map((l) => starter('offense', l)).filter(Boolean);

  const home = schedule.filter((g) => g.home);
  const away = schedule.filter((g) => !g.home);
  const nonCon = schedule.filter((g) => !g.conference);
  const acc = schedule.filter((g) => g.conference);
  const thuFri = schedule.filter((g) => /thu|fri/i.test(g.dateLabel));
  const open = schedule[0];
  const uga = schedule.find((g) => /georgia/i.test(g.opponent) && !/tech/i.test(g.opponent));
  const clem = schedule.find((g) => /clemson/i.test(g.opponent));
  const miami = schedule.find((g) => /miami/i.test(g.opponent));
  const fsu = schedule.find((g) => /florida state|fsu/i.test(g.opponent));

  // Bye weeks: gaps > 10 days between games
  const byes = [];
  for (let i = 0; i < schedule.length - 1; i++) {
    const a = new Date(`${schedule[i].date}T12:00:00`);
    const b = new Date(`${schedule[i + 1].date}T12:00:00`);
    const days = (b - a) / (1000 * 60 * 60 * 24);
    if (days >= 13) {
      byes.push(`Open week between ${schedule[i].opponent} (${schedule[i].dateLabel}) and ${schedule[i + 1].opponent} (${schedule[i + 1].dateLabel})`);
    }
  }

  const rushYds = (p) => {
    const h = p.career?.headlines?.find((x) => x.label === 'YDS');
    return h ? Number(String(h.value).replace(/,/g, '')) || 0 : 0;
  };
  const thousandYard = rbs.filter((p) => rushYds(p) >= 1000);

  // --- QB ---
  if (qb1) {
    const qbPlayer = players.find((p) => p.id === qb1.id || p.name === qb1.name);
    push({
      id: 'fan-qb1',
      category: 'roster',
      scope: 'player',
      intent: 'depth',
      playerIds: qb1.id ? [String(qb1.id)] : [],
      jersey: qb1.number,
      names: [qb1.name, shortLastName(qb1.name)],
      questions: [
        "Who's QB1?",
        'Who is QB1?',
        'Who starts at quarterback?',
        'Who is the starting quarterback?',
        'Is the QB job settled?',
        'Is the job settled or still open in fall camp?',
      ],
      keywords: ['qb1', 'starting quarterback', 'qb job', 'fall camp'],
      answer: [
        `Camp depth chart projects QB1 as #${qb1.number} ${qb1.name}.`,
        qbPlayer ? describeStats(qbPlayer) : null,
        `Backups on the loaded roster: ${qbs
          .filter((p) => p.name !== qb1.name)
          .map((p) => `#${p.number} ${p.name}`)
          .join(', ') || '—'}.`,
        'Depth charts are camp projections — not a proclamation that the job is closed.',
      ]
        .filter(Boolean)
        .join('\n'),
      links: qb1.id
        ? [
            { label: `#${qb1.number} ${qb1.name}`, href: `/player/${qb1.id}` },
            { label: 'Open depth chart', href: '/depth' },
          ]
        : [{ label: 'Open depth chart', href: '/depth' }],
      followUps: ['Who is the backup QB?', 'Did we add a QB from the portal?'],
    });

    push({
      id: 'fan-qb-backup',
      category: 'roster',
      scope: 'group',
      intent: 'depth',
      questions: [
        "Who's the backup if QB1 goes down?",
        'Who is the backup QB?',
        'QB2',
        'Who backs up the quarterback?',
      ],
      keywords: ['backup qb', 'qb2', 'if qb1 goes down'],
      answer: `Behind #${qb1.number} ${qb1.name} on the camp depth chart: ${depthNames('offense', 'QB', 4) || qbs.map((p) => `#${p.number} ${p.name}`).join(', ')}.`,
      links: [{ label: 'Open depth chart', href: '/depth' }],
      followUps: ["Who's QB1?", 'List the QBs'],
    });

    if (qbPlayer?.career?.headlines?.length) {
      push({
        id: 'fan-qb-numbers',
        category: 'player',
        scope: 'player',
        intent: 'stats',
        playerIds: [String(qbPlayer.id)],
        jersey: qbPlayer.number,
        names: [qbPlayer.name, shortLastName(qbPlayer.name)],
        questions: [
          'What were his numbers last season?',
          `What were ${qbPlayer.name} numbers last season?`,
          'QB stats last year',
          'Starting QB career numbers',
        ],
        keywords: ['qb stats', 'numbers last season', 'last year'],
        answer: describeStats(qbPlayer),
        links: playerLinks([qbPlayer]),
        followUps: ["Who's QB1?", 'Runner or pocket passer?'],
      });
    }
  }

  push({
    id: 'fan-qb-portal',
    category: 'roster',
    scope: 'group',
    intent: 'transfer',
    questions: [
      'Did we add a QB from the portal?',
      'Any portal quarterbacks?',
      'QB transfer portal additions',
    ],
    keywords: ['qb portal', 'portal quarterback', 'qb transfer'],
    answer: qbTransfers.length
      ? `QBs on the roster with prior college stops:\n${qbTransfers
          .map((p) => {
            const path = collegeStops(p)
              .map((t) => t.abbr || t.name)
              .join(' → ');
            return `• #${p.number} ${p.name} — ${path} → GT`;
          })
          .join('\n')}`
      : 'No quarterbacks on the loaded roster are listed with a prior college team.',
    links: playerLinks(qbTransfers.slice(0, 4)),
    followUps: ["Who's QB1?", 'List the transfer players'],
  });

  push({
    id: 'fan-qb-style',
    category: 'playbook',
    scope: 'team',
    intent: 'playbook',
    questions: [
      'Runner or pocket passer?',
      'Is the QB a runner?',
      'Dual-threat QB?',
      'Are we an RPO-heavy offense?',
      "What's our play-action rate?",
      'Shotgun vs under center?',
    ],
    keywords: ['runner', 'pocket passer', 'dual threat', 'rpo', 'play-action', 'shotgun'],
    answer: [
      `Scheme label: ${team.offense}.`,
      'In-app playbook: Tech wants room to run and easy throws — zone/gap run game, RPOs/packaged plays, and play-action shots. That is complementary football, not a pure air-raid or pure option identity.',
      'I do not track advanced rates (play-action %, time-to-throw, pressure completion). Open Depth → Playbook for the for-dummies guide.',
    ].join('\n'),
    links: [{ label: 'Open playbook', href: '/depth' }],
    followUps: ['Explain the offense playbook', "Who's QB1?"],
  });

  // --- Offense skill / OL ---
  if (rb1) {
    push({
      id: 'fan-rb1',
      category: 'roster',
      scope: 'player',
      intent: 'depth',
      playerIds: rb1.id ? [String(rb1.id)] : [],
      jersey: rb1.number,
      names: [rb1.name, shortLastName(rb1.name)],
      questions: [
        "Who's RB1 and is there a committee?",
        "Who's RB1?",
        'Who is the starting running back?',
        'Is there a running back committee?',
      ],
      keywords: ['rb1', 'running back committee', 'starting rb'],
      answer: [
        `Camp depth chart RB1: #${rb1.number} ${rb1.name}.`,
        `RB room on the roster (${rbs.length}): ${rbs
          .map((p) => `#${p.number} ${shortLastName(p.name)}`)
          .join(', ')}.`,
        thousandYard.length
          ? `Players with 1,000+ career rush yards in-app: ${thousandYard
              .map((p) => `#${p.number} ${p.name} (${p.career.headlines.find((h) => h.label === 'YDS')?.value} YDS)`)
              .join('; ')}.`
          : 'No RB on the loaded roster shows 1,000+ career rush yards in the app headlines.',
        'Looks like a featured back with committee depth — not a pure committee of equals on the depth chart.',
      ].join('\n'),
      links: rb1.id
        ? [
            { label: `#${rb1.number} ${rb1.name}`, href: `/player/${rb1.id}` },
            { label: 'Open depth chart', href: '/depth' },
          ]
        : [{ label: 'Open depth chart', href: '/depth' }],
      followUps: ['Do we return a 1,000-yard rusher?', 'List the RBs'],
    });
  }

  push({
    id: 'fan-1000-rusher',
    category: 'roster',
    scope: 'group',
    intent: 'stats',
    questions: [
      'Do we return a 1,000-yard rusher?',
      'Any 1000 yard rushers?',
      'Who rushed for 1000 yards?',
    ],
    keywords: ['1000-yard', '1,000-yard', 'thousand yard rusher'],
    answer: thousandYard.length
      ? `Yes — in career totals loaded in the app:\n${thousandYard
          .map((p) => `• #${p.number} ${p.name}: ${p.career.headlines.map((h) => `${h.label} ${h.value}`).join(' · ')}`)
          .join('\n')}\n(Those are career college totals in the feed, not necessarily a single GT season.)`
      : 'No RB currently shows 1,000+ rush yards in the career headlines loaded here.',
    links: playerLinks(thousandYard.slice(0, 4)),
    followUps: ["Who's RB1?", 'Justice Haynes stats'],
  });

  push({
    id: 'fan-top-receivers',
    category: 'roster',
    scope: 'group',
    intent: 'roster',
    questions: [
      'Who are the top three receivers?',
      'Top receivers',
      'Who are our best WRs?',
      'Do we have a true No. 1 outside receiver?',
      "Who's the slot guy?",
      "Who's the vertical threat?",
    ],
    keywords: ['top receivers', 'top three receivers', 'no. 1 receiver', 'slot', 'vertical threat'],
    answer: [
      `Camp depth chart WRs: X ${depthNames('offense', 'WR-X', 1) || '—'} · Z ${
        depthNames('offense', 'WR-Z', 1) || '—'
      } · Slot ${depthNames('offense', 'WR-SL', 1) || '—'}.`,
      topWrs.length
        ? `Highest career receiving yards in-app among WRs:\n${topWrs
            .map((p, i) => `${i + 1}. #${p.number} ${p.name} — ${p.career?.headlines?.map((h) => `${h.label} ${h.value}`).join(' · ') || 'no stats'}`)
            .join('\n')}`
        : null,
      'I do not grade “true WR1” or contested-catch rankings beyond depth + career lines.',
    ]
      .filter(Boolean)
      .join('\n'),
    links: playerLinks((depthWrs.map((s) => players.find((p) => p.id === s.id || p.name === s.name)).filter(Boolean)).slice(0, 3)),
    followUps: ['Who is the starting tight end?', 'List the WRs'],
  });

  if (te1) {
    push({
      id: 'fan-starting-te',
      category: 'roster',
      scope: 'player',
      intent: 'depth',
      playerIds: te1.id ? [String(te1.id)] : [],
      jersey: te1.number,
      names: [te1.name, shortLastName(te1.name)],
      questions: [
        "Who's the starting tight end?",
        'Who starts at TE?',
        'Starting TE',
        'Do tight ends get targeted or mostly block?',
      ],
      keywords: ['starting tight end', 'starting te', 'tight end'],
      answer: [
        `Camp depth chart TE: #${te1.number} ${te1.name} (${depthNames('offense', 'TE', 3)}).`,
        'Playbook note: the TE is a chess piece — can inline block like an extra tackle or detach as a receiver. I do not have target-share splits.',
      ].join('\n'),
      links: te1.id
        ? [{ label: `#${te1.number} ${te1.name}`, href: `/player/${te1.id}` }]
        : [{ label: 'Open depth chart', href: '/depth' }],
      followUps: ['List the TEs', 'Tell me about the offense'],
    });
  }

  push({
    id: 'fan-ol-starters',
    category: 'roster',
    scope: 'group',
    intent: 'depth',
    questions: [
      'How many O-line starters return?',
      "Who's at left tackle?",
      'Who starts at left tackle?',
      'Offensive line starters',
      "Who's the sixth man on the O-line?",
      'Zone or gap scheme up front?',
      'Do we pull guards much?',
      'Do we use a fullback or H-back?',
    ],
    keywords: ['o-line', 'offensive line', 'left tackle', 'zone', 'gap', 'fullback', 'sixth man'],
    answer: [
      `Camp OL starters: ${olStarters
        .map((s, i) => `${olLabels[i]} #${s.number} ${shortLastName(s.name)}`)
        .join(' · ') || 'not loaded'}.`,
      lt ? `Left tackle: #${lt.number} ${lt.name}.` : null,
      `Scheme identity: ${team.offense} — playbook emphasizes outside/inside zone with gap/power flavors and RPO packaging. I do not have “how many OL starters return from last year” as a computed field, or pull-rate / sixth-man labels beyond the depth chart.`,
      'Open Depth for the full OL chain.',
    ]
      .filter(Boolean)
      .join('\n'),
    links: [{ label: 'Open depth chart', href: '/depth' }],
    followUps: ['Tell me about the offense', 'Explain the offense playbook'],
  });

  push({
    id: 'fan-offensive-identity',
    category: 'playbook',
    scope: 'team',
    intent: 'playbook',
    questions: [
      "What's the offensive identity — tempo, spread, run-heavy?",
      'What is the offensive identity?',
      'Tempo or grind?',
      'Run-heavy offense?',
      "What's the biggest question mark on offense?",
      "Who's the breakout candidate nobody's talking about?",
      "What's our returning production percentage on offense?",
      'What did we average in points and yards per game last year?',
      'Any true freshmen expected to contribute?',
      'Any injuries carrying over from spring?',
    ],
    keywords: [
      'offensive identity',
      'tempo',
      'run-heavy',
      'question mark',
      'breakout',
      'returning production',
      'points per game',
      'freshmen contribute',
      'spring injuries',
    ],
    answer: [
      `Identity in-app: ${team.offense} — space the field, run with purpose, throw on schedule (not pure tempo air raid).`,
      'I do not invent returning-production %, PPG/YPG team averages, spring injury carryovers, or “breakout nobody’s talking about” opinions.',
      `Freshmen on the loaded roster: ${players.filter((p) => /fresh/i.test(p.eligibility?.class || p.year)).length}. Ask about a name or “list the freshmen.”`,
      'Open Depth → Playbook for scheme basics.',
    ].join('\n'),
    links: [{ label: 'Open playbook', href: '/depth' }],
    followUps: ['Explain the offense playbook', "Who's QB1?"],
  });

  // --- Defense ---
  push({
    id: 'fan-base-defense',
    category: 'playbook',
    scope: 'team',
    intent: 'playbook',
    questions: [
      "What's our base defense — 3-4, 4-2-5, 4-3?",
      'What is our base defense?',
      'Did the scheme change with the current staff?',
      'Do we live in nickel or is that a change-up?',
      'Single-high or two-high safety look?',
      'How much man vs zone do we play?',
      "What's our blitz rate?",
    ],
    keywords: ['base defense', '3-4', '4-3', '4-2-5', 'nickel', 'blitz rate', 'man vs zone', 'two-high'],
    answer: [
      `Base defense label in-app: ${team.defense} (four down linemen, two linebackers, five DBs).`,
      `DC ${team.defensiveCoordinator || 'Jason Semore'} is in year one of this DC stint (returned for 2026).`,
      'I do not track man/zone %, blitz rate, or single-high vs two-high tendencies snap-by-snap. Open Depth → Playbook for the 4-2-5 for-dummies guide.',
    ].join('\n'),
    links: [{ label: 'Open playbook', href: '/depth' }],
    followUps: ['Explain the defense playbook', 'Who are the starting linebackers?'],
  });

  const passRusher = starter('defense', 'RUSH') || starter('defense', 'DE');
  const nt = starter('defense', 'NT');
  const dt = starter('defense', 'DT');
  const mlb = starter('defense', 'MLB');
  const wlb = starter('defense', 'WLB');
  const lcb = starter('defense', 'LCB');
  const rcb = starter('defense', 'RCB');
  const nb = starter('defense', 'NB');

  push({
    id: 'fan-def-starters',
    category: 'depth',
    scope: 'group',
    intent: 'depth',
    questions: [
      "Who's the primary pass rusher?",
      'Who anchors the interior D-line?',
      'Who are the starting linebackers?',
      "Who's the top corner and does he travel?",
      "Who's the nickel?",
      'Who wears the green dot?',
      'Do we rotate the D-line heavily or ride starters?',
      'Which portal additions on defense matter most?',
      "What's the biggest hole on that side of the ball?",
    ],
    keywords: [
      'pass rusher',
      'interior d-line',
      'starting linebackers',
      'top corner',
      'nickel',
      'green dot',
      'd-line rotation',
      'portal defense',
      'biggest hole',
    ],
    answer: [
      `Camp defense projection:`,
      passRusher ? `· Edge/RUSH: ${depthNames('defense', 'RUSH', 2) || depthNames('defense', 'DE', 2)}` : null,
      nt || dt
        ? `· Interior: NT ${depthNames('defense', 'NT', 2) || '—'} · DT ${depthNames('defense', 'DT', 2) || '—'}`
        : null,
      mlb || wlb
        ? `· Linebackers: MLB ${depthNames('defense', 'MLB', 2) || '—'} · WLB ${depthNames('defense', 'WLB', 2) || '—'}`
        : null,
      lcb || rcb
        ? `· Corners: LCB ${depthNames('defense', 'LCB', 2) || '—'} · RCB ${depthNames('defense', 'RCB', 2) || '—'}${
            nb ? ` · Nickel ${depthNames('defense', 'NB', 2)}` : ''
          }`
        : null,
      `Defense portal/transfers on roster: ${defTransfers.length} (ask “list the transfer players” or a name).`,
      'I do not invent green-dot assignments, travel-corner labels, rotation philosophy, or “biggest hole” opinions.',
    ]
      .filter(Boolean)
      .join('\n'),
    links: [{ label: 'Open depth chart', href: '/depth' }],
    followUps: ['Tell me about the defense', 'List the transfer players'],
  });

  // --- Special teams ---
  push({
    id: 'fan-special-teams',
    category: 'depth',
    scope: 'group',
    intent: 'depth',
    questions: [
      "Who's kicking field goals?",
      "Who's punting?",
      "Who's returning kicks and punts?",
      'Any long snapper concerns?',
      'Were there kicking issues last season?',
      'Where did we rank in special teams efficiency?',
      "What's the kicker's realistic range?",
      'Touchback percentage on kickoffs?',
      'Net punting average?',
      'Do we fake punts or field goals?',
    ],
    keywords: [
      'field goals',
      'kicking',
      'punting',
      'punt return',
      'kick return',
      'long snapper',
      'special teams efficiency',
      'touchback',
      'net punting',
      'fake punt',
    ],
    answer: [
      pk ? `PK (camp): ${depthNames('special', 'PK', 3)}` : 'PK: not listed on special depth.',
      punter ? `P (camp): ${depthNames('special', 'P', 3)}` : 'P: not listed.',
      ls ? `LS (camp): ${depthNames('special', 'LS', 3)}` : 'LS: not listed.',
      'Returners are not always broken out as depth rows in this feed — check Roster tags/notes or Athletics depth charts for KR/PR.',
      'I do not track ST efficiency rankings, touchback %, net punt, fake tendencies, or “kicking issues” narratives.',
    ].join('\n'),
    links: [{ label: 'Open depth chart', href: '/depth' }],
    followUps: ['Who is Aidan Birr?', 'When is the next game?'],
  });

  // --- Schedule fan phrasings ---
  if (open) {
    push({
      id: 'fan-schedule-open',
      category: 'schedule',
      scope: 'team',
      intent: 'schedule',
      questions: [
        'When and against whom do we open?',
        'Home or away for game one?',
        "What's the full non-conference slate?",
        'Any Power Four non-con opponents?',
        'How many home games do we have?',
        'Any Thursday or Friday night games?',
        'Have kickoff times and TV windows been announced?',
        'Any neutral-site games?',
        'When are the bye weeks?',
        'When do we get Clemson, Miami, and FSU?',
        'Which ACC opponents did we draw this year?',
      ],
      keywords: [
        'open',
        'game one',
        'non-conference',
        'power four',
        'home games',
        'thursday',
        'friday',
        'tv windows',
        'bye weeks',
        'miami',
        'fsu',
        'neutral-site',
      ],
      answer: [
        `Opener: ${open.home ? 'vs' : '@'} ${open.opponent} on ${open.dateLabel} at ${open.time} (${open.tv || 'TV TBD'}) — ${
          open.home ? 'home' : 'away'
        } at ${open.venue}.`,
        `Non-conference (${nonCon.length}): ${nonCon
          .map((g) => `${g.home ? 'vs' : '@'} ${g.opponent} (${g.dateLabel})`)
          .join('; ')}.`,
        `Power-four flavored non-con on this slate: ${nonCon
          .filter((g) => !/mercer/i.test(g.opponent))
          .map((g) => g.opponent)
          .join(', ') || '—'}.`,
        `Home games: ${home.length}. Road games: ${away.length}.`,
        `ACC opponents (${acc.length}): ${acc.map((g) => g.opponent).join(', ')}.`,
        clem
          ? `Clemson: ${clem.home ? 'vs' : '@'} Clemson on ${clem.dateLabel}.`
          : 'Clemson: not on the loaded 2026 slate.',
        miami ? `Miami: ${miami.dateLabel}.` : 'Miami: not on the loaded 2026 slate.',
        fsu ? `FSU: ${fsu.dateLabel}.` : 'FSU: not on the loaded 2026 slate.',
        thuFri.length
          ? `Thu/Fri games: ${thuFri.map((g) => `${g.dateLabel} ${g.home ? 'vs' : '@'} ${g.opponent}`).join('; ')}.`
          : 'No Thursday/Friday games on the loaded slate.',
        byes.length ? `Likely bye/open weeks: ${byes.join(' · ')}.` : 'No 13+ day gaps detected between listed games.',
        'Neutral-site: none flagged in this schedule feed (UGA is listed as a road game in Athens).',
        'Some ACC windows still show TBA for time/TV — ask a specific opponent for the latest row.',
      ].join('\n'),
      links: [{ label: 'Full schedule', href: '/schedule' }],
      followUps: ['When is the UGA game?', 'When is the next game?'],
    });
  }

  if (uga) {
    push({
      id: 'fan-uga-site',
      category: 'schedule',
      scope: 'team',
      intent: 'schedule',
      questions: [
        'When do we play Georgia, and is it in Athens or Atlanta?',
        'Is the Georgia game in Athens or Atlanta?',
        'UGA home or away?',
        'Sanford Stadium?',
      ],
      keywords: ['athens', 'atlanta', 'sanford', 'uga site', 'georgia site'],
      answer: `${uga.home ? 'vs' : '@'} Georgia on ${uga.dateLabel} at ${uga.time} (${uga.tv || 'TV TBD'}).\nVenue: ${uga.venue}, ${uga.city} — ${
        uga.home ? 'Atlanta / The Flats' : 'road / Athens side of the rivalry this year on our slate'
      }.`,
      links: uga.opponentId
        ? [{ label: 'Georgia results', href: `/opponent/${uga.opponentId}` }]
        : [{ label: 'Open schedule', href: '/schedule' }],
      followUps: ['What is Clean, Old-Fashioned Hate?', 'Show the full schedule'],
    });
  }

  push({
    id: 'fan-schedule-opinions',
    category: 'schedule',
    scope: 'faq',
    intent: 'limits',
    questions: [
      "What's the toughest three-week stretch?",
      'Which road games are most winnable?',
      'Which game is the trap game?',
      "Who's the homecoming opponent?",
      'Which game most likely decides the season?',
      "Where's the most likely upset loss?",
      'Are we favored in every game we should be?',
      'Which opposing QB should scare us most?',
    ],
    keywords: [
      'toughest stretch',
      'most winnable',
      'trap game',
      'homecoming',
      'decides the season',
      'upset loss',
      'favored',
      'scare us',
    ],
    answer:
      "Dunno — I don't rank trap games, homecoming designations, betting favorites, or 'scariest QB' opinions. I can pull dates, venues, and TV from the schedule — try “When is the UGA game?” or “Show the full schedule.”",
    followUps: ['Show the full schedule', 'When is the next game?'],
  });

  // --- Portal / roster volume ---
  const transfers = players.filter((p) => collegeStops(p).length);
  const freshmen = players.filter((p) => /fresh/i.test(p.eligibility?.class || p.year));
  push({
    id: 'fan-portal-roster',
    category: 'roster',
    scope: 'group',
    intent: 'transfer',
    questions: [
      'How many players in and out of the portal?',
      "Who's the biggest portal addition?",
      'How many total starters return?',
      'Who did we lose to the NFL draft?',
      'Any freshmen projected to start?',
      'What are the key fall camp position battles?',
      'Who are the team captains?',
      "What's the current injury report?",
      'How many total players on the roster?',
    ],
    keywords: [
      'portal',
      'biggest portal',
      'starters return',
      'nfl draft',
      'freshmen start',
      'position battles',
      'captains',
      'injury report',
    ],
    answer: [
      `Loaded roster: ${players.length} players · ${transfers.length} with prior college stops (portal/transfers in-app) · ${freshmen.length} freshmen.`,
      'I can list transfers and camp depth starters, but I do not track portal outs, NFL draft losses, official captains, live injury reports, or who “will” win camp battles.',
      'Try: “List the transfer players”, “Who starts at QB?”, or a player name.',
    ].join('\n'),
    links: [
      { label: 'Open roster', href: '/roster' },
      { label: 'Open depth chart', href: '/depth' },
    ],
    followUps: ['List the transfer players', "Who's QB1?"],
  });

  // Last season finish (expectations that are answerable)
  push({
    id: 'fan-last-year-finish',
    category: 'standings',
    scope: 'team',
    intent: 'standings',
    questions: [
      'How did we finish last year — record and bowl result?',
      'How did we finish last year?',
      'What was the bowl result?',
      'Pop-Tarts Bowl?',
      'Did we make a bowl last year?',
    ],
    keywords: ['bowl result', 'pop-tarts', 'finish last year', '2025 finish'],
    answer: [
      `2025: ${team.lastSeason.record} (${team.lastSeason.conference} ACC), final AP #${team.lastSeason.rank}. ${team.lastSeason.note}`,
      'Bowl: Pop-Tarts Bowl loss (reported vs BYU). Open Standings for ACC/Top 25 context.',
    ].join('\n'),
    links: [{ label: 'Open standings', href: '/standings' }],
    followUps: ['Where do we stand in the ACC?', 'When is the next game?'],
  });
}
