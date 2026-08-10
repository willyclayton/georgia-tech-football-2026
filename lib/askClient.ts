import { AskMessage, askBuzz } from '@/lib/askBuzz';

/**
 * Ask Buzz Version A — local retrieval only.
 *
 * Flow: question → Fuse.js over data/ask-knowledge.json → canned grounded answer.
 * No server, no API key, no per-query cost.
 *
 * Version B (later): same retrieval, pass top hits to a free-tier LLM via /api/ask
 * for phrasing, with aggressive caching and fallback to this local answer on 429.
 */
export async function askBuzzSmart(question: string): Promise<AskMessage> {
  const local = askBuzz(question);
  return { ...local, source: 'local' };
}
