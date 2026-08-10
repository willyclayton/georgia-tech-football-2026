/**
 * Browseable Ask Buzz topics + tap-to-ask prompts for the empty state.
 * Keep questions grounded in knowledge corpus (Version A).
 */

export type AskTopicId =
  | 'players'
  | 'schedule'
  | 'coaching'
  | 'offense'
  | 'defense'
  | 'special'
  | 'standings'
  | 'rivalry';

export type AskTopic = {
  id: AskTopicId;
  label: string;
  blurb: string;
  questions: string[];
};

export const ASK_TOPICS: AskTopic[] = [
  {
    id: 'players',
    label: 'Players',
    blurb: 'Jerseys, transfers, eligibility, stats',
    questions: [
      'What school did Justice Haynes come from?',
      'What school did Malachi Hosley transfer from?',
      'Who is number 15?',
      'How much eligibility does #22 have?',
      'List the transfer players',
      'Who is Evan Haynes?',
    ],
  },
  {
    id: 'schedule',
    label: 'Schedule',
    blurb: 'Opener, UGA, home/road, TV',
    questions: [
      'When is the next game?',
      'When and against whom do we open?',
      'When do we play Georgia, and is it in Athens or Atlanta?',
      'When do we play Clemson?',
      'How many home games do we have?',
      'Show the full schedule',
    ],
  },
  {
    id: 'coaching',
    label: 'Coaching',
    blurb: 'Key, coordinators, staff changes',
    questions: [
      "Who's the head coach heading into 2026, and what's his record at Tech?",
      'Any coordinator changes this offseason?',
      "Who's the OC and who's actually calling plays?",
      "Who's the DC and what's his scheme background?",
      "Who's the special teams coordinator?",
      'List the position coaches',
    ],
  },
  {
    id: 'offense',
    label: 'Offense',
    blurb: 'QB1, run game, receivers, scheme',
    questions: [
      "Who's QB1?",
      "Who's RB1 and is there a committee?",
      'Who are the top three receivers?',
      "Who's the starting tight end?",
      "Who's at left tackle?",
      'Explain the offense playbook',
    ],
  },
  {
    id: 'defense',
    label: 'Defense',
    blurb: '4-2-5, starters, depth',
    questions: [
      "What's our base defense — 3-4, 4-2-5, 4-3?",
      'Tell me about the defense',
      'Who are the starting linebackers?',
      "Who's the primary pass rusher?",
      'Explain the defense playbook',
      'Which portal additions on defense matter most?',
    ],
  },
  {
    id: 'special',
    label: 'Special teams',
    blurb: 'Kicker, punter, snapper',
    questions: [
      "Who's kicking field goals?",
      "Who's punting?",
      'Any long snapper concerns?',
      "Who's the special teams coordinator?",
    ],
  },
  {
    id: 'standings',
    label: 'Standings',
    blurb: 'ACC table, last season, record',
    questions: [
      'Where do we stand in the ACC?',
      'How did we finish last year — record and bowl result?',
      "What's our record?",
      'Were we ranked last year?',
    ],
  },
  {
    id: 'rivalry',
    label: 'Rivalry & campus',
    blurb: 'UGA, The Flats, traditions',
    questions: [
      'What is Clean, Old-Fashioned Hate?',
      'What is the Governor\'s Cup?',
      'Where do the Yellow Jackets play?',
      'What is the Ramblin\' Wreck?',
      "What's the fight song?",
      'Who is Buzz?',
    ],
  },
];

export function topicById(id: AskTopicId | null | undefined): AskTopic | undefined {
  if (!id) return undefined;
  return ASK_TOPICS.find((t) => t.id === id);
}
