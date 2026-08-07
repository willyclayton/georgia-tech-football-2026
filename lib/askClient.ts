import { AskMessage, askBuzz } from '@/lib/askBuzz';

/**
 * Local team-data engine only.
 * No LLM fallback — if we can't match the question, we say so instead of inventing an answer.
 */
export async function askBuzzSmart(question: string): Promise<AskMessage> {
  const local = askBuzz(question);
  return { ...local, source: 'local' };
}
