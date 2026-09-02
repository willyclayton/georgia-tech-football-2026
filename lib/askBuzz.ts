import { matchAskEasterEgg } from '@/lib/askEasterEggs';
import { bestAskAnswer } from '@/lib/askRetrieve';

export type AskMessage = {
  id: string;
  role: 'user' | 'buzz';
  text: string;
  links?: { label: string; href: string }[];
  /** Compact follow-up prompts shown after this reply (not the starter list). */
  followUps?: string[];
  /** True when the local engine could not match the question. */
  unmatched?: boolean;
  source?: 'local' | 'llm';
};

/** Compact follow-ups after a reply — keep to three. */
export const SAMPLE_QUESTIONS = [
  'What school did Justice Haynes come from?',
  'Who is number 15?',
  'When is the next game?',
];

const TOPIC_FOLLOW_UPS = [
  'Tell me about the offense',
  'Tell me about the defense',
  'Where do we stand in the ACC?',
];

function withFollowUps(msg: AskMessage, extras: string[] = []): AskMessage {
  const pool = [...extras, ...TOPIC_FOLLOW_UPS];
  const seen = new Set<string>();
  const followUps: string[] = [];
  for (const item of pool) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    followUps.push(item);
    if (followUps.length >= 3) break;
  }
  return { ...msg, followUps };
}

let _seq = 0;
function uid() {
  _seq += 1;
  return `m-${Date.now()}-${_seq}`;
}

export function welcomeMessage(): AskMessage {
  return {
    id: uid(),
    role: 'buzz',
    text: 'Hey — Buzz here. Pick a topic below, tap a ready-made question, or type your own.',
  };
}

/** Topic-style prompts after the user has already asked something. */
export function defaultFollowUps(): string[] {
  return [...TOPIC_FOLLOW_UPS];
}

/**
 * Version A Ask Buzz: retrieve a grounded answer from the committed knowledge JSON
 * via Fuse.js (client-side). No API, no fine-tuning.
 */
export function askBuzz(question: string): AskMessage {
  const raw = question.trim();
  if (!raw) {
    return withFollowUps({
      id: uid(),
      role: 'buzz',
      text: 'Ask me a question about Georgia Tech football.',
    });
  }

  const egg = matchAskEasterEgg(raw);
  if (egg) {
    return withFollowUps({
      id: uid(),
      role: 'buzz',
      text: egg.answer,
      links: egg.links,
      source: 'local',
    });
  }

  const hit = bestAskAnswer(raw);
  if (!hit) {
    return withFollowUps(
      {
        id: uid(),
        role: 'buzz',
        text: "Dunno how to answer that — I only know what's in this app's roster, schedule, depth chart, standings, and team FAQ. Try a player name, jersey number, or “When is the next game?”",
        unmatched: true,
      },
      SAMPLE_QUESTIONS
    );
  }

  return withFollowUps(
    {
      id: uid(),
      role: 'buzz',
      text: hit.entry.answer,
      links: hit.entry.links?.length ? hit.entry.links : undefined,
      source: 'local',
    },
    hit.entry.followUps || []
  );
}
