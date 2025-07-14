import { ollama } from '../utils/ollama';
import { config } from '../config';
import { MATCH_REASON as intructPrompt } from '../utils/prompts';
import type { Message } from 'ollama';
import { Match } from '../utils/types';

const { reasonModel } = config;

export async function addReason<T extends Match>(matches: T[], targetText: string): Promise<T[]> {
  if (matches.length === 0) {
    return matches; // No matches to reason about
  }
  const reasonMatches: T[] = await Promise.all(
    matches.map(async (match) => {
      const messages: Message[] = [
        ...intructPrompt,
        {
          role: 'user',
          content: `Task: ${targetText}\nCompetence: ${match.text}\nSimilarity Score: ${match.distance}`,
        },
      ];
      try {
        const response = await ollama.chat({
          model: reasonModel,
          messages: messages,
        });

        // Extract the reason from the response
        const reason = response.message.content.trim();
        return {
          ...match,
          reason, // Add the reason to the match
        };
      } catch (error) {
        console.error('Error during reasoning:', error);
        // If there's an error, just keep the original match without a reason
        return match;
      }
    }),
  );

  return reasonMatches;
}
