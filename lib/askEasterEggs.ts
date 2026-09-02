import egg from '@/data/ask-easter-eggs.json';

export type EasterEggHit = {
  answer: string;
  links: { label: string; href: string }[];
};

type EasterEggFile = {
  videoUrl: string;
  linkLabel: string;
  answer: string;
  phraseTriggers: string[];
  mediaNeedles: string[];
  topicNeedles: string[];
};

const config = egg as EasterEggFile;

/** Strip punctuation so “Dragon’s Teeth” and “dragon-teeth” land on the same phrase. */
export function normalizeEggQuery(q: string) {
  return q
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function needleRe(needle: string) {
  const body = needle
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/ /g, '\\s+');
  return new RegExp(`\\b${body}s?\\b`);
}

function hasAnyNeedle(q: string, needles: string[]) {
  return needles.some((n) => needleRe(n).test(q));
}

function hit(): EasterEggHit {
  return {
    answer: `${config.answer}\n\n${config.videoUrl}`,
    links: [{ label: config.linkLabel, href: config.videoUrl }],
  };
}

/**
 * Hidden Game Day / Beta video Easter egg.
 * Distinctive lyric phrases always match. “Game day” / “beta” only match
 * when the ask is clearly about a music video/song — so football “game day”
 * questions stay on schedule and stadium answers.
 */
export function matchAskEasterEgg(question: string): EasterEggHit | null {
  const q = normalizeEggQuery(question);
  if (!q) return null;

  for (const phrase of config.phraseTriggers) {
    if (q.includes(normalizeEggQuery(phrase))) return hit();
  }

  if (hasAnyNeedle(q, config.mediaNeedles) && hasAnyNeedle(q, config.topicNeedles)) {
    return hit();
  }

  return null;
}
